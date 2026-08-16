import type {
  WhatsAppProvider,
  WhatsAppMessage,
  DeliveryStatus,
  SendTextOptions,
  SendTemplateOptions,
  SendMediaOptions,
} from './provider.interface.js'

/**
 * NullProvider — no-op for local development and testing.
 * Logs to console instead of hitting any external API.
 */
export class NullProvider implements WhatsAppProvider {
  readonly name = 'null'

  async sendText({ to, message }: SendTextOptions) {
    console.log(`[WhatsApp:null] sendText → ${to}: "${message}"`)
    return { messageId: `null-${Date.now()}` }
  }

  async sendTemplate({ to, templateName }: SendTemplateOptions) {
    console.log(`[WhatsApp:null] sendTemplate → ${to}: "${templateName}"`)
    return { messageId: `null-${Date.now()}` }
  }

  async sendMedia({ to, mediaType }: SendMediaOptions) {
    console.log(`[WhatsApp:null] sendMedia(${mediaType}) → ${to}`)
    return { messageId: `null-${Date.now()}` }
  }

  verifyWebhook({ query }: { headers: any; rawBody: Buffer; query?: any }) {
    // Always pass in dev; verify_token echo for hub challenge
    return query?.['hub.mode'] !== 'subscribe' || true
  }

  parseWebhookPayload(_body: unknown): WhatsAppMessage[] { return [] }
  parseDeliveryStatuses(_body: unknown): DeliveryStatus[] { return [] }
}
