/**
 * Phase I — Next.js middleware: Supabase SSR session handling
 *
 * Replaces the old refreshToken-cookie check with Supabase session validation.
 * Supabase @supabase/ssr automatically refreshes the session cookie here.
 *
 * Public paths bypass the check. All protected routes redirect to /login
 * if the Supabase session is missing or expired.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/register', '/api/v1/auth/login', '/api/v1/auth/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Build a response object so Supabase SSR can write refreshed cookies
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll: ()           => req.cookies.getAll(),
        setAll: (toSet)      => {
          toSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // getUser validates the JWT with Supabase Auth (not just local cookie parse)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
