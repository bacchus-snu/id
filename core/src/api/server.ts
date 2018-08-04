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
    let body
    try {
      body = JSON.parse(ctx.request.body)
    } catch (e) {
      ctx.status = 400
      return
    }

    let { username, name, password } = body

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
