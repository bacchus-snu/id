import type { RouterMiddleware } from '@koa/router';
import type Model from '../../model/model.js';

export function listAnnouncements(model: Model): RouterMiddleware {
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
