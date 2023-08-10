import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import Model from '../model/model'
import Config from '../config'
import { login, loginPAM, logout, checkLogin, loginLegacy } from './handlers/login'
import {
  createUser, changePassword, sendChangePasswordEmail,
  getUserEmails, getUserInfo, checkChangePasswordEmailToken
} from './handlers/users'
import { getUserShell, changeUserShell } from './handlers/users'
import { sendVerificationEmail, checkVerificationEmailToken } from './handlers/emails'
import { getShells } from './handlers/shells'
import { getPasswd, getGroup } from './handlers/nss'
import {
  listGroups, listMembers, listPending,
  applyGroup, acceptGroup, rejectGroup, leaveGroup
} from './handlers/groups'
import createOIDCRouter from '../oidc/routes'
// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type OIDCProvider from 'oidc-provider'

export function createRouter(model: Model, oidcProvider: OIDCProvider, config: Config): Router {
  const router = new Router()
  router.use(bodyParser())
  router.use(async (ctx, next) => {
    const oidcCtx = oidcProvider.app.createContext(ctx.req, ctx.res)
    const session = await oidcProvider.Session.get(oidcCtx)
    ctx.state.oidcSession = session
    ctx.state.userIdx = session.accountId ? Number(session.accountId) : undefined
    return next()
  })

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
  router.post('/api/login/pam', loginPAM(model))
  /**
   * Legacy login API route.
   * CAUTION: response code 200 means failure in sign in.
   */
  router.post('/Authentication/Login.aspx', loginLegacy(model, config))
  /**
   * Logout API route.
   * Always set status code to 200, and clear session store.
   */
  router.post('/api/logout', logout())
  /**
   * Check login.
   * 200 if already logged in, 401 if not.
   * @returns username username.
   */
  router.get('/api/check-login', checkLogin(model))

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
   * Check password change email token.
   * @param token verification token.
   */
  router.post('/api/user/check-password-token', checkChangePasswordEmailToken(model))

  /**
   * Get user's emails.
   * 200 if success.
   * @param username username.
   * @returns emails: Array of EmailAddress.
   */
  router.get('/api/user/emails', getUserEmails(model))

  /**
   * Get user info.
   * 200 if success.
   * @param Authorization header with JWT.
   * @returns username
   * @returns name
   * @returns studentNumber
   */
  router.get('/api/user/info', getUserInfo(model, config))

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
  router.get('/api/nss/passwd', getPasswd(model))

  /**
   * Get the group map
   * 200 on success
   * 304 if not modified since
   * 401 if not a valid host
   */
  router.get('/api/nss/group', getGroup(model))

  /**
   * Get get the group list, along with is_member, is_pending, is_owner
   * 200 on success
   * 401 if not logged in
   */
  router.get('/api/group', listGroups(model))

  /**
   * Get get the group's member list, if requested by an owner.
   * 200 on success
   * 401 if not owner
   */
  router.get('/api/group/:gid/members', listMembers(model))

  /**
   * Get get the group's pending member list, if requested by an owner.
   * 200 on success
   * 401 if not owner
   */
  router.get('/api/group/:gid/pending', listPending(model))

  /**
   * Apply to join the group.
   * 200 on success
   * 400 if already applied or already a member, or invalid group
   * 401 if not logged in
   */
  router.post('/api/group/:gid/apply', applyGroup(model))

  /**
   * Accent a join request.
   * 200 on success
   * 400 if any approval fails
   * 401 if not owner
   */
  router.post('/api/group/:gid/accept', acceptGroup(model))

  /**
   * Reject a join request, or remove a user.
   * 200 on success
   * 400 if any rejection fails
   * 401 if not owner
   */
  router.post('/api/group/:gid/reject', rejectGroup(model))

  /**
   * Leave a group.
   * 200 on success
   * 400 if not in group
   * 401 if not logged in
   */
  router.post('/api/group/:gid/leave', leaveGroup(model))

  /**
   *
   */
  const oidcRouter = createOIDCRouter(model, oidcProvider)
  router.use(oidcRouter.routes())

  return router
}
