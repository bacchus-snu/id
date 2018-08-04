import * as fs from 'fs'

/**
 * Configuration.
 */

/**
 * PostgreSQL connection configuration.
 */
interface PostgreSQLConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

/**
 * LDAP server configuration.
 */
interface LDAPConfig {
  /**
   * Host to listen on.
   */
  listenHost: string

  /**
   * Port to listen on.
   */
  listenPort: number

  /**
   * DN for 'users' ou.
   * e.g. ou=cseusers,dc=snucse,dc=org
   */
  usersDN: string

  /**
   * DN for 'groups' ou.
   * e.g. ou=groups,dc=snucse,dc=org
   */
  groupsDN: string

  /**
   * DN for the subschema subentry.
   * e.g. cn=subschema,dc=snucse,dc=org
   */
  subschemaDN: string
}

/**
 * REST API server configuration.
 */
interface APIConfig {
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
interface POSIXConfig {
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
   */
  minUid: number
}

interface Config {
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
  posix: POSIXConfig
}

const configurationString = fs.readFileSync('config.json', {encoding: 'utf-8'})
const configuration: Config = JSON.parse(configurationString)

export default configuration
