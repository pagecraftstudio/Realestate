'use client'
import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { CommsList } from '@/components/modules/communication/comms-list'
import { WhatsAppDialog } from '@/components/modules/communication/whatsapp-dialog'

export function CommunicationClient() {
  const [waOpen, setWaOpen] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-indigo-500" />
            Communications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">WhatsApp, calls, and email logs across all leads and customers</p>
        </div>
        <button
          onClick={() => setWaOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-medium hover:bg-emerald-700 shrink-0"
        >
          <Send className="h-4 w-4" />
          Send WhatsApp
        </button>
      </div>

      <CommsList />
      <WhatsAppDialog open={waOpen} onOpenChange={setWaOpen} />
    </div>
  )
}
