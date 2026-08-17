import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../types/auth.js'
import { TaskPriority, TaskStatus, UserRole } from '../../lib/enums.js'
import type { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from './tasks.schema.js'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Agents see only tasks assigned to them */
function agentScope(actor: AuthUser) {
  return actor.role === UserRole.SALES_AGENT ? { assigneeId: actor.id } : {}
}

function taskSelect() {
  return {
    id:            true,
    organizationId: true,
    assigneeId:    true,
    createdById:   true,
    relatedType:   true,
    relatedId:     true,
    title:         true,
    description:   true,
    priority:      true,
    status:        true,
    dueAt:         true,
    completedAt:   true,
    createdAt:     true,
    updatedAt:     true,
    assignee: {
      select: {
        id: true,
        userProfile: { select: { firstName: true, lastName: true } },
      },
    },
    createdBy: {
      select: {
        id: true,
        userProfile: { select: { firstName: true, lastName: true } },
      },
    },
  } as const
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createTask(actor: AuthUser, input: CreateTaskInput) {
  // Verify assignee belongs to same org
  const assignee = await prisma.user.findFirst({
    where: { id: input.assigneeId, organizationId: actor.organizationId },
  })
  if (!assignee) throw new NotFoundError('Assignee not found in organization')

  return prisma.task.create({
    data: {
      organizationId: actor.organizationId,
      assigneeId:     input.assigneeId,
      createdById:    actor.id,
      relatedType:    input.relatedType,
      relatedId:      input.relatedId,
      title:          input.title,
      description:    input.description,
      priority:       (input.priority as TaskPriority) ?? TaskPriority.MEDIUM,
      status:         TaskStatus.TODO,
      dueAt:          input.dueAt ? new Date(input.dueAt) : undefined,
    },
    select: taskSelect(),
  })
}

export async function listTasks(actor: AuthUser, query: ListTasksQuery) {
  const scope = agentScope(actor)
  const { page, limit, overdue, dueBefore, ...filters } = query
  const skip = (page - 1) * limit

  const now = new Date()

  const where = {
    organizationId: actor.organizationId,
    ...scope,
    ...(filters.assigneeId  && { assigneeId: filters.assigneeId }),
    ...(filters.status      && { status: filters.status as TaskStatus }),
    ...(filters.priority    && { priority: filters.priority as TaskPriority }),
    ...(filters.relatedType && { relatedType: filters.relatedType }),
    ...(filters.relatedId   && { relatedId: filters.relatedId }),
    ...(overdue             && { dueAt: { lt: now }, status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } }),
    ...(dueBefore           && !overdue && { dueAt: { lte: new Date(dueBefore) } }),
  }

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: taskSelect(),
      skip,
      take: limit,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.task.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getTask(actor: AuthUser, id: string) {
  const scope = agentScope(actor)
  const task = await prisma.task.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
    select: taskSelect(),
  })
  if (!task) throw new NotFoundError('Task not found')
  return task
}

export async function updateTask(actor: AuthUser, id: string, input: UpdateTaskInput) {
  const scope = agentScope(actor)
  const existing = await prisma.task.findFirst({
    where: { id, organizationId: actor.organizationId, ...scope },
  })
  if (!existing) throw new NotFoundError('Task not found')

  // Agents can only update status of their own tasks; cannot reassign
  if (actor.role === UserRole.SALES_AGENT && input.assigneeId !== undefined) {
    throw new ForbiddenError('Agents cannot reassign tasks')
  }

  const completedAt =
    input.status === 'DONE' && existing.status !== TaskStatus.DONE
      ? new Date()
      : input.status && input.status !== 'DONE'
        ? null
        : undefined

  return prisma.task.update({
    where: { id },
    data: {
      ...(input.assigneeId  !== undefined && { assigneeId: input.assigneeId }),
      ...(input.title       !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.priority    !== undefined && { priority: input.priority as TaskPriority }),
      ...(input.status      !== undefined && { status: input.status as TaskStatus }),
      ...(input.dueAt       !== undefined && { dueAt: new Date(input.dueAt) }),
      ...(completedAt !== undefined && { completedAt }),
    },
    select: taskSelect(),
  })
}

export async function deleteTask(actor: AuthUser, id: string) {
  // Only creator, manager, or admin can delete
  const task = await prisma.task.findFirst({
    where: { id, organizationId: actor.organizationId },
  })
  if (!task) throw new NotFoundError('Task not found')

  if (
    actor.role === UserRole.SALES_AGENT &&
    task.createdById !== actor.id &&
    task.assigneeId  !== actor.id
  ) {
    throw new ForbiddenError('Cannot delete this task')
  }

  await prisma.task.delete({ where: { id } })
  return { deleted: true }
}
