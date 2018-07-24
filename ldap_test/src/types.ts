/**
 * Commonly used type definitions.
 */

 /**
  * String literal 'posixAccount'.
  */
 export const posixAccount = 'posixAccount'

 /**
  * String literal type for objectClass attribute in 'posixAccount' objects.
  */
type PosixAccountObjectClass = 'posixAccount'

/**
 * Represents a RFC2307 'posixAccount' object.
 *
 * Note back that in RFC2037 'gecos' and 'loginShell' are optional attributes.
 * Also, 'userPassword' and 'description' attributes are omitted.
 */
export interface PosixAccount {
  /**
   * Object class attribute. Inherited from 'top' object class.
   */
  objectClass: PosixAccountObjectClass,

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
   * The 'GECOS' field for common name or comment.
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
