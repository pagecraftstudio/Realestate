'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, MessageCircle } from 'lucide-react'
import { useSendWhatsApp } from '@/lib/hooks/use-comms'

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
}

export function WhatsAppDialog({ open, onOpenChange }: Props) {
  const send = useSendWhatsApp()
  const [phone,   setPhone]   = useState('')
  const [message, setMessage] = useState('')

  async function submit() {
    if (!phone.trim() || !message.trim()) return
    await send.mutateAsync({ phone: phone.trim(), message: message.trim() })
    setPhone(''); setMessage('')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card border border-border p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              Send WhatsApp
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone number *</label>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+20 1XX XXX XXXX"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message *</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message…"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Cancel
            </Dialog.Close>
            <button
              onClick={submit}
              disabled={!phone.trim() || !message.trim() || send.isPending}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {send.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
