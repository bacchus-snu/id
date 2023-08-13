// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Account } from 'oidc-provider';

interface Profile {
  name: string;
  username: string;
  student_id: string;
}

class OIDCAccount implements Account {
  [key: string]: unknown;

  constructor(
    public accountId: string,
    public profile: Profile,
    public email: string,
    public groups: Array<string>,
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
      name: this.profile.name,
      username: this.profile.username,
      student_id: this.profile.student_id,
      email: this.email,
      groups: this.groups,
    };
  }
}

export default OIDCAccount;
