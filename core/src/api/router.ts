import * as Router from 'koa-router'
import Model from '../model/model'
import { getUserList, createUser } from './handlers/users'
import Config from '../config'

export function createRouter(model: Model, config: Config): Router {
  const router = new Router()

  router.get('/api/user', getUserList(model))
  router.post('/api/user', createUser(model, config))

  return router
}
