import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../auth/simpleToken.js'

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''

  if (!token || !verifyToken(token)) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  next()
}

