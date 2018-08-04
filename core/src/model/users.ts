import { PoolClient } from 'pg'

export default class Users {
  public async create(client: PoolClient, username: string, name: string, password: string): Promise<void> {
    const query = 'INSERT INTO users(username, name, password) VALUES ($1, $2, $3)'
    const values = [username, name, password]
    await client.query(query, values)
  }
}
