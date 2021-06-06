import { Context } from 'koa'
import * as tweetnacl from 'tweetnacl'

export interface VerifyResult {
  publicKey: Buffer
}

export function verifyPubkeyReq(ctx: Context): VerifyResult | null {
  const hostPubkey = Buffer.from(ctx.headers['x-bacchus-id-pubkey'], 'base64')
  const reqTimestamp = parseInt(ctx.headers['x-bacchus-id-timestamp'], 10)
  const signature = Buffer.from(ctx.headers['x-bacchus-id-signature'], 'base64')

  if (
    hostPubkey.length !== tweetnacl.sign.publicKeyLength ||
    Number.isNaN(reqTimestamp) ||
    signature.length !== tweetnacl.sign.signatureLength
  ) {
    // bad signature info
    return null
  }

  const now = Date.now()
  if (Math.abs(now / 1000 - reqTimestamp) > 30) {
    // time drift
    return null
  }

  const rawBody = ctx.request.rawBody
  const msgText = String(reqTimestamp) + rawBody
  const message = Buffer.from(msgText, 'utf8')
  if (!tweetnacl.sign.detached.verify(message, signature, hostPubkey)) {
    return null
  }

  return { publicKey: hostPubkey }
}
