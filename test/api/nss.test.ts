import test from 'ava';
import { app, config, model } from '../_setup';
import { createAgentForwardedFor, createUser } from '../_test_utils';

test('fetch passwd entries', async t => {
  const agent = createAgentForwardedFor(app, '10.0.2.0');

  const expect = await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model);
    const user = await model.users.getByUserIdx(tr, userIdx);
    return `${user.username}:x:${user.uid}:`
      + `${config.posix.userGroupGid}:${user.name}:`
      + `${config.posix.homeDirectoryPrefix}/${user.username}:`
      + `${user.shell}\n`;
  }, ['users']);

  let response;

  // No host
  response = await agent.get('/api/nss/passwd');
  t.is(response.status, 401);

  // With host
  await model.pgDo(async tr => {
    await model.hosts.addHost(tr, 'nss-test-0', '10.0.2.0');
    tr.ensureHasAccessExclusiveLock('hosts');
  }, ['hosts']);

  response = await agent.get('/api/nss/passwd');
  t.is(response.status, 200);
  t.true(response.text.includes(expect));

  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['nss-test-0']);
    tr.ensureHasAccessExclusiveLock('hosts');
  }, ['hosts']);
});

test('fetch group entries', async t => {
  const agent = createAgentForwardedFor(app, '10.0.2.1');

  let username = '';
  let expect = '';
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model);
    const user = await model.users.getByUserIdx(tr, userIdx);
    if (user.username) {
      username = user.username;
    }
    expect = `${config.posix.userGroupName}:x:${config.posix.userGroupGid}:`;
  }, ['users']);

  let response;

  // No host
  response = await agent.get('/api/nss/group');
  t.is(response.status, 401);

  // With host
  await model.pgDo(async tr => {
    await model.hosts.addHost(tr, 'nss-test-1', '10.0.2.1');
    tr.ensureHasAccessExclusiveLock('hosts');
  }, ['hosts']);

  response = await agent.get('/api/nss/group');
  t.is(response.status, 200);
  t.true(response.text.startsWith(expect));
  t.true(response.text.split(':')[3].includes(username));

  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['nss-test-1']);
    tr.ensureHasAccessExclusiveLock('hosts');
  }, ['hosts']);
});

test('test not-modified posix entries', async t => {
  const agent = createAgentForwardedFor(app, '10.0.2.2');

  await model.pgDo(async tr => {
    await model.hosts.addHost(tr, 'nss-test-2', '10.0.2.2');
    tr.ensureHasAccessExclusiveLock('hosts');
  }, ['hosts']);

  let response;
  let lastMod;

  response = await agent.get('/api/nss/passwd').send();
  t.is(response.status, 200);

  lastMod = response.header['last-modified'];
  response = await agent.get('/api/nss/passwd').set('if-modified-since', lastMod);
  t.is(response.status, 304);

  response = await agent.get('/api/nss/group').send();
  t.is(response.status, 200);

  lastMod = response.header['last-modified'];
  response = await agent.get('/api/nss/group').set('if-modified-since', lastMod);
  t.is(response.status, 304);

  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['nss-test-2']);
    tr.ensureHasAccessExclusiveLock('hosts');
  }, ['hosts']);
});
