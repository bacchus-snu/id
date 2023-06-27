import { IMiddleware } from 'koa-router'

import Model from '../../model/model'
import { OAuthData } from '../../oauth/koa'

export function getRequestToken(model: Model): IMiddleware {
  return async ctx => {
    const oauth = (ctx.request as any).oauth as OAuthData
    ctx.response.status = 204
  }
}
