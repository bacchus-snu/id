import type { IMiddleware } from 'koa-router';
import { z } from 'zod';
import type Config from '../../config.js';
import { UserExistsError } from '../../model/errors.js';
import Model from '../../model/model.js';
import { fetchCanvasData } from '../canvasClient.js';
import { computeCanvasDiff, findMatchingGroups } from '../canvasDiff.js';

export function canvasPreview(model: Model, config: Config): IMiddleware {
  const schema = z.object({ canvasToken: z.string().min(1) });
  return async (ctx, next) => {
    const body = schema.safeParse(ctx.request.body);
    if (!body.success) {
      ctx.status = 400;
      return;
    }
    let canvasData;
    try {
      canvasData = await fetchCanvasData(
        config.canvas.baseUrl,
        config.canvas.xinicsSsoToolId,
        body.data.canvasToken,
      );
    } catch (e) {
      console.error('Canvas preview error:', e);
      ctx.status = 400;
      ctx.body = {
        message: `Canvas 토큰이 유효하지 않습니다: ${e instanceof Error ? e.message : String(e)}`,
      };
      return;
    }
    const groupItems = await model.pgDo(tr =>
      findMatchingGroups(tr, canvasData, model.groups, new Set(), new Set())
    );
    ctx.body = {
      name: canvasData.profile.name.replace(/\(.*\)/, '').trim(),
      emails: canvasData.emails,
      profiles: canvasData.xinicsProfiles.map(p => ({
        studentNumber: p.studentNumber,
        major: p.major,
      })),
      matchedGroups: groupItems.map(g => ({
        groupIdx: g.groupIdx,
        name: g.groupName,
        reasonKey: g.reasonKey,
        reasonDetail: g.reasonDetail,
      })),
    };
    await next();
  };
}

export function canvasSignup(model: Model, config: Config): IMiddleware {
  const schema = z.object({
    canvasToken: z.string().min(1),
    username: z.string().nonempty().max(20).regex(/^[a-z][a-z0-9]+$/),
    password: z.string().min(8),
    preferredLanguage: z.enum(['ko', 'en']),
  });
  return async (ctx, next) => {
    const body = schema.safeParse(ctx.request.body);
    if (!body.success) {
      ctx.status = 400;
      return;
    }
    const { canvasToken, username, password, preferredLanguage } = body.data;
    let canvasData;
    try {
      canvasData = await fetchCanvasData(
        config.canvas.baseUrl,
        config.canvas.xinicsSsoToolId,
        canvasToken,
      );
    } catch {
      ctx.status = 400;
      ctx.body = { message: 'Canvas 토큰이 유효하지 않습니다.' };
      return;
    }
    try {
      await model.pgDo(async tr => {
        const cleanName = canvasData.profile.name.replace(/\(.*\)/, '').trim();
        const userIdx = await model.users.create(
          tr,
          username,
          password,
          cleanName,
          config.posix.defaultShell,
          preferredLanguage,
        );
        for (const email of canvasData.emails) {
          const [local, domain] = email.split('@');
          if (!domain) { continue; }
          const emailIdx = await model.emailAddresses.create(tr, local, domain);
          await model.emailAddresses.validate(tr, userIdx, emailIdx);
        }
        for (const p of canvasData.xinicsProfiles) {
          try {
            await model.users.addStudentNumber(tr, userIdx, p.studentNumber);
          } catch { /* dup */ }
        }
        const groupItems = await findMatchingGroups(
          tr,
          canvasData,
          model.groups,
          new Set(),
          new Set(),
        );
        for (const g of groupItems) {
          try {
            await model.users.addUserMembership(tr, userIdx, g.groupIdx);
          } catch { /* dup */ }
        }
      }, ['users']);
    } catch (e) {
      if (e instanceof UserExistsError) {
        ctx.status = 409;
        ctx.body = { message: '이미 존재하는 사용자입니다.' };
        return;
      }
      throw e;
    }
    ctx.status = 201;
    ctx.body = { ok: true };
    await next();
  };
}

export function canvasSync(model: Model, config: Config): IMiddleware {
  const schema = z.object({ canvasToken: z.string().min(1) });
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx !== 'number') {
      ctx.status = 401;
      return;
    }
    const body = schema.safeParse(ctx.request.body);
    if (!body.success) {
      ctx.status = 400;
      return;
    }
    let canvasData;
    try {
      canvasData = await fetchCanvasData(
        config.canvas.baseUrl,
        config.canvas.xinicsSsoToolId,
        body.data.canvasToken,
      );
    } catch {
      ctx.status = 400;
      ctx.body = { message: 'Canvas 토큰이 유효하지 않습니다.' };
      return;
    }
    const userIdx = ctx.state.userIdx;
    const diff = await model.pgDo(async tr => {
      const [emails, studentNumbers, memberships, pendingMemberships] = await Promise.all([
        model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx),
        model.users.getStudentNumbersByUserIdx(tr, userIdx),
        model.users.getAllUserMemberships(tr, userIdx),
        model.users.getAllPendingUserMemberships(tr, userIdx),
      ]);
      const memberSet = new Set(memberships.map(m => m.groupIdx));
      const pendingSet = new Set(pendingMemberships.map(m => m.groupIdx));
      const groupItems = await findMatchingGroups(
        tr,
        canvasData,
        model.groups,
        memberSet,
        pendingSet,
      );
      return computeCanvasDiff(
        canvasData,
        studentNumbers,
        emails.map(e => ({ local: e.local, domain: e.domain })),
        groupItems,
      );
    });
    ctx.body = diff;
    await next();
  };
}

export function canvasApply(model: Model): IMiddleware {
  const schema = z.object({
    actions: z.array(z.discriminatedUnion('type', [
      z.object({ type: z.literal('add_student_number'), studentNumber: z.string() }),
      z.object({ type: z.literal('add_email'), emailLocal: z.string(), emailDomain: z.string() }),
      z.object({ type: z.literal('add_group'), groupIdx: z.number().int().positive() }),
    ])),
  });
  return async (ctx, next) => {
    if (typeof ctx.state.userIdx !== 'number') {
      ctx.status = 401;
      return;
    }
    const body = schema.safeParse(ctx.request.body);
    if (!body.success) {
      ctx.status = 400;
      return;
    }
    const userIdx = ctx.state.userIdx;
    await model.pgDo(async tr => {
      for (const action of body.data.actions) {
        switch (action.type) {
          case 'add_student_number':
            try {
              await model.users.addStudentNumber(tr, userIdx, action.studentNumber);
            } catch { /* dup */ }
            break;
          case 'add_email': {
            if (!action.emailDomain.endsWith('snu.ac.kr')) { break; }
            const emailIdx = await model.emailAddresses.create(
              tr,
              action.emailLocal,
              action.emailDomain,
            );
            await model.emailAddresses.validate(tr, userIdx, emailIdx);
            break;
          }
          case 'add_group': {
            const group = await model.groups.getByIdx(tr, action.groupIdx);
            const id = group.identifier;
            if (id !== 'undergraduate' && id !== 'graduate' && !id.startsWith('course-')) { break; }
            const hasPending = await model.users.hasPendingUserMembership(
              tr,
              userIdx,
              action.groupIdx,
            );
            if (hasPending) {
              await model.users.acceptUserMemberships(tr, action.groupIdx, [userIdx]);
            } else {
              try {
                await model.users.addUserMembership(tr, userIdx, action.groupIdx);
              } catch { /* dup */ }
            }
            break;
          }
        }
      }
    });
    ctx.status = 200;
    ctx.body = { ok: true };
    await next();
  };
}
