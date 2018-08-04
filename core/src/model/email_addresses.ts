import { PoolClient } from 'pg'

export default class EmailAddresses {
  /**
   * Create an email address record.
   * @param client provides access to the database
   * @param local local part of the address
   * @param domain domain part of the address
   * @return promise of the index of the new record
   */
  public async create(client: PoolClient, local: string, domain: string): Promise<number> {
    const query = 'INSERT INTO email_addresses(address_local, address_domain) VALUES ($1, $2)' +
      'RETURNING email_address_idx'
    const result = await client.query(query, [local, domain])
    return result.rows[0].email_address_idx
  }
}
