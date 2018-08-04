import Model from './model'

export default class EmailAddresses {
  constructor(private readonly model: Model) {
  }

  /**
   * Create an email address record.
   * @param local local part of the address
   * @param domain domain part of the address
   * @return promise of the index of the new record
   */
  public async create(local: string, domain: string): Promise<() => number> {
    const query = 'INSERT INTO email_addresses(address_local, address_domain) VALUES ($1, $2)'
    const result = await this.model.pgClient.query(query, [local, domain])
    return () => result.rows[0].email_address_idx
  }
}
