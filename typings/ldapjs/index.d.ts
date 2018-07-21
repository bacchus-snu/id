/// <reference types="bunyan" />

declare module 'ldapjs' {

  import * as Bunyan from 'bunyan'

  export interface Error {
  }

  export interface ServerOptions {
    /**
     * A bunyan instance to be used for logging.
     */
    log?: Bunyan,
    /**
     * PEM-encoded X.509 certificate.
     */
    certificate?: string,
    /**
     * PEM-encoded private key for the certificate.
     */
    key?: string,
  }

  export interface DN {
    toString(): string
  }

  export interface ServerHandler {
    (req: Req, res: Res, next: (error?: Error) => ServerHandler): void
  }

  export interface Req {
    dn: DN,
    filter: Filter,
    credentials: string,
  }

  export interface Res {
    end(): void,
    send(entity: Entity): void
  }

  export interface Entity {
    dn: string,
    attributes: object,
  }

  export interface Filter {
    matches(entity: object): boolean
  }

  export interface Server {
    /**
     * Begin accepting connections on the given port and host.
     * @param port port to bind.
     * @param host host to bind. (default: any IPv4 address)
     * @param callback callback to be called when the server has been bound
     */
    listen(port: number, host?: string, callback?: () => void): void

    /**
     * Chain handler to Bind operation
     * @param name the DN to mount this handler
     * @param handlers handlers
     */
    bind(name: string, ...handlers: Array<ServerHandler>): Server

    /**
     * Chain handler to Search operation
     * @param name the DN to mount this handler
     * @param handlers handlers
     */
    search(name: string, ...handlers: Array<ServerHandler>): Server

    use(...handlers: Array<ServerHandler>): Server
  }

  /**
   * Create a new LDAP server.
   * @param options options to provide.
   */
  export function createServer(options?: ServerOptions): Server

  export class InvalidCredentialsError implements Error {
  }

  export class InsufficientAccessRightsError implements Error {
  }
}
