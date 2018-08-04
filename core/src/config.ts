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

  /**
   * Prefix for home directory.
   */
  homeDirectoryPrefix: string
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
   * PostgreSQL connection configuration.
   */
  postgresql: PostgreSQLConfig

  /**
   * POSIX configuration.
   */
  posix: PosixConfig
}
