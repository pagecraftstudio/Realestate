/**
 * redis.ts — stub that re-exports from upstash.ts so any module that still
 * imports from './lib/redis' gets the Upstash-backed implementations.
 * ioredis is NOT installed; this file must not import it.
 */
export {
  getUpstashRedis as getRedis,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  blacklistAccessToken,
  isAccessTokenBlacklisted,
  REFRESH_TOKEN_PREFIX,
  BLACKLIST_PREFIX,
} from './upstash.js'
