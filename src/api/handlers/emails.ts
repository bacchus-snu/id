import { IMiddleware } from 'koa-router';
import z from 'zod';
import Config from '../../config';
import { EmailAddress } from '../../model/email_addresses';
import { EmailInUseError, InvalidEmailError, ResendLimitExeededError } from '../../model/errors';
import Model from '../../model/model';
import { sendEmail } from '../email';
import emailVerificationTemplate from '../templates/verification_email_template';

export function sendVerificationEmail(model: Model, config: Config): IMiddleware {
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
    if (emailDomain !== 'snu.ac.kr') {
      ctx.status = 400;
      return;
    }

    let emailIdx = -1;
    let token = '';
    let resendCount = -1;

    try {
      // create email address and generate token
      await model.pgDo(async tr => {
        emailIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain);
        const isValidated = await model.emailAddresses.isValidatedEmail(tr, emailIdx);
        if (isValidated) {
          throw new EmailInUseError();
        }
        token = await model.emailAddresses.generateVerificationToken(tr, emailIdx);
        resendCount = await model.emailAddresses.getResendCount(tr, token);
      });
    } catch (e) {
      if (e instanceof EmailInUseError) {
        ctx.status = 409;
        return;
      }
      ctx.status = 400;
      return;
    }

    try {
      // send email
      const option = {
        address: `${emailLocal}@${emailDomain}`,
        token,
        subject: config.email.verificationEmailSubject,
        url: config.email.verificationEmailUrl,
        template: emailVerificationTemplate,
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

export function checkVerificationEmailToken(model: Model): IMiddleware {
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
    let emailAddress: EmailAddress;
    let result;

    try {
      await model.pgDo(async tr => {
        emailAddress = await model.emailAddresses.getEmailAddressByToken(tr, token);
        await model.emailAddresses.ensureTokenNotExpired(tr, token);
        result = {
          emailLocal: emailAddress.local,
          emailDomain: emailAddress.domain,
        };
      });
    } catch (e) {
      ctx.status = 401;
      return;
    }

    ctx.status = 200;
    ctx.body = result;

    await next();
  };
}
