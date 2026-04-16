import crypto from 'crypto'

const base64UrlEncode = (buf: Buffer): string =>
  buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

const base64UrlDecode = (s: string): Buffer => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(b64, 'base64')
}

const timingSafeEqualStr = (a: string, b: string): boolean => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

const getPassword = (): string => process.env.SIMPLE_PASSWORD || 'demo'

export const verifyPassword = (password: string): boolean =>
  timingSafeEqualStr(password, getPassword())

type TokenPayload = {
  exp: number
}

export const issueToken = (): string => {
  const payload: TokenPayload = {
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  }

  const payloadJson = JSON.stringify(payload)
  const payloadPart = base64UrlEncode(Buffer.from(payloadJson, 'utf8'))
  const sig = crypto
    .createHmac('sha256', getPassword())
    .update(payloadPart)
    .digest()
  const sigPart = base64UrlEncode(sig)
  return `${payloadPart}.${sigPart}`
}

export const verifyToken = (token: string): boolean => {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payloadPart, sigPart] = parts

  try {
    const expected = crypto
      .createHmac('sha256', getPassword())
      .update(payloadPart)
      .digest()
    const expectedPart = base64UrlEncode(expected)
    if (!timingSafeEqualStr(sigPart, expectedPart)) return false

    const payload = JSON.parse(
      base64UrlDecode(payloadPart).toString('utf8'),
    ) as TokenPayload
    return typeof payload?.exp === 'number' && Date.now() < payload.exp
  } catch {
    return false
  }
}
