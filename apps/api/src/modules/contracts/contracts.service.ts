import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { ContractStatus, UserRole, Prisma } from '@prisma/client'
import type {
  CreateContractInput,
  UpdateContractInput,
  UpdateContractStatusInput,
  ListContractsQuery,
} from './contracts.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(msg: string) { super(msg); this.name = 'ConflictError' }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.SALES_MANAGER,
]

function agentScope(actor: AuthUser) {
  return actor.role === UserRole.SALES_AGENT ? { agentId: actor.id } : {}
}

/** Valid status transitions */
const TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT:     ['SENT', 'CANCELLED'],
  SENT:      ['SIGNED', 'CANCELLED', 'EXPIRED'],
  SIGNED:    ['ACTIVE', 'CANCELLED'],
  ACTIVE:    ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED:   ['DRAFT'],
}

function assertTransition(from: ContractStatus, to: ContractStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ConflictError(`Cannot transition contract from ${from} to ${to}`)
  }
}

/** Generate contract number: CNT-YYYYMM-#####  */
async function generateContractNumber(orgId: string): Promise<string> {
  const now    = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const lockKey = BigInt('0x' + Buffer.from(orgId).toString('hex').slice(0, 15))

  const count = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`)
    return tx.contract.count({ where: { organizationId: orgId } })
  })

  return `CNT-${yyyymm}-${String(count + 1).padStart(5, '0')}`
}

function contractSelect() {
  return {
    id:             true,
    organizationId: true,
    dealId:         true,
    customerId:     true,
    unitId:         true,
    agentId:        true,
    contractNumber: true,
    contractType:   true,
    status:         true,
    contractDate:   true,
    handoverDate:   true,
    expiresAt:      true,
    signedAt:       true,
    totalValue:     true,
    currency:       true,
    terms:          true,
    notes:          true,
    documentUrl:    true,
    signatureUrl:   true,
    metadata:       true,
    createdAt:      true,
    updatedAt:      true,
    deal: {
      select: { id: true, dealNumber: true, salePrice: true, status: true, pipelineStage: true },
    },
    customer: {
      select: { id: true, fullName: true, phone: true, email: true },
    },
    unit: {
      select: {
        id: true, unitNumber: true, unitType: true, area: true, price: true,
        project:  { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
      },
    },
    agent: {
      select: { id: true, userProfile: { select: { firstName: true, lastName: true } } },
    },
  } as const
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listContracts(actor: AuthUser, q: ListContractsQuery) {
  const where: Prisma.ContractWhereInput = {
    organizationId: actor.organizationId,
    ...agentScope(actor),
    ...(q.customerId   ? { customerId:   q.customerId }   : {}),
    ...(q.dealId       ? { dealId:       q.dealId }       : {}),
    ...(q.agentId      ? { agentId:      q.agentId }      : {}),
    ...(q.status       ? { status:       q.status }       : {}),
    ...(q.contractType ? { contractType: q.contractType } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      select: contractSelect(),
      orderBy: { createdAt: 'desc' },
      skip:  (q.page - 1) * q.limit,
      take:  q.limit,
    }),
    prisma.contract.count({ where }),
  ])

  return {
    data,
    meta: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
  }
}

export async function getContract(actor: AuthUser, id: string) {
  const contract = await prisma.contract.findFirst({
    where: { id, organizationId: actor.organizationId, ...agentScope(actor) },
    select: contractSelect(),
  })
  if (!contract) throw new NotFoundError('Contract not found')
  return contract
}

export async function createContract(actor: AuthUser, data: CreateContractInput) {
  // Resolve deal — must belong to this org
  const deal = await prisma.deal.findFirst({
    where: { id: data.dealId, organizationId: actor.organizationId },
    select: { id: true, customerId: true, unitId: true, agentId: true, status: true },
  })
  if (!deal) throw new NotFoundError('Deal not found')

  // One contract per deal
  const existing = await prisma.contract.findUnique({
    where: { dealId: data.dealId },
    select: { id: true },
  })
  if (existing) throw new ConflictError('A contract already exists for this deal')

  const contractNumber = await generateContractNumber(actor.organizationId)

  return prisma.contract.create({
    data: {
      organizationId: actor.organizationId,
      dealId:         data.dealId,
      customerId:     deal.customerId,
      unitId:         deal.unitId,
      agentId:        deal.agentId,
      contractNumber,
      contractType:   data.contractType,
      contractDate:   data.contractDate  ? new Date(data.contractDate)  : undefined,
      handoverDate:   data.handoverDate  ? new Date(data.handoverDate)  : undefined,
      expiresAt:      data.expiresAt     ? new Date(data.expiresAt)     : undefined,
      totalValue:     data.totalValue,
      currency:       data.currency,
      terms:          data.terms,
      notes:          data.notes,
      documentUrl:    data.documentUrl,
    },
    select: contractSelect(),
  })
}

export async function updateContract(actor: AuthUser, id: string, data: UpdateContractInput) {
  const contract = await prisma.contract.findFirst({
    where: { id, organizationId: actor.organizationId, ...agentScope(actor) },
    select: { id: true, status: true },
  })
  if (!contract) throw new NotFoundError('Contract not found')
  if (['COMPLETED', 'CANCELLED'].includes(contract.status)) {
    throw new ConflictError(`Contract is ${contract.status} and cannot be modified`)
  }

  return prisma.contract.update({
    where:  { id },
    data: {
      ...(data.contractDate ? { contractDate: new Date(data.contractDate) } : {}),
      ...(data.handoverDate ? { handoverDate: new Date(data.handoverDate) } : {}),
      ...(data.expiresAt    ? { expiresAt:    new Date(data.expiresAt) }    : {}),
      ...(data.totalValue   !== undefined ? { totalValue:  data.totalValue }  : {}),
      ...(data.terms        !== undefined ? { terms:       data.terms }       : {}),
      ...(data.notes        !== undefined ? { notes:       data.notes }       : {}),
      ...(data.documentUrl  !== undefined ? { documentUrl: data.documentUrl } : {}),
      ...(data.signatureUrl !== undefined ? { signatureUrl: data.signatureUrl } : {}),
    },
    select: contractSelect(),
  })
}

export async function updateContractStatus(
  actor: AuthUser,
  id: string,
  data: UpdateContractStatusInput,
) {
  const contract = await prisma.contract.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true, status: true },
  })
  if (!contract) throw new NotFoundError('Contract not found')

  // Only admin roles can change status
  if (!ADMIN_ROLES.includes(actor.role as UserRole)) {
    throw new ForbiddenError('Only managers or admins can change contract status')
  }

  assertTransition(contract.status, data.status as ContractStatus)

  const signedAt = data.status === 'SIGNED' ? new Date() : undefined

  return prisma.contract.update({
    where:  { id },
    data: {
      status: data.status as ContractStatus,
      ...(signedAt ? { signedAt } : {}),
    },
    select: contractSelect(),
  })
}

export async function deleteContract(actor: AuthUser, id: string) {
  if (!ADMIN_ROLES.includes(actor.role as UserRole)) {
    throw new ForbiddenError('Only admins can delete contracts')
  }

  const contract = await prisma.contract.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: { id: true, status: true },
  })
  if (!contract) throw new NotFoundError('Contract not found')
  if (['SIGNED', 'ACTIVE', 'COMPLETED'].includes(contract.status)) {
    throw new ConflictError(`Cannot delete a ${contract.status} contract`)
  }

  await prisma.contract.delete({ where: { id } })
  return { success: true }
}
