import Model from './model'
import { PoolClient } from 'pg'

export default class Shells {
  constructor(private readonly model: Model) {
  }

  public async getShells(client: PoolClient): Promise<Array<string>> {
    const query = 'SELECT shell from shells'
    const result = await client.query(query)
    return result.rows.map(row => row.shell)
  }

  public async addShell(client: PoolClient, shell: string): Promise<void> {
    const query = 'INSERT INTO shells(shell) VALUES ($1)'
    const result = await client.query(query, [shell])
  }

  public async removeShell(client: PoolClient, shell: string): Promise<void> {
    const query = 'DELETE FROM shells WHERE shell = $1'
    const result = await client.query(query, [shell])
  }
}
