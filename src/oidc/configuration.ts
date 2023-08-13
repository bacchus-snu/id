// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Configuration } from 'oidc-provider';
import Config from '../config';
import type Model from '../model/model';
import OIDCAccount from './account';
import AdapterFactory from './adapter';

const claims = {
  openid: ['sub'],
  profile: ['name', 'username', 'student_id'],
  email: ['email'],
  groups: ['groups'],
};

export default function createOIDCConfig(model: Model, oidcConfig: Config['oidc']): Configuration {
  let adapter;
  if (oidcConfig.redisURL) {
    adapter = AdapterFactory(oidcConfig.redisURL, model);
  }

  return {
    adapter,
    findAccount: async (ctx, id) => {
      const [profile, email, groups] = await model.pgDo(async tr => {
        // get name and username
        const userResult = await model.users.getByUserIdx(tr, Number(id));
        if (!userResult.name || !userResult.username) {
          throw new Error('name or username empty');
        }

        // ~84: YYXX-NNNN, 85 ~ 99: YYXXX-NNN, 00 ~: YYYY-NNNNN
        // get student id, hard-coded by ataching '19' and sorting
        const sidResult = await model.users.getStudentNumbersByUserIdx(tr, Number(id));
        if (sidResult.length == 0) {
          throw new Error('no student id');
        }
        if (sidResult.length > 1) {
          for (let i = 0; i < sidResult.length; i++) {
            if (sidResult[i].length == 9) {
              sidResult[i] = '19' + sidResult[i];
            }
          }
          sidResult.sort((a, b) => {
            return a > b ? -1 : 1;
          });
          if (sidResult[0].length == 11) {
            sidResult[0] = sidResult[0].substring(2);
          }
        }

        const profile = {
          name: userResult.name,
          username: userResult.username,
          student_id: sidResult[0],
        };

        // get email, hard-coded, 1. snu.ac.kr, 2. last row
        const emailResult = await model.emailAddresses.getEmailsByOwnerIdx(tr, Number(id));
        if (emailResult.length == 0) {
          throw new Error('no email');
        }
        let email = emailResult[emailResult.length - 1].local + '@'
          + emailResult[emailResult.length - 1].domain;
        for (let i = 0; i < emailResult.length; i++) {
          if (emailResult[i].domain === 'snu.ac.kr') {
            email = emailResult[i].local + '@' + emailResult[i].domain;
            break;
          }
        }

        // get groups
        const groupSet = await model.users.getUserReachableGroups(tr, Number(id));
        const groupResult = await tr.query('SELECT identifier FROM groups WHERE idx = ANY($1)', [[
          ...groupSet,
        ]]);
        const groups = groupResult.rows.map(r => r.identifier);

        return [profile, email, groups];
      });

      return new OIDCAccount(id, profile, email, groups);
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
            ...claims.groups,
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
