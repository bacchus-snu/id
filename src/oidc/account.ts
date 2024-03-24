import type { Account } from 'oidc-provider';

class OIDCAccount implements Account {
  [key: string]: unknown;

  constructor(
    public accountId: string,
    public username: string,
    public groups: Array<string>,
    public name: string,
    public student_id: string,
    public email: string,
  ) {}

  /**
   * @param use - can either be "id_token" or "userinfo", depending on
   *   where the specific claims are intended to be put in.
   * @param scope - the intended scope, while oidc-provider will mask
   *   claims depending on the scope automatically you might want to skip
   *   loading some claims from external resources etc. based on this detail
   *   or not return them in id tokens but only userinfo and so on.
   */
  async claims() {
    return {
      sub: this.accountId,
      username: this.username,
      groups: this.groups,
      name: this.name,
      student_id: this.student_id,
      email: this.email,
    };
  }
}

export default OIDCAccount;
