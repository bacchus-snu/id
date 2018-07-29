import Model from './model'

export default class Users {
  constructor(private readonly model: Model) {
  }

  public async create(username: string, name: string, password: string): Promise<void> {
    const query = 'INSERT INTO users(username, name, password) VALUES ($1, $2, $3)'
    const values = [username, name, password]
    await this.model.pgClient.query(query, values)
  }
}
