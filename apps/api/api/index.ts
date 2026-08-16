/**
 * Vercel serverless entry point.
 * Wraps the Fastify app using @vercel/node so every request hits
 * the same router/middleware stack as the long-running server.
 *
 * Vercel routes:  vercel.json → { source: "/api/(.*)", dest: "/api/index.ts" }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from '../src/main.js'
import type { FastifyInstance } from 'fastify'

// Re-use the app across warm invocations (connection pooling)
let _app: FastifyInstance | null = null

async function getApp(): Promise<FastifyInstance> {
  if (_app) return _app
  _app = await buildApp()
  await _app.ready()
  return _app
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp()

  // Convert Vercel request to Fastify inject payload
  const rawBody = await getRawBody(req)

  const response = await app.inject({
    method: req.method as any,
    url: req.url ?? '/',
    headers: req.headers as Record<string, string>,
    payload: rawBody,
  })

  // Forward status + headers
  res.status(response.statusCode)
  const skip = new Set(['transfer-encoding', 'connection'])
  for (const [key, value] of Object.entries(response.headers)) {
    if (!skip.has(key.toLowerCase()) && value !== undefined) {
      res.setHeader(key, value as string)
    }
  }

  res.send(response.rawPayload)
}

// ─── Body helper ──────────────────────────────────────────────────────────────

function getRawBody(req: VercelRequest): Promise<Buffer | undefined> {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
      return resolve(undefined)
    }
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined))
    req.on('error', reject)
  })
}
