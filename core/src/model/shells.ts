import Model from './model'
import Transaction from './transaction'

export default class Shells {
  constructor(private readonly model: Model) {
  }

  public async getShells(tr: Transaction): Promise<Array<string>> {
    const query = 'SELECT shell from shells'
    const result = await tr.query(query)
    return result.rows.map(row => row.shell)
  }

  public async addShell(tr: Transaction, shell: string): Promise<void> {
    const query = 'INSERT INTO shells(shell) VALUES ($1)'
    const result = await tr.query(query, [shell])
  }

  public async removeShell(tr: Transaction, shell: string): Promise<void> {
    const query = 'DELETE FROM shells WHERE shell = $1'
    const result = await tr.query(query, [shell])
  }
}
