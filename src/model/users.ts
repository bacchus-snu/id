import Model from './model'
import Transaction from './transaction'
import { NoSuchEntryError, AuthenticationError, NotActivatedError, ExpiredTokenError, BadParameterError } from './errors'
import * as argon2 from 'argon2'
import * as phc from '@phc/format'
import * as moment from 'moment'
import * as crypto from 'crypto'

// see language enum in schema.sql
export type Language = 'ko' | 'en'

export interface User {
  idx: number
  username: string | null
  name: string
  uid: number
  shell: string
  preferredLanguage: Language
  studentNumber?: string
}

export interface UserMembership {
  idx: number
  userIdx: number
  groupIdx: number
  pending: boolean
}

export default class Users {
  private posixPasswdCache: string
  private posixGroupCache: string
  private posixLastModified: Date
  constructor(private readonly model: Model) {
    this.posixPasswdCache = ''
    this.posixGroupCache = ''
    this.posixLastModified = new Date()
  }

  public async create(tr: Transaction, username: string, password: string,
      name: string, shell: string, preferredLanguage: Language): Promise<number> {
    const query = 'INSERT INTO users(username, password_digest, name, uid, shell, preferred_language) ' +
      'VALUES ($1, $2, $3, $4, $5, $6) RETURNING idx'
    const passwordDigest = await argon2.hash(password)
    const uid = await this.generateUid(tr)
    const result = await tr.query(query, [username, passwordDigest, name, uid, shell, preferredLanguage])
    this.posixPasswdCache = ''
    this.posixGroupCache = ''
    return result.rows[0].idx
  }

  public async delete(tr: Transaction, userIdx: number): Promise<number> {
    const query = 'DELETE FROM users WHERE idx = $1 RETURNING idx'
    const result = await tr.query(query, [userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    this.posixPasswdCache = ''
    this.posixGroupCache = ''
    return result.rows[0].idx
  }

  public async getAll(tr: Transaction): Promise<Array<User>> {
    const query = 'SELECT idx, username, name, uid, shell FROM users'
    const result = await tr.query(query)
    const users: Array<User> = []
    result.rows.forEach(row => users.push(this.rowToUser(row)))
    return users
  }

  public async getAllSorted(tr: Transaction): Promise<Array<User>> {
    const query = 'SELECT idx, username, name, uid, shell FROM users ORDER BY uid'
    const result = await tr.query(query)
    const users: Array<User> = []
    result.rows.forEach(row => users.push(this.rowToUser(row)))
    return users
  }

  public getPosixLastModified(): Date {
    return this.posixLastModified
  }

  public async getPasswdEntries(tr: Transaction): Promise<string> {
    if (this.posixPasswdCache === '') {
      this.generatePosixCache(await this.getAllSorted(tr))
    }
    return this.posixPasswdCache
  }

  public async getGroupEntries(tr: Transaction): Promise<string> {
    if (this.posixGroupCache === '') {
      this.generatePosixCache(await this.getAllSorted(tr))
    }
    return this.posixGroupCache
  }

  public async getByUsername(tr: Transaction, username: string): Promise<User> {
    const query = 'SELECT idx, username, name, uid, shell FROM users WHERE username = $1'
    const result = await tr.query(query, [username])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }
    return this.rowToUser(result.rows[0])
  }

  public async getByUserIdx(tr: Transaction, userIdx: number): Promise<User> {
    const query = 'SELECT idx, username, name, uid, shell FROM users WHERE idx = $1'
    const result = await tr.query(query, [userIdx])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }
    return this.rowToUser(result.rows[0])
  }

  public async getUserIdxByEmailAddress(tr: Transaction, emailLocal: string, emailDomain: string): Promise<number> {
    const query = 'SELECT owner_idx FROM email_addresses WHERE LOWER(address_local) = LOWER($1) AND address_domain = $2'
    const result = await tr.query(query, [emailLocal, emailDomain])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].owner_idx
  }

  public async authenticate(tr: Transaction, username: string, password: string): Promise<number> {
    const query = 'SELECT idx, password_digest, activated FROM users WHERE username = $1'
    const result = await tr.query(query, [username])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }

    if (!result.rows[0].activated) {
      throw new NotActivatedError()
    }

    const idx: number = result.rows[0].idx

    const passwordDigest: string = result.rows[0].password_digest
    const phcObject = phc.deserialize(passwordDigest)
    if (['mssql-sha1', 'mssql-sha512'].includes(phcObject.id)) {
      const nullAppendedPassword = Buffer.from([...password].map(x => x + '\u0000').join(''))
      const hash = crypto.createHash(phcObject.id === 'mssql-sha1' ? 'sha1' : 'sha512')
      hash.update(nullAppendedPassword)
      hash.update(phcObject.salt)
      if (!hash.digest().equals(phcObject.hash)) {
        throw new AuthenticationError()
      }
      await this.changePassword(tr, idx, password)
    } else if (!await argon2.verify(passwordDigest, password)) {
      throw new AuthenticationError()
    }

    await this.model.users.updateLastLoginAt(tr, idx)
    return idx
  }

  public async updateLastLoginAt(tr: Transaction, userIdx: number): Promise<void> {
    const query = 'UPDATE users SET last_login_at = NOW() WHERE idx = $1'
    const result = await tr.query(query, [userIdx])
  }

  public async activate(tr: Transaction, userIdx: number): Promise<void> {
    const query = 'UPDATE users SET activated = TRUE WHERE idx = $1'
    const result = await tr.query(query, [userIdx])
  }

  public async deactivate(tr: Transaction, userIdx: number): Promise<void> {
    const query = 'UPDATE users SET activated = FALSE WHERE idx = $1'
    const result = await tr.query(query, [userIdx])
  }

  public async generateUid(tr: Transaction): Promise<number> {
    tr.ensureHasAccessExclusiveLock('users')
    const minUid = this.model.config.posix.minUid
    const getNewUidResult = await tr.query('SELECT b.uid + 1 AS uid FROM users AS a RIGHT OUTER JOIN ' +
      'users AS b ON a.uid = b.uid + 1 WHERE a.uid IS NULL AND b.uid + 1 >= $1 ORDER BY b.uid LIMIT 1', [minUid])
    return getNewUidResult.rows.length ? getNewUidResult.rows[0].uid : minUid
  }

  public async generatePasswordChangeToken(tr: Transaction, userIdx: number): Promise<string> {
    await this.resetResendCountIfExpired(tr, userIdx)
    const query = 'INSERT INTO password_change_tokens AS p(user_idx, token, expires) VALUES ($1, $2, $3) ' +
    'ON CONFLICT (user_idx) DO UPDATE SET token = $2, resend_count = p.resend_count + 1, expires = $3'
    const randomBytes = await this.asyncRandomBytes(32)
    const token = randomBytes.toString('hex')
    const expires = moment().add(1, 'day').toDate()
    const result = await tr.query(query, [userIdx, token, expires])
    return token
  }

  public async resetResendCountIfExpired(tr: Transaction, userIdx: number): Promise<void> {
    const query = 'UPDATE password_change_tokens SET resend_count = 0 WHERE user_idx = $1 AND expires <= now()'
    await tr.query(query, [userIdx])
  }

  public async getResendCount(tr: Transaction, token: string): Promise<number> {
    const query = 'SELECT resend_count FROM password_change_tokens WHERE token = $1'
    const result = await tr.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].resend_count
  }

  public async removeToken(tr: Transaction, token: string): Promise<number> {
    const query = 'DELETE FROM password_change_tokens WHERE token = $1 RETURNING idx'
    const result = await tr.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async ensureTokenNotExpired(tr: Transaction, token: string): Promise<void> {
    const query = 'SELECT expires FROM password_change_tokens WHERE token = $1'
    const result = await tr.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }

    const expires = result.rows[0].expires

    if (moment().isSameOrAfter(expires)) {
      throw new ExpiredTokenError()
    }
  }

  public async changePassword(tr: Transaction, userIdx: number, newPassword: string): Promise<number> {
    const passwordDigest = await argon2.hash(newPassword)
    const query = 'UPDATE users SET password_digest = $1 WHERE idx = $2 RETURNING idx'
    const result = await tr.query(query, [passwordDigest, userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async changeShell(tr: Transaction, userIdx: number, shell: string): Promise<number> {
    const query = 'UPDATE users SET shell = $1 WHERE idx = $2 RETURNING idx'
    const result = await tr.query(query, [shell, userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    this.posixPasswdCache = ''
    return result.rows[0].idx
  }

  public async getShell(tr: Transaction, userIdx: number): Promise<string> {
    const query = 'SELECT shell FROM users WHERE idx = $1'
    const result = await tr.query(query, [userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].shell
  }

  public async addUserMembership(tr: Transaction, userIdx: number, groupIdx: number): Promise<number> {
    const query = 'INSERT INTO user_memberships(user_idx, group_idx) VALUES ($1, $2) RETURNING idx'
    const result = await tr.query(query, [userIdx, groupIdx])
    return result.rows[0].idx
  }

  public async deleteUserMembership(tr: Transaction, userMembershipIdx: number): Promise<number> {
    const query = 'DELETE FROM user_memberships WHERE idx = $1 RETURNING idx'
    const result = await tr.query(query, [userMembershipIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async hasUserMembership(tr: Transaction, userIdx: number, groupIdx: number): Promise<boolean> {
    try {
      await this.getUserMembership(tr, userIdx, groupIdx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return false
      }
      throw e
    }
    return true
  }

  public async getUserMembership(tr: Transaction, userIdx: number, groupIdx: number): Promise<number> {
    const query = 'SELECT idx FROM user_memberships WHERE user_idx = $1 AND group_idx = $2'
    const result = await tr.query(query, [userIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async getAllUserMemberships(tr: Transaction, userIdx: number): Promise<Array<UserMembership>> {
    const query = 'SELECT idx, user_idx, group_idx FROM user_memberships WHERE user_idx = $1'
    const result = await tr.query(query, [userIdx])
    return result.rows.map(row => this.rowToUserMembership(row))
  }

  public async getAllMembershipUsers(tr: Transaction, groupIdx: number, pagination?: { start: number; count: number }): Promise<Array<User>> {
    let query = 'SELECT u.*, sn.student_number FROM user_memberships AS um INNER JOIN users AS u ' +
      'ON um.user_idx = u.idx INNER JOIN student_numbers AS sn ON sn.owner_idx = u.idx ' +
      'WHERE um.group_idx = $1 ORDER BY um.idx'
    const params = [groupIdx]
    if (pagination != null) {
      if (pagination.count <= 0 || pagination.start <= 0) {
        throw new BadParameterError()
      }
      query += ' LIMIT $2 OFFSET $3'
      params.push(pagination.count, pagination.start)
    }
    const result = await tr.query(query, params)
    return result.rows.map(row => this.rowToUser(row))
  }

  public async addPendingUserMembership(tr: Transaction, userIdx: number, groupIdx: number): Promise<number> {
    const query = 'INSERT INTO pending_user_memberships (user_idx, group_idx) VALUES ($1, $2) RETURNING idx'
    const result = await tr.query(query, [userIdx, groupIdx])
    return result.rows[0].idx
  }

  public async deletePendingUserMembership(tr: Transaction, userMembershipIdx: number): Promise<number> {
    const query = 'DELETE FROM pending_user_memberships WHERE idx = $1 RETURNING idx'
    const result = await tr.query(query, [userMembershipIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async hasPendingUserMembership(tr: Transaction, userIdx: number, groupIdx: number): Promise<boolean> {
    try {
      await this.getPendingUserMembership(tr, userIdx, groupIdx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return false
      }
      throw e
    }
    return true
  }

  public async getPendingUserMembership(tr: Transaction, userIdx: number, groupIdx: number): Promise<number> {
    const query = 'SELECT idx FROM pending_user_memberships WHERE user_idx = $1 AND group_idx = $2'
    const result = await tr.query(query, [userIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async acceptUserMemberships(tr: Transaction, groupIdx: number, userIdx: Array<number>): Promise<number> {
    const query = 'WITH accepted_users AS (DELETE FROM pending_user_memberships ' +
      'WHERE group_idx = $1 AND user_idx = ANY($2) RETURNING user_idx) ' +
      'INSERT INTO user_memberships (user_idx, group_idx) SELECT user_idx, $1 FROM accepted_users ' +
      'RETURNING user_idx'
    const result = await tr.query(query, [groupIdx, userIdx])
    return result.rows.length
  }

  public async rejectUserMemberships(tr: Transaction, groupIdx: number, userIdx: Array<number>): Promise<number> {
    const query1 = 'DELETE FROM pending_user_memberships WHERE group_idx = $1 AND user_idx = ANY($2) RETURNING user_idx'
    const query2 = 'DELETE FROM user_memberships WHERE group_idx = $1 AND user_idx = ANY($2) RETURNING user_idx'
    const result1 = await tr.query(query1, [groupIdx, userIdx])
    const result2 = await tr.query(query2, [groupIdx, userIdx])
    return result1.rows.length + result2.rows.length
  }

  public async getAllPendingMembershipUsers(tr: Transaction, groupIdx: number): Promise<Array<User>> {
    const query = 'SELECT u.*, sn.student_number FROM pending_user_memberships AS pum INNER JOIN users AS u ' +
      'ON pum.user_idx = u.idx INNER JOIN student_numbers AS sn ON sn.owner_idx = u.idx ' +
      'WHERE pum.group_idx = $1 ORDER BY pum.idx'
    const result = await tr.query(query, [groupIdx])
    return result.rows.map(row => this.rowToUser(row))
  }

  public async getUserReachableGroups(tr: Transaction, userIdx: number): Promise<Set<number>> {
    const userMemberships = await this.getAllUserMemberships(tr, userIdx)
    const groupSet = new Set<number>()

    for (const userMembership of userMemberships) {
      const reachableGroups = await this.model.groups.getGroupReachableArray(tr, userMembership.groupIdx)
      reachableGroups.forEach(gi => {
        groupSet.add(gi)
      })
    }

    return groupSet
  }

  public async getUserIdxByPasswordToken(tr: Transaction, token: string): Promise<number> {
    const query = 'SELECT user_idx FROM password_change_tokens WHERE token = $1'
    const result = await tr.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].user_idx
  }

  public async getStudentNumbersByUserIdx(tr: Transaction, userIdx: number): Promise<Array<string>> {
    const query = 'SELECT sn.student_number FROM users u ' +
      'LEFT OUTER JOIN student_numbers AS sn ON sn.owner_idx = u.idx ' +
      'WHERE u.idx = $1'
    const result = await tr.query(query, [userIdx])
    return result.rows.map(row => row.student_number)
  }

  public async addStudentNumber(tr: Transaction, userIdx: number, studentNumber: string): Promise<number> {
    const query = 'INSERT INTO student_numbers(student_number, owner_idx) VALUES ($1, $2) RETURNING idx'
    const result = await tr.query(query, [studentNumber, userIdx])
    return result.rows[0].idx
  }

  private rowToUser(row: any): User {
    const user: User = {
      idx: row.idx,
      username: row.username,
      name: row.name,
      uid: row.uid,
      shell: row.shell,
      preferredLanguage: row.preferred_language,
    }

    if (row.student_number) {
      user.studentNumber = row.student_number
    }

    return user
  }

  private rowToUserMembership(row: any): UserMembership {
    return {
      idx: row.idx,
      userIdx: row.user_idx,
      groupIdx: row.group_idx,
      pending: false,
    }
  }

  private rowToPendingUserMembership(row: any): UserMembership {
    return {
      idx: row.idx,
      userIdx: row.user_idx,
      groupIdx: row.group_idx,
      pending: true,
    }
  }

  private asyncRandomBytes(n: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(n, (err, buf) => {
        if (err) {
          reject(err)
          return
        }
        resolve(buf)
      })
    })
  }

  // Set posix{Passwd, Group}Cache based on the user array. Should be sorted.
  private generatePosixCache(users: Array<User>): void {
    let passwd = ''
    let group = `${this.model.config.posix.userGroupName}:x:${this.model.config.posix.userGroupGid}:`

    const usernames: Array<string> = []
    users.forEach(user => {
      if (user.username) {
        passwd +=
          `${user.username}:x:${user.uid.toString()}:` +
          `${this.model.config.posix.userGroupGid}:${user.name}:` +
          `${this.model.config.posix.homeDirectoryPrefix}/${user.username}:` +
          `${user.shell}\n`
        usernames.push(user.username)
      }
    })
    group += usernames.join(',')

    if (passwd !== this.posixPasswdCache) {
      this.posixPasswdCache = passwd
      this.posixGroupCache = group
      this.posixLastModified = new Date()
    }
  }
}
