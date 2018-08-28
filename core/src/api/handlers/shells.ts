import Model from '../../model/model'
import { IMiddleware } from 'koa-router'

export function getShells(model: Model): IMiddleware {
  return async (ctx, next) => {
    let shells
    await model.pgDo(async c => {
      shells = await model.shells.getShells(c)
    })

    ctx.status = 200
    ctx.body = { shells }

    await next()
  }
}
