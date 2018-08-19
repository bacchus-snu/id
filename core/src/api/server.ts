import * as Koa from 'koa'
import * as Bunyan from 'bunyan'
import * as bodyParser from 'koa-bodyparser'
import * as Session from 'koa-session'
import * as crypto from 'crypto'

import Model from '../model/model'
import { createRouter } from './router'
import Config from '../config'

const createServer = (log: Bunyan, model: Model, config: Config) => {
  const app = new Koa()
  const router = createRouter(model, config)

  app.use(bodyParser())
  app.use(Session(config.session, app))
  const key = crypto.randomBytes(256).toString('hex')
  app.keys = [key]

  app.on('error', e => {
    log.error('API error', e)
  })

  app.use(router.routes()).use(router.allowedMethods())

  return app
}

export default createServer
