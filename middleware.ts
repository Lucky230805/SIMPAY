import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth-token'


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isDemoMode = process.env.DEMO_MODE === 'true'

  // 1. Whitelist public assets and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/antrean/display'
  ) {
    return NextResponse.next()
  }

  // 2. Extract and verify session cookie
  const sessionCookie = request.cookies.get('simpay_session')?.value
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null

  // 3. Handle login page access
  if (pathname === '/login') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 4. Require authentication for all protected application routes
  if (!session && !isDemoMode) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('from', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 5. Enforce Route-Level Role Authorization Guards
  const role = session?.role

  // Guard A: Doctor Examination workbench (/antrean/[id]) is restricted to DOKTER
  const isDoctorExamRoute = /^\/antrean\/\d+$/.test(pathname)
  if (isDoctorExamRoute && role !== 'DOKTER' && !isDemoMode) {
    return NextResponse.redirect(new URL('/antrean', request.url))
  }


  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
