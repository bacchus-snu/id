import Model from '../../model/model'
import { EmailAddress } from '../../model/email_addresses'
import { IMiddleware } from 'koa-router'
import Config from '../../config'

export function createUser(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    if (!ctx.session) {
      ctx.status = 500
      return
    }

    if (!ctx.session.verificationToken) {
      ctx.status = 401
      return
    }

    const token = ctx.session.verificationToken
    let emailAddress: EmailAddress

    // check verification token
    try {
      await model.pgDo(async c => {
        emailAddress = await model.emailAddresses.getEmailAddressByToken(c, token)
      })
    } catch (e) {
      ctx.status = 401
      return
    }

    const { username, name, password, preferredLanguage } = body

    if (!username || !name || !password || !preferredLanguage) {
      ctx.status = 400
      return
    }

    // validates inputs
    if (!/^[a-z][a-z0-9_]+$/.test(username) || username.length > 20) {
      ctx.status = 400
      return
    }

    if (password.length < 8) {
      ctx.status = 400
      return
    }

    if (!(['ko', 'en'].includes(preferredLanguage))) {
      ctx.status = 400
      return
    }

    await model.pgDo(async c => {
      const emailAddressIdx = await model.emailAddresses.getIdxByAddress(c, emailAddress.local, emailAddress.domain)
      const userIdx = await model.users.create(
        c, username, password, name, emailAddressIdx, config.posix.defaultShell, preferredLanguage)
      await model.emailAddresses.validate(c, userIdx, emailAddressIdx)
      await model.emailAddresses.removeToken(c, token)
    })
    ctx.status = 201
    await next()
  }
}

export function checkPasswordToken(model: Model): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    if (!ctx.session) {
      ctx.status = 500
      return
    }

    const { token } = body

    if (!token) {
      ctx.status = 401
      return
    }

    let username
    try {
      await model.pgDo(async c => {
        const userIdx = await model.users.getUserIdxByPasswordToken(c, token)
        const query = 'SELECT username FROM users WHERE idx = $1'
        const result = await c.query(query, [userIdx])
        username = result.rows[0].username
      })
    } catch (e) {
      ctx.status = 400
      return
    }

    if (!username) {
      ctx.status = 400
      return
    }

    const data = {
      username,
    }

    ctx.body = data
    ctx.status = 200
    await next()
  }
}

export function changePassword(model: Model): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    if (!ctx.session) {
      ctx.status = 500
      return
    }

    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      ctx.status = 400
      return
    }

  }
}
