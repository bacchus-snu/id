import test from 'ava';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';
import { app, model } from '../_setup.js';

test('test getShells', async t => {
  const newShell = uuid();
  await model.pgDo(async tr => {
    await model.shells.addShell(tr, newShell);
  });

  const agent = request.agent(app);

  const response = await agent.get('/api/shells').send({});
  t.is(response.status, 200);
  t.true(response.body.shells.includes(newShell));
});
