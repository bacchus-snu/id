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
 * Note back that some attributes defined in RFCs, namely 'userPassword', 'description',
 * 'seeAlso', 'l', 'o', 'ou', and 'host', are omitted.
 *
 * Array types are for multi-valued attributes.
 */
export interface PosixAccount {
  /**
   * Object class attribute.
   */
  objectClass: string | Array<string>,

  /**
   * The common name for the account.
   */
  cn: string | Array<string>,

  /**
   * The login name for the account.
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
  gecos?: string,

  /**
   * The absolute path to the home directory.
   * Corresponds to the sixth column of passwd(5) file.
   */
  homeDirectory: string,

  /**
   * The path to the login shell.
   * Corresponds to the seventh column of passwd(5) file.
   */
  loginShell?: string,
}

 /**
  * Array literal for 'organizationalUnit', and 'top'.
  */
 export const organizationalUnitObjectClass = ['organizationalUnit', 'top']

/**
 * An object which is a member of RFC4519 'organizationalUnit', and RFC2256 'top'.
 *
 * Note back that all optional attributes except for 'description' are omitted.
 *
 * Array types are for multi-valued attributes.
 */
export interface OrganizationalUnit {
  /**
   * Object class attribute.
   */
  objectClass: string | Array<string>,

  /**
   * Name of the organizational unit.
   */
  ou: string | Array<string>,

  /**
   * Human-readable description for the object.
   */
  description?: string | Array<string>,
}

 /**
  * Array literal for 'subschema', 'subentry', and 'top'.
  */
 export const subschemaObjectClass = ['subschema', 'subentry', 'top']

/**
 * An object which is a member of RFC4512 'subschema', RFC3672 'subentry', and RFC2256 'top'.
 * Provides schema definition.
 *
 * Note back that some optional attributes for 'subschema' are omitted.
 *
 * Array types are for multi-valued attributes.
 */
export interface Subschema {
  /**
   * Object class attribute.
   */
  objectClass: string | Array<string>,

  /**
   * Common name.
   */
  cn: string | Array<string>,

  /**
   * Specifies subet of entries in DIT, onto which this subentry is effective.
   */
  subtreeSpecification: string,

  /**
   * Provides definitions for object classes.
   */
  objectClasses?: string | Array<string>,

  /**
   * Provides definitions for attribute types.
   */
  attributeTypes?: string | Array<string>,

  /**
   * Provides definitions for matching rules.
   */
  matchingRules?: string | Array<string>,
}

/**
 * Attributes for the root DSA-Specific entry. In other words, metadata for the LDAP server itself.
 * This is not an exhaustive definition for RootDSE. Refer to the Section 3.4 of RFC2251.
 *
 * Array types are for multi-valued attributes.
 */
export interface RootDSE {
  /**
   * All DNs that serve as naming contexts for the DITs in this server.
   * In other words, DNs of the entries which act as 'root' in the information hierarchy.
   */
  namingContexts: string | Array<string>,

  /**
   * Subschema subentires known by this server.
   */
  subschemaSubentry: string | Array<string>,

  /**
   * Supported LDAP version as integer.
   */
  supportedLDAPVersion: number | Array<number>,
}
