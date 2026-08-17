import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import { getRatelimiter } from './lib/upstash.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { teamsRoutes } from './modules/teams/teams.routes.js'
import { projectsRoutes } from './modules/projects/projects.routes.js'
import { buildingsRoutes } from './modules/buildings/buildings.routes.js'
import { floorsRoutes } from './modules/floors/floors.routes.js'
import { unitsRoutes } from './modules/units/units.routes.js'
import { leadsRoutes } from './modules/leads/leads.routes.js'
import { customersRoutes } from './modules/customers/customers.routes.js'
import { viewingsRoutes } from './modules/viewings/viewings.routes.js'
import { offersRoutes } from './modules/offers/offers.routes.js'
import { reservationsRoutes } from './modules/reservations/reservations.routes.js'
import { dealsRoutes } from './modules/deals/deals.routes.js'
import { paymentPlansRoutes } from './modules/payment-plans/payment-plans.routes.js'
import { commissionsRoutes } from './modules/commissions/commissions.routes.js'
import { tasksRoutes } from './modules/tasks/tasks.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'
import { communicationsRoutes } from './modules/communications/communications.routes.js'
import { documentsRoutes } from './modules/documents/documents.routes.js'
import { analyticsRoutes } from './modules/analytics/analytics.routes.js'
import { auditLogsRoutes } from './modules/audit-logs/audit-logs.routes.js'
import { errorHandler } from './utils/errors.js'
import fastifyMultipart from '@fastify/multipart'
import fastifyRawBody from 'fastify-raw-body'
import { prisma } from './lib/prisma.js'

// ─── Build app ────────────────────────────────────────────────────────────────

export async function buildApp() {
  const isDev = process.env['NODE_ENV'] === 'development'
  const fastify = Fastify({
    logger: isDev
      ? {
          level: process.env['LOG_LEVEL'] ?? 'info',
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : { level: process.env['LOG_LEVEL'] ?? 'info' },
    trustProxy: true,
  })

  // ─── Security headers ───────────────────────────────────────────────────
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Configured at reverse-proxy level in prod
  })

  // ─── CORS ───────────────────────────────────────────────────────────────
  await fastify.register(fastifyCors, {
    origin: process.env['CORS_ORIGIN']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  })

  // ─── Rate limiting ──────────────────────────────────────────────────────
  // Upstash rate limiting (serverless-safe, replaces @fastify/rate-limit + ioredis)
  fastify.addHook('onRequest', async (request, reply) => {
    const limiter = getRatelimiter()
    if (!limiter) return
    const { success } = await limiter.limit(request.ip ?? 'anonymous')
    if (!success) return reply.status(429).send({ error: 'Too many requests' })
  })

  // ─── Cookies ────────────────────────────────────────────────────────────
  await fastify.register(fastifyCookie, {
    secret: process.env['COOKIE_SECRET'] ?? 'dev-cookie-secret-change-in-prod',
  })

  // ─── JWT ────────────────────────────────────────────────────────────────
  await fastify.register(fastifyJwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-in-prod',
    cookie: { cookieName: 'refreshToken', signed: false },
  })

  // ─── Raw body (Phase 14 — WhatsApp webhook HMAC verification) ─────────
  // Must be registered before any body parser. global:false means only
  // routes that set config.rawBody = true will capture the raw buffer.
  await fastify.register(fastifyRawBody, {
    field:    'rawBody',   // req.rawBody = Buffer
    global:   false,       // opt-in per route via config: { rawBody: true }
    encoding: false,       // keep as Buffer, not string
    runFirst: true,        // run before other body parsers
  })

  // ─── Multipart (Phase 15 — file uploads) ───────────────────────────────
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20 MB hard limit at transport layer
      files: 1,
      fields: 10,
    },
    attachFieldsToBody: false,
  })

  // ─── Global error handler ───────────────────────────────────────────────
  fastify.setErrorHandler(errorHandler)

  // ─── Health check ───────────────────────────────────────────────────────
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {}
    let healthy = true

    // DB probe
    try {
      await prisma.$queryRaw`SELECT 1`
      checks['db'] = 'ok'
    } catch {
      checks['db'] = 'error'
      healthy = false
    }

    // Upstash Redis probe (optional)
    try {
      const { getUpstashRedis } = await import('./lib/upstash.js')
      const redis = getUpstashRedis()
      if (redis) {
        await redis.ping()
        checks['redis'] = 'ok'
      } else {
        checks['redis'] = 'not configured'
      }
    } catch {
      checks['redis'] = 'error'
    }

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      env: process.env['NODE_ENV'] ?? 'development',
      checks,
    })
  })

  // ─── API routes ─────────────────────────────────────────────────────────
  await fastify.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' })
      await api.register(usersRoutes, { prefix: '/users' })
      await api.register(teamsRoutes, { prefix: '/teams' })
      // Phase 5 — Property hierarchy
      await api.register(projectsRoutes, { prefix: '/projects' })
      await api.register(buildingsRoutes, { prefix: '/buildings' })
      await api.register(floorsRoutes, { prefix: '/floors' })
      await api.register(unitsRoutes, { prefix: '/units' })
      // Phase 6 — Lead management
      await api.register(leadsRoutes, { prefix: '/leads' })
      // Phase 7 — Customer management
      await api.register(customersRoutes, { prefix: '/customers' })
      // Phase 8 — Viewings
      await api.register(viewingsRoutes, { prefix: '/viewings' })
      // Phase 9 — Offers + Reservations
      await api.register(offersRoutes, { prefix: '/offers' })
      await api.register(reservationsRoutes, { prefix: '/reservations' })
      // Phase 10 — Deals + Pipeline
      await api.register(dealsRoutes, { prefix: '/deals' })
      // Phase 11 — Payment plans + Installments + Payments
      // NOTE: paymentPlansRoutes defines paths internally as /payment-plans, /installments, /payments
      // Registered at root of /api/v1 so those paths resolve correctly.
      await api.register(paymentPlansRoutes, { prefix: '/' })
      // Phase 12 — Commissions
      // NOTE: commissionsRoutes defines /commission-rules and /commissions internally
      await api.register(commissionsRoutes, { prefix: '/' })
      // Phase 13 — Tasks + Notifications
      await api.register(tasksRoutes, { prefix: '/tasks' })
      await api.register(notificationsRoutes, { prefix: '/notifications' })
            // Phase 14 — Communications + WhatsApp
      await api.register(communicationsRoutes, { prefix: '/communications' })
      // Phase 15 — Documents
      await api.register(documentsRoutes, { prefix: '/documents' })
      // Phase 16 — Analytics + Reports
      await api.register(analyticsRoutes, { prefix: '/analytics' })
      // Phase 17 — Audit logs
      await api.register(auditLogsRoutes, { prefix: '/audit-logs' })
      // Future phases register here:
    },
    { prefix: '/api/v1' },
  )

  return fastify
}

// ─── Startup env validation ───────────────────────────────────────────────────

function validateEnv() {
  const required: string[] = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    // NOTE: SUPABASE_JWT_SECRET is NOT required here — token verification is
    // handled by supabaseAdmin.auth.getUser() in the authenticate middleware,
    // which uses the service role key internally. The raw JWT secret is never
    // needed by the API process.
    'DATABASE_URL',
  ]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`[startup] Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  // Warn (not fatal) when Upstash is missing — rate limiting degrades gracefully
  if (!process.env['UPSTASH_REDIS_REST_URL'] || !process.env['UPSTASH_REDIS_REST_TOKEN']) {
    console.warn('[startup] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting disabled')
  }

  const insecureDefaults: [string, string][] = [
    ['COOKIE_SECRET', 'dev-cookie-secret-change-in-prod'],
    ['JWT_SECRET',    'dev-jwt-secret-change-in-prod'],
  ]
  if (process.env['NODE_ENV'] === 'production') {
    for (const [key, defaultVal] of insecureDefaults) {
      if (!process.env[key] || process.env[key] === defaultVal) {
        console.error(`[startup] ${key} must be set to a secure value in production`)
        process.exit(1)
      }
    }
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  validateEnv()

  const app = await buildApp()
  const port = Number(process.env['PORT'] ?? 4000)
  const host = process.env['HOST'] ?? '0.0.0.0'

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal} — shutting down gracefully`)
    try {
      await app.close()
      app.log.info('Server closed')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'Error during shutdown')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))

  // ─── Unhandled rejection guard ────────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'Unhandled promise rejection')
  })

  try {
    await app.listen({ port, host })
    app.log.info(`🚀 API listening on http://${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
