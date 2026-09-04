/**
 * Lightweight middleware — cookie-only session check.
 * No Supabase SDK import = tiny bundle = no cold-start timeout.
 * Full JWT validation happens inside each Server Component / Route Handler.
 */
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/api/v1/auth/register', '/api/cron/']

// Supabase stores the session in a cookie whose name starts with sb- and ends with -auth-token
const SESSION_COOKIE_RE = /^sb-.+-auth-token$/

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const hasSession = req.cookies.getAll().some(({ name }) => SESSION_COOKIE_RE.test(name))

  if (!hasSession) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
