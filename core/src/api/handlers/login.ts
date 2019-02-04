import Model from '../../model/model'
import { IMiddleware } from 'koa-router'
import Config from '../../config'
import { ControllableError, AuthorizationError } from '../../model/errors'

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
      await model.pgDo(async tr => {
        try {
          userIdx = await model.users.authenticate(tr, username, password)

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

export function loginPAM(model: Model): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (!body || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { username, password } = body
    try {
      await model.pgDo(async tr => {
        try {
          const userIdx = await model.users.authenticate(tr, username, password)
	  // Remember to configure app.proxy and X-Forwarded-For when deploying
          const host = await model.hosts.getHostByInet(tr, ctx.ip)
          await model.hosts.authorizeUserByHost(tr, userIdx, host)
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
      return
    }

    ctx.status = 200
    return
  }
}

export function loginLegacy(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (!body || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const username = body.member_account
    const password = body.member_password

    if (!username || !password) {
      // 200 means failure
      ctx.status = 200
      return
    }

    let userIdx: number

    try {
      await model.pgDo(async tr => {
        try {
          userIdx = await model.users.authenticate(tr, username, password)
          const requiredPermission = config.permissions.snucse
          const havePermission =  await model.permissions.checkUserHavePermission(tr, userIdx, requiredPermission)
          if (!havePermission) {
            throw new AuthorizationError()
          }
        } catch (e) {
          ctx.status = 200
          throw e
        }
      })
    } catch (e) {
      return
    }

    ctx.status = 302
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
