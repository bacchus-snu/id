/// Incomplete type definitions for ldapjs.
/// <reference types="bunyan" />

declare module 'ldapjs' {

  import * as Bunyan from 'bunyan'

  /**
   * Optioins to provide on server creation.
   */
  export interface ServerOptions {
    /**
     * A bunyan instance to be used for logging.
     */
    log?: Bunyan

    /**
     * PEM-encoded X.509 certificate.
     */
    certificate?: string

    /**
     * PEM-encoded private key for the certificate.
     */
    key?: string
  }

  /**
   * Distinguished name (RFC2253).
   */
  export class DN {
    /**
     * Array of RDNs which compose this DN, in the order of the presence in the string representation.
     */
    rdns: Array<RDN>

    /**
     * @param dn DN to test with
     * @returns true if this is a child of the specified DN, false otherwise
     */
    childOf(dn: DN | string): boolean

    /**
     * @param dn DN to test with
     * @returns true if this is a parent of the specified DN, false otherwise
     */
    parentOf(dn: DN | string): boolean

    /**
     * @param dn DN to test with
     * @returns true if this is equivalent to the specified DN, false otherwise
     */
    equals(dn: DN | string): boolean

    /**
     * @returns the direct parent of this DN, or null if there is no parent
     */
    parent(): DN | null

    /**
     * @returns string representation of this DN
     */
    toString(): string
  }

  /**
   * @param name string representation for a DN
   * @returns the corresponding DN
   */
  export const parseDN: (name: string) => DN

  /**
   * Relative distinguished name (RFC2253).
   */
  export class RDN {
    /**
     * Map between RDN name in lowercase and the corresponding RDNAttribute.
     */
    attrs: {[nameInLowerCase: string]: RDNAttribute}

    /**
     * @param rdn RDN to test with
     * @returns true if this is equivalent to the specified RDN, false otherwise
     */
    equals(rdn: RDN): boolean

    /**
     * @returns string representation of this RDN
     */
    toString(): boolean
  }

  /**
   * Attribute in a RDN.
   */
  export interface RDNAttribute {
    /**
     * Name of the attribute.
     */
    name: string

    /**
     * Value of the attribute.
     */
    value: string
  }

  /**
   * Handles requests from clients.
   * @param req provides information about the request
   * @param res provides contexts and methods for making responses
   * @param next provides access for the next handler in the chain
   */
  export type Handler = (req: Req, res: Res, next: (error?: Error) => void) => void

  export interface Req {
    dn: DN,
    filter: Filter,
    credentials: string,
    scope: 'base' | 'one' | 'sub'
  }

  export interface Res {
    end(): void,
    send(entity: Entity<object>): void
  }

  export interface Entity<T> {
    dn: DN | string,
    attributes: T,
  }

  export interface Filter {
    matches(entity: object): boolean
  }

  export interface Server {
    /**
     * Begin accepting connections on the given port and host.
     * @param port port to bind
     * @param host host to bind (default: any IPv4 address)
     * @param callback callback to be called when the server has been bound
     */
    listen(port: number, host?: string, callback?: () => void): void

    /**
     * Chain handler to Bind operation
     * @param name the DN to mount this handler
     * @param handlers handlers
     */
    bind(name: string, ...handlers: Array<Handler|Array<Handler>>): Server

    /**
     * Chain handler to Search operation
     * @param name the DN to mount this handler
     * @param handlers handlers
     */
    search(name: string, ...handlers: Array<Handler|Array<Handler>>): Server
  }

  /**
   * Create a new LDAP server.
   * @param options options to provide.
   */
  export function createServer(options?: ServerOptions): Server

  export interface Error {
  }

  export class InvalidCredentialsError implements Error {
  }

  export class InsufficientAccessRightsError implements Error {
  }
}
