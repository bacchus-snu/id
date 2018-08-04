import Model from './model'
import { PoolClient } from 'pg'
import config from '../config'

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
}
