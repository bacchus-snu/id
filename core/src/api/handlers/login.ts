import Model from '../../model/model'
import { IMiddleware } from 'koa-router'
import Config from '../../config'
import { ControllableError } from '../../model/errors'

export function login(model: Model): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (!body || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { username, password } = body
    let userIdx: number

    try {
      await model.pgDo(async c => {
        try {
          userIdx = await model.users.authenticate(c, username, password)

          if (ctx.session) {
            // store information in session store
            ctx.session.userIdx = userIdx
            ctx.session.username = username
          } else {
            ctx.status = 500
            throw new Error('session error')
          }

        } catch (e) {
          if (e instanceof ControllableError) {
            ctx.status = 401
          } else {
            ctx.status = 500
          }

          throw e
        }
      })
    } catch (e) {
      ctx.session = null
      return
    }

    ctx.status = 200
    return
  }
}

export function logout(): IMiddleware {
  return async (ctx, next) => {
    ctx.session = null
    ctx.status = 200
    await next()
  }
}

export function checkLogin(): IMiddleware {
  return async (ctx, next) => {
    if (ctx.session && !ctx.session.isNew) {
      const data = {
        username: ctx.session.username,
      }
      ctx.body = data
      ctx.status = 200
    } else {
      ctx.status = 401
    }
    await next()
  }
}
