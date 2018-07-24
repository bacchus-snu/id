/**
 * Commonly used type definitions.
 */

 /**
  * Array literal for 'posixAccount', 'account', and 'top'.
  */
 export const posixAccountObjectClass = ['posixAccount', 'account', 'top']

/**
 * An object which is a member of RFC2307 'posixAccount', RFC4524 'account', and RFC2256 'top'.
 *
 * Note back that in RFC2037 'gecos' and 'loginShell' are optional attributes.
 * Also, some attributes defined in RFCs, namely 'userPassword', 'description',
 * 'seeAlso', 'l', 'o', 'ou', and 'host', are omitted.
 */
export interface PosixAccount {
  /**
   * Object class attribute (multi-valued attribute).
   */
  objectClass: string | Array<string>,

  /**
   * X.500 commonName attribute. Typically the person's full name (multi-valued attribute).
   */
  cn: string | Array<string>,

  /**
   * The login name for the account (multi-valued attribute).
   * Corresponds to the first column of passwd(5) file.
   */
  uid: string | Array<string>,

  /**
   * Integer identifier for the account.
   * Corresponds to the third column of passwd(5) file.
   */
  uidNumber: number,

  /**
   * Integer identifier for the primary group this account belongs to.
   * Corresponds to the fourth column of passwd(5) file.
   */
  gidNumber: number,

  /**
   * The 'GECOS' attribute. Typically used for common name or comment.
   * Corresponds to the fifth column of passwd(5) file.
   */
  gecos: string,

  /**
   * The absolute path to the home directory.
   * Corresponds to the sixth column of passwd(5) file.
   */
  homeDirectory: string,

  /**
   * The path to the login shell.
   * Corresponds to the seventh column of passwd(5) file.
   */
  loginShell: string,
}

 /**
  * Array literal for 'organizationalUnit', and 'top'.
  */
 export const organizationalUnitObjectClass = ['organizationalUnit', 'top']

/**
 * An object which is a member of RFC4519 'organizationalUnit', and RFC2256 'top'.
 *
 * Note back that all optional attributes except for 'description' are omitted.
 */
export interface OrganizationalUnit {
  /**
   * Object class attribute (multi-valued attribute).
   */
  objectClass: string | Array<string>,

  /**
   * Name of the organizational unit (multi-valued attribute).
   */
  ou: string | Array<string>,

  /**
   * Human-readable description for the object (multi-valued attribute).
   */
  description?: string | Array<string>,
}

/**
 * Attributes for the root DSA-Specific entry.
 * This is not an exhaustive definition for RootDSE. Refer to the Section 3.4 of RFC2251.
 */
export interface RootDSE {
  /**
   * All DNs that serve as naming contexts for the DITs in this server.
   */
  namingContexts: string | Array<string>,

  /**
   * Supported LDAP version as integer.
   */
  supportedLDAPVersion: number | Array<number>,
}
