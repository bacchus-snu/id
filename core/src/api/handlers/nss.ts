import Model from '../../model/model'
import { User } from '../../model/users'
import Config from '../../config'
import { IMiddleware } from 'koa-router'
import { NoSuchEntryError } from '../../model/errors'

const util = require('util')

// Would be better to invalidate on user change.
// Possibly move into models? (like posixAccountCache)
async function generate(model: Model, config: Config): Promise<string> {
  let users: Array<User> = []
  await model.pgDo(async tr => {
     users = await model.users.getAll(tr)
  })

  // TODO: push this to the db layer
  users.sort((a, b) => {
    return a.uid - b.uid
  })

  const encoded: Array<string> = [];
  users.forEach(user => {
  encoded.push(util.format('%s:x:%d:%d:%s:%s:%s',
    user.username, user.uid, config.posix.userGroupGid, user.name,
    `${model.config.posix.homeDirectoryPrefix}/${user.username}`,
    user.shell));
  })

  return encoded.join('\n')
}

export function getPasswd(model: Model, config: Config): IMiddleware {
  let encodedUsers = ''
  let lastModified = new Date()

  setInterval(() => {
    generate(model, config).then(enc => {
      if (enc !== encodedUsers) {
        encodedUsers = enc
        lastModified = new Date()
      }
    })
  }, 15*60)

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
      ctx.status = 304;
    } else {
      ctx.body = encodedUsers
    }

    await next()
  }
}
