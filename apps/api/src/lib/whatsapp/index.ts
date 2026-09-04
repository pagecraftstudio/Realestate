// ─── WhatsApp provider factory ────────────────────────────────────────────────
//
// To add a new provider:
//   1. Implement WhatsAppProvider in a new file
//   2. Add a case to buildProvider() below
//   3. Set WHATSAPP_PROVIDER=<key> in .env
//
// Nothing outside this file imports a concrete provider.

export type { WhatsAppProvider, WhatsAppMessage, DeliveryStatus } from './provider.interface.js'
import type { WhatsAppProvider } from './provider.interface.js'
import { CloudApiProvider } from './cloud-api.provider.js'
import { NullProvider }     from './null.provider.js'

let _instance: WhatsAppProvider | null = null

export function getWhatsAppProvider(): WhatsAppProvider {
  if (_instance) return _instance
  _instance = buildProvider(process.env['WHATSAPP_PROVIDER'] ?? 'null')
  return _instance
}

/** Reset for tests */
export function resetWhatsAppProvider() { _instance = null }

function buildProvider(name: string): WhatsAppProvider {
  switch (name) {
    case 'meta-cloud-api':
      return new CloudApiProvider({
        phoneNumberId: requireEnv('WHATSAPP_PHONE_NUMBER_ID'),
        accessToken:   requireEnv('WHATSAPP_ACCESS_TOKEN'),
        appSecret:     requireEnv('WHATSAPP_APP_SECRET'),
      })

    case 'null':
    default:
      return new NullProvider()
  }
}

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}
