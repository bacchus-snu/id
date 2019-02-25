import Model from '../../model/model'
import { User } from '../../model/users'
import { Group, GroupUserInfo } from '../../model/groups'
import { IMiddleware } from 'koa-router'
import Config from '../../config'

export function listGroups(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (ctx.session && !ctx.session.isNew && ctx.session.username) {
      let user = null
      let groups = null

      try {
        await model.pgDo(async tr => {
          if (ctx.session !== null) {
            user = await model.users.getByUsername(tr, ctx.session.username)
            groups = await model.groups.getUserGroupList(tr, user.idx)
          } else {
            ctx.status = 400
            return
          }
        })
      } catch (e) {
        ctx.status = 500
        return
      }

      ctx.body = groups
      ctx.status = 200
    } else {
      ctx.status = 401
      return
    }
    await next()
  }
}
