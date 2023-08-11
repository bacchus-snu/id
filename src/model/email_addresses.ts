import * as crypto from 'crypto';
import moment from 'moment';
import { ExpiredTokenError, NoSuchEntryError } from './errors';
import Model from './model';
import Transaction from './transaction';

export interface EmailAddress {
  local: string;
  domain: string;
}

export default class EmailAddresses {
  constructor(private readonly model: Model) {
  }

  /**
   * Create an email address record.
   * @param tr provides access to the database
   * @param local local part of the address
   * @param domain domain part of the address
   * @return promise of the index of the new record
   */
  public async create(tr: Transaction, local: string, domain: string): Promise<number> {
    const query = 'INSERT INTO email_addresses(address_local, address_domain) VALUES ($1, $2) '
      + 'ON CONFLICT (LOWER(address_local), LOWER(address_domain)) DO UPDATE SET address_local = $1 RETURNING idx';
    const result = await tr.query(query, [local, domain]);
    const idx = result.rows[0].idx;
    return idx;
  }

  public async getIdxByAddress(tr: Transaction, local: string, domain: string): Promise<number> {
    const query = 'SELECT idx FROM email_addresses WHERE LOWER(address_local) = LOWER($1)'
      + ' AND LOWER(address_domain) = LOWER($2)';
    const result = await tr.query(query, [local, domain]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    return result.rows[0].idx;
  }

  public async validate(tr: Transaction, userIdx: number, emailAddressIdx: number): Promise<void> {
    const query = 'UPDATE email_addresses SET owner_idx = $1 WHERE idx = $2';
    await tr.query(query, [userIdx, emailAddressIdx]);
  }

  public async isValidatedEmail(tr: Transaction, emailAddressIdx: number): Promise<boolean> {
    const query = 'SELECT owner_idx FROM email_addresses WHERE idx = $1';
    const result = await tr.query(query, [emailAddressIdx]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    if (result.rows[0].owner_idx) {
      return true;
    }
    return false;
  }

  public async generateVerificationToken(tr: Transaction, emailIdx: number): Promise<string> {
    await this.resetResendCountIfExpired(tr, emailIdx);
    const query =
      'INSERT INTO email_verification_tokens AS e(email_idx, token, expires) VALUES ($1, $2, $3) '
      + 'ON CONFLICT (email_idx) DO UPDATE SET token = $2, resend_count = e.resend_count + 1, expires = $3';
    const randomBytes = await this.asyncRandomBytes(32);
    const token = randomBytes.toString('hex');
    const expires = moment().add(1, 'day').toDate();
    const result = await tr.query(query, [emailIdx, token, expires]);
    return token;
  }

  public async resetResendCountIfExpired(tr: Transaction, emailIdx: number): Promise<void> {
    const query =
      'UPDATE email_verification_tokens SET resend_count = 0 WHERE email_idx = $1 AND expires <= now()';
    await tr.query(query, [emailIdx]);
  }

  public async getResendCount(tr: Transaction, token: string): Promise<number> {
    const query = 'SELECT resend_count FROM email_verification_tokens WHERE token = $1';
    const result = await tr.query(query, [token]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    return result.rows[0].resend_count;
  }

  public async getEmailAddressByToken(tr: Transaction, token: string): Promise<EmailAddress> {
    const query = 'SELECT e.address_local AS address_local, e.address_domain AS address_domain'
      + ' FROM email_addresses AS e'
      + ' INNER JOIN email_verification_tokens AS v ON v.token = $1 AND v.email_idx = e.idx';
    const result = await tr.query(query, [token]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    const ret: EmailAddress = {
      local: result.rows[0].address_local,
      domain: result.rows[0].address_domain,
    };
    return ret;
  }

  public async removeToken(tr: Transaction, token: string): Promise<number> {
    const query = 'DELETE FROM email_verification_tokens WHERE token = $1 RETURNING idx';
    const result = await tr.query(query, [token]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    return result.rows[0].idx;
  }

  public async ensureTokenNotExpired(tr: Transaction, token: string): Promise<void> {
    const query = 'SELECT expires FROM email_verification_tokens WHERE token = $1';
    const result = await tr.query(query, [token]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }

    const expires = result.rows[0].expires;

    if (moment().isSameOrAfter(expires)) {
      throw new ExpiredTokenError();
    }
  }

  public async getEmailsByOwnerIdx(
    tr: Transaction,
    ownerIdx: number,
  ): Promise<Array<EmailAddress>> {
    const query = 'SELECT address_local, address_domain FROM email_addresses WHERE owner_idx = $1';
    const result = await tr.query(query, [ownerIdx]);

    return result.rows.map(row => ({
      local: row.address_local,
      domain: row.address_domain,
    }));
  }

  private asyncRandomBytes(n: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(n, (err, buf) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(buf);
      });
    });
  }
}
