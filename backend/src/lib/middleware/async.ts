import type { NextFunction, Request, RequestHandler, Response } from 'express'

// Express 4 does not forward errors thrown in async handlers automatically.
// This wrapper catches a rejected promise and passes it to the error middleware.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
