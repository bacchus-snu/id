import * as Koa from 'koa'
import * as Bunyan from 'bunyan'
import Model from '../model/model'

const createServer = (_log: Bunyan, _model: Model) => {
  const app = new Koa()
  app.use(async ctx => {
    ctx.body = 'Hello, world'
  })
  return app
}

export default createServer
