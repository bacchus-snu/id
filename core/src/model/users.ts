import Model from './model'
import { PoolClient } from 'pg'
import config from '../config'

interface User {
  idx: number
  username: string | null
  passwordDigest: string | null
  name: string
  uid: number | null
  shell: string
}

export default class Users {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, username: string, passwordDigest: string,
      name: string, primaryEmailAddressIdx: number): Promise<number> {
    const query = 'INSERT INTO users(username, password_digest, name, primary_email_address_idx, shell)' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING user_idx'
    const result = await client.query(query, [username, passwordDigest, name,
      primaryEmailAddressIdx, config.posix.defaultShell])
    return result.rows[0].user_idx
  }

  public async getAll(client: PoolClient): Promise<Array<User>> {
    const query = 'SELECT * FROM users'
    const result = await client.query(query)
    const users = []
    for (const row of result.rows) {
      users.push({
        idx: row.user_idx,
        username: row.username,
        passwordDigest: row.password_digest,
        name: row.name,
        uid: row.uid,
        shell: row.shell,
      })
    }
    return users
  }
}
