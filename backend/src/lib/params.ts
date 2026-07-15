import { z } from 'zod'
import { AppError } from './errors'

const idSchema = z.coerce.number().int().positive()

/** Parse a numeric route param, throwing a clean 400 if it isn't a positive int. */
export function parseIdParam(raw: string | undefined): number {
  const result = idSchema.safeParse(raw)
  if (!result.success) throw AppError.badRequest('Invalid id parameter')
  return result.data
}
