/**
 * Configuration.
 */

/**
 * PostgreSQL connection configuration.
 */
export interface PostgreSQLConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

/**
 * LDAP server configuration.
 */
export interface LDAPConfig {
  /**
   * Host to listen on.
   */
  listenHost: string

  /**
   * Port to listen on.
   */
  listenPort: number

  /**
   * Base DN.
   * e.g. dc=snucse,dc=org
   */
  baseDN: string

  /**
   * Name of the OU containing users.
   */
  usersOU: string

  /**
   * Name of the OU containing groups.
   */
  groupsOU: string

  /**
   * DN for the subschema subentry.
   * e.g. cn=subschema,dc=snucse,dc=org
   */
  subschemaDN: string

  /**
   * Path to x509 PEM-encoded certificate.
   */
  certificate: string

  /**
   * Path to x509 PEM-encoded private key.
   */
  key: string
}

/**
 * REST API server configuration.
 */
export interface APIConfig {
  /**
   * Host to listen on.
   */
  listenHost: string

  /**
   * Port to listen on.
   */
  listenPort: number
}

/**
 * Session configuration.
 */
export interface SessionConfig {
  /**
   * Session key name.
   */
  key: string

  /**
   * Session max age.
   */
  maxAge: number

  /**
   * Signed or not.
   */
  signed: boolean

  /**
   * Force to set session cookie for every response.
   * Expiration will be reset on every resposne.
   */
  rolling: boolean

  /**
   * Renew session when session is nearly expired.
   */
  renew: boolean
}

/**
 * Confituration for sending email
 */
export interface EmailConfig {
  /**
   * SMTP host. e.g. smtp.gmail.com
   */
  host: string

  /**
   * Username. e.g. no-reply@snucse.org
   */
  username: string

  /**
   * Password.
   */
  password: string

  /**
   * Resend limit.
   */
  resendLimit: number

  /**
   * Verification email subject.
   */
  verificationEmailSubject: string

  /**
   * Password change email subject.
   */
  passwordChangeEmailSubject: string

  /**
   * URL of id.snucse.org/sign-up
   */
  verificationEmailUrl: string

  /**
   * URL of id.snucse.org/change-password
   */
  passwordChangeEmailUrl: string
}

/**
 * Configurations for POSIX-compliant interface.
 */
export interface PosixConfig {
  /**
   * Name of the primary group for the users.
   */
  userGroupName: string

  /**
   * Gid of the primary group for the users.
   */
  userGroupGid: number

  /**
   * Name of the group for the sudoers.
   */
  sudoerGroupName: string

  /**
   * Gid of the group for the sudoers.
   */
  sudoerGroupGid: number

  /**
   * The default value for shell.
   */
  defaultShell: string

  /**
   * Minimum value for uid.
   * Note that this value is ignored when there are any UIDs below this limit.
   */
  minUid: number

  nullUid: number

  /**
   * Prefix for home directory.
   */
  homeDirectoryPrefix: string
}

/**
 * Miscellaneous configurations.
 */
export interface MiscConfig {
  /**
   * Slack chat message API Endpoint.
   */
  slackAPIEndpoint: string
}

export default interface Config {
  /**
   * Name of this id core instance.
   */
  instanceName: string

  /**
   * Bunyan logging level.
   */
  logLevel: number

  /**
   * LDAP server configuration.
   */
  ldap: LDAPConfig

  /**
   * API server configuration.
   */
  api: APIConfig

  /**
   * Session configuration.
   */
  session: SessionConfig

  /**
   * Email configuration.
   */
  email: EmailConfig

  /**
   * PostgreSQL connection configuration.
   */
  postgresql: PostgreSQLConfig

  /**
   * POSIX configuration.
   */
  posix: PosixConfig

  /**
   * Miscellaneous configuration.
   */
  misc: MiscConfig
}
