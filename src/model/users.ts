interface User {
  userId?: number;
  name?: string;
  passwordDigest?: Buffer | null;
  blocked?: boolean;
  blockedExpireAfter?: Date | null;
  realname?: string | null;
  snuidBachelor?: string | null;
  snuidMaster?: string | null;
  snuidDoctor?: string | null;
  resetToken?: string | null;
  resetExpireAfter?: Date | null;
  uid?: number | null;
  shellId?: number | null;
  primaryEmailAddressId?: number | null;
}

export default User;
