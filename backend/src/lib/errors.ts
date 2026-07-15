export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PREDICTION_LOCKED: 'PREDICTION_LOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/** Application error carrying an HTTP status and a stable, machine-readable code. */
export class AppError extends Error {
  readonly status: number
  readonly code: ErrorCode

  constructor(status: number, code: ErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }

  static badRequest(message = 'Bad request') {
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, message)
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, ErrorCodes.UNAUTHORIZED, message)
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(403, ErrorCodes.FORBIDDEN, message)
  }
  static notFound(message = 'Not found') {
    return new AppError(404, ErrorCodes.NOT_FOUND, message)
  }
  static conflict(message = 'Conflict') {
    return new AppError(409, ErrorCodes.CONFLICT, message)
  }
  static locked(message = 'Prediction is locked') {
    return new AppError(409, ErrorCodes.PREDICTION_LOCKED, message)
  }
}
