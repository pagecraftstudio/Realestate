'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DealDetailPanel } from '@/components/modules/deals/deal-detail-panel'
import { RecordPaymentDialog } from '@/components/modules/payments/record-payment-dialog'
import { useState } from 'react'
import { useDeal } from '@/lib/hooks/use-deals'

interface Props { dealId: string }

export function DealDetailClient({ dealId }: Props) {
  const { data: deal } = useDeal(dealId)
  const [showPay, setShowPay] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/deals"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Deal {deal ? `— ${deal.customer.fullName}` : ''}
            </h1>
            {deal && (
              <p className="text-sm text-muted-foreground">
                Unit {deal.unit.unitNumber} · {deal.unit.project.name}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowPay(true)}
          className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Record Payment
        </button>
      </div>

      <DealDetailPanel dealId={dealId} />

      {showPay && deal && (
        <RecordPaymentDialog
          dealId={dealId}
          onClose={() => setShowPay(false)}
        />
      )}
    </div>
  )
}
