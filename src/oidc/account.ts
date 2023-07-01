// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Account } from 'oidc-provider'
import Model from '../model/model'

class OIDCAccount implements Account {
  [key: string]: unknown

  constructor(public accountId: string) {}

  /**
   * @param use - can either be "id_token" or "userinfo", depending on
   *   where the specific claims are intended to be put in.
   * @param scope - the intended scope, while oidc-provider will mask
   *   claims depending on the scope automatically you might want to skip
   *   loading some claims from external resources etc. based on this detail
   *   or not return them in id tokens but only userinfo and so on.
   */
  async claims() { return { sub: this.accountId } }

  static async findByLogin(model: Model, username: string, password: string) {
    const accountId = await model.pgDo(async tr => {
      return model.users.authenticate(tr, username, password)
    })

    return new this(String(accountId))
  }
}

export default OIDCAccount
