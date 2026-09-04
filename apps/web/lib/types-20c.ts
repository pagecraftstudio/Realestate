// ─── Phase 20C types ──────────────────────────────────────────────────────────

export type InstallmentStatus = 'PENDING' | 'DUE' | 'OVERDUE' | 'PAID' | 'WAIVED'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE' | 'OTHER'
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'
export type PipelineStage =
  | 'INITIAL_CONTACT'
  | 'NEEDS_ANALYSIS'
  | 'SITE_VISIT'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CONTRACT_SIGNED'
  | 'PAYMENT_PLAN'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

export interface PaymentPlan {
  id: string
  dealId: string
  organizationId: string
  totalAmount: string
  downPayment: string
  downPaymentPct: string
  installmentCount: number
  frequency: string
  startDate: string | null
  notes: string | null
  createdAt: string
  installments?: Installment[]
}

export interface Installment {
  id: string
  paymentPlanId: string
  dealId: string
  organizationId: string
  installmentNumber: number
  dueDate: string
  amount: string
  status: InstallmentStatus
  paidAt: string | null
  paidAmount: string | null
  notes: string | null
  payments?: Payment[]
}

export interface Payment {
  id: string
  dealId: string
  installmentId: string | null
  organizationId: string
  amount: string
  method: PaymentMethod
  referenceNumber: string | null
  receiptUrl: string | null
  paidAt: string
  notes: string | null
  createdAt: string
  deal?: { id: string; dealNumber: string; customer: { fullName: string } }
  installment?: { id: string; installmentNumber: number; dueDate: string } | null
  recordedBy?: { id: string; profile: { firstName: string | null; lastName: string | null } | null }
}

export interface Commission {
  id: string
  dealId: string
  agentId: string
  managerId: string | null
  organizationId: string
  agentRate: string
  managerRate: string | null
  agentAmount: string
  managerAmount: string | null
  totalAmount: string
  status: CommissionStatus
  approvedAt: string | null
  paidAt: string | null
  notes: string | null
  createdAt: string
  deal: { id: string; dealNumber: string; dealValue: string; customer: { fullName: string } }
  agent: { id: string; profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null }
  manager?: { id: string; profile: { firstName: string | null; lastName: string | null } | null } | null
}

export interface DealDetail {
  id: string
  organizationId: string
  dealNumber: string
  customerId: string
  unitId: string
  agentId: string | null
  dealValue: string
  status: string
  pipelineStage: PipelineStage
  signedAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  customer: { id: string; fullName: string; phone: string | null; email: string | null }
  unit: {
    id: string
    unitNumber: string
    unitType: string
    area: string | null
    price: string
    project: { id: string; name: string; city: string | null }
    building: { id: string; name: string } | null
  }
  agent: { id: string; profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null } | null
  paymentPlan: PaymentPlan | null
  installments: Installment[]
  payments: Payment[]
  commission: Commission | null
}
