import { createPublicKey } from 'crypto';
import { jwtVerify } from 'jose';
import type { IMiddleware } from 'koa-router';
import z from 'zod';
import type Config from '../../config.js';
import type { EmailAddress } from '../../model/email_addresses.js';
import { InvalidEmailError, ResendLimitExeededError, UserExistsError } from '../../model/errors.js';
import Model from '../../model/model.js';
import { sendEmail } from '../email.js';
import changePasswordTemplate from '../templates/change_password_email_template.js';

export function createUser(model: Model, config: Config): IMiddleware {
  const bodySchema = z.object({
    username: z.string().nonempty().max(20).regex(/^[a-z][a-z0-9]+$/),
    name: z.string().nonempty(),
    password: z.string().min(8),
    preferredLanguage: z.enum(['ko', 'en']),
    studentNumbers: z.string().regex(/^(\d{5}-\d{3}|\d{4}-\d{4,5})$/).array().nonempty(),
    token: z.string().nonempty(),
  });

  return async (ctx, next) => {
    const bodyResult = bodySchema.safeParse(ctx.request.body);
    if (!bodyResult.success) {
      ctx.status = 400;
      return;
    }

    const token = bodyResult.data.token;
    let emailAddress: EmailAddress;

    // check verification token
    try {
      await model.pgDo(async tr => {
        emailAddress = await model.emailAddresses.getEmailAddressByToken(tr, token);
      });
    } catch (e) {
      ctx.status = 401;
      return;
    }

    const { username, name, password, preferredLanguage, studentNumbers } = bodyResult.data;
    try {
      // acquires access exclusive lock on 'users'
      await model.pgDo(async tr => {
        const emailAddressIdx = await model.emailAddresses.getIdxByAddress(
          tr,
          emailAddress.local,
          emailAddress.domain,
        );
        let userIdx;
        try {
          userIdx = await model.users.create(
            tr,
            username,
            password,
            name,
            config.posix.defaultShell,
            preferredLanguage,
          );
        } catch (e) {
          throw new UserExistsError();
        }
        await model.emailAddresses.validate(tr, userIdx, emailAddressIdx);
        await model.emailAddresses.removeToken(tr, token);

        for (const studentNumber of studentNumbers) {
          await model.users.addStudentNumber(tr, userIdx, studentNumber);
        }
      }, ['users']);
    } catch (e) {
      if (e instanceof UserExistsError) {
        ctx.status = 409;
        return;
      }
      ctx.status = 400;
      return;
    }
    ctx.status = 201;
    await next();
  };
}

export function sendChangePasswordEmail(model: Model, config: Config): IMiddleware {
  const bodySchema = z.object({
    emailLocal: z.string().trim().nonempty(),
    emailDomain: z.string().trim().nonempty(),
  });

  return async (ctx, next) => {
    const bodyResult = bodySchema.safeParse(ctx.request.body);
    if (!bodyResult.success) {
      ctx.status = 400;
      return;
    }

    const { emailLocal, emailDomain } = bodyResult.data;
    let token = '';
    let resendCount = -1;
    try {
      await model.pgDo(async tr => {
        const userIdx = await model.users.getUserIdxByEmailAddress(tr, emailLocal, emailDomain);
        token = await model.users.generatePasswordChangeToken(tr, userIdx);
        resendCount = await model.users.getResendCount(tr, token);
      });
    } catch (e) {
      // no such entry, but do nothing and just return 200
      ctx.status = 200;
      return;
    }

    try {
      const option = {
        address: `${emailLocal}@${emailDomain}`,
        token,
        subject: config.email.passwordChangeEmailSubject,
        url: config.email.passwordChangeEmailUrl,
        template: changePasswordTemplate,
        resendCount,
      };
      await sendEmail(option, model.log, config);
    } catch (e) {
      if (e instanceof ResendLimitExeededError) {
        ctx.status = 429;
        return;
      }
      if (e instanceof InvalidEmailError) {
        ctx.status = 400;
        return;
      }
      model.log.warn(`sending email to ${emailLocal}@${emailDomain} just failed.`);
    }

    ctx.status = 200;
    await next();
  };
}

export function checkChangePasswordEmailToken(model: Model): IMiddleware {
  const bodySchema = z.object({
    token: z.string().nonempty(),
  });

  return async (ctx, next) => {
    const bodyResult = bodySchema.safeParse(ctx.request.body);
    if (!bodyResult.success) {
      ctx.status = 400;
      return;
    }

    const { token } = bodyResult.data;

    try {
      await model.pgDo(async tr => {
        const userIdx = await model.users.getUserIdxByPasswordToken(tr, token);
        await model.users.ensureTokenNotExpired(tr, token);
        const user = await model.users.getByUserIdx(tr, userIdx);
        if (user.username === null) {
          throw new Error();
        }
      });
    } catch (e) {
      ctx.status = 401;
      return;
    }

    ctx.status = 204;

    await next();
  };
}

export function changePassword(model: Model): IMiddleware {
  const bodySchema = z.object({
    newPassword: z.string().min(8),
    token: z.string().nonempty(),
  });

  return async (ctx, next) => {
    const bodyResult = bodySchema.safeParse(ctx.request.body);
    if (!bodyResult.success) {
      ctx.status = 400;
      return;
    }

    const { newPassword, token } = bodyResult.data;
    try {
      // check token validity
      await model.pgDo(async tr => {
        const userIdx = await model.users.getUserIdxByPasswordToken(tr, token);
        await model.users.ensureTokenNotExpired(tr, token);
        const user = await model.users.getByUserIdx(tr, userIdx);
        if (user.username === null) {
          throw new Error();
        }
        await model.users.changePassword(tr, userIdx, newPassword);
        await model.users.removeToken(tr, token);
      });
    } catch (e) {
      ctx.status = 401;
      return;
    }

    ctx.status = 200;
    await next();
  };
}

export function getUserShell(model: Model): IMiddleware {
  return async (ctx, next) => {
    // authorize
    const userIdx = ctx.state.userIdx;
    if (typeof userIdx !== 'number') {
      ctx.status = 401;
      return;
    }

    let shell = '';
    try {
      await model.pgDo(async tr => {
        shell = await model.users.getShell(tr, userIdx);
      });
    } catch (e) {
      ctx.status = 400;
      return;
    }

    ctx.status = 200;
    ctx.body = {
      shell,
    };
    await next();
  };
}

export function changeUserShell(model: Model): IMiddleware {
  const bodySchema = z.object({
    shell: z.string().nonempty(),
  });

  return async (ctx, next) => {
    // authorize
    const userIdx = ctx.state.userIdx;
    if (typeof userIdx !== 'number') {
      ctx.status = 401;
      return;
    }

    const bodyResult = bodySchema.safeParse(ctx.request.body);
    if (!bodyResult.success) {
      ctx.status = 400;
      return;
    }

    const { shell } = bodyResult.data;
    try {
      await model.pgDo(async tr => {
        await model.users.changeShell(tr, userIdx, shell);
      });
    } catch (e) {
      ctx.status = 400;
      return;
    }

    ctx.status = 200;
    await next();
  };
}

export function getUserEmails(model: Model): IMiddleware {
  return async (ctx, next) => {
    // authorize
    const userIdx = ctx.state.userIdx;
    if (typeof userIdx !== 'number') {
      ctx.status = 401;
      return;
    }

    let emails;
    await model.pgDo(async tr => {
      emails = await model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx);
    });

    ctx.status = 200;
    ctx.body = { emails };
    await next();
  };
}

export function getUserInfo(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    // authorize
    let userIdx: number;
    const auth = ctx.header.authorization;

    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const jwt = auth.substring('Bearer '.length);

      const key = createPublicKey(config.jwt.privateKey);
      try {
        const result = await jwtVerify(jwt, key, {
          algorithms: ['ES256'],
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          currentDate: new Date(),
        });

        if (typeof result.payload.userIdx === 'number') {
          userIdx = result.payload.userIdx;
        } else {
          ctx.status = 400;
          return;
        }
      } catch (e) {
        ctx.status = 401;
        return;
      }
    } else if (typeof ctx.state.userIdx === 'number') {
      userIdx = ctx.state.userIdx;
    } else {
      ctx.status = 401;
      return;
    }

    try {
      const [user, studentNumbers, emails] = await model.pgDo(async tr => {
        return Promise.all([
          model.users.getByUserIdx(tr, userIdx),
          model.users.getStudentNumbersByUserIdx(tr, userIdx),
          model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx),
        ]);
      });

      ctx.status = 200;
      ctx.body = {
        username: user.username,
        name: user.name,
        studentNumbers,
        emailAddresses: emails.map(({ local, domain }) => `${local}@${domain}`),
      };
    } catch (e) {
      // user not found??
      console.error(e);
      ctx.status = 500;
      return;
    }

    await next();
  };
}
