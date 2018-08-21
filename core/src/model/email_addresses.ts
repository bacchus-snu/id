import Model from './model'
import { NoSuchEntryError } from './errors'
import { PoolClient } from 'pg'
import * as crypto from 'crypto'
import * as moment from 'moment'

export interface EmailAddress {
  local: string
  domain: string
}

export default class EmailAddresses {
  constructor(private readonly model: Model) {
  }

  /**
   * Create an email address record.
   * @param client provides access to the database
   * @param local local part of the address
   * @param domain domain part of the address
   * @return promise of the index of the new record
   */
  public async create(client: PoolClient, local: string, domain: string): Promise<number> {
    const query = 'INSERT INTO email_addresses(address_local, address_domain) VALUES ($1, $2) RETURNING idx'
    const result = await client.query(query, [local, domain])
    const idx = result.rows[0].idx
    await this.generateVerificationToken(client, idx)
    return idx
  }

  public async validate(client: PoolClient, userIdx: number, emailAddressIdx: number): Promise<void> {
    const query = 'UPDATE email_addresses SET owner_idx = $1 WHERE idx = $2'
    await client.query(query, [userIdx, emailAddressIdx])
  }

  public async generateVerificationToken(client: PoolClient, emailIdx: number): Promise<number> {
    const query = 'INSERT INTO email_verification_token(email_idx, token, expires) VALUES ($1, $2, $3) RETURNING idx'
    const token = crypto.randomBytes(32).toString('hex')
    const expires = moment().add(1, 'day').toDate()
    const result = await client.query(query, [emailIdx, token, expires])
    return result.rows[0].idx
  }

  public async getEmailAddressByToken(client: PoolClient, token: string): Promise<EmailAddress> {
    const query = 'SELECT e.address_local, e.address_domain FROM email_addresses AS e' +
    ' INNER JOIN email_verification_token AS v ON v.token = $1 AND v.email_idx = e.idx'
    const result = await client.query(query, [token])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    const ret: EmailAddress = {
      local: result.rows[0].address_local,
      domain: result.rows[0].address_domain,
    }
    return ret
  }
}
