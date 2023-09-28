import { IMiddleware } from 'koa-router';
import z from 'zod';
import { BadParameterError } from '../../model/errors';
import Model from '../../model/model';
import { User } from '../../model/users';

export function listGroups(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      let groups = null;

      try {
        await model.pgDo(async tr => {
          groups = await model.groups.getUserGroupList(tr, ctx.state.userIdx);
        });
      } catch (e) {
        ctx.status = 500;
        throw e;
      }

      ctx.body = groups;
      ctx.status = 200;
    } else {
      ctx.status = 401;
      return;
    }
    await next();
  };
}

export function listMembers(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      const gid = Number(ctx.params.gid);
      const start = Number(ctx.params.start);
      const count = Number(ctx.params.count);
      let pagination: { start: number; count: number } | undefined = undefined;
      if (!Number.isNaN(start) || !Number.isNaN(count)) {
        pagination = {
          start: Number.isNaN(start) ? 0 : start,
          count: Number.isNaN(count) ? 10 : count,
        };
      }

      let owner = false;
      let users: Array<User> = [];
      let studentNumberMap: Map<number, Array<string>>;
      try {
        await model.pgDo(async tr => {
          owner = await model.groups.checkOwner(tr, gid, ctx.state.userIdx);

          if (owner) {
            users = await model.users.getAllMembershipUsers(tr, gid, pagination);
            const indices = users.map(u => u.idx);
            studentNumberMap = await model.users.getStudentNumbersByUserIdxBulk(tr, indices);
          }
        });
      } catch (e) {
        if (e instanceof BadParameterError) {
          ctx.status = 400;
        } else {
          ctx.status = 500;
        }
        return;
      }

      if (!owner) {
        ctx.status = 401;
        return;
      }

      ctx.status = 200;
      ctx.body = users.map(u => ({
        uid: u.idx,
        username: u.username,
        name: u.name,
        studentNumbers: studentNumberMap?.get(u.idx) ?? [],
      }));
    } else {
      ctx.status = 401;
      return;
    }
    await next();
  };
}

export function listPending(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      const gid = Number(ctx.params.gid);

      let owner = false;
      let users: Array<User> = [];
      let studentNumberMap: Map<number, Array<string>>;
      try {
        await model.pgDo(async tr => {
          owner = await model.groups.checkOwner(tr, gid, ctx.state.userIdx);

          if (owner) {
            users = await model.users.getAllPendingMembershipUsers(tr, gid);
            const indices = users.map(u => u.idx);
            studentNumberMap = await model.users.getStudentNumbersByUserIdxBulk(tr, indices);
          }
        });
      } catch (e) {
        ctx.status = 500;
        return;
      }

      if (!owner) {
        ctx.status = 401;
        return;
      }

      ctx.status = 200;
      ctx.body = users.map(u => ({
        uid: u.idx,
        username: u.username,
        name: u.name,
        studentNumbers: studentNumberMap?.get(u.idx) ?? [],
      }));
    } else {
      ctx.status = 401;
      return;
    }
    await next();
  };
}

export function applyGroup(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      const userIdx = ctx.state.userIdx;
      const gid = Number(ctx.params.gid);

      try {
        await model.pgDo(async tr => {
          const group = await model.groups.getByIdx(tr, gid);

          const check = !group.ownerGroupIdx
            || await model.users.hasPendingUserMembership(tr, userIdx, group.idx)
            || await model.users.hasUserMembership(tr, userIdx, group.idx);
          if (check) {
            ctx.status = 400;
            return;
          }

          await model.users.addPendingUserMembership(tr, userIdx, group.idx);
          ctx.status = 200;
        });
      } catch (e) {
        ctx.status = 500;
        throw e;
      }
    } else {
      ctx.status = 401;
      return;
    }
    await next();
  };
}

export function acceptGroup(model: Model): IMiddleware {
  const bodySchema = z.number().array().nonempty();

  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      const gid = Number(ctx.params.gid);

      const bodyResult = bodySchema.safeParse(ctx.request.body);
      if (!bodyResult.success) {
        ctx.status = 400;
        return;
      }
      const users = bodyResult.data;

      try {
        await model.pgDo(async tr => {
          const group = await model.groups.getByIdx(tr, gid);

          const owner = await model.groups.checkOwner(tr, group.idx, ctx.state.userIdx);
          if (!owner) {
            ctx.status = 401;
            return;
          }

          const result = await model.users.acceptUserMemberships(tr, group.idx, users);
          if (result !== users.length) {
            ctx.status = 400;
            return;
          }

          ctx.status = 200;
        });
      } catch (e) {
        ctx.status = 500;
        throw e;
      }
    } else {
      ctx.status = 401;
      return;
    }
    await next();
  };
}

export function rejectGroup(model: Model): IMiddleware {
  const bodySchema = z.number().array().nonempty();

  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      const gid = Number(ctx.params.gid);

      const bodyResult = bodySchema.safeParse(ctx.request.body);
      if (!bodyResult.success) {
        ctx.status = 400;
        return;
      }
      const users = bodyResult.data;

      try {
        await model.pgDo(async tr => {
          const group = await model.groups.getByIdx(tr, gid);

          const owner = await model.groups.checkOwner(tr, group.idx, ctx.state.userIdx);
          if (!owner) {
            ctx.status = 401;
            return;
          }

          const result = await model.users.rejectUserMemberships(tr, group.idx, users);
          if (result !== users.length) {
            ctx.status = 400;
            return;
          }

          ctx.status = 200;
        });
      } catch (e) {
        ctx.status = 500;
        throw e;
      }
    } else {
      ctx.status = 401;
      return;
    }
    await next();
  };
}

export function leaveGroup(model: Model): IMiddleware {
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx === 'number') {
      const gid = Number(ctx.params.gid);

      try {
        await model.pgDo(async tr => {
          const group = await model.groups.getByIdx(tr, gid);

          const result = await model.users.rejectUserMemberships(tr, group.idx, [
            ctx.state.userIdx,
          ]);
          if (result !== 1) {
            ctx.status = 400;
            return;
          }

          ctx.status = 200;
        });
      } catch (e) {
        ctx.status = 500;
        throw e;
      }
    } else {
      ctx.status = 401;
      return;
    }
    await next();
  };
}
