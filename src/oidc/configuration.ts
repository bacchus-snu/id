// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Configuration } from 'oidc-provider';
import Config from '../config';
import type Model from '../model/model';
import OIDCAccount from './account';
import AdapterFactory from './adapter';

const claims = {
  openid: ['sub', 'username', 'groups'],
  profile: ['name', 'student_id'],
  email: ['email'],
};

export default function createOIDCConfig(model: Model, oidcConfig: Config['oidc']): Configuration {
  let adapter;
  if (oidcConfig.redisURL) {
    adapter = AdapterFactory(oidcConfig.redisURL, model);
  }

  return {
    adapter,
    findAccount: async (_ctx, id) => {
      const [username, groups, name, student_id, email] = await model.pgDo(async tr => {
        // get name and username
        const userResult = await model.users.getByUserIdx(tr, Number(id));
        if (!userResult.name || !userResult.username) {
          throw new Error('name or username empty');
        }
        const username = userResult.username;
        const name = userResult.name;

        // ~84: YYXX-NNNN, 85 ~ 99: YYXXX-NNN, 00 ~: YYYY-NNNNN
        // get student id, hard-coded by ataching '19' and sorting
        const sidResult = await model.users.getStudentNumbersByUserIdx(tr, Number(id));
        const student_id = sidResult
          .map(sid => ({
            sid,
            year: Number(sid.length === 9 ? `19${sid.substring(0, 2)}` : sid.substring(0, 4)),
          }))
          .sort((a, b) => b.year - a.year)
          .map(({ sid }) => sid)[0] ?? '';

        // get email, hard-coded, 1. snu.ac.kr, 2. last row
        const emailResult = await model.emailAddresses.getEmailsByOwnerIdx(tr, Number(id));
        if (emailResult.length === 0) {
          throw new Error('no email');
        }
        const { local: emailLocal, domain: emailDomain } = emailResult.find(({ domain }) =>
          domain === 'snu.ac.kr'
        )
          ?? emailResult[emailResult.length - 1];
        const email = `${emailLocal}@${emailDomain}`;

        // get groups
        const groupSet = await model.users.getUserReachableGroups(tr, Number(id));
        const groupResult = await tr.query<{ identifier: string }>(
          'SELECT identifier FROM groups WHERE idx = ANY($1)',
          [[
            ...groupSet,
          ]],
        );
        const groups = groupResult.rows.map(r => r.identifier);

        return [username, groups, name, student_id, email];
      });

      return new OIDCAccount(id, username, groups, name, student_id, email);
    },
    async loadExistingGrant(ctx) {
      if (!ctx.oidc.client || !ctx.oidc.session || !ctx.oidc.result) {
        return undefined;
      }

      const clientId = ctx.oidc.client.clientId;
      const grantId = ctx.oidc.result.consent?.grantId
        || ctx.oidc.session.grantIdFor(ctx.oidc.client.clientId);

      if (grantId) {
        // keep grant expiry aligned with session expiry
        // to prevent consent prompt being requested when grant expires
        const grant = await ctx.oidc.provider.Grant.find(grantId);

        // this aligns the Grant ttl with that of the current session
        // if the same Grant is used for multiple sessions, or is set
        // to never expire, you probably do not want this in your code
        if (grant && ctx.oidc.account && (!grant.exp || grant.exp < ctx.oidc.session.exp)) {
          grant.exp = ctx.oidc.session.exp;

          await grant.save();
        }

        return grant;
      } else {
        const isFirstParty = await model.pgDo(tr => model.oauth.isFirstParty(tr, clientId));
        if (isFirstParty) {
          const grant = new ctx.oidc.provider.Grant({
            clientId: clientId,
            accountId: ctx.oidc.session.accountId,
          });

          grant.addOIDCScope('openid profile email groups');
          grant.addOIDCClaims([
            ...claims.openid,
            ...claims.profile,
            ...claims.email,
          ]);
          await grant.save();
          return grant;
        }
      }

      return undefined;
    },
    cookies: {
      keys: [oidcConfig.cookieKey],
      long: {
        signed: true,
        httpOnly: true,
        overwrite: true,
        sameSite: 'lax',
      },
      short: {
        signed: true,
        httpOnly: true,
        overwrite: true,
        sameSite: 'lax',
      },
    },
    jwks: oidcConfig.jwks,
    pkce: {
      required: () => false,
    },
    clients: oidcConfig.clients,
    interactions: {
      url: (_ctx, interaction) => {
        return `/oauth/${interaction.uid}`;
      },
    },
    claims,
    features: {
      devInteractions: {
        enabled: oidcConfig.devInteractions,
      },
      deviceFlow: {
        enabled: oidcConfig.deviceFlow,
      },
      revocation: {
        enabled: oidcConfig.revocation,
      },
    },
  };
}
