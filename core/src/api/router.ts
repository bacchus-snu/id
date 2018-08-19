import * as Router from 'koa-router'
import Model from '../model/model'
import Config from '../config'
import { login, logout, checkLogin } from './handlers/login'
import { getUserList, createUser, deleteUser } from './handlers/users'
import { getShells } from './handlers/shells'

export function createRouter(model: Model, config: Config): Router {
  const router = new Router()

  /**
   * Login API route.
   * @param username username.
   * @param password password.
   * 200 if success, 401 if not.
   */
  router.post('/api/login', login(model))
  /**
   * Logout API route.
   * Always set status code to 200, and clear session store.
   */
  router.get('/api/logout', logout())
  /**
   * Check login.
   * 200 if already logged in, 401 if not.
   */
  router.get('/api/check-login', checkLogin())

  /**
   * Get shell list.
   * 200 if success.
   * @returns shell: Array of string.
   */
  router.get('/api/shells', getShells(model))

  router.get('/api/user', getUserList(model))
  router.post('/api/user', createUser(model, config))
  router.delete('/api/user/:user_idx', deleteUser(model))

  return router
}
