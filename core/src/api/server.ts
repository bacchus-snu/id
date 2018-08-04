import * as Koa from 'koa'
import * as Bunyan from 'bunyan'
import * as bodyParser from 'koa-bodyparser'
import Model from '../model/model'
import { createRouter } from './router'

const createServer = (log: Bunyan, model: Model) => {
  const app = new Koa()
  const router = createRouter(model)

  app.use(bodyParser())
  app.on('error', e => {
    log.error('API error', e)
  })
  app.use(router.routes()).use(router.allowedMethods())

  return app
}

export default createServer
