import * as Router from 'koa-router'
import Model from '../model/model'
import { getUserList, createUser } from './handlers/users'

export function createRouter(model: Model): Router {
  const router = new Router()

  router.get('/api/user', getUserList(model))
  router.post('/api/user', createUser(model))

  return router
}
