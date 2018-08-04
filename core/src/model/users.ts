import Model from './model'
import { PoolClient } from 'pg'
import { NoSuchEntryError } from './errors'

export interface User {
  user_idx: number
  username: string | null
  name: string
  uid: number | null
  shell: string
}

export default class Users {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, username: string, passwordDigest: string,
      name: string, primaryEmailAddressIdx: number, shell: string): Promise<number> {
    const query = 'INSERT INTO users(username, password_digest, name, primary_email_address_idx, shell)' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING user_idx'
    const result = await client.query(query, [username, passwordDigest, name,
      primaryEmailAddressIdx, shell])
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

  public async authenticate(client: PoolClient, username: string, passwordDigest: string): Promise<User> {
    const query = 'SELECT user_idx FROM users WHERE username = $1 and password_digest = $2'
    const result = await client.query(query, [username, passwordDigest])
    if (result.rows.length !== 1) {
      throw new NoSuchEntryError()
    }
    return this.rowToUser(result.rows[0])
  }

  private rowToUser(row: any): User {
    return {
      user_idx: row.user_idx,
      username: row.username,
      name: row.name,
      uid: row.uid,
      shell: row.shell,
    }
  }
}
