import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError, ErrorCodes } from '../errors'
import { logger } from '../logger'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: ErrorCodes.NOT_FOUND, message: 'Resource not found' } })
}

// Express identifies an error handler by its four arguments — keep all four.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: err.flatten(),
      },
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }

  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: { code: ErrorCodes.INTERNAL, message: 'Internal server error' } })
}
