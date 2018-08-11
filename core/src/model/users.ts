import Model from './model'
import { PoolClient } from 'pg'
import { NoSuchEntryError, AuthenticationError } from './errors'
import * as argon2 from 'argon2'

// see language enum in schema.sql
export type Language = 'ko' | 'en'

export interface User {
  user_idx: number
  username: string | null
  name: string
  uid: number | null
  shell: string
  preferred_language: Language
}

export default class Users {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, username: string, password: string,
      name: string, primaryEmailAddressIdx: number, shell: string): Promise<number> {
    const query = 'INSERT INTO users(username, password_digest, name, primary_email_address_idx, shell)' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING user_idx'
    const passwordDigest = await argon2.hash(password)
    const result = await client.query(query, [username, passwordDigest, name,
      primaryEmailAddressIdx, shell])
    return result.rows[0].user_idx
  }

  public async delete(client: PoolClient, userIdx: string): Promise<number> {
    const query = 'DELETE FROM users WHERE user_idx = $1 RETURNING user_idx'
    const result = await client.query(query, [userIdx])
    return result.rows[0].user_idx
  }

  public async getAll(client: PoolClient): Promise<Array<User>> {
    const query = 'SELECT user_idx, username, name, uid, shell FROM users'
    const result = await client.query(query)
    const users: Array<User> = []
    result.rows.forEach(row => users.push(this.rowToUser(row)))
    return users
  }

  public async getByUsername(client: PoolClient, username: string): Promise<User> {
    const query = 'SELECT user_idx, username, name, uid, shell FROM users WHERE username = $1'
    const result = await client.query(query, [username])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }
    return this.rowToUser(result.rows[0])
  }

  public async getByUserIdx(client: PoolClient, userIdx: number): Promise<User> {
    const query = 'SELECT user_idx, username, name, uid, shell FROM users WHERE user_idx = $1'
    const result = await client.query(query, [userIdx])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }
    return this.rowToUser(result.rows[0])
  }

  public async authenticate(client: PoolClient, username: string, password: string): Promise<void> {
    const query = 'SELECT user_idx, password_digest FROM users WHERE username = $1'
    const result = await client.query(query, [username])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }

    const passwordDigest = result.rows[0].password_digest

    if (!await argon2.verify(passwordDigest, password)) {
      throw new AuthenticationError()
    }
  }

  public async assignUid(client: PoolClient, userIdx: number, minUid: number): Promise<void> {
    const getNewUidResult = await client.query('SELECT b.uid + 1 AS uid FROM users AS a RIGHT OUTER JOIN ' +
      'users AS b ON a.uid = b.uid + 1 WHERE a.uid IS NULL ORDER BY b.uid LIMIT 1')
    if (getNewUidResult.rows.length !== 1) {
      throw new Error('Failed to assign posix uid')
    }
    const newUid = getNewUidResult.rows[0].uid === null ? minUid : getNewUidResult.rows[0].uid
    const assignResult = await client.query('UPDATE users SET uid = $1 WHERE user_idx = $2 AND uid IS NULL',
      [newUid, userIdx])
  }

  public async addUserMembership(client: PoolClient, userIdx: number, groupIdx: number): Promise<number> {
    const query = 'INSERT INTO user_memberships(user_idx, group_idx) VALUES ($1, $2) RETURNING user_membership_idx'
    const result = await client.query(query, [userIdx, groupIdx])
    return result.rows[0].user_membership_idx
  }

  public async deleteUserMembership(client: PoolClient, userMembershipIdx: number): Promise<number> {
    const query = 'DELETE FROM user_memberships WHERE user_membership_idx = $1 RETURNING user_membership_idx'
    const result = await client.query(query, [userMembershipIdx])
    return result.rows[0].user_membership_idx
  }

  private rowToUser(row: any): User {
    return {
      user_idx: row.user_idx,
      username: row.username,
      name: row.name,
      uid: row.uid,
      shell: row.shell,
      preferred_language: row.preferred_language,
    }
  }
}
