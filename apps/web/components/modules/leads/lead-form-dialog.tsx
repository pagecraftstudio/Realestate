'use client'
import { useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import { useCreateLead, useUpdateLead } from '@/lib/hooks/use-leads'
import type { Lead } from '@/lib/types'

const SOURCES = [
  'WEBSITE','FACEBOOK','INSTAGRAM','WHATSAPP','GOOGLE_ADS',
  'PROPERTY_PORTAL','REFERRAL','PHONE','WALK_IN','MANUAL','IMPORT','OTHER',
]
const TEMPERATURES = ['HOT','WARM','COLD']
const STATUSES = ['NEW','CONTACTED','QUALIFIED','UNQUALIFIED','VIEWING_SCHEDULED','VIEWING_COMPLETED','NEGOTIATION','RESERVED','WON','LOST']
const PROPERTY_TYPES = ['RESIDENTIAL','COMMERCIAL','ADMINISTRATIVE','RETAIL','LAND','OTHER']
const PURPOSES = ['OWN_USE','INVESTMENT','RENTAL','RESALE','UNDECIDED']
const FINANCING = ['CASH','MORTGAGE','INSTALLMENT','UNDECIDED']

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  lead?: Lead | null
}

type FormValues = {
  fullName: string; phone: string; whatsapp: string; email: string
  country: string; city: string; source: string; status: string; temperature: string
  budgetMin: string; budgetMax: string; preferredType: string
  preferredLocation: string; bedrooms: string; purchasePurpose: string
  financingPref: string; notes: string; nextFollowupAt: string
}

export function LeadFormDialog({ open, onOpenChange, lead }: Props) {
  const isEdit = !!lead
  const create = useCreateLead()
  const update = useUpdateLead(lead?.id ?? '')

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      source: 'MANUAL', status: 'NEW', temperature: 'COLD',
    },
  })

  useEffect(() => {
    if (lead) {
      reset({
        fullName: lead.fullName,
        phone: lead.phone ?? '',
        whatsapp: lead.whatsapp ?? '',
        email: lead.email ?? '',
        country: lead.country ?? '',
        city: lead.city ?? '',
        source: lead.source,
        status: lead.status,
        temperature: lead.temperature,
        budgetMin: lead.budgetMin ?? '',
        budgetMax: lead.budgetMax ?? '',
        preferredType: lead.preferredType ?? '',
        preferredLocation: lead.preferredLocation ?? '',
        bedrooms: lead.bedrooms?.toString() ?? '',
        purchasePurpose: lead.purchasePurpose ?? '',
        financingPref: lead.financingPref ?? '',
        notes: lead.notes ?? '',
        nextFollowupAt: lead.nextFollowupAt ? lead.nextFollowupAt.slice(0, 16) : '',
      })
    } else {
      reset({ source: 'MANUAL', status: 'NEW', temperature: 'COLD' })
    }
  }, [lead, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
      budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
      bedrooms: values.bedrooms ? Number(values.bedrooms) : undefined,
      nextFollowupAt: values.nextFollowupAt ? new Date(values.nextFollowupAt).toISOString() : undefined,
      phone: values.phone || undefined,
      whatsapp: values.whatsapp || undefined,
      email: values.email || undefined,
      preferredType: values.preferredType || undefined,
      purchasePurpose: values.purchasePurpose || undefined,
      financingPref: values.financingPref || undefined,
    }

    if (isEdit) {
      await update.mutateAsync(payload)
    } else {
      await create.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <Dialog.Title className="font-semibold text-foreground">
              {isEdit ? 'Edit Lead' : 'New Lead'}
            </Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
            {/* Contact */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Info</p>
            <div>
              <label className={labelCls}>Full Name *</label>
              <input {...register('fullName', { required: true })} className={inputCls} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Phone</label>
                <input {...register('phone')} className={inputCls} placeholder="+20 10 0000 0000" />
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input {...register('whatsapp')} className={inputCls} placeholder="+20 10 0000 0000" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input {...register('email')} type="email" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Country</label>
                <input {...register('country')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input {...register('city')} className={inputCls} />
              </div>
            </div>

            {/* Source + Status */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Lead Info</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Source</label>
                <select {...register('source')} className={inputCls}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select {...register('status')} className={inputCls}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Temperature</label>
                <select {...register('temperature')} className={inputCls}>
                  {TEMPERATURES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Requirements */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Requirements</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Budget Min</label>
                <input {...register('budgetMin')} type="number" className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Budget Max</label>
                <input {...register('budgetMax')} type="number" className={inputCls} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Property Type</label>
                <select {...register('preferredType')} className={inputCls}>
                  <option value="">Any</option>
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Bedrooms</label>
                <input {...register('bedrooms')} type="number" min="0" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Preferred Location</label>
              <input {...register('preferredLocation')} className={inputCls} placeholder="District, area…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Purpose</label>
                <select {...register('purchasePurpose')} className={inputCls}>
                  <option value="">—</option>
                  {PURPOSES.map((p) => <option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Financing</label>
                <select {...register('financingPref')} className={inputCls}>
                  <option value="">—</option>
                  {FINANCING.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Notes + Follow-up */}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea {...register('notes')} rows={3} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Next Follow-up</label>
              <input {...register('nextFollowupAt')} type="datetime-local" className={inputCls} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Lead'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
