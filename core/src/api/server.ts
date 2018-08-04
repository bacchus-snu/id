import * as Koa from 'koa'
import * as Bunyan from 'bunyan'
import Model from '../model/model'
import * as Router from 'koa-router'
import * as bodyParser from 'koa-bodyparser'
import Config from '../config'

const createServer = (log: Bunyan, model: Model, config: Config) => {
  const app = new Koa()
  const router = new Router()

  app.use(bodyParser())

  router.post('/api/user', async (ctx, next) => {
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
  })

  app.on('error', e => {
    log.error('API error', e)
  })

  app.use(router.routes()).use(router.allowedMethods())

  return app
}

export default createServer
