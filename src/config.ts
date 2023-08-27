/**
 * Configuration.
 */

// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { ClientMetadata, JWKS } from 'oidc-provider';

/**
 * PostgreSQL connection configuration.
 */
export interface PostgreSQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * REST API server configuration.
 */
export interface APIConfig {
  /**
   * Host to listen on.
   */
  listenHost: string;

  /**
   * Port to listen on.
   */
  listenPort: number;

  /**
   * Trust X-Forwarded-For headers
   */
  proxy: boolean;

  /**
   * Allowed origins for CORS
   */
  corsAllowedOrigins: Array<string>;
}

/**
 * Confituration for sending email
 */
export interface EmailConfig {
  /**
   * SMTP host. e.g. smtp.gmail.com
   */
  host: string;

  /**
   * Username. e.g. no-reply@snucse.org
   */
  username: string;

  /**
   * Password.
   */
  password: string;

  /**
   * Resend limit.
   */
  resendLimit: number;

  /**
   * Verification email subject.
   */
  verificationEmailSubject: string;

  /**
   * Password change email subject.
   */
  passwordChangeEmailSubject: string;

  /**
   * URL of id.snucse.org/sign-up
   */
  verificationEmailUrl: string;

  /**
   * URL of id.snucse.org/change-password
   */
  passwordChangeEmailUrl: string;
}

/**
 * Configurations for POSIX-compliant interface.
 */
export interface PosixConfig {
  /**
   * Name of the primary group for the users.
   */
  userGroupName: string;

  /**
   * Gid of the primary group for the users.
   */
  userGroupGid: number;

  /**
   * Name of the group for the sudoers.
   */
  sudoerGroupName: string;

  /**
   * Gid of the group for the sudoers.
   */
  sudoerGroupGid: number;

  /**
   * The default value for shell.
   */
  defaultShell: string;

  /**
   * Minimum value for uid.
   * Note that this value is ignored when there are any UIDs below this limit.
   */
  minUid: number;

  /**
   * Prefix for home directory.
   */
  homeDirectoryPrefix: string;
}

/**
 * Permission configurations.
 */
export interface PermissionConfig {
  /**
   * SNUCSE3 login group idxs.
   */
  snucse: Array<number>;
}

/**
 * Permission configurations.
 */
export interface JWTConfig {
  /**
   * JWT private key
   * Should be PEM formatted pkcs8 type key.
   * Algorithm should be EC(namedCurve = P-256)
   */
  privateKey: string;

  /**
   * Token expiry in second
   */
  expirySec: number;

  /**
   * Issuer (`iss`)
   */
  issuer: string;

  /**
   * Audience (`aud`)
   */
  audience: string;
}

export interface OIDCConfig {
  /** */
  issuer: string;

  /** */
  redisURL?: string;

  /** */
  jwks: JWKS;

  /** */
  cookieKey: string;

  /** */
  devInteractions: boolean;

  /** */
  deviceFlow: boolean;

  /** */
  revocation: boolean;

  /** */
  clients?: Array<ClientMetadata>;
}

export default interface Config {
  /**
   * Name of this id core instance.
   */
  instanceName: string;

  /**
   * Bunyan logging level.
   */
  logLevel: number;

  /**
   * API server configuration.
   */
  api: APIConfig;

  /**
   * Email configuration.
   */
  email: EmailConfig;

  /**
   * PostgreSQL connection configuration.
   */
  postgresql: PostgreSQLConfig;

  /**
   * POSIX configuration.
   */
  posix: PosixConfig;

  /**
   * Permission configuration.
   */
  permissions: PermissionConfig;

  /**
   * JWT configuration.
   */
  jwt: JWTConfig;

  /**
   * OIDC configuration.
   */
  oidc: OIDCConfig;
}
