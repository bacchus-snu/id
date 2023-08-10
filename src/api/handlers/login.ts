import { IMiddleware } from 'koa-router'
// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type OIDCProvider from 'oidc-provider'

import Config from '../../config'
import { ControllableError, AuthorizationError, NoSuchEntryError } from '../../model/errors'
import Model from '../../model/model'
import { SignatureError, verifyPubkeyReq } from '../pubkey'

export function login(model: Model): IMiddleware {
  return async ctx => {
    const session = ctx.state.oidcSession as InstanceType<OIDCProvider['Session']>
    const body: any = ctx.request.body

    if (!body || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { username, password } = body

    try {
      const userIdx = await model.pgDo(tr => model.users.authenticate(tr, username, password))
      session.loginAccount({
        accountId: String(userIdx),
      })
    } catch (e) {
      if (e instanceof ControllableError) {
        ctx.status = 401
      } else {
        ctx.status = 500
      }
      return
    }

    ctx.status = 200
    return
  }
}

export function loginPAM(model: Model): IMiddleware {
  return async ctx => {
    const body: any = ctx.request.body

    if (!body || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { username, password } = body
    try {
      await model.pgDo(async tr => {
        try {
          let host
          if (ctx.headers['x-bacchus-id-pubkey']) {
            const verifyResult = verifyPubkeyReq(ctx)

            // signature verified, find host info
            host = await model.hosts.getHostByPubkey(tr, verifyResult.publicKey)
          } else {
            // Remember to configure app.proxy and X-Forwarded-For when deploying
            host = await model.hosts.getHostByInet(tr, ctx.ip)
          }

          const userIdx = await model.users.authenticate(tr, username, password)
          await model.hosts.authorizeUserByHost(tr, userIdx, host)
        } catch (e) {
          if (e instanceof ControllableError) {
            ctx.status = 401
          } else if (e instanceof SignatureError) {
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
  return async ctx => {
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
    await (ctx.state.oidcSession as InstanceType<OIDCProvider['Session']>).destroy()
    await next()
  }
}

export function checkLogin(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      const userIdx = ctx.state.userIdx
      let user
      try {
        user = await model.pgDo(async tr => model.users.getByUserIdx(tr, userIdx))
      } catch (e) {
        if (e instanceof NoSuchEntryError) {
          ctx.status = 401
        } else {
          console.error(e)
          ctx.status = 500
        }
        return next()
      }

      const data = {
        username: user.username,
      }
      ctx.body = data
      ctx.status = 200
    } else {
      ctx.status = 401
    }
    await next()
  }
}
