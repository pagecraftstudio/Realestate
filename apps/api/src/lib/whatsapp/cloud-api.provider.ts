import crypto from 'node:crypto'
import type {
  WhatsAppProvider,
  WhatsAppMessage,
  DeliveryStatus,
  SendTextOptions,
  SendTemplateOptions,
  SendMediaOptions,
} from './provider.interface.js'

// ─── Meta Cloud API v20 ───────────────────────────────────────────────────────

const BASE_URL = 'https://graph.facebook.com/v20.0'

export class CloudApiProvider implements WhatsAppProvider {
  readonly name = 'meta-cloud-api'

  private readonly phoneNumberId: string
  private readonly accessToken:   string
  private readonly appSecret:     string

  constructor(config: {
    phoneNumberId: string
    accessToken:   string
    appSecret:     string
  }) {
    this.phoneNumberId = config.phoneNumberId
    this.accessToken   = config.accessToken
    this.appSecret     = config.appSecret
  }

  // ─── Send helpers ───────────────────────────────────────────────────────

  async sendText({ to, message }: SendTextOptions): Promise<{ messageId: string }> {
    const res = await this.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to,
      type: 'text',
      text: { body: message, preview_url: false },
    })
    return { messageId: res.messages?.[0]?.id ?? '' }
  }

  async sendTemplate({ to, templateName, languageCode, components }: SendTemplateOptions): Promise<{ messageId: string }> {
    const res = await this.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name:     templateName,
        language: { code: languageCode },
        components: components ?? [],
      },
    })
    return { messageId: res.messages?.[0]?.id ?? '' }
  }

  async sendMedia({ to, mediaUrl, mediaType, caption, filename }: SendMediaOptions): Promise<{ messageId: string }> {
    const mediaPayload: Record<string, unknown> = { link: mediaUrl }
    if (caption)  mediaPayload['caption']  = caption
    if (filename) mediaPayload['filename'] = filename

    const res = await this.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
    })
    return { messageId: res.messages?.[0]?.id ?? '' }
  }

  // ─── Webhook ────────────────────────────────────────────────────────────

  verifyWebhook({ headers, rawBody, query }: {
    headers: Record<string, string | string[] | undefined>
    rawBody: Buffer
    query?:  Record<string, string>
  }): boolean {
    // Hub verification challenge (GET)
    if (query?.['hub.mode'] === 'subscribe') {
      return query['hub.verify_token'] === process.env['WHATSAPP_VERIFY_TOKEN']
    }

    // Payload signature (POST) — X-Hub-Signature-256
    const sig = headers['x-hub-signature-256']
    if (!sig || typeof sig !== 'string') return false

    const expected = 'sha256=' + crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  }

  parseWebhookPayload(body: unknown): WhatsAppMessage[] {
    const messages: WhatsAppMessage[] = []
    const entries = (body as any)?.entry ?? []

    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value
        if (!value?.messages) continue

        for (const msg of value.messages) {
          const profile = value.contacts?.find((c: any) => c.wa_id === msg.from)
          messages.push(this.normalizeMessage(msg, profile))
        }
      }
    }
    return messages
  }

  parseDeliveryStatuses(body: unknown): DeliveryStatus[] {
    const statuses: DeliveryStatus[] = []
    const entries = (body as any)?.entry ?? []

    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        for (const status of change?.value?.statuses ?? []) {
          statuses.push({
            messageId: status.id,
            status:    this.mapStatus(status.status),
            timestamp: new Date(Number(status.timestamp) * 1000),
            error:     status.errors?.[0]?.title,
          })
        }
      }
    }
    return statuses
  }

  // ─── Internals ──────────────────────────────────────────────────────────

  private async post(path: string, body: unknown): Promise<any> {
    const url = `${BASE_URL}/${this.phoneNumberId}${path}`
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`WhatsApp API error ${res.status}: ${JSON.stringify(err)}`)
    }
    return res.json()
  }

  private normalizeMessage(msg: any, contact?: any): WhatsAppMessage {
    const base: WhatsAppMessage = {
      id:          msg.id,
      from:        msg.from,
      to:          '',
      type:        msg.type ?? 'unknown',
      timestamp:   new Date(Number(msg.timestamp) * 1000),
      rawPayload:  msg,
    }

    if (msg.type === 'text') {
      base.text = msg.text?.body
    } else if (['image', 'document', 'audio', 'video', 'sticker'].includes(msg.type)) {
      const media = msg[msg.type]
      base.mediaType = msg.type
      base.caption   = media?.caption
    } else if (msg.type === 'template') {
      base.templateName = msg.template?.name
    }

    return base
  }

  private mapStatus(s: string): DeliveryStatus['status'] {
    const map: Record<string, DeliveryStatus['status']> = {
      sent:      'sent',
      delivered: 'delivered',
      read:      'read',
      failed:    'failed',
    }
    return map[s] ?? 'sent'
  }
}
