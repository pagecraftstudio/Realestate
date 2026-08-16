import { prisma } from '../../lib/prisma.js'
import {
  uploadFile,
  getPresignedDownloadUrl,
  deleteFile,
  validateMimeType,
  validateFileSize,
  generateStorageKey,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '../../lib/storage.js'
import type { AuthUser } from '../../types/auth.js'
import type {
  UploadDocumentInput,
  ListDocumentsQuery,
  UpdateDocumentInput,
  DownloadQuery,
} from './documents.schema.js'
import { DocumentRelatedType } from '@prisma/client'

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class BadRequestError extends Error {
  readonly statusCode = 400
  constructor(msg: string) { super(msg); this.name = 'BadRequestError' }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

// ─── Select shape ─────────────────────────────────────────────────────────────

function docSelect() {
  return {
    id:             true,
    organizationId: true,
    relatedType:    true,
    relatedId:      true,
    name:           true,
    fileType:       true,
    fileSizeBytes:  true,
    uploadedById:   true,
    notes:          true,
    createdAt:      true,
    // storageKey intentionally excluded from list responses
  } as const
}

// ─── Ownership check ──────────────────────────────────────────────────────────

async function assertRelatedEntityExists(
  actor: AuthUser,
  relatedType: DocumentRelatedType,
  relatedId: string,
): Promise<void> {
  const orgId = actor.organizationId

  switch (relatedType) {
    case 'LEAD': {
      const r = await prisma.lead.findFirst({ where: { id: relatedId, organizationId: orgId } })
      if (!r) throw new NotFoundError('Lead not found')
      break
    }
    case 'CUSTOMER': {
      const r = await prisma.customer.findFirst({ where: { id: relatedId, organizationId: orgId } })
      if (!r) throw new NotFoundError('Customer not found')
      break
    }
    case 'DEAL': {
      const r = await prisma.deal.findFirst({ where: { id: relatedId, organizationId: orgId } })
      if (!r) throw new NotFoundError('Deal not found')
      break
    }
    case 'RESERVATION': {
      const r = await prisma.reservation.findFirst({ where: { id: relatedId, organizationId: orgId } })
      if (!r) throw new NotFoundError('Reservation not found')
      break
    }
    case 'UNIT': {
      const r = await prisma.unit.findFirst({ where: { id: relatedId, organizationId: orgId } })
      if (!r) throw new NotFoundError('Unit not found')
      break
    }
    case 'PROJECT': {
      const r = await prisma.project.findFirst({ where: { id: relatedId, organizationId: orgId } })
      if (!r) throw new NotFoundError('Project not found')
      break
    }
    default: {
      throw new BadRequestError(`Unknown relatedType: ${relatedType}`)
    }
  }
}

async function findDocumentOrThrow(id: string, organizationId: string) {
  const doc = await prisma.document.findFirst({
    where: { id, organizationId },
  })
  if (!doc) throw new NotFoundError(`Document ${id} not found`)
  return doc
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadDocument(
  actor: AuthUser,
  input: UploadDocumentInput,
  fileBuffer: Buffer,
  mimeType: string,
  originalFilename: string,
): Promise<{ id: string; name: string; fileType: string; fileSizeBytes: number }> {
  // Validate MIME
  if (!validateMimeType(mimeType)) {
    throw new BadRequestError(
      `File type "${mimeType}" not allowed. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
    )
  }

  // Validate size
  if (!validateFileSize(fileBuffer.byteLength)) {
    const mb = (MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)
    throw new BadRequestError(`File exceeds maximum size of ${mb} MB`)
  }

  // Verify related entity belongs to org
  await assertRelatedEntityExists(actor, input.relatedType as DocumentRelatedType, input.relatedId)

  // Generate storage key scoped to org
  const storageKey = generateStorageKey(
    actor.organizationId,
    input.relatedType,
    input.relatedId,
    originalFilename,
  )

  // Upload to S3-compatible storage
  const result = await uploadFile({
    key: storageKey,
    body: fileBuffer,
    mimeType,
    organizationId: actor.organizationId,
  })

  // Persist metadata in DB
  const doc = await prisma.document.create({
    data: {
      organizationId: actor.organizationId,
      relatedType:    input.relatedType as DocumentRelatedType,
      relatedId:      input.relatedId,
      name:           input.name,
      fileUrl:        storageKey,   // storageKey, NOT public URL
      fileType:       result.mimeType,
      fileSizeBytes:  result.sizeBytes,
      uploadedById:   actor.userId,
      notes:          input.notes ?? null,
    },
    select: {
      id:            true,
      name:          true,
      fileType:      true,
      fileSizeBytes: true,
    },
  })

  return doc
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listDocuments(actor: AuthUser, query: ListDocumentsQuery) {
  const { page, limit, relatedType, relatedId } = query
  const skip = (page - 1) * limit

  const where = {
    organizationId: actor.organizationId,
    ...(relatedType ? { relatedType: relatedType as DocumentRelatedType } : {}),
    ...(relatedId   ? { relatedId }   : {}),
  }

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: docSelect(),
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
  ])

  return {
    items,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

// ─── Get one (no signed URL — use /download for that) ─────────────────────────

export async function getDocument(actor: AuthUser, id: string) {
  const doc = await prisma.document.findFirst({
    where: { id, organizationId: actor.organizationId },
    select: docSelect(),
  })
  if (!doc) throw new NotFoundError(`Document ${id} not found`)
  return doc
}

// ─── Generate signed download URL ─────────────────────────────────────────────

export async function getDocumentDownloadUrl(
  actor: AuthUser,
  id: string,
  query: DownloadQuery,
): Promise<{ url: string; expiresIn: number }> {
  const doc = await findDocumentOrThrow(id, actor.organizationId)

  const url = await getPresignedDownloadUrl(doc.fileUrl, query.expiresIn)
  return { url, expiresIn: query.expiresIn }
}

// ─── Update metadata ──────────────────────────────────────────────────────────

export async function updateDocument(
  actor: AuthUser,
  id: string,
  input: UpdateDocumentInput,
) {
  await findDocumentOrThrow(id, actor.organizationId)

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(input.name  !== undefined ? { name: input.name }   : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    select: docSelect(),
  })

  return updated
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDocument(actor: AuthUser, id: string): Promise<void> {
  const doc = await findDocumentOrThrow(id, actor.organizationId)

  // Delete from storage first; if S3 fails, don't remove DB record
  try {
    await deleteFile(doc.fileUrl)
  } catch (err) {
    // Log but don't expose storage errors — DB record stays for audit
    console.error(`[documents] Failed to delete storage key ${doc.fileUrl}:`, err)
    throw new Error('Failed to delete file from storage. Document record preserved.')
  }

  await prisma.document.delete({ where: { id } })
}

// ─── List for a specific entity (convenience) ──────────────────────────────────

export async function listDocumentsForEntity(
  actor: AuthUser,
  relatedType: string,
  relatedId: string,
) {
  await assertRelatedEntityExists(actor, relatedType as DocumentRelatedType, relatedId)

  return prisma.document.findMany({
    where: {
      organizationId: actor.organizationId,
      relatedType:    relatedType as DocumentRelatedType,
      relatedId,
    },
    select: docSelect(),
    orderBy: { createdAt: 'desc' },
  })
}
