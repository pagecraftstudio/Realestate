'use client'
import Link from 'next/link'
import { ArrowLeft, Phone, MessageCircle, Mail, MapPin } from 'lucide-react'
import { useCustomer } from '@/lib/hooks/use-customers'
import { AgentAvatar } from '@/components/shared/agent-avatar'
import { StatusBadge } from '@/components/shared/status-badge'

const fmt = (n: string | null, currency = 'EGP') =>
  n ? new Intl.NumberFormat('en-EG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n)) : '—'

export function CustomerDetailClient({ id }: { id: string }) {
  const { data: customer, isLoading } = useCustomer(id)

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (!customer) return <p className="text-muted-foreground">Customer not found</p>

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{customer.fullName}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-muted-foreground">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-4 w-4" /> {customer.phone}
                </a>
              )}
              {customer.whatsapp && (
                <a href={`https://wa.me/${customer.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-700">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-foreground">
                  <Mail className="h-4 w-4" /> {customer.email}
                </a>
              )}
              {(customer.city || customer.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {[customer.city, customer.country].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
          <AgentAvatar agent={customer.assignedAgent} showName size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Details</p>
            {customer.nationality && <InfoRow label="Nationality">{customer.nationality}</InfoRow>}
            {customer.idNumber && <InfoRow label="ID/Passport">{customer.idNumber}</InfoRow>}
            {customer.address && <InfoRow label="Address">{customer.address}</InfoRow>}
            {(customer.budgetMin || customer.budgetMax) && (
              <InfoRow label="Budget">{fmt(customer.budgetMin)} – {fmt(customer.budgetMax)}</InfoRow>
            )}
          </div>
          {customer.lead && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">From Lead</p>
              <Link href={`/leads/${customer.lead.id}`} className="text-sm text-indigo-600 hover:underline flex items-center gap-2">
                View original lead
                <StatusBadge value={customer.lead.status} />
              </Link>
            </div>
          )}
        </div>

        {/* Deals */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Deals</p>
            {customer.deals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deals yet</p>
            ) : (
              <div className="space-y-2">
                {customer.deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Unit {d.unit.unitNumber} — {d.unit.project.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.pipelineStage.replace(/_/g,' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {fmt(d.dealValue)}
                      </span>
                      <StatusBadge value={d.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground text-right">{children}</span>
    </div>
  )
}
