import Transaction from './transaction.js';

export default class Shells {
  constructor() {
  }

  public async getShells(tr: Transaction): Promise<Array<string>> {
    const query = 'SELECT shell from shells';
    const result = await tr.query<{ shell: string }>(query);
    return result.rows.map(row => row.shell);
  }

  public async addShell(tr: Transaction, shell: string): Promise<void> {
    const query = 'INSERT INTO shells(shell) VALUES ($1)';
    await tr.query(query, [shell]);
  }

  public async removeShell(tr: Transaction, shell: string): Promise<void> {
    const query = 'DELETE FROM shells WHERE shell = $1';
    await tr.query(query, [shell]);
  }
}
