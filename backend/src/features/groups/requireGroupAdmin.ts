import { asyncHandler } from '../../lib/middleware/async'
import { AppError } from '../../lib/errors'
import { parseIdParam } from '../../lib/params'
import { query } from '../../db/pool'

// Must run after requireAuth (needs req.userId). Confirms the caller is the
// admin of the group named by :id (or :groupId) before letting the route run.
export const requireGroupAdmin = asyncHandler(async (req, _res, next) => {
  const groupId = parseIdParam(req.params.id ?? req.params.groupId)
  const { rows } = await query<{ admin_user_id: number }>(
    `SELECT admin_user_id FROM groups WHERE id = $1`,
    [groupId],
  )
  const group = rows[0]
  if (!group) throw AppError.notFound('Group not found')
  if (group.admin_user_id !== req.userId) throw AppError.forbidden('Admin privileges required')
  next()
})
