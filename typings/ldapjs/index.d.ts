/// <reference types="bunyan" />

declare module 'ldapjs' {
  import * as Bunyan from 'bunyan'

  export interface ServerOptions {
    /**
     * A bunyan instance to be used for logging.
     */
    log: Bunyan,
    /**
     * PEM-encoded X.509 certificate.
     */
    certificate: string,
    /**
     * PEM-encoded private key for the certificate.
     */
    key: string,
  }

  export interface Server {
    /**
     * This function blahblah.
     * @param x is awesome
     */
    test(x: number): number
  }

  /**
   * Create a new LDAP server.
   * @param options options to provide.
   */
  export function createServer(options?: ServerOptions): Server
}
