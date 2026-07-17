import { z } from 'zod'
import { AppError } from './errors'

// Cap at MAX_SAFE_INTEGER: larger values lose JS precision and overflow BIGINT,
// which would otherwise reach Postgres as a numeric-overflow 500 instead of a 400.
const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)

/** Parse a numeric route param, throwing a clean 400 if it isn't a positive int. */
export function parseIdParam(raw: string | undefined): number {
  const result = idSchema.safeParse(raw)
  if (!result.success) throw AppError.badRequest('Invalid id parameter')
  return result.data
}
