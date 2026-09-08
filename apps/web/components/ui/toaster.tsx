'use client'

import * as Toast from '@radix-ui/react-toast'
import { useToastStore } from '@/stores/toast.store'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = {
  success: <CheckCircle size={16} className="text-green-500" />,
  error:   <AlertCircle size={16} className="text-red-500" />,
  info:    <Info        size={16} className="text-indigo-500" />,
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) dismiss(t.id) }}
          duration={t.duration ?? 4000}
          className={cn(
            'bg-card border border-border rounded-lg shadow-lg p-4',
            'flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]',
            'data-[state=open]:animate-fade-in',
          )}
        >
          <div className="mt-0.5 shrink-0">{ICONS[t.type ?? 'info']}</div>
          <div className="flex-1 min-w-0">
            {t.title && (
              <Toast.Title className="text-sm font-medium text-foreground">{t.title}</Toast.Title>
            )}
            {t.description && (
              <Toast.Description className="text-xs text-muted-foreground mt-0.5">
                {t.description}
              </Toast.Description>
            )}
          </div>
          <Toast.Close
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </Toast.Close>
        </Toast.Root>
      ))}

      <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 z-[9999]" />
    </Toast.Provider>
  )
}
