import * as Koa from 'koa'

import verify from './verify'

interface Params {
  [key: string]: string
}

export function parseAuthorizationParams(authorization: string): Params {
  authorization = authorization.trim()
  if (authorization.substring(0, 6).toLowerCase() === 'oauth ') {
    authorization = authorization.substring(6).trim()
  } else {
    return {}
  }

  const collectedParams: Params = {}
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
  return collectedParams
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

    // Parse Authorization header, if there is any
    const authorization: string | undefined = ctx.request.headers.authorization
    const authorizationParams = typeof authorization === 'string' ? parseAuthorizationParams(authorization) : {}

    // Test and extract body
    let requestParams: Params
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

    // Percent-encode body
    const convertedRequestParams: Params = {}
    for (const [k, v] of Object.entries(requestParams)) {
      convertedRequestParams[encodeURIComponent(k)] = encodeURIComponent(v)
    }

    const collectedParams = { ...convertedRequestParams, ...authorizationParams }

    ctx.assert('oauth_consumer_key' in collectedParams, 400, 'Consumer Key should be given')
    const consumerKey = decodeURIComponent(collectedParams.oauth_consumer_key)
    const oauthToken = collectedParams.oauth_token && decodeURIComponent(collectedParams.oauth_token)
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
