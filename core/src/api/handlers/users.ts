import Model from '../../model/model'
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

    const { username, name, password, emailLocal, emailDomain } = body

    if (!username || !name || !password || !emailLocal || !emailDomain) {
      ctx.status = 400
      return
    }

    await model.pgDo(async c => {
      const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
      const userIdx = await model.users.create(c, username, password, name, emailAddressIdx, config.posix.defaultShell)
      await model.emailAddresses.validate(c, userIdx, emailAddressIdx)
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
