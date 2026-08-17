import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { CommunicationChannel, CommunicationDirection } from '../../lib/enums.js'
import { getWhatsAppProvider } from '../../lib/whatsapp/index.js'
import type { WhatsAppMessage, DeliveryStatus } from '../../lib/whatsapp/index.js'
import type {
  LogCommunicationInput,
  ListCommunicationsQuery,
  SendWhatsAppTextInput,
  SendWhatsAppTemplateInput,
} from './communications.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class BadRequestError extends Error {
  readonly statusCode = 400
  constructor(msg: string) { super(msg); this.name = 'BadRequestError' }
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function commSelect() {
  return {
    id:             true,
    organizationId: true,
    leadId:         true,
    customerId:     true,
    agentId:        true,
    channel:        true,
    direction:      true,
    subject:        true,
    content:        true,
    attachmentUrls: true,
    metadata:       true,
    sentAt:         true,
  } as const
}

// ─── Manual log ───────────────────────────────────────────────────────────────

export async function logCommunication(actor: AuthUser, input: LogCommunicationInput) {
  // Verify lead/customer exists in org
  if (input.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: actor.organizationId },
    })
    if (!lead) throw new NotFoundError('Lead not found')
  }
  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId: actor.organizationId },
    })
    if (!customer) throw new NotFoundError('Customer not found')
  }

  const comm = await prisma.communication.create({
    data: {
      organizationId: actor.organizationId,
      leadId:         input.leadId,
      customerId:     input.customerId,
      agentId:        actor.id,
      channel:        input.channel as CommunicationChannel,
      direction:      input.direction as CommunicationDirection,
      subject:        input.subject,
      content:        input.content,
      attachmentUrls: input.attachmentUrls,
      metadata:       input.metadata !== undefined ? (input.metadata as unknown) : undefined,
      sentAt:         input.sentAt ? new Date(input.sentAt) : new Date(),
    },
    select: commSelect(),
  })

  // Log activity on lead if present
  if (input.leadId) {
    await prisma.leadActivity.create({
      data: {
        leadId:         input.leadId,
        organizationId: actor.organizationId,
        actorId:        actor.id,
        type:           'COMMUNICATION_LOGGED',
        payload: {
          channel:   input.channel,
          direction: input.direction,
          commId:    comm.id,
        } as unknown,
      },
    })

    // Update lastContactedAt on lead
    await prisma.lead.update({
      where: { id: input.leadId },
      data:  { lastContactedAt: new Date() },
    })
  }

  return comm
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listCommunications(actor: AuthUser, query: ListCommunicationsQuery) {
  const { page, limit, ...filters } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(filters.leadId     && { leadId: filters.leadId }),
    ...(filters.customerId && { customerId: filters.customerId }),
    ...(filters.channel    && { channel: filters.channel as CommunicationChannel }),
    ...(filters.direction  && { direction: filters.direction as CommunicationDirection }),
  }

  const [items, total] = await Promise.all([
    prisma.communication.findMany({
      where,
      select: commSelect(),
      skip,
      take: limit,
      orderBy: { sentAt: 'desc' },
    }),
    prisma.communication.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

// ─── WhatsApp outbound ────────────────────────────────────────────────────────

export async function sendWhatsAppText(actor: AuthUser, input: SendWhatsAppTextInput) {
  const provider = getWhatsAppProvider()

  const { messageId } = await provider.sendText({
    to:      input.to,
    message: input.message,
  })

  return prisma.communication.create({
    data: {
      organizationId: actor.organizationId,
      leadId:         input.leadId,
      customerId:     input.customerId,
      agentId:        actor.id,
      channel:        CommunicationChannel.WHATSAPP,
      direction:      CommunicationDirection.OUTBOUND,
      content:        input.message,
      metadata:       { messageId, provider: provider.name } as unknown,
      sentAt:         new Date(),
    },
    select: commSelect(),
  })
}

export async function sendWhatsAppTemplate(actor: AuthUser, input: SendWhatsAppTemplateInput) {
  const provider = getWhatsAppProvider()

  const { messageId } = await provider.sendTemplate({
    to:           input.to,
    templateName: input.templateName,
    languageCode: input.languageCode,
    components:   input.components ?? [],
  })

  return prisma.communication.create({
    data: {
      organizationId: actor.organizationId,
      leadId:         input.leadId,
      customerId:     input.customerId,
      agentId:        actor.id,
      channel:        CommunicationChannel.WHATSAPP,
      direction:      CommunicationDirection.OUTBOUND,
      subject:        input.templateName,
      metadata:       { messageId, provider: provider.name, templateName: input.templateName } as unknown,
      sentAt:         new Date(),
    },
    select: commSelect(),
  })
}

// ─── WhatsApp webhook processing ──────────────────────────────────────────────

/**
 * Process inbound WhatsApp message from webhook.
 * Matches lead/customer by phone, logs communication.
 * orgId is resolved from WHATSAPP_ORG_ID env (multi-tenant orgs each need
 * their own phone number; env maps number→org).
 */
export async function processInboundMessage(
  orgId:   string,
  message: WhatsAppMessage,
) {
  // Find lead by whatsapp number
  const phone = message.from

  const lead = await prisma.lead.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ whatsapp: phone }, { phone }],
    },
  })

  const customer = !lead
    ? await prisma.customer.findFirst({
        where: { organizationId: orgId, phone },
      })
    : null

  const content = message.text ?? message.caption ?? `[${message.type}]`

  await prisma.communication.create({
    data: {
      organizationId: orgId,
      leadId:         lead?.id,
      customerId:     customer?.id,
      channel:        CommunicationChannel.WHATSAPP,
      direction:      CommunicationDirection.INBOUND,
      content,
      metadata: {
        messageId:    message.id,
        provider:     getWhatsAppProvider().name,
        type:         message.type,
        mediaUrl:     message.mediaUrl,
        rawTimestamp: message.timestamp.toISOString(),
      } as unknown,
      sentAt: message.timestamp,
    },
  })

  // Update lead lastContactedAt
  if (lead) {
    await prisma.lead.update({
      where: { id: lead.id },
      data:  { lastContactedAt: new Date() },
    })
  }
}

export async function processDeliveryStatus(
  _orgId: string,
  status: DeliveryStatus,
) {
  // Update the communication record's metadata with latest delivery status
  const comm = await prisma.communication.findFirst({
    where: { metadata: { path: ['messageId'], equals: status.messageId } },
  })
  if (!comm) return   // may not exist if sent outside CRM

  await prisma.communication.update({
    where: { id: comm.id },
    data: {
      metadata: {
        ...(typeof comm.metadata === 'object' && comm.metadata !== null ? comm.metadata as object : {}),
        deliveryStatus:    status.status,
        deliveryTimestamp: status.timestamp.toISOString(),
        ...(status.error && { deliveryError: status.error }),
      },
    },
  })
}
