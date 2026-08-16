import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import { getWhatsAppProvider } from '../../lib/whatsapp/index.js'
import { prisma } from '../../lib/prisma.js'
import {
  logCommunicationSchema,
  listCommunicationsQuerySchema,
  sendWhatsAppTextSchema,
  sendWhatsAppTemplateSchema,
  webhookChallengeQuerySchema,
} from './communications.schema.js'
import * as svc from './communications.service.js'

export async function communicationsRoutes(fastify: FastifyInstance) {
  // ─── List ────────────────────────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, requirePermission('communications', 'read')],
  }, async (req) => {
    const query = listCommunicationsQuerySchema.parse(req.query)
    return svc.listCommunications(req.authUser!, query)
  })

  // ─── Log manual communication ─────────────────────────────────────────────
  fastify.post('/', {
    preHandler: [authenticate, requirePermission('communications', 'create')],
  }, async (req, reply) => {
    const input = logCommunicationSchema.parse(req.body)
    const comm  = await svc.logCommunication(req.authUser!, input)
    return reply.status(201).send(comm)
  })

  // ─── Send WhatsApp text ───────────────────────────────────────────────────
  fastify.post('/whatsapp/send', {
    preHandler: [authenticate, requirePermission('communications', 'create')],
  }, async (req, reply) => {
    const input = sendWhatsAppTextSchema.parse(req.body)
    const comm  = await svc.sendWhatsAppText(req.authUser!, input)
    return reply.status(201).send(comm)
  })

  // ─── Send WhatsApp template ───────────────────────────────────────────────
  fastify.post('/whatsapp/template', {
    preHandler: [authenticate, requirePermission('communications', 'create')],
  }, async (req, reply) => {
    const input = sendWhatsAppTemplateSchema.parse(req.body)
    const comm  = await svc.sendWhatsAppTemplate(req.authUser!, input)
    return reply.status(201).send(comm)
  })

  // ─── WhatsApp webhook — GET (hub challenge verification) ──────────────────
  fastify.get('/whatsapp/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const query  = webhookChallengeQuerySchema.parse(req.query)
    const provider = getWhatsAppProvider()

    const valid = provider.verifyWebhook({
      headers: req.headers as Record<string, string>,
      rawBody: Buffer.alloc(0),
      query:   req.query as Record<string, string>,
    })

    if (!valid) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    // Echo challenge back — Meta expects a plain text response
    const challenge = query['hub.challenge']
    return reply.status(200).header('Content-Type', 'text/plain').send(challenge ?? 'ok')
  })

  // ─── WhatsApp webhook — POST (inbound messages + status updates) ──────────
  fastify.post('/whatsapp/webhook', {
    // Raw body needed for HMAC signature verification
    config: { rawBody: true },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const provider = getWhatsAppProvider()

    // rawBody is set by @fastify/rawbody (registered in main.ts with global:false,
    // enabled here via config: { rawBody: true }). The module augments FastifyRequest.
    const rawBody = (req as FastifyRequest & { rawBody: Buffer }).rawBody
    const valid   = provider.verifyWebhook({
      headers: req.headers as Record<string, string>,
      rawBody,
    })

    if (!valid) {
      fastify.log.warn('WhatsApp webhook: invalid signature')
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const body = req.body as unknown

    // ─── Multi-tenant org resolution ────────────────────────────────────────
    // Extract the receiving phone number ID from Meta's webhook payload.
    // Look up which organization owns that phone number in the DB.
    // Falls back to WHATSAPP_ORG_ID env var for single-tenant deployments.
    let orgId: string | null = null

    const phoneNumberId = extractPhoneNumberId(body)
    if (phoneNumberId) {
      const org = await prisma.organization.findFirst({
        where:  { whatsappPhoneNumberId: phoneNumberId },
        select: { id: true },
      }).catch(() => null)
      orgId = org?.id ?? null
    }

    // Fallback: single-tenant env var (deprecated — use DB mapping instead)
    if (!orgId) {
      orgId = process.env['WHATSAPP_ORG_ID'] ?? null
    }

    if (!orgId) {
      fastify.log.warn({ phoneNumberId }, 'WhatsApp webhook: no org mapped to this phone number')
      return reply.status(200).send({ status: 'ignored' })  // always 200 to Meta
    }

    // Process inbound messages
    const messages = provider.parseWebhookPayload(body)
    for (const msg of messages) {
      await svc.processInboundMessage(orgId, msg).catch((err) => {
        fastify.log.error({ err, msgId: msg.id }, 'Failed to process inbound WhatsApp message')
      })
    }

    // Process delivery status updates
    const statuses = provider.parseDeliveryStatuses(body)
    for (const status of statuses) {
      await svc.processDeliveryStatus(orgId, status).catch((err) => {
        fastify.log.error({ err, messageId: status.messageId }, 'Failed to process delivery status')
      })
    }

    // Meta requires 200 response within 20s
    return reply.status(200).send({ status: 'ok' })
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the receiving phone_number_id from Meta's webhook payload.
 * Structure: entry[0].changes[0].value.metadata.phone_number_id
 */
function extractPhoneNumberId(body: unknown): string | null {
  try {
    const b = body as {
      entry?: Array<{
        changes?: Array<{
          value?: { metadata?: { phone_number_id?: string } }
        }>
      }>
    }
    return b?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null
  } catch {
    return null
  }
}
