import * as Router from 'koa-router'
import Model from '../model/model'
import Config from '../config'
import { login } from './handlers/login'
import { getUserList, createUser, deleteUser } from './handlers/users'

export function createRouter(model: Model, config: Config): Router {
  const router = new Router()

  /**
   * Login API route.
   * @param username username.
   * @param password password.
   */
  router.post('/api/login', login(model))

  router.get('/api/user', getUserList(model))
  router.post('/api/user', createUser(model, config))
  router.delete('/api/user/:user_idx', deleteUser(model))

  return router
}
