/**
 * Utility functions for Patient data formatting and calculations
 */

export function formatNoRM(id: number): string {
  // Uses healthcare standard RM-10044 + id (e.g. ID 1 -> RM-10045)
  return `RM-${10044 + id}`
}

export function parseNoRM(query: string): number | null {
  const trimmed = query.trim()
  const rmMatch = trimmed.match(/^RM-?(\d+)$/i)
  if (rmMatch) {
    const num = parseInt(rmMatch[1], 10)
    return num > 10044 ? num - 10044 : num
  }
  const directNum = parseInt(trimmed, 10)
  if (!isNaN(directNum) && directNum > 10044) {
    return directNum - 10044
  }
  return null
}

export function calculateAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return Math.max(0, age)
}

export function formatBirthDateAndAge(dateOfBirth: Date | string): string {
  const dob = new Date(dateOfBirth)
  const age = calculateAge(dob)

  const dateFormatted = dob.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return `${dateFormatted} (${age} thn)`
}

export function formatDateIndo(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
