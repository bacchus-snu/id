import { PoolClient } from 'pg'

export default class Users {
  public async create(client: PoolClient, username: string, passwordDigest: string,
      name: string, primaryEmailAddressIdx: number): Promise<number> {
    const query = 'INSERT INTO users(username, password_digest, name, primary_email_address_idx)' +
      'VALUES ($1, $2, $3, $4) RETURNING user_idx'
    const result = await client.query(query, [username, passwordDigest, name, primaryEmailAddressIdx])
    return result.rows[0].user_idx
  }
}
