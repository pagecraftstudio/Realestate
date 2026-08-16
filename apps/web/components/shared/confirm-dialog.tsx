'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  // Support both patterns: onOpenChange (radix style) or onCancel (explicit)
  onOpenChange?: (v: boolean) => void
  onCancel?: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  variant?: 'default' | 'destructive'  // alias for danger
  onConfirm: (() => void) | (() => Promise<void>)
  loading?: boolean
}

export function ConfirmDialog({
  open, onOpenChange, onCancel, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, variant, onConfirm, loading,
}: Props) {
  const isDanger = danger || variant === 'destructive'
  function handleClose() {
    if (onCancel) onCancel()
    else if (onOpenChange) onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange ?? (() => handleClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card border border-border p-6 shadow-xl">
          <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60',
                isDanger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700',
              )}
            >
              {loading ? 'Loading…' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
