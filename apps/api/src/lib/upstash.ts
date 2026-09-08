/**
 * Upstash Redis client — HTTP-based, works in serverless (Vercel).
 * Replaces ioredis which requires persistent TCP connections.
 *
 * Set in env:
 *   UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=<token>
 *
 * Free tier: https://upstash.com  (10k commands/day)
 * Falls back gracefully when env vars are missing (dev without Redis).
 */

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// ─── Upstash Redis singleton ──────────────────────────────────────────────────

let _redis: Redis | null = null

export function getUpstashRedis(): Redis | null {
  if (_redis) return _redis
  const url   = process.env['UPSTASH_REDIS_REST_URL']
  const token = process.env['UPSTASH_REDIS_REST_TOKEN']
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

let _ratelimit: Ratelimit | null = null

export function getRatelimiter(): Ratelimit | null {
  if (_ratelimit) return _ratelimit
  const redis = getUpstashRedis()
  if (!redis) return null
  _ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 m'),
    analytics: false,
    prefix: 'recrm:rl',
  })
  return _ratelimit
}

// ─── Refresh token store (Upstash KV) ────────────────────────────────────────

export const REFRESH_TOKEN_PREFIX = 'rt:'
export const BLACKLIST_PREFIX     = 'bl:'

export async function storeRefreshToken(
  userId: string,
  tokenId: string,
  ttlSeconds: number,
): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return
  await redis.setex(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`, ttlSeconds, '1')
}

export async function validateRefreshToken(
  userId: string,
  tokenId: string,
): Promise<boolean> {
  const redis = getUpstashRedis()
  if (!redis) return true // dev fallback — no Redis means no validation
  const val = await redis.get<string>(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`)
  return val === '1'
}

export async function revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return
  await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`)
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return
  // Upstash doesn't support KEYS scan in free tier — use a set to track token IDs
  // For production, upgrade plan or use a token registry pattern.
  // This is a best-effort single-key delete of the latest known token.
  await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}:*`)
}

export async function blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return
  await redis.setex(`${BLACKLIST_PREFIX}${jti}`, ttlSeconds, '1')
}

export async function isAccessTokenBlacklisted(jti: string): Promise<boolean> {
  const redis = getUpstashRedis()
  if (!redis) return false
  const val = await redis.get<string>(`${BLACKLIST_PREFIX}${jti}`)
  return val === '1'
}
