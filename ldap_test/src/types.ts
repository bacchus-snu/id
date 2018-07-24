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
   * Object class attribute.
   */
  objectClass: Array<string>,

  /**
   * X.500 commonName attribute. Typically the person's full name.
   */
  cn: string,

  /**
   * The login name for the account.
   * Corresponds to the first column of passwd(5) file.
   */
  uid: string,

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
