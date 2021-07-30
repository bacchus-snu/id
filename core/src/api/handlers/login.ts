import { IMiddleware } from 'koa-router'
import { SignJWT } from 'jose/jwt/sign'
import { createPrivateKey } from 'crypto'

import Config from '../../config'
import { ControllableError, AuthorizationError } from '../../model/errors'
import Model from '../../model/model'
import { verifyPubkeyReq } from '../pubkey'

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
          let host
          if (ctx.headers['x-bacchus-id-pubkey']) {
            const verifyResult = verifyPubkeyReq(ctx)
            if (verifyResult == null) {
              ctx.status = 401
              return
            }

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

export function issueJWT(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    if (ctx.session && !ctx.session.isNew) {
      if (!ctx.session.userIdx || !ctx.session.username) {
        ctx.status = 401
        return
      }

      const body: any = ctx.request.body
      const userIdx = ctx.session.userIdx

      if (!body || typeof body !== 'object') {
        ctx.status = 400
        return
      }

      const { permissionIdx } = body
      let hasPermission: boolean = false
      if (permissionIdx) {
        if (typeof permissionIdx !== 'number') {
          ctx.status = 400
          return
        }
        try {
          await model.pgDo(async tr => {
            try {
              const hp = await model.permissions.checkUserHavePermission(tr, userIdx, permissionIdx)
              hasPermission = hp
            } catch (e) {
              ctx.status = 500
              throw e
            }
          })
        } catch (e) {
          return
        }
      }

      const payload = {
        userIdx: ctx.session.userIdx,
        username: ctx.session.username,
        permissionIdx: -1,
      }
      if (hasPermission) {
        payload.permissionIdx = permissionIdx
      }
      const key = createPrivateKey(config.jwt.privateKey)
      const expiry = Math.floor(new Date().getTime() / 1000) + config.jwt.expirySec
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer(config.jwt.issuer)
        .setAudience(config.jwt.audience)
        .setExpirationTime(expiry)
        .sign(key)

      let data
      if (permissionIdx) {
        data = {
          token: jwt,
          hasPermission,
        }
      } else {
        data = {
          token: jwt,
        }
      }
      ctx.body = data
      ctx.status = 200
    } else {
      ctx.status = 401
    }
    await next()
  }
}

export function loginIssueJWT(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (!body || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { username, password } = body
    let userIdx: number = -1

    const { permissionIdx } = body
    let hasPermission: boolean = false
    if (permissionIdx && typeof permissionIdx !== 'number') {
      ctx.status = 400
      return
    }
    try {
      await model.pgDo(async tr => {
        try {
          userIdx = await model.users.authenticate(tr, username, password)
          if (permissionIdx) {
            hasPermission = await model.permissions.checkUserHavePermission(
              tr,
              userIdx,
              permissionIdx,
            )
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
      return
    }

    if (userIdx === -1) {
      ctx.status = 500
      return
    }

    const payload = {
      userIdx,
      username,
      permissionIdx: -1,
    }
    if (hasPermission) {
      payload.permissionIdx = permissionIdx
    }
    const key = createPrivateKey(config.jwt.privateKey)
    const expiry = Math.floor(new Date().getTime() / 1000) + config.jwt.expirySec
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(config.jwt.issuer)
      .setAudience(config.jwt.audience)
      .setExpirationTime(expiry)
      .sign(key)

    let data
    if (permissionIdx) {
      data = {
        token: jwt,
        hasPermission,
      }
    } else {
      data = {
        token: jwt,
      }
    }
    ctx.body = data
    ctx.status = 200
  }
}
