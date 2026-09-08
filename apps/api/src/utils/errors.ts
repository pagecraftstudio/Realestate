import type { FastifyError, FastifyReply, FastifyRequest, FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

interface AppError extends Error {
  statusCode?: number
}

// Use 'this: FastifyInstance' to satisfy Fastify's setErrorHandler overload signature
// which requires the handler to accept the instance's generic server type.
export function errorHandler(
  this: FastifyInstance,
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // Zod validation errors
  if (error instanceof ZodError) {
    void reply.status(400).send({
      error: 'Validation error',
      issues: error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    })
    return
  }

  // Known app errors with statusCode
  const appErr = error as AppError
  if (appErr.statusCode && appErr.statusCode < 500) {
    void reply.status(appErr.statusCode).send({ error: appErr.message })
    return
  }

  // Fastify validation errors (schema-level)
  const fastifyErr = error as FastifyError
  if (fastifyErr.validation) {
    void reply.status(400).send({
      error: 'Validation error',
      details: fastifyErr.validation,
    })
    return
  }

  // Unhandled — log + 500
  console.error('[errorHandler] unhandled error:', error)
  request.log.error(error)
  void reply.status(500).send({ error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) })
}
