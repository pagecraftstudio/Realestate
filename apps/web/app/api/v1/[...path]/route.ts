/**
 * Catch-all route — serves the Fastify API directly inside Next.js.
 *
 * The api workspace package is compiled to dist/ before Next.js builds.
 * We import the compiled JS so Next.js webpack never tries to parse
 * Fastify's .js-suffixed ESM-style imports from TypeScript source.
 *
 * Build order (apps/web/vercel.json buildCommand):
 *   1. prisma generate
 *   2. tsc (api → dist/)
 *   3. next build (web)
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { FastifyInstance } from 'fastify'

// Singleton reused across warm invocations
let _app: FastifyInstance | null = null

async function getApp(): Promise<FastifyInstance> {
  if (_app) return _app

  // Import compiled dist — avoids webpack trying to parse .js-suffixed TS imports
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { buildApp } = require('api') as { buildApp: () => Promise<FastifyInstance> }
  _app = await buildApp()
  await _app.ready()
  return _app
}

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  let app: FastifyInstance
  try {
    app = await getApp()
  } catch (err) {
    console.error('[api route] getApp failed:', err)
    return NextResponse.json(
      { error: 'API initialization failed', detail: String(err) },
      { status: 500 }
    )
  }

  const { path } = await ctx.params
  const search = req.nextUrl.search
  const url = `/api/v1/${path.join('/')}${search}`

  // Read body
  let body: Buffer | string | undefined
  if (!['GET', 'HEAD'].includes(req.method)) {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('multipart/form-data')) {
      body = Buffer.from(await req.arrayBuffer())
    } else {
      body = await req.text()
    }
  }

  // Forward headers
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') headers[key] = value
  })

  const result = await app.inject({
    method:  req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS',
    url,
    headers,
    payload: body,
  })

  const resHeaders = new Headers()
  Object.entries(result.headers).forEach(([key, value]) => {
    const skip = ['transfer-encoding', 'connection', 'keep-alive']
    if (!skip.includes(key.toLowerCase()) && value != null) {
      resHeaders.set(key, String(value))
    }
  })

  return new NextResponse(result.rawPayload, {
    status:  result.statusCode,
    headers: resHeaders,
  })
}

export const GET     = handler
export const POST    = handler
export const PUT     = handler
export const PATCH   = handler
export const DELETE  = handler
export const OPTIONS = handler

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
