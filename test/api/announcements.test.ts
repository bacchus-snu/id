import test from 'ava';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';
import type { Announcement } from '../../src/model/announcements.js';
import { app, model } from '../_setup.js';
import { createGroup } from '../_test_utils.js';

function translation() {
  return { ko: uuid(), en: uuid() };
}

test('announcement listing', async t => {
  let groupIdx: number;
  let activeIdx: number;
  let endedIdx: number;
  let futureIdx: number;

  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model);
    activeIdx = await model.announcements.create(tr, translation(), translation(), {
      url: 'https://example.com',
      groupIdx,
    });
    endedIdx = await model.announcements.create(tr, translation(), translation(), {
      endsAt: new Date(Date.now() - 1000),
    });
    futureIdx = await model.announcements.create(tr, translation(), translation(), {
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  }, ['group_reachable_cache']);

  const response = await request.agent(app).get('/api/announcements');
  t.is(response.status, 200);

  const body = response.body as Array<Announcement>;
  const active = body.find(a => a.idx === activeIdx);
  t.truthy(active);
  t.is(active?.url, 'https://example.com');
  t.is(active?.groupIdx, groupIdx!);
  t.false(body.some(a => a.idx === endedIdx));
  t.false(body.some(a => a.idx === futureIdx));
});
