import { IMiddleware } from 'koa-router';

import { NoSuchEntryError } from '../../model/errors.js';
import Model from '../../model/model.js';

export function getPasswd(model: Model): IMiddleware {
  return async (ctx, next) => {
    try {
      await model.pgDo(async tr => {
        await model.hosts.getHostByInet(tr, ctx.ip, true);
      });
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        ctx.status = 401;
      } else {
        ctx.status = 500;
      }
      return;
    }

    let passwd = '';
    try {
      passwd = await model.pgDo(async tr => {
        return model.users.getPasswdEntries(tr);
      });
      ctx.lastModified = model.users.getPosixLastModified();
    } catch (e) {
      ctx.status = 500;
      return;
    }

    ctx.status = 200; // Required for freshness check

    if (ctx.fresh) {
      ctx.status = 304;
    } else {
      ctx.body = passwd;
    }

    await next();
  };
}

export function getGroup(model: Model): IMiddleware {
  return async (ctx, next) => {
    try {
      await model.pgDo(async tr => {
        await model.hosts.getHostByInet(tr, ctx.ip, true);
      });
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        ctx.status = 401;
      } else {
        ctx.status = 500;
      }
      return;
    }

    let group = '';
    try {
      group = await model.pgDo(async tr => {
        return model.users.getGroupEntries(tr);
      });
      ctx.lastModified = model.users.getPosixLastModified();
    } catch (e) {
      ctx.status = 500;
      return;
    }

    ctx.status = 200; // Required for freshness check

    if (ctx.fresh) {
      ctx.status = 304;
    } else {
      ctx.body = group;
    }

    await next();
  };
}
