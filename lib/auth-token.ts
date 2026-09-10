export interface SessionPayload {
  userId: number
  email: string
  name: string
  role: 'DOKTER' | 'PERAWAT'
  expiresAt: number
}

export type AuthRole = 'DOKTER' | 'PERAWAT'

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'simpay-super-secret-key-2026-dokter-perawat-auth-system'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Sign a session payload using Web Crypto API (Edge & Node compatible)
 */
export async function createSessionToken(
  payload: Omit<SessionPayload, 'expiresAt'>
): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS
  const fullPayload: SessionPayload = { ...payload, expiresAt }
  const jsonStr = JSON.stringify(fullPayload)
  
  // Base64url encoding safe for Edge & Node
  const base64Data = btoa(jsonStr)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const secretBuffer = new TextEncoder().encode(SESSION_SECRET) as unknown as BufferSource
  const key = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const dataBuffer = new TextEncoder().encode(base64Data) as unknown as BufferSource
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataBuffer)
  const signature = bufferToHex(signatureBuffer)

  return `${base64Data}.${signature}`
}

/**
 * Verify and parse a session token using Web Crypto API (Edge & Node compatible)
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [base64Data, signature] = parts
    if (!signature || signature.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(signature)) {
      return null
    }

    const secretBuffer = new TextEncoder().encode(SESSION_SECRET) as unknown as BufferSource
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const hexMatches = signature.match(/.{1,2}/g)
    if (!hexMatches) return null
    const sigBytes = new Uint8Array(hexMatches.map((byte) => parseInt(byte, 16))) as unknown as BufferSource
    const dataBuffer = new TextEncoder().encode(base64Data) as unknown as BufferSource

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      dataBuffer
    )

    if (!isValid) return null

    // Base64url decoding
    const base64Standard = base64Data
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(base64Data.length + ((4 - (base64Data.length % 4)) % 4), '=')
    const jsonStr = atob(base64Standard)
    const payload: SessionPayload = JSON.parse(jsonStr)

    if (!payload || !payload.userId || !payload.role || !payload.expiresAt) {
      return null
    }

    if (Date.now() > payload.expiresAt) {
      return null
    }

    if (payload.role !== 'DOKTER' && payload.role !== 'PERAWAT') {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}
