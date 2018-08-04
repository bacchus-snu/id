import Model from './model'
import { PoolClient } from 'pg'

export default class Users {
  constructor(private readonly model: Model) {
  }

  public async create(_client: PoolClient, username: string, name: string, password: string): Promise<void> {
    const query = 'INSERT INTO users(username, name, password) VALUES ($1, $2, $3)'
    const values = [username, name, password]
    // await client.query(query, values)
    this.model.log.info(`INSERTING ${username}, ${name}, ${password}`)
  }
}
