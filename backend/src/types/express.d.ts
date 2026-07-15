// Augments Express's Request so authenticated handlers can read req.userId,
// which requireAuth sets after verifying the JWT.
declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

export {}
