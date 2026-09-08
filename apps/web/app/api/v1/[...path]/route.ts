/**
 * Catch-all proxy to Fastify API.
 * Next.js rewrites strip Authorization headers for external destinations,
 * so we use a Next.js API route to explicitly forward all headers.
 */

import { type NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://realestate-api-one.vercel.app'

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path    = params.path.join('/')
  const search  = req.nextUrl.search
  const url     = `${API_BASE}/api/v1/${path}${search}`

  // Forward all headers except host
  // Explicitly set Authorization first to guarantee it's included
  const headers = new Headers()
  const auth = req.headers.get('authorization')
  if (auth) headers.set('authorization', auth)
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') headers.set(key, value)
  })
  console.log('[proxy] →', req.method, url, 'auth:', auth ? auth.slice(0, 30) + '...' : 'NONE')

  let body: BodyInit | undefined
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = await req.arrayBuffer()
  }

  const res = await fetch(url, {
    method:  req.method,
    headers,
    body,
    // Don't follow redirects — forward them as-is
    redirect: 'manual',
  })

  const resHeaders = new Headers()
  res.headers.forEach((value, key) => {
    // Strip headers that conflict with Next.js response handling
    const skip = ['transfer-encoding', 'connection', 'keep-alive', 'upgrade']
    if (!skip.includes(key.toLowerCase())) resHeaders.set(key, value)
  })

  return new NextResponse(res.body, {
    status:  res.status,
    headers: resHeaders,
  })
}

export const GET     = proxy
export const POST    = proxy
export const PUT     = proxy
export const PATCH   = proxy
export const DELETE  = proxy
export const OPTIONS = proxy
