import { Client } from './utils';

interface EmailAddress {
  userId: number;
  addressLocal: string;
  addressDomain: string;
  verified: boolean;
}

interface StoredEmailAddress extends EmailAddress {
  emailAddressId: number;
}

class EmailAddressModel implements StoredEmailAddress {

}

export function insert(client: Client, emailAddress: EmailAddress): Promise<void> {

}

export function byEmailAddressId(client: Client, id: number): Promise<EmailAddressModel> {

}

export function byAddress(client: Client, local: string, domain: string):
  Promise<EmailAddressModel> {

}

export function list(client: Client, length?: number, after?: number,
 condition?: StoredEmailAddress): Promise<Array<EmailAddressModel>> {
 return null;
}
