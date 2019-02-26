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

export function listPending(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (ctx.session && !ctx.session.isNew) {
      const username = ctx.session.username
      const gid = Number(ctx.params.gid)

      let user = null
      let owner = false
      let users = null
      try {
        await model.pgDo(async tr => {
          user = await model.users.getByUsername(tr, username)
          owner = await model.groups.checkOwner(tr, gid, user.idx)

          if (owner) {
            users = await model.users.getAllPendingMembershipUsers(tr, gid)
          }
        })
      } catch (e) {
        ctx.status = 500
        return
      }

      if (!owner) {
        ctx.status = 401
        return
      }

      ctx.status = 200
      ctx.body = users
      ctx.body.forEach((u: any) => {
        u.uid = u.idx
        delete u.idx
        delete u.username
        delete u.shell
        delete u.preferredLanguage
      })
    } else {
      ctx.status = 401
      return
    }
    await next()
  }
}
