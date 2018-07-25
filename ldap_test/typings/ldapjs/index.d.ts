/// Incomplete type definitions for ldapjs.
/// <reference types="bunyan" />

declare module 'ldapjs' {

  import * as net from 'net'
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
  export interface DN {
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
  export interface RDN {
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
   * Provides access to the next handler in the chain, and allows specifying an error occurred during the operation.
   * @param error an error during the operation
   */
  export type Next = (error?: Error) => void

  /**
   * Handles requests from clients.
   * @param req provides information about the request
   * @param res provides contexts and methods for making responses
   * @param next provides access to the next handler in the chain
   */
  export type Handler<ReqType, ResType> = (req: ReqType, res: ResType, next: Next) => void

  /**
   * Handles bind requests.
   */
  export type BindHandler = Handler<BindRequest, Res>

  /**
   * Handles search requests.
   */
  export type SearchHandler = Handler<SearchRequest, SearchResponse>

  /**
   * LDAP context for a connection.
   */
  export interface LDAPConnectionContext {
    /**
     * Specifies what the client have authenticated as.
     */
    bindDN: DN
  }

  /**
   * Request to the server.
   */
  export interface Req {
    /**
     * The DN on which the request wants to operate.
     */
    dn: DN

    /**
     * Unique identifier for the connection-request pair.
     */
    logId: string

    /**
     * Provides information for the connection.
     */
    connection: net.Socket & {
      ldap: LDAPConnectionContext
    }
  }

  /**
   * Response from the server.
   */
  export interface Res {
    /**
     * Send the result of LDAP operation to the client.
     * To indicate any errors, consider passing an Error object to the 'next' function in the handler,
     * instead of indicating erros by setting statusCode manually.
     * @param statusCode status code (default: SUCCESS)
     */
    end(statusCode?: number): void
  }

  /**
   * Bind request.
   *
   * Note back that 'name' property is omitted. The 'dn' property has the same value.
   */
  export interface BindRequest extends Req {
    /**
     * LDAP protocol version the client wants.
     *
     * ldapjs supports LDAP v3 only.
     */
    version: number

    /**
     * The authentication method.
     *
     * ldapjs supports 'simple' only.
     */
    authentication: string

    /**
     * For 'simple' authentication, it's the plain text for the password.
     */
    credentials: string
  }

  /**
   * Search request.
   *
   * Note back that 'baseObject' property is omitted. The 'dn' property has the same value.
   */
  export interface SearchRequest extends Req {
    /**
     * Scope of the search.
     * The base object itself, one-level, or subtree.
     */
    scope: 'base' | 'one' | 'sub'

    /**
     * Specifies whether to dereference aliases or not (RFC 4511).
     * neverDerefAliases(0), derefInSearching(1), derefFindingBaseObj(2), or derefAlways(3).
     */
    derefAliases: number

    /**
     * Limits the number of entires returned.
     * 0 means unlimited.
     */
    sizeLimit: number

    /**
     * Limits the time to take in sending responses.
     * 0 means unlimited.
     */
    timeLimit: number

    /**
     * Whether to return only names of the attributes or not.
     * Automatically handled by ldapjs.
     */
    typesOnly: boolean

    /**
     * Filter object the client requested.
     */
    filter: Filter

    /**
     * Limits the attributes in the responses.
     * Automatically handled by ldapjs.
     */
    attributes: Array<string>
  }

  /**
   * Provides mechanism for filtering entries.
   */
  export interface Filter {
    /**
     * @param obj the object to test against
     * @returns true if the object matches with the filter, false otherwise
     */
    matches(obj: object): boolean
  }

  /**
   * Search response.
   */
  export interface SearchResponse extends Res {
    /**
     * Sends a response entry.
     * @param entry entry to send
     */
    send(entry: SearchEntry<object>): void
  }

  /**
   * Represents an entry in serach results.
   */
  export interface SearchEntry<T> {
    /**
     * DN of the object.
     */
    dn: DN | string,

    /**
     * Attributes of the object.
     */
    attributes: T
  }

  /**
   * LDAP server.
   */
  export interface Server {
    /**
     * Begin accepting connections on the given port and host.
     * @param port port to bind
     * @param host host to bind (default: any IPv4 address)
     * @param callback callback to be called when the server has been bound
     */
    listen(port: number, host?: string, callback?: () => void): void

    /**
     * Chain handler to bind operation.
     * @param name the DN to mount this handler
     * @param handlers handlers
     */
    bind(name: string, ...handlers: Array<BindHandler|Array<BindHandler>>): Server

    /**
     * Chain handler to search operation.
     * @param name the DN to mount this handler
     * @param handlers handlers
     */
    search(name: string, ...handlers: Array<SearchHandler|Array<SearchHandler>>): Server
  }

  /**
   * Create a new LDAP server.
   * @param options options to provide.
   */
  export function createServer(options?: ServerOptions): Server

  /**
   * Represents an error occurred during the operation (RFC4511).
   */
  export interface Error {
  }

  /**
   * Indicates that the received data is not well-formed.
   * For bind operation only, this may also indicate that
   * the server does not support the requested protocol version.
   */
  export class ProtocolError implements Error {
  }

  /**
   * Indicates that the specified authentication method is not supported.
   */
  export class AuthMethodNotSupportedError implements Error {
  }

  /**
   * Indicates that the object does not exist.
   */
  export class NoSuchObjectError implements Error {
  }

  /**
   * Indicates that the provided credential is invalid.
   */
  export class InvalidCredentialsError implements Error {
  }

  /**
   * Indicates that the client does not have sufficient access rights to request the operation.
   */
  export class InsufficientAccessRightsError implements Error {
  }

  /**
   * Indicates an internal error encountered by the server.
   */
  export class OtherError implements Error {
  }
}
