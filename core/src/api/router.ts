import * as Router from 'koa-router'
import Model from '../model/model'
import Config from '../config'
import { login, loginPAM, logout, checkLogin, loginLegacy } from './handlers/login'
import { createUser, changePassword, sendChangePasswordEmail, getUserEmails } from './handlers/users'
import { getUserShell, changeUserShell } from './handlers/users'
import { sendVerificationEmail, checkVerificationEmailToken } from './handlers/emails'
import { getShells } from './handlers/shells'
import { getPasswd, getGroup } from './handlers/nss'
import { listGroups, listPending } from './handlers/groups'

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
   * PAM Login API route.
   * @param username username.
   * @param password password.
   * 200 if success, 401 if not.
   */
  router.post('/api/login-pam', loginPAM(model))
  /**
   * Legacy login API route.
   * CAUTION: response code 200 means failure in sign in.
   */
  router.post('/Authentication/Login.aspx', loginLegacy(model, config))
  /**
   * Logout API route.
   * Always set status code to 200, and clear session store.
   */
  router.get('/api/logout', logout())
  /**
   * Check login.
   * 200 if already logged in, 401 if not.
   * @returns username username.
   */
  router.get('/api/check-login', checkLogin())

  /**
   * Get shell list.
   * 200 if success.
   * @returns shells: Array of string.
   */
  router.get('/api/shells', getShells(model))

  /**
   * Generate verification token and send sign up link.
   * @param emailLocal email local.
   * @param emailDomain email domain.
   */
  router.post('/api/email/verify', sendVerificationEmail(model, config))

  /**
   * Check token and response with according email addresss.
   * @param token verification token.
   * @returns emailLocal email local.
   * @returns emailDomain email domain.
   */
  router.post('/api/email/check-token', checkVerificationEmailToken(model))

  /**
   * Create user.
   * @param username username.
   * @param name real name.
   * @param password password.
   * @param preferredLanguage preferred language.
   */
  router.post('/api/user', createUser(model, config))

  /**
   * Change password for user.
   * @param newPassword new password.
   * @param token change password token.
   */
  router.post('/api/user/change-password', changePassword(model))

  /**
   * Send password change email.
   * @param emailLocal email local.
   * @param emailDomain email domain.
   */
  router.post('/api/user/send-password-token', sendChangePasswordEmail(model, config))

  /**
   * Get user's emails.
   * 200 if success.
   * @param username username.
   * @returns emails: Array of EmailAddress.
   */
  router.get('/api/user/emails', getUserEmails(model))

  /**
   * Get user current shell.
   * 200 if success.
   */
  router.get('/api/user/shell', getUserShell(model))

  /**
   * Change user shell.
   * 200 if success.
   * @param shell shell.
   */
  router.post('/api/user/shell', changeUserShell(model))

  /**
   * Get the passwd map
   * 200 on success
   * 304 if not modified since
   * 401 if not a valid host
   */
  router.get('/api/get-passwd', getPasswd(model))

  /**
   * Get the group map
   * 200 on success
   * 304 if not modified since
   * 401 if not a valid host
   */
  router.get('/api/get-group', getGroup(model))

  /**
   * Get get the group list, along with is_member, is_pending, is_owner
   * 200 on success
   * 401 if not logged in
   */
  router.get('/api/group', listGroups(model))

  /**
   * Get get the group's pending member list, if requested by an owner.
   * 200 on success
   * 401 if not owner
   */
  router.get('/api/group/:gid/pending', listPending(model))

  return router
}
