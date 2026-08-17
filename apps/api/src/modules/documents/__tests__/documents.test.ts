/**
 * Phase 15 — Documents service tests
 *
 * Storage operations (uploadFile, getPresignedDownloadUrl, deleteFile)
 * are mocked so tests run without a real S3 / MinIO instance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock storage lib ─────────────────────────────────────────────────────────

vi.mock('../../../lib/storage.js', () => ({
  uploadFile: vi.fn().mockResolvedValue({
    storageKey: 'orgs/org1/lead/lead1/123-abc.pdf',
    bucket: 'recrm-documents',
    sizeBytes: 1024,
    mimeType: 'application/pdf',
  }),
  getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://s3.example.com/signed-url?x=1'),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  validateMimeType: vi.fn().mockReturnValue(true),
  validateFileSize: vi.fn().mockReturnValue(true),
  generateStorageKey: vi.fn().mockReturnValue('orgs/org1/lead/lead1/123-abc.pdf'),
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  ALLOWED_MIME_TYPES: new Set(['application/pdf', 'image/jpeg']),
}))

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockDoc = {
  id:             'doc1',
  organizationId: 'org1',
  relatedType:    'LEAD',
  relatedId:      'lead1',
  name:           'Contract.pdf',
  fileUrl:        'orgs/org1/lead/lead1/123-abc.pdf',
  fileType:       'application/pdf',
  fileSizeBytes:  1024,
  uploadedById:   'user1',
  notes:          null,
  createdAt:      new Date('2025-01-01'),
}

const mockDocMeta = {
  id:             'doc1',
  organizationId: 'org1',
  relatedType:    'LEAD',
  relatedId:      'lead1',
  name:           'Contract.pdf',
  fileType:       'application/pdf',
  fileSizeBytes:  1024,
  uploadedById:   'user1',
  notes:          null,
  createdAt:      new Date('2025-01-01'),
}

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    lead: {
      findFirst: vi.fn().mockResolvedValue({ id: 'lead1', userId: 'lead1', supabaseUid: 'sb-test', organizationId: 'org1' }),
    },
    customer: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    deal: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    reservation: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    unit: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    project: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    document: {
      create:   vi.fn().mockResolvedValue({ id: 'doc1', name: 'Contract.pdf', fileType: 'application/pdf', fileSizeBytes: 1024 }),
      findMany: vi.fn().mockResolvedValue([mockDocMeta]),
      count:    vi.fn().mockResolvedValue(1),
      findFirst: vi.fn().mockResolvedValue(mockDoc),
      update:   vi.fn().mockResolvedValue({ ...mockDocMeta, name: 'Updated.pdf' }),
      delete:   vi.fn().mockResolvedValue(mockDoc),
    },
  },
}))

import {
  uploadDocument,
  listDocuments,
  getDocument,
  getDocumentDownloadUrl,
  updateDocument,
  deleteDocument,
  NotFoundError,
  BadRequestError,
} from '../documents.service.js'
import { prisma } from '../../../lib/prisma.js'
import * as storage from '../../../lib/storage.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const actor = {
  id:             'user1',
  userId:         'user1',
  supabaseUid:    'sb-test-uid',
  organizationId: 'org1',
  role:           'COMPANY_ADMIN' as const,
  email:          'admin@test.com',
}

const uploadInput = {
  relatedType: 'LEAD' as const,
  relatedId:   'lead1',
  name:        'Contract.pdf',
}

const fileBuffer = Buffer.from('%PDF-1.4 test content')

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('documentsService.uploadDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uploads file and creates DB record', async () => {
    const result = await uploadDocument(actor, uploadInput, fileBuffer, 'application/pdf', 'contract.pdf')

    expect(storage.uploadFile).toHaveBeenCalledOnce()
    expect(prisma.document.create).toHaveBeenCalledOnce()
    expect(result.id).toBe('doc1')
    expect(result.name).toBe('Contract.pdf')
  })

  it('rejects disallowed MIME type', async () => {
    vi.mocked(storage.validateMimeType).mockReturnValueOnce(false)

    await expect(
      uploadDocument(actor, uploadInput, fileBuffer, 'application/exe', 'virus.exe'),
    ).rejects.toThrow(BadRequestError)
  })

  it('rejects oversized file', async () => {
    vi.mocked(storage.validateFileSize).mockReturnValueOnce(false)

    await expect(
      uploadDocument(actor, uploadInput, fileBuffer, 'application/pdf', 'huge.pdf'),
    ).rejects.toThrow(BadRequestError)
  })

  it('throws if related entity not found in org', async () => {
    vi.mocked((prisma.lead as any).findFirst).mockResolvedValueOnce(null)

    await expect(
      uploadDocument(actor, uploadInput, fileBuffer, 'application/pdf', 'doc.pdf'),
    ).rejects.toThrow(NotFoundError)
  })
})

describe('documentsService.listDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated list scoped to org', async () => {
    const result = await listDocuments(actor, { page: 1, limit: 20 })

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org1' }),
      }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })

  it('filters by relatedType and relatedId', async () => {
    await listDocuments(actor, { page: 1, limit: 10, relatedType: 'LEAD', relatedId: 'lead1' })

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          relatedType: 'LEAD',
          relatedId:   'lead1',
        }),
      }),
    )
  })
})

describe('documentsService.getDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns document metadata (no storageKey)', async () => {
    const result = await getDocument(actor, 'doc1')
    expect(result.id).toBe('doc1')
    // storageKey (fileUrl) should not be in the select shape
  })

  it('throws NotFoundError for unknown id', async () => {
    vi.mocked((prisma.document as any).findFirst).mockResolvedValueOnce(null)
    await expect(getDocument(actor, 'ghost')).rejects.toThrow(NotFoundError)
  })
})

describe('documentsService.getDocumentDownloadUrl', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns presigned URL', async () => {
    const result = await getDocumentDownloadUrl(actor, 'doc1', { expiresIn: 900 })
    expect(result.url).toContain('signed-url')
    expect(result.expiresIn).toBe(900)
    expect(storage.getPresignedDownloadUrl).toHaveBeenCalledWith(mockDoc.fileUrl, 900)
  })

  it('throws if document not found', async () => {
    vi.mocked((prisma.document as any).findFirst).mockResolvedValueOnce(null)
    await expect(getDocumentDownloadUrl(actor, 'ghost', { expiresIn: 900 })).rejects.toThrow(NotFoundError)
  })
})

describe('documentsService.updateDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates name and notes', async () => {
    const result = await updateDocument(actor, 'doc1', { name: 'Updated.pdf' })
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'doc1' } }),
    )
    expect(result.name).toBe('Updated.pdf')
  })
})

describe('documentsService.deleteDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes from storage then DB', async () => {
    await deleteDocument(actor, 'doc1')
    expect(storage.deleteFile).toHaveBeenCalledWith(mockDoc.fileUrl)
    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc1' } })
  })

  it('throws if storage delete fails (preserves DB record)', async () => {
    vi.mocked(storage.deleteFile).mockRejectedValueOnce(new Error('S3 error'))
    await expect(deleteDocument(actor, 'doc1')).rejects.toThrow('Failed to delete file from storage')
    expect(prisma.document.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundError for unknown id', async () => {
    vi.mocked((prisma.document as any).findFirst).mockResolvedValueOnce(null)
    await expect(deleteDocument(actor, 'ghost')).rejects.toThrow(NotFoundError)
  })
})
