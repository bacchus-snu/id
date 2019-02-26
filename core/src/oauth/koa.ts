import * as Koa from 'koa'

import percentEncode from './percent_encode'
import verify from './verify'

function percentDecode(str: string): string {
  let len = str.length
  len -= (str.split('%').length - 1) * 2
  const buf = Buffer.alloc(len)
  let lastIndex = 0
  let bufOffset = 0
  while (true) {
    const prevIndex = lastIndex
    lastIndex = str.indexOf('%', prevIndex)
    if (lastIndex === -1) {
      break
    }
    bufOffset += buf.write(str.substring(prevIndex, lastIndex), bufOffset)
    buf[bufOffset] = parseInt(str.substring(lastIndex + 1, lastIndex + 3), 16)
    bufOffset++
    lastIndex += 3
  }
  bufOffset += buf.write(str.substring(lastIndex), bufOffset)
  return buf.toString('utf8')
}

export interface MiddlewareParams {
  getConsumerSecret(consumerKey: string): Promise<string | undefined>
  getTokenSecret(token: string): Promise<string | undefined>
}

export interface OAuthData {
  consumerKey: string
  oauthToken?: string
  collectedParams: any
}

export default function oauth10a(args: MiddlewareParams): Koa.Middleware {
  return async (ctx, next) => {
    if (ctx.request.body == null) {
      return await next()
    }

    // Preprocess Authorization header
    let authorization: string | undefined = ctx.request.headers.authorization
    if (typeof authorization === 'string') {
      authorization = authorization.trim()
      if (authorization.substring(0, 6).toLowerCase() === 'oauth ') {
        authorization = authorization.substring(6).trim()
      } else {
        authorization = undefined
      }
    }

    // Test and extract body
    let requestParams: { [k: string]: string }
    const testUrlEncoded = ctx.request.is('x-www-form-urlencoded')
    if (testUrlEncoded === null) {
      // No body
      requestParams = ctx.request.query
    } else if (testUrlEncoded === false) {
      // Body is not x-www-form-urlencoded
      return ctx.throw('Body should be form data', 400)
    } else {
      // Has body
      requestParams = ctx.request.body
    }

    const collectedParams: any = {}
    // Percent-encode body
    for (const [k, v] of Object.entries(requestParams)) {
      collectedParams[percentEncode(k)] = percentEncode(v)
    }

    // Parse Authorization header, if there is any
    if (authorization != null) {
      while (true) {
        const eqIndex = authorization.indexOf('="')
        const keyEscaped = authorization.substring(0, eqIndex)
        authorization = authorization.substring(eqIndex + 2)
        const quoteIndex = authorization.indexOf('"')
        const valueEscaped = authorization.substring(0, quoteIndex)
        collectedParams[keyEscaped] = valueEscaped
        if (authorization[quoteIndex + 1] !== ',') {
          break
        }
        authorization = authorization.substring(quoteIndex + 2).trim()
      }
    }

    ctx.assert('oauth_consumer_key' in collectedParams, 400, 'Consumer Key should be given')
    const consumerKey = percentDecode(collectedParams.oauth_consumer_key)
    const oauthToken = collectedParams.oauth_token && percentDecode(collectedParams.oauth_token)
    const [consumerSecret, tokenSecret] = await Promise.all([
      args.getConsumerSecret(consumerKey),
      (async () => {
        if (oauthToken == null) {
          return ''
        }
        return await args.getTokenSecret(oauthToken)
      })(),
    ])
    if (consumerSecret == null || tokenSecret == null) {
      return ctx.throw(401)
    }
    if (!verify(collectedParams, ctx.request.method, ctx.request.URL.toString(), consumerSecret, tokenSecret)) {
      return ctx.throw(401)
    }

    (ctx.request as any).oauth = {
      consumerKey,
      oauthToken,
      collectedParams,
    } as OAuthData
    return await next()
  }
}
