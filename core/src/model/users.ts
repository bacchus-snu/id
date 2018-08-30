import Model from './model'
import { PoolClient } from 'pg'
import { NoSuchEntryError, AuthenticationError, NotActivatedError } from './errors'
import * as argon2 from 'argon2'
import * as phc from '@phc/format'
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
      name: string, shell: string, preferredLanguage: Language): Promise<number> {
    const query = 'INSERT INTO users(username, password_digest, name, shell, preferred_language) ' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING idx'
    const passwordDigest = await argon2.hash(password)
    const result = await client.query(query, [username, passwordDigest, name, shell, preferredLanguage])
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

  public async authenticate(client: PoolClient, username: string, password: string): Promise<number> {
    const query = 'SELECT idx, password_digest, activated FROM users WHERE username = $1'
    const result = await client.query(query, [username])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }

    if (!result.rows[0].activated) {
      throw new NotActivatedError()
    }

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
    } else if (!await argon2.verify(passwordDigest, password)) {
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
}
