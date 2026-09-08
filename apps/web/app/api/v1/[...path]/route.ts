/**
 * Catch-all route — serves the Fastify API directly inside Next.js.
 * No external API project needed. The `api` workspace package is imported
 * and its Fastify app is invoked via inject(), reusing a singleton instance.
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { FastifyInstance } from 'fastify'

// Lazy singleton — reused across warm Vercel invocations
let _app: FastifyInstance | null = null

async function getApp(): Promise<FastifyInstance> {
  if (_app) return _app
  // Dynamic import avoids pulling Fastify into Next.js client bundles
  const { buildApp } = await import('api/src/main')
  _app = await buildApp()
  await _app.ready()
  return _app
}

async function handler(req: NextRequest, ctx: { params: { path: string[] } }) {
  const app = await getApp()

  const path   = (await ctx.params).path.join('/')
  const search = req.nextUrl.search
  const url    = `/api/v1/${path}${search}`

  // Read body once
  let body: string | Buffer | undefined
  if (!['GET', 'HEAD'].includes(req.method)) {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('multipart/form-data')) {
      body = Buffer.from(await req.arrayBuffer())
    } else {
      body = await req.text()
    }
  }

  // Build headers object for Fastify inject
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

export const dynamic    = 'force-dynamic'
export const runtime    = 'nodejs'
