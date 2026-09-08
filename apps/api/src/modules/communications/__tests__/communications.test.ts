import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  logCommunication,
  listCommunications,
  sendWhatsAppText,
  processInboundMessage,
  processDeliveryStatus,
} from '../communications.service.js'
import { prisma } from '../../../lib/prisma.js'
import * as whatsappModule from '../../../lib/whatsapp/index.js'
import type { AuthUser } from '../../../types/auth.js'

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    lead:          { findFirst: vi.fn(), update: vi.fn() },
    customer:      { findFirst: vi.fn() },
    communication: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    leadActivity:  { create: vi.fn() },
  },
}))

vi.mock('../../../lib/whatsapp/index.js', () => ({
  getWhatsAppProvider: vi.fn(),
}))

const mockAgent: AuthUser = {
  id: 'agent-1', userId: 'agent-1', supabaseUid: 'sb-test',
  organizationId: 'org-1',
  role: 'SALES_AGENT',
}

const mockComm = {
  id: 'comm-1',
  organizationId: 'org-1',
  leadId: 'lead-1',
  customerId: null,
  agentId: 'agent-1',
  channel: 'WHATSAPP',
  direction: 'OUTBOUND',
  subject: null,
  content: 'Hello!',
  attachmentUrls: [],
  metadata: {},
  sentAt: new Date(),
}

describe('Communications Service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('logCommunication', () => {
    it('logs a manual communication and updates lead', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({ id: 'lead-1' } as any)
      vi.mocked(prisma.communication.create).mockResolvedValue(mockComm as any)
      vi.mocked(prisma.leadActivity.create).mockResolvedValue({} as any)
      vi.mocked(prisma.lead.update).mockResolvedValue({} as any)

      const result = await logCommunication(mockAgent, {
        leadId:    'lead-1',
        channel:   'WHATSAPP',
        direction: 'OUTBOUND',
        content:   'Hello!',
        attachmentUrls: [],
        metadata: {},
      })

      expect(prisma.communication.create).toHaveBeenCalled()
      expect(prisma.leadActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'COMMUNICATION_LOGGED' }),
        }),
      )
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastContactedAt: expect.any(Date) }) }),
      )
      expect(result.content).toBe('Hello!')
    })

    it('throws if lead not in org', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)
      await expect(
        logCommunication(mockAgent, {
          leadId: 'bad', channel: 'WHATSAPP', direction: 'OUTBOUND',
          attachmentUrls: [], metadata: {},
        }),
      ).rejects.toThrow('Lead not found')
    })
  })

  describe('listCommunications', () => {
    it('filters by leadId', async () => {
      vi.mocked(prisma.communication.findMany).mockResolvedValue([])
      vi.mocked(prisma.communication.count).mockResolvedValue(0)

      await listCommunications(mockAgent, { page: 1, limit: 20, leadId: 'lead-1' })

      expect(prisma.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ leadId: 'lead-1' }),
        }),
      )
    })
  })

  describe('sendWhatsAppText', () => {
    it('sends via provider and logs comm', async () => {
      const mockProvider = {
        name: 'null',
        sendText: vi.fn().mockResolvedValue({ messageId: 'wa-msg-123' }),
      }
      vi.mocked(whatsappModule.getWhatsAppProvider).mockReturnValue(mockProvider as any)
      vi.mocked(prisma.communication.create).mockResolvedValue(mockComm as any)

      await sendWhatsAppText(mockAgent, {
        to: '+201001234567',
        message: 'Hello!',
        leadId: 'lead-1',
      })

      expect(mockProvider.sendText).toHaveBeenCalledWith({ to: '+201001234567', message: 'Hello!' })
      expect(prisma.communication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: 'WHATSAPP',
            direction: 'OUTBOUND',
            metadata: expect.objectContaining({ messageId: 'wa-msg-123' }),
          }),
        }),
      )
    })
  })

  describe('processInboundMessage', () => {
    it('matches lead by phone and logs inbound comm', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({ id: 'lead-1' } as any)
      vi.mocked(prisma.communication.create).mockResolvedValue(mockComm as any)
      vi.mocked(prisma.lead.update).mockResolvedValue({} as any)
      vi.mocked(whatsappModule.getWhatsAppProvider).mockReturnValue({ name: 'null' } as any)

      await processInboundMessage('org-1', {
        id:        'wa-1',
        from:      '+201001234567',
        to:        '',
        type:      'text',
        timestamp: new Date(),
        text:      'I am interested',
      })

      expect(prisma.communication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: 'INBOUND',
            leadId: 'lead-1',
            content: 'I am interested',
          }),
        }),
      )
      expect(prisma.lead.update).toHaveBeenCalled()
    })

    it('logs without lead/customer if phone not matched', async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.communication.create).mockResolvedValue(mockComm as any)
      vi.mocked(whatsappModule.getWhatsAppProvider).mockReturnValue({ name: 'null' } as any)

      await processInboundMessage('org-1', {
        id: 'wa-2', from: '+99000000000', to: '', type: 'text',
        timestamp: new Date(), text: 'Who is this?',
      })

      expect(prisma.communication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ leadId: undefined, customerId: undefined }),
        }),
      )
    })
  })

  describe('processDeliveryStatus', () => {
    it('updates comm metadata with delivery status', async () => {
      vi.mocked(prisma.communication.findFirst).mockResolvedValue({
        id: 'comm-1', metadata: { messageId: 'wa-msg-123' },
      } as any)
      vi.mocked(prisma.communication.update).mockResolvedValue({} as any)

      await processDeliveryStatus('org-1', {
        messageId: 'wa-msg-123',
        status:    'delivered',
        timestamp: new Date(),
      })

      expect(prisma.communication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ deliveryStatus: 'delivered' }),
          }),
        }),
      )
    })
  })
})
