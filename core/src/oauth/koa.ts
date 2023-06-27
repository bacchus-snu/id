import * as Koa from 'koa'

import Params, { ParamObj } from './params'
import verify from './verify'

export function parseAuthorizationParams(params: Params, authorization: string) {
  authorization = authorization.trim()
  if (authorization.substring(0, 6).toLowerCase() === 'oauth ') {
    authorization = authorization.substring(6).trim()
  } else {
    return
  }

  while (true) {
    const eqIndex = authorization.indexOf('="')
    const keyEscaped = authorization.substring(0, eqIndex)
    authorization = authorization.substring(eqIndex + 2)
    const quoteIndex = authorization.indexOf('"')
    const valueEscaped = authorization.substring(0, quoteIndex)
    params.addOneEscaped(keyEscaped, valueEscaped)
    if (authorization[quoteIndex + 1] !== ',') {
      break
    }
    authorization = authorization.substring(quoteIndex + 2).trim()
  }
}

export interface MiddlewareParams {
  getConsumerSecret(consumerKey: string): Promise<string | undefined>
  getTokenSecret(token: string): Promise<string | undefined>
}

export interface OAuthData {
  consumerKey: string
  oauthToken?: string
  collectedParams: Params
}

export default function oauth10a(args: MiddlewareParams): Koa.Middleware {
  return async (ctx: Koa.ParameterizedContext, next) => {
    if (ctx.request.body == null) {
      return await next()
    }

    const params = new Params()

    // Parse Authorization header, if there is any
    const authorization: string | undefined = ctx.request.headers.authorization
    if (typeof authorization === 'string') {
      parseAuthorizationParams(params, authorization)
    }

    // Test and extract body
    let requestParams: ParamObj
    const testUrlEncoded = ctx.request.is('x-www-form-urlencoded')
    if (testUrlEncoded === null) {
      // No body
      requestParams = ctx.request.query
    } else if (testUrlEncoded === false) {
      // Body is not x-www-form-urlencoded
      return ctx.throw('Body should be form data', 400)
    } else {
      // Has body
      if (typeof ctx.request.body === 'string') {
        return ctx.throw('Body should be a dict', 400)
      }
      requestParams = {}
      for (const [key, value] of Object.entries(ctx.request.body)) {
        if (typeof value !== 'string') {
          return ctx.throw('Body should be a dict to string', 400)
        }
        requestParams[key] = value
      }
    }
    params.extend(requestParams)

    const consumerKeyList = params.get('oauth_consumer_key')
    ctx.assert(consumerKeyList.length === 1, 400, 'Consumer Key should be present and unique')
    const consumerKey = decodeURIComponent(consumerKeyList[0])

    const oauthTokenList = params.get('oauth_token')
    const oauthToken = oauthTokenList.length !== 0 ? decodeURIComponent(oauthTokenList[0]) : undefined
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
    if (!verify(params, ctx.request.method, ctx.request.URL.toString(), consumerSecret, tokenSecret)) {
      return ctx.throw(401)
    }

    (ctx.request as any).oauth = {
      consumerKey,
      oauthToken,
      collectedParams: params,
    } as OAuthData
    return await next()
  }
}
