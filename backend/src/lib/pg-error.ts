// Postgres reports a unique-constraint violation with SQLSTATE 23505. We use
// this to turn a race-y "insert and catch" into a clean 409 or a retry.
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  )
}
