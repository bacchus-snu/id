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

    // 이메일/학번 충돌 검사
    const conflicts = await model.pgDo(async tr => {
      const emailConflicts: Array<string> = [];
      for (const email of canvasData.emails) {
        const [local, domain] = email.split('@');
        if (!domain) { continue; }
        try {
          const ownerIdx = await model.users.getUserIdxByEmailAddress(tr, local, domain);
          if (ownerIdx) { emailConflicts.push(email); }
        } catch { /* NoSuchEntryError = 충돌 없음 */ }
      }
      const studentNumberConflicts: Array<string> = [];
      for (const p of canvasData.xinicsProfiles) {
        try {
          await tr.query('SELECT 1 FROM student_numbers WHERE student_number = $1', [
            p.studentNumber,
          ]);
          const result = await tr.query<{ owner_idx: number }>(
            'SELECT owner_idx FROM student_numbers WHERE student_number = $1',
            [p.studentNumber],
          );
          if (result.rows.length > 0) { studentNumberConflicts.push(p.studentNumber); }
        } catch { /* 없음 */ }
      }
      return { emails: emailConflicts, studentNumbers: studentNumberConflicts };
    });

    const hasConflicts = conflicts.emails.length > 0 || conflicts.studentNumbers.length > 0;

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
      conflicts: hasConflicts ? conflicts : null,
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

    // 이메일/학번 충돌 재검사 (preview와 signup 사이에 상태가 바뀔 수 있으므로)
    const conflicts = await model.pgDo(async tr => {
      const emailConflicts: Array<string> = [];
      for (const email of canvasData.emails) {
        const [local, domain] = email.split('@');
        if (!domain) { continue; }
        try {
          const ownerIdx = await model.users.getUserIdxByEmailAddress(tr, local, domain);
          if (ownerIdx) { emailConflicts.push(email); }
        } catch { /* 없음 */ }
      }
      const studentNumberConflicts: Array<string> = [];
      for (const p of canvasData.xinicsProfiles) {
        const result = await tr.query<{ owner_idx: number }>(
          'SELECT owner_idx FROM student_numbers WHERE student_number = $1',
          [p.studentNumber],
        );
        if (result.rows.length > 0) { studentNumberConflicts.push(p.studentNumber); }
      }
      return { emails: emailConflicts, studentNumbers: studentNumberConflicts };
    });

    if (conflicts.emails.length > 0 || conflicts.studentNumbers.length > 0) {
      ctx.status = 409;
      ctx.body = {
        message: '이미 등록된 이메일 또는 학번이 있습니다.',
        conflicts,
      };
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

    // 이름 + 이메일 일치 검증 (identity verification)
    const identity = await model.pgDo(async tr => {
      const user = await model.users.getByUserIdx(tr, userIdx);
      const emails = await model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx);
      return { name: user.name, emails };
    });

    const canvasName = canvasData.profile.name.replace(/\(.*\)/, '').trim();
    const canvasEmailSet = new Set(canvasData.emails.map(e => e.toLowerCase()));
    const userEmailSet = new Set(
      identity.emails.map(e => `${e.local}@${e.domain}`.toLowerCase()),
    );

    // 이메일이 하나라도 겹쳐야 함 (동일 인물 확인)
    const hasEmailMatch = [...canvasEmailSet].some(e => userEmailSet.has(e));
    if (!hasEmailMatch) {
      ctx.status = 403;
      ctx.body = {
        message: 'Canvas 계정의 이메일이 현재 계정의 이메일과 일치하지 않습니다.',
        mismatch: { type: 'email' },
      };
      return;
    }

    // 이름 일치 확인
    if (identity.name !== canvasName) {
      ctx.status = 403;
      ctx.body = {
        message:
          `Canvas 계정의 이름(${canvasName})이 현재 계정의 이름(${identity.name})과 일치하지 않습니다.`,
        mismatch: { type: 'name', canvas: canvasName, current: identity.name },
      };
      return;
    }

    // 학번 + 그룹만 sync (이메일은 sync 대상 아님)
    const diff = await model.pgDo(async tr => {
      const [studentNumbers, memberships, pendingMemberships] = await Promise.all([
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
        [], // 이메일은 빈 배열 — sync 대상 아님
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
          case 'add_group': {
            const group = await model.groups.getByIdx(tr, action.groupIdx);
            const id = group.identifier;
            if (id !== 'undergraduate' && id !== 'graduate' && !id.startsWith('course-')) {
              break;
            }
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
