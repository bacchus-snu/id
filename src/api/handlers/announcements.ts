import type { IMiddleware } from 'koa-router';
import type Model from '../../model/model.js';

export function listAnnouncements(model: Model): IMiddleware {
  return async (ctx, next) => {
    let announcements;
    try {
      announcements = await model.pgDo(tr => model.announcements.getActive(tr));
    } catch (e) {
      ctx.status = 500;
      throw e;
    }

    ctx.body = announcements;
    ctx.status = 200;
    await next();
  };
}
