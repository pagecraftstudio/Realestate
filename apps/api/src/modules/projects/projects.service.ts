import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsQuery,
} from './projects.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function projectSelect() {
  return {
    id: true,
    organizationId: true,
    name: true,
    developer: true,
    description: true,
    propertyType: true,
    status: true,
    address: true,
    city: true,
    district: true,
    country: true,
    lat: true,
    lng: true,
    startingPrice: true,
    amenities: true,
    imageUrls: true,
    videoUrls: true,
    completionDate: true,
    deliveryDate: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        buildings: true,
        units: true,
      },
    },
  } as const
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createProject(actor: AuthUser, data: CreateProjectInput) {
  return prisma.project.create({
    data: {
      organizationId: actor.organizationId,
      ...data,
      startingPrice: data.startingPrice ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      completionDate: data.completionDate ? new Date(data.completionDate) : undefined,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
    },
    select: projectSelect(),
  })
}

export async function listProjects(actor: AuthUser, query: ListProjectsQuery) {
  const { page, limit, status, propertyType, search, city } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(status && { status }),
    ...(propertyType && { propertyType }),
    ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { developer: { contains: search, mode: 'insensitive' as const } },
        { city: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: projectSelect(),
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ])

  return {
    data: projects,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

export async function getProject(actor: AuthUser, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: {
      ...projectSelect(),
      buildings: {
        select: {
          id: true,
          name: true,
          buildingNumber: true,
          floorsCount: true,
          _count: { select: { units: true } },
        },
        orderBy: { name: 'asc' },
      },
      paymentPlans: {
        select: {
          id: true,
          name: true,
          downPaymentPct: true,
          installmentCount: true,
          installmentFrequencyMonths: true,
        },
      },
    },
  })

  if (!project) throw new NotFoundError('Project not found')
  return project
}

export async function updateProject(
  actor: AuthUser,
  projectId: string,
  data: UpdateProjectInput,
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!existing) throw new NotFoundError('Project not found')

  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...data,
      startingPrice: data.startingPrice ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      completionDate: data.completionDate ? new Date(data.completionDate) : undefined,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
    },
    select: projectSelect(),
  })
}

export async function deleteProject(actor: AuthUser, projectId: string) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true, _count: { select: { units: true } } },
  })
  if (!existing) throw new NotFoundError('Project not found')

  // Block delete if units exist — use status change instead
  if (existing._count.units > 0) {
    const err = new Error('Cannot delete project with existing units. Change status instead.')
    ;(err as any).statusCode = 409
    throw err
  }

  await prisma.project.delete({ where: { id: projectId } })
  return { success: true }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getProjectStats(actor: AuthUser, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: actor.organizationId },
    select: { id: true },
  })
  if (!project) throw new NotFoundError('Project not found')

  const unitStats = await prisma.unit.groupBy({
    by: ['status'],
    where: { projectId, organizationId: actor.organizationId },
    _count: { _all: true },
    _sum: { price: true },
  })

  const statsMap = Object.fromEntries(
    unitStats.map((s) => [s.status, { count: s._count._all, totalPrice: s._sum.price }]),
  )

  return {
    projectId,
    units: {
      available: statsMap['AVAILABLE'] ?? { count: 0, totalPrice: null },
      reserved: statsMap['RESERVED'] ?? { count: 0, totalPrice: null },
      sold: statsMap['SOLD'] ?? { count: 0, totalPrice: null },
      onHold: statsMap['ON_HOLD'] ?? { count: 0, totalPrice: null },
      total: unitStats.reduce((sum, s) => sum + s._count._all, 0),
    },
  }
}
