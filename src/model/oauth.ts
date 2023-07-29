// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { AllClientMetadata } from 'oidc-provider'

import { NoSuchEntryError } from './errors'
import Transaction from './transaction'

export default class OAuth {
  public async getClientById(tr: Transaction, id: string): Promise<AllClientMetadata> {
    const client = await tr.query('SELECT client_id, client_secret, client_name FROM oauth_client WHERE client_id = $1', [id])
    const redirectUri = await tr.query('SELECT redirect_uri FROM oauth_client_redirect_uris WHERE client_id = $1', [id])
    if (client.rows.length !== 1) {
      throw new NoSuchEntryError()
    }

    return {
      client_id: client.rows[0].client_id,
      client_secret: client.rows[0].client_secret,
      client_name: client.rows[0].client_name,
      redirect_uris: redirectUri.rows.map(row => row.redirect_uri),
    }
  }

  public async isFirstParty(tr: Transaction, id: string): Promise<boolean> {
    const result = await tr.query('SELECT first_party FROM oauth_client WHERE client_id = $1', [id])
    return Boolean(result.rows[0]?.first_party)
  }
}
