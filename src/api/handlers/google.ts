import * as crypto from 'crypto';
import type { IMiddleware } from 'koa-router';
import type Config from '../../config.js';
import type Model from '../../model/model.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const STATE_COOKIE = 'google_oauth_state';
const STATE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function parseDepartment(googleName: string): string | null {
  if (!googleName || typeof googleName !== 'string') {
    return null;
  }
  const parts = googleName.split('/').map(s => s.trim());
  if (parts.length >= 3 && parts[2].length > 0) {
    return parts[2];
  }
  return null;
}

function frontendRedirect(config: Config, path: string) {
  return `${config.google.frontendUrl}${path}`;
}

export function googleAuth(config: Config): IMiddleware {
  return async ctx => {
    const userIdx = ctx.state.userIdx;
    if (typeof userIdx !== 'number') {
      ctx.status = 401;
      return;
    }

    const state = crypto.randomBytes(32).toString('hex');
    ctx.cookies.set(STATE_COOKIE, state, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: STATE_MAX_AGE_MS,
      overwrite: true,
    });

    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      hd: 'snu.ac.kr',
      access_type: 'online',
      prompt: 'select_account',
    });

    ctx.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  };
}

export function googleCallback(model: Model, config: Config): IMiddleware {
  return async ctx => {
    const userIdx = ctx.state.userIdx;
    if (typeof userIdx !== 'number') {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=not_logged_in'));
      return;
    }

    // Validate state (CSRF protection)
    const storedState = ctx.cookies.get(STATE_COOKIE, { signed: true });
    const receivedState = ctx.query.state as string | undefined;
    ctx.cookies.set(STATE_COOKIE); // clear cookie

    if (!storedState || !receivedState || storedState !== receivedState) {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=invalid_state'));
      return;
    }

    const code = ctx.query.code as string | undefined;
    if (!code) {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=no_code'));
      return;
    }

    // Exchange code for tokens
    let googleEmail: string;
    let googleName: string;
    try {
      const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: config.google.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResp.ok) {
        ctx.redirect(frontendRedirect(config, '/?google=error&reason=token_exchange_failed'));
        return;
      }

      const tokenData = await tokenResp.json() as Record<string, unknown>;
      const accessToken = tokenData.access_token;
      if (typeof accessToken !== 'string' || !accessToken) {
        ctx.redirect(frontendRedirect(config, '/?google=error&reason=token_exchange_failed'));
        return;
      }

      // Fetch user profile
      const userinfoResp = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userinfoResp.ok) {
        ctx.redirect(frontendRedirect(config, '/?google=error&reason=userinfo_failed'));
        return;
      }

      const userinfo = await userinfoResp.json() as Record<string, unknown>;
      if (typeof userinfo.email !== 'string' || typeof userinfo.name !== 'string') {
        ctx.redirect(frontendRedirect(config, '/?google=error&reason=userinfo_failed'));
        return;
      }

      googleEmail = userinfo.email;
      googleName = userinfo.name;
    } catch {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=unknown'));
      return;
    }

    // Verify snu.ac.kr domain
    const atIdx = googleEmail.indexOf('@');
    if (atIdx < 0 || googleEmail.substring(atIdx + 1) !== 'snu.ac.kr') {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=email_not_snu'));
      return;
    }

    // Verify email matches user's registered emails
    const emailLocal = googleEmail.substring(0, atIdx);
    const emailDomain = googleEmail.substring(atIdx + 1);
    let emailMatched = false;
    try {
      await model.pgDo(async tr => {
        const emails = await model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx);
        emailMatched = emails.some(
          e =>
            e.local.toLowerCase() === emailLocal.toLowerCase()
            && e.domain.toLowerCase() === emailDomain.toLowerCase(),
        );
      });
    } catch {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=unknown'));
      return;
    }

    if (!emailMatched) {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=email_mismatch'));
      return;
    }

    // Parse department from Google profile name
    const department = parseDepartment(googleName);
    if (!department) {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=department_not_found'));
      return;
    }
    if (!config.google.targetDepartments.includes(department)) {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=department_mismatch'));
      return;
    }

    // Auto-join major group
    type JoinResult = 'success' | 'group_not_found' | 'already_member';
    let joinResult: JoinResult;
    try {
      joinResult = await model.pgDo(async tr => {
        const group = await model.groups.getByIdentifier(tr, config.google.targetGroupIdentifier);
        if (!group) {
          return 'group_not_found' as const;
        }

        // Check if already a member
        const groupList = await model.groups.getUserGroupList(tr, userIdx);
        const existing = groupList.find(g => g.idx === group.idx);
        if (existing && existing.isMember) {
          return 'already_member' as const;
        }

        await model.users.addUserMembership(tr, userIdx, group.idx);
        return 'success' as const;
      });
    } catch {
      ctx.redirect(frontendRedirect(config, '/?google=error&reason=unknown'));
      return;
    }

    if (joinResult !== 'success') {
      ctx.redirect(frontendRedirect(config, `/?google=error&reason=${joinResult}`));
      return;
    }

    ctx.redirect(frontendRedirect(config, '/?google=success'));
  };
}
