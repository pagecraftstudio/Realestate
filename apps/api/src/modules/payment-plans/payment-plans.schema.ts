import { z } from 'zod'

const INSTALLMENT_STATUSES = [
  'UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED',
] as const

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'] as const
const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'] as const

// ─── Payment Plan ─────────────────────────────────────────────────────────────

export const createPaymentPlanSchema = z.object({
  dealId:            z.string().cuid(),
  totalAmount:       z.number().positive(),
  downPayment:       z.number().min(0),
  handoverAmount:    z.number().min(0).default(0),
  installmentCount:  z.number().int().positive().max(360),
  frequencyMonths:   z.number().int().positive().max(12).default(1),
  startDate:         z.string().datetime(),
  notes:             z.string().max(2000).optional(),
})

export type CreatePaymentPlanInput = z.infer<typeof createPaymentPlanSchema>

export const updatePaymentPlanSchema = z.object({
  notes:         z.string().max(2000).optional(),
  handoverAmount: z.number().min(0).optional(),
})

export type UpdatePaymentPlanInput = z.infer<typeof updatePaymentPlanSchema>

// ─── Installment ──────────────────────────────────────────────────────────────

export const updateInstallmentSchema = z.object({
  dueDate: z.string().datetime().optional(),
  amount:  z.number().positive().optional(),
  notes:   z.string().max(2000).optional(),
  status:  z.enum(INSTALLMENT_STATUSES).optional(),
})

export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>

export const listInstallmentsQuerySchema = z.object({
  dealId:  z.string().cuid().optional(),
  status:  z.enum(INSTALLMENT_STATUSES).optional(),
  page:    z.coerce.number().int().positive().default(1),
  limit:   z.coerce.number().int().positive().max(100).default(50),
})

export type ListInstallmentsQuery = z.infer<typeof listInstallmentsQuerySchema>

// ─── Payment ──────────────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  dealId:          z.string().cuid(),
  installmentId:   z.string().cuid().optional(),
  amount:          z.number().positive(),
  method:          z.enum(PAYMENT_METHODS).default('BANK_TRANSFER'),
  referenceNumber: z.string().max(255).optional(),
  receiptUrl:      z.string().url().optional(),
  paidAt:          z.string().datetime(),
  notes:           z.string().max(2000).optional(),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

export const listPaymentsQuerySchema = z.object({
  dealId:        z.string().cuid().optional(),
  installmentId: z.string().cuid().optional(),
  status:        z.enum(PAYMENT_STATUSES).optional(),
  page:          z.coerce.number().int().positive().default(1),
  limit:         z.coerce.number().int().positive().max(100).default(20),
})

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>
