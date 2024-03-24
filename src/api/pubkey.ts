import type { Context } from 'koa';
import tweetnacl from 'tweetnacl';

export class SignatureError extends Error {
  constructor() {
    super('signature verification failed');
  }
}

export interface VerifyResult {
  publicKey: Buffer;
}

export function verifyPubkeyReq(ctx: Context): VerifyResult {
  const hostPubkey = Buffer.from(String(ctx.headers['x-bacchus-id-pubkey']), 'base64');
  const reqTimestamp = parseInt(String(ctx.headers['x-bacchus-id-timestamp']), 10);
  const signature = Buffer.from(String(ctx.headers['x-bacchus-id-signature']), 'base64');

  if (
    hostPubkey.length !== tweetnacl.sign.publicKeyLength
    || Number.isNaN(reqTimestamp)
    || signature.length !== tweetnacl.sign.signatureLength
  ) {
    // bad signature info
    throw new SignatureError();
  }

  const now = Date.now();
  if (Math.abs(now / 1000 - reqTimestamp) > 30) {
    // time drift
    throw new SignatureError();
  }

  const rawBody = ctx.request.rawBody;
  const msgText = String(reqTimestamp) + rawBody;
  const message = Buffer.from(msgText, 'utf8');
  if (!tweetnacl.sign.detached.verify(message, signature, hostPubkey)) {
    throw new SignatureError();
  }

  return { publicKey: hostPubkey };
}
