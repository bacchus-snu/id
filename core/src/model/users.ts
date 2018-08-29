import Model from './model'
import { PoolClient } from 'pg'
import { NoSuchEntryError, AuthenticationError, NotActivatedError, ExpiredTokenError } from './errors'
import * as argon2 from 'argon2'
import * as moment from 'moment'
import * as crypto from 'crypto'

// see language enum in schema.sql
export type Language = 'ko' | 'en'

export interface User {
  idx: number
  username: string | null
  name: string
  uid: number | null
  shell: string
  preferredLanguage: Language
}

export interface UserMembership {
  userIdx: number
  groupIdx: number
}

export default class Users {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, username: string, password: string,
      name: string, primaryEmailAddressIdx: number, shell: string, preferredLanguage: Language): Promise<number> {
    const query = 'INSERT INTO users(username, password_digest, name, primary_email_address_idx, shell, ' +
      'preferred_language) VALUES ($1, $2, $3, $4, $5, $6) RETURNING idx'
    const passwordDigest = await argon2.hash(password)
    const result = await client.query(query, [username, passwordDigest, name,
      primaryEmailAddressIdx, shell, preferredLanguage])
    return result.rows[0].idx
  }

  public async delete(client: PoolClient, userIdx: number): Promise<number> {
    const query = 'DELETE FROM users WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async getAll(client: PoolClient): Promise<Array<User>> {
    const query = 'SELECT idx, username, name, uid, shell FROM users'
    const result = await client.query(query)
    const users: Array<User> = []
    result.rows.forEach(row => users.push(this.rowToUser(row)))
    return users
  }

  public async getByUsername(client: PoolClient, username: string): Promise<User> {
    const query = 'SELECT idx, username, name, uid, shell FROM users WHERE username = $1'
    const result = await client.query(query, [username])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }
    return this.rowToUser(result.rows[0])
  }

  public async getByUserIdx(client: PoolClient, userIdx: number): Promise<User> {
    const query = 'SELECT idx, username, name, uid, shell FROM users WHERE idx = $1'
    const result = await client.query(query, [userIdx])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }
    return this.rowToUser(result.rows[0])
  }

  public async getUserIdxByEmailAddress(client: PoolClient, emailLocal: string, emailDomain: string): Promise<number> {
    const query = 'SELECT owner_idx FROM email_addresses WHERE address_local = $1 AND address_domain = $2'
    const result = await client.query(query, [emailLocal, emailDomain])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].owner_idx
  }

  public async authenticate(client: PoolClient, username: string, password: string): Promise<number> {
    const query = 'SELECT idx, password_digest, activated FROM users WHERE username = $1'
    const result = await client.query(query, [username])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }

    if (!result.rows[0].activated) {
      throw new NotActivatedError()
    }

    const passwordDigest = result.rows[0].password_digest
    if (!await argon2.verify(passwordDigest, password)) {
      throw new AuthenticationError()
    }

    return result.rows[0].idx
  }

  public async activate(client: PoolClient, userIdx: number): Promise<void> {
    const query = 'UPDATE users SET activated = TRUE WHERE idx = $1'
    const result = await client.query(query, [userIdx])
  }

  public async deactivate(client: PoolClient, userIdx: number): Promise<void> {
    const query = 'UPDATE users SET activated = FALSE WHERE idx = $1'
    const result = await client.query(query, [userIdx])
  }

  public async assignUid(client: PoolClient, userIdx: number, minUid: number): Promise<void> {
    const getNewUidResult = await client.query('SELECT b.uid + 1 AS uid FROM users AS a RIGHT OUTER JOIN ' +
      'users AS b ON a.uid = b.uid + 1 WHERE a.uid IS NULL ORDER BY b.uid LIMIT 1')
    if (getNewUidResult.rows.length !== 1) {
      throw new Error('Failed to assign posix uid')
    }
    const newUid = getNewUidResult.rows[0].uid === null ? minUid : getNewUidResult.rows[0].uid
    const assignResult = await client.query('UPDATE users SET uid = $1 WHERE idx = $2 AND uid IS NULL',
      [newUid, userIdx])
  }

  public async generatePasswordChangeToken(client: PoolClient, userIdx: number): Promise<string> {
    await this.resetResendCountIfExpired(client, userIdx)
    const query = 'INSERT INTO password_change_tokens AS p(user_idx, token, expires) VALUES ($1, $2, $3) ' +
    'ON CONFLICT (user_idx) DO UPDATE SET token = $2, resend_count = p.resend_count + 1'
    const randomBytes = await this.asyncRandomBytes(32)
    const token = randomBytes.toString('hex')
    const expires = moment().add(1, 'day').toDate()
    const result = await client.query(query, [userIdx, token, expires])
    return token
  }

  public async resetResendCountIfExpired(client: PoolClient, userIdx: number): Promise<void> {
    const query = 'UPDATE password_change_tokens SET resend_count = 0 WHERE user_idx = $1 AND expires <= now()'
    await client.query(query, [userIdx])
  }

  public async getResendCount(client: PoolClient, token: string): Promise<number> {
    const query = 'SELECT resend_count FROM password_change_tokens WHERE token = $1'
    const result = await client.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].resend_count
  }

  public async removeToken(client: PoolClient, token: string): Promise<number> {
    const query = 'DELETE FROM password_change_tokens WHERE token = $1 RETURNING idx'
    const result = await client.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async ensureTokenNotExpired(client: PoolClient, token: string): Promise<void> {
    const query = 'SELECT expires FROM password_change_tokens WHERE token = $1'
    const result = await client.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }

    const expires = result.rows[0].expires

    if (moment().isSameOrAfter(expires)) {
      throw new ExpiredTokenError()
    }
  }

  public async changePassword(client: PoolClient, userIdx: number, newPassword: string): Promise<number> {
    const passwordDigest = await argon2.hash(newPassword)
    const query = 'UPDATE users SET password_digest = $1 WHERE idx = $2 RETURNING idx'
    const result = await client.query(query, [passwordDigest, userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async changeShell(client: PoolClient, userIdx: number, shell: string): Promise<number> {
    const query = 'UPDATE users SET shell = $1 WHERE idx = $2 RETURNING idx'
    const result = await client.query(query, [shell, userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async getShell(client: PoolClient, userIdx: number): Promise<string> {
    const query = 'SELECT shell FROM users WHERE idx = $1'
    const result = await client.query(query, [userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].shell
  }

  public async addUserMembership(client: PoolClient, userIdx: number, groupIdx: number): Promise<number> {
    const query = 'INSERT INTO user_memberships(user_idx, group_idx) VALUES ($1, $2) RETURNING idx'
    const result = await client.query(query, [userIdx, groupIdx])
    return result.rows[0].idx
  }

  public async deleteUserMembership(client: PoolClient, userMembershipIdx: number): Promise<number> {
    const query = 'DELETE FROM user_memberships WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [userMembershipIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async getAllUserMemberships(client: PoolClient, userIdx: number): Promise<Array<UserMembership>> {
    const query = 'SELECT user_idx, group_idx FROM user_memberships WHERE user_idx = $1'
    const result = await client.query(query, [userIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows.map(row => this.rowToUserMembership(row))
  }

  public async getUserReachableGroups(client: PoolClient, userIdx: number): Promise<Set<number>> {
    const userMemberships = await this.getAllUserMemberships(client, userIdx)
    const groupSet = new Set<number>()

    for (const userMembership of userMemberships) {
      const reachableGroups = await this.model.groups.getGroupReachableArray(client, userMembership.groupIdx)
      reachableGroups.forEach(gi => {
        groupSet.add(gi)
      })
    }

    return groupSet
  }

  public async getUserIdxByPasswordToken(client: PoolClient, token: string): Promise<number> {
    const query = 'SELECT user_idx FROM password_change_tokens WHERE token = $1'
    const result = await client.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].user_idx
  }

  private rowToUser(row: any): User {
    return {
      idx: row.idx,
      username: row.username,
      name: row.name,
      uid: row.uid,
      shell: row.shell,
      preferredLanguage: row.preferred_language,
    }
  }

  private rowToUserMembership(row: any): UserMembership {
    return {
      userIdx: row.user_idx,
      groupIdx: row.group_idx,
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
}
