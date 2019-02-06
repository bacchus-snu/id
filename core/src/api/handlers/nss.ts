import Model from '../../model/model'
import { User } from '../../model/users'
import Config from '../../config'
import { IMiddleware } from 'koa-router'
import { NoSuchEntryError } from '../../model/errors'
import util = require('util')

let encodedPasswd = ''
let encodedGroup = ''
let lastModified = new Date()

async function update(model: Model, config: Config) {
  const users = await model.pgDo(async tr => {
     return await model.users.getAll(tr)
  })

  // TODO: push this to the db layer?
  users.sort((a, b) => {
    return a.uid - b.uid
  })

  let passwd = ''
  const usernames = []
  users.forEach(user => {
    passwd += util.format('%s:x:%d:%d:%s:%s:%s\n',
      user.username, user.uid, config.posix.userGroupGid, user.name,
      `${model.config.posix.homeDirectoryPrefix}/${user.username}`,
      user.shell)

    if (user.username) {
      usernames.push(user.username)
    }
  })

  if (passwd !== encodedPasswd) {
    encodedPasswd = passwd
    encodedGroup = util.format('%s:x:%d:%s',
      config.posix.userGroupName, config.posix.userGroupGid,
      usernames.join(','))
    lastModified = new Date()
  }
}

export function getPasswd(model: Model, config: Config): IMiddleware {
  // TODO: invalidate on user change, move to models
  setInterval(() => {
    update(model, config)
  }, 15 * 60)

  return async (ctx, next) => {
    try {
      await model.pgDo(async tr => {
        await model.hosts.getHostByInet(tr, ctx.ip)
      })
    } catch (e) {
        if (e instanceof NoSuchEntryError) {
          ctx.status = 401
        } else {
          ctx.status = 500
        }
        return
    }

    ctx.status = 200 // Required for freshness check
    ctx.lastModified = lastModified

    if (ctx.fresh) {
      ctx.status = 304
    } else {
      ctx.body = encodedPasswd
    }

    await next()
  }
}

export function getGroup(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    try {
      await model.pgDo(async tr => {
        await model.hosts.getHostByInet(tr, ctx.ip)
      })
    } catch (e) {
        if (e instanceof NoSuchEntryError) {
          ctx.status = 401
        } else {
          ctx.status = 500
        }
        return
    }

    ctx.status = 200 // Required for freshness check
    ctx.lastModified = lastModified

    if (ctx.fresh) {
      ctx.status = 304
    } else {
      ctx.body = encodedGroup
    }

    await next()
  }
}
