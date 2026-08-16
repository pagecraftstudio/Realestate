import Redis from 'ioredis'

let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    redisClient.on('error', (err) => {
      console.error('[Redis] connection error:', err.message)
    })
  }
  return redisClient
}

export const REFRESH_TOKEN_PREFIX = 'rt:'
export const BLACKLIST_PREFIX = 'bl:'

export async function storeRefreshToken(
  userId: string,
  tokenId: string,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedis()
  await redis.setex(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`, ttlSeconds, '1')
}

export async function validateRefreshToken(
  userId: string,
  tokenId: string,
): Promise<boolean> {
  const redis = getRedis()
  const val = await redis.get(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`)
  return val === '1'
}

export async function revokeRefreshToken(
  userId: string,
  tokenId: string,
): Promise<void> {
  const redis = getRedis()
  await redis.del(`${REFRESH_TOKEN_PREFIX}${userId}:${tokenId}`)
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const redis = getRedis()
  const keys = await redis.keys(`${REFRESH_TOKEN_PREFIX}${userId}:*`)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

export async function blacklistAccessToken(
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedis()
  await redis.setex(`${BLACKLIST_PREFIX}${jti}`, ttlSeconds, '1')
}

export async function isAccessTokenBlacklisted(jti: string): Promise<boolean> {
  const redis = getRedis()
  const val = await redis.get(`${BLACKLIST_PREFIX}${jti}`)
  return val === '1'
}
