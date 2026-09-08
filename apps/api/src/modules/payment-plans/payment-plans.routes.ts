import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  createPaymentPlanSchema,
  updatePaymentPlanSchema,
  updateInstallmentSchema,
  listInstallmentsQuerySchema,
  recordPaymentSchema,
  listPaymentsQuerySchema,
} from './payment-plans.schema.js'
import * as svc from './payment-plans.service.js'

export async function paymentPlansRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT PLANS
  // ═══════════════════════════════════════════════════════════════════════════

  // Create plan for a deal
  fastify.post('/payment-plans', {
    preHandler: [authenticate, requirePermission('payment-plans', 'manage')],
  }, async (req, reply) => {
    const input = createPaymentPlanSchema.parse(req.body)
    const plan = await svc.createPaymentPlan(req.authUser!, input)
    return reply.status(201).send(plan)
  })

  // Get plan by deal
  fastify.get('/deals/:dealId/payment-plan', {
    preHandler: [authenticate, requirePermission('payment-plans', 'manage')],
  }, async (req) => {
    const { dealId } = req.params as { dealId: string }
    return svc.getPaymentPlan(req.authUser!, dealId)
  })

  // Update plan (notes/handover only)
  fastify.patch('/payment-plans/:id', {
    preHandler: [authenticate, requirePermission('payment-plans', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updatePaymentPlanSchema.parse(req.body)
    return svc.updatePaymentPlan(req.authUser!, id, input)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // INSTALLMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // List installments (filterable by deal/status)
  fastify.get('/installments', {
    preHandler: [authenticate, requirePermission('installments', 'manage')],
  }, async (req) => {
    const query = listInstallmentsQuerySchema.parse(req.query)
    return svc.listInstallments(req.authUser!, query)
  })

  // Get one installment
  fastify.get('/installments/:id', {
    preHandler: [authenticate, requirePermission('installments', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getInstallment(req.authUser!, id)
  })

  // Update installment (date/amount/notes/status)
  fastify.patch('/installments/:id', {
    preHandler: [authenticate, requirePermission('installments', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const input = updateInstallmentSchema.parse(req.body)
    return svc.updateInstallment(req.authUser!, id, input)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Record a payment
  fastify.post('/payments', {
    preHandler: [authenticate, requirePermission('payments', 'manage')],
  }, async (req, reply) => {
    const input = recordPaymentSchema.parse(req.body)
    const payment = await svc.recordPayment(req.authUser!, input)
    return reply.status(201).send(payment)
  })

  // List payments
  fastify.get('/payments', {
    preHandler: [authenticate, requirePermission('payments', 'manage')],
  }, async (req) => {
    const query = listPaymentsQuerySchema.parse(req.query)
    return svc.listPayments(req.authUser!, query)
  })

  // Get one payment
  fastify.get('/payments/:id', {
    preHandler: [authenticate, requirePermission('payments', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    return svc.getPayment(req.authUser!, id)
  })

  // Void/refund payment
  fastify.post('/payments/:id/void', {
    preHandler: [authenticate, requirePermission('payments', 'manage')],
  }, async (req) => {
    const { id } = req.params as { id: string }
    const { reason } = (req.body as { reason?: string }) ?? {}
    return svc.voidPayment(req.authUser!, id, reason ?? '')
  })
}
