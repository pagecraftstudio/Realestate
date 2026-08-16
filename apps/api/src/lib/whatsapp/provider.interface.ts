// ─── WhatsApp Provider Abstraction ───────────────────────────────────────────
//
// All WhatsApp vendors implement this interface.
// The CRM never imports a concrete provider directly — only this contract.
// Switch providers by swapping the concrete class in whatsapp/index.ts.

export interface WhatsAppMessage {
  id:          string          // provider message ID
  from:        string          // phone number (E.164)
  to:          string
  type:        'text' | 'image' | 'document' | 'audio' | 'video' | 'template' | 'sticker' | 'unknown'
  timestamp:   Date
  text?:       string
  mediaUrl?:   string
  mediaType?:  string
  caption?:    string
  templateName?: string
  templateParams?: string[]
  status?:     'sent' | 'delivered' | 'read' | 'failed'
  rawPayload?: unknown
}

export interface SendTextOptions {
  to:      string   // E.164 phone number
  message: string
}

export interface SendTemplateOptions {
  to:           string
  templateName: string
  languageCode: string
  components?:  unknown[]   // vendor-specific template components
}

export interface SendMediaOptions {
  to:        string
  mediaUrl:  string
  mediaType: 'image' | 'document' | 'audio' | 'video'
  caption?:  string
  filename?: string
}

export interface DeliveryStatus {
  messageId: string
  status:    'sent' | 'delivered' | 'read' | 'failed'
  timestamp: Date
  error?:    string
}

/**
 * WhatsAppProvider — implement this interface for any WhatsApp vendor.
 *
 * Current implementations:
 *   - CloudApiProvider  (Meta WhatsApp Cloud API)
 *   - NullProvider      (no-op for dev/test)
 */
export interface WhatsAppProvider {
  readonly name: string

  /** Send a plain text message */
  sendText(opts: SendTextOptions): Promise<{ messageId: string }>

  /** Send a pre-approved template message */
  sendTemplate(opts: SendTemplateOptions): Promise<{ messageId: string }>

  /** Send a media message (image, document, audio, video) */
  sendMedia(opts: SendMediaOptions): Promise<{ messageId: string }>

  /**
   * Verify that an incoming webhook request is authentic.
   * Return true if the signature / challenge is valid.
   */
  verifyWebhook(params: {
    headers: Record<string, string | string[] | undefined>
    rawBody: Buffer
    query?:  Record<string, string>
  }): boolean

  /**
   * Parse a raw webhook payload into normalized WhatsAppMessages.
   * May return multiple messages from one webhook call.
   */
  parseWebhookPayload(body: unknown): WhatsAppMessage[]

  /**
   * Parse delivery status updates from a webhook payload.
   * May be empty if the payload contains no status events.
   */
  parseDeliveryStatuses(body: unknown): DeliveryStatus[]
}
