import Model from '../../model/model'
import { EmailAddress } from '../../model/email_addresses'
import { IMiddleware } from 'koa-router'
import Config from '../../config'

export function getUserList(model: Model): IMiddleware {
  return async (ctx, next) => {
    let users

    await model.pgDo(async c => {
      users = await model.users.getAll(c)
    })

    ctx.response.status = 200
    ctx.response.body = users

    await next()
  }
}

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

export function deleteUser(model: Model): IMiddleware {
  return async (ctx, next) => {
    const user_idx: any = ctx.params.user_idx

    await model.pgDo(async c => {
      await model.users.delete(c, user_idx)
    })

    ctx.status = 204
    await next()
  }
}
