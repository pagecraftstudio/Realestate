/**
 * Phase 15 — Documents routes
 *
 * Requires @fastify/multipart for file upload endpoint.
 *
 * Routes:
 *   POST   /documents/upload           — upload file + metadata
 *   GET    /documents                  — list (filter by relatedType/relatedId)
 *   GET    /documents/:id              — get one (metadata only)
 *   GET    /documents/:id/download     — get presigned download URL
 *   PATCH  /documents/:id              — update name/notes
 *   DELETE /documents/:id              — delete file + record
 *   GET    /documents/:relatedType/:relatedId  — all docs for an entity
 */

import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/rbac.js'
import {
  listDocumentsQuerySchema,
  updateDocumentSchema,
  uploadDocumentSchema,
  downloadQuerySchema,
  RELATED_TYPES,
} from './documents.schema.js'
import {
  uploadDocument,
  listDocuments,
  getDocument,
  getDocumentDownloadUrl,
  updateDocument,
  deleteDocument,
  listDocumentsForEntity,
} from './documents.service.js'
import type { AuthUser } from '../../types/auth.js'

export async function documentsRoutes(fastify: FastifyInstance) {
  // ── POST /documents/upload ─────────────────────────────────────────────────
  // Multipart: file field "file" + JSON fields relatedType, relatedId, name, notes
  fastify.post(
    '/upload',
    { preHandler: [authenticate, requirePermission('documents', 'create')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser

      // @fastify/multipart must be registered globally
      const data = await (request as any).file()
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      // Collect file buffer
      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const fileBuffer = Buffer.concat(chunks)
      const mimeType = data.mimetype as string
      const originalFilename: string = data.filename

      // Parse metadata fields from multipart form
      const fields = data.fields ?? {}
      const metaRaw = {
        relatedType: (fields.relatedType as any)?.value ?? '',
        relatedId:   (fields.relatedId as any)?.value ?? '',
        name:        (fields.name as any)?.value ?? originalFilename,
        notes:       (fields.notes as any)?.value,
      }

      const parsed = uploadDocumentSchema.safeParse(metaRaw)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation error',
          issues: parsed.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        })
      }

      const doc = await uploadDocument(actor, parsed.data, fileBuffer, mimeType, originalFilename)
      return reply.status(201).send(doc)
    },
  )

  // ── GET /documents ─────────────────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('documents', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = listDocumentsQuerySchema.parse(request.query)
      return listDocuments(actor, query)
    },
  )

  // ── GET /documents/:id ─────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('documents', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      return getDocument(actor, request.params.id)
    },
  )

  // ── GET /documents/:id/download ────────────────────────────────────────────
  // Returns { url: string, expiresIn: number } — presigned S3 URL
  fastify.get<{ Params: { id: string } }>(
    '/:id/download',
    { preHandler: [authenticate, requirePermission('documents', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const query = downloadQuerySchema.parse(request.query)
      return getDocumentDownloadUrl(actor, request.params.id, query)
    },
  )

  // ── PATCH /documents/:id ───────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('documents', 'update')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const input = updateDocumentSchema.parse(request.body)
      return updateDocument(actor, request.params.id, input)
    },
  )

  // ── DELETE /documents/:id ──────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('documents', 'delete')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      await deleteDocument(actor, request.params.id)
      return reply.status(204).send()
    },
  )

  // ── GET /documents/:relatedType/:relatedId ─────────────────────────────────
  // Convenience: all documents for one entity (e.g. GET /documents/CUSTOMER/abc123)
  fastify.get<{ Params: { relatedType: string; relatedId: string } }>(
    '/:relatedType/:relatedId',
    { preHandler: [authenticate, requirePermission('documents', 'read')] },
    async (request, reply) => {
      const actor = (request as typeof request & { authUser: AuthUser }).authUser
      const { relatedType, relatedId } = request.params

      if (!RELATED_TYPES.includes(relatedType as any)) {
        return reply.status(400).send({
          error: `Invalid relatedType. Must be one of: ${RELATED_TYPES.join(', ')}`,
        })
      }

      return listDocumentsForEntity(actor, relatedType, relatedId)
    },
  )
}
