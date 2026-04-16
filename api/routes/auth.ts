import { Router, type Request, type Response } from 'express'
import { issueToken, verifyPassword } from '../auth/simpleToken.js'

const router = Router()

router.post(
  '/simple/login',
  async (req: Request, res: Response): Promise<void> => {
    const password =
      typeof req.body?.password === 'string' ? req.body.password : ''

    if (!verifyPassword(password)) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    res.status(200).json({
      success: true,
      data: { token: issueToken() },
    })
  },
)

export default router
