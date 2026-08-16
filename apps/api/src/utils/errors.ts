import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

interface AppError extends Error {
  statusCode?: number
}

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // Zod validation errors
  if (error instanceof ZodError) {
    reply.status(400).send({
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
    reply.status(appErr.statusCode).send({ error: appErr.message })
    return
  }

  // Fastify validation errors (schema-level)
  const fastifyErr = error as FastifyError
  if (fastifyErr.validation) {
    reply.status(400).send({
      error: 'Validation error',
      details: fastifyErr.validation,
    })
    return
  }

  // Unhandled — log + 500
  request.log.error(error)
  reply.status(500).send({ error: 'Internal server error' })
}
