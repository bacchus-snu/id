import type { AllClientMetadata } from 'oidc-provider';

import { NoSuchEntryError } from './errors.js';
import Transaction from './transaction.js';

export default class OAuth {
  public async getClientById(tr: Transaction, id: string): Promise<AllClientMetadata> {
    const client = await tr.query<
      { client_id: string; client_secret: string; client_name: string }
    >(
      'SELECT client_id, client_secret, client_name FROM oauth_clients WHERE client_id = $1',
      [id],
    );
    const redirectUri = await tr.query<{ redirect_uri: string }>(
      'SELECT redirect_uri FROM oauth_client_redirect_uris WHERE client_id = $1',
      [id],
    );
    if (client.rows.length !== 1) {
      throw new NoSuchEntryError();
    }

    return {
      client_id: client.rows[0].client_id,
      client_secret: client.rows[0].client_secret,
      client_name: client.rows[0].client_name,
      redirect_uris: redirectUri.rows.map(row => row.redirect_uri),
      id_token_signed_response_alg: 'ES256',
    };
  }

  public async isFirstParty(tr: Transaction, id: string): Promise<boolean> {
    const result = await tr.query<{ first_party: boolean }>(
      'SELECT first_party FROM oauth_clients WHERE client_id = $1',
      [
        id,
      ],
    );
    return Boolean(result.rows[0]?.first_party);
  }
}
