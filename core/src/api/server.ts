import * as Koa from 'koa'
import * as Bunyan from 'bunyan'
import Model from '../model/model'
import * as Router from 'koa-router'
import * as bodyParser from 'koa-bodyparser'

const createServer = (log: Bunyan, model: Model) => {
  const app = new Koa()
  const router = new Router()

  app.use(bodyParser())

  router.post('/api/user', async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { username, name, password } = body

    if (!username || !name || !password) {
      ctx.status = 400
      return
    }

    model.pgDo(c => model.users.create(c, username, name, password ))
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
