import test from 'ava';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';
import { GroupUserInfo } from '../../src/model/groups';
import { app, model } from '../_setup';
import { createGroup, createGroupRelation, createUser } from '../_test_utils';

test('group listing', async t => {
  const username = uuid();
  const password = uuid();

  let noneGroupIdx: number;
  let memberGroupIdx: number;
  let indirectGroupIdx: number;
  let pendingGroupIdx: number;
  let ownerGroupIdx: number;

  await model.pgDo(async tr => {
    noneGroupIdx = await createGroup(tr, model);
    memberGroupIdx = await createGroup(tr, model);
    indirectGroupIdx = await createGroup(tr, model);
    pendingGroupIdx = await createGroup(tr, model);
    ownerGroupIdx = await createGroup(tr, model);
    await model.groups.setOwnerGroup(tr, noneGroupIdx, noneGroupIdx);
    await model.groups.setOwnerGroup(tr, memberGroupIdx, noneGroupIdx);
    await model.groups.setOwnerGroup(tr, indirectGroupIdx, noneGroupIdx);
    await model.groups.setOwnerGroup(tr, pendingGroupIdx, noneGroupIdx);
    await model.groups.setOwnerGroup(tr, ownerGroupIdx, memberGroupIdx);
    await createGroupRelation(tr, model, memberGroupIdx, indirectGroupIdx);

    const userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en');
    await model.users.addUserMembership(tr, userIdx, memberGroupIdx);
    await model.users.addPendingUserMembership(tr, userIdx, pendingGroupIdx);
  }, ['users', 'group_reachable_cache']);

  const agent = request.agent(app);
  let response;

  response = await agent.get('/api/group');
  t.is(response.status, 401);

  response = await agent.post('/api/login').send({
    username,
    password,
  });
  t.is(response.status, 200);

  response = await agent.get('/api/group');
  t.is(response.status, 200);

  const body = response.body as Array<GroupUserInfo>;

  t.true(body.some(g => {
    return g.idx === noneGroupIdx && !g.isMember && !g.isDirectMember && !g.isPending && !g.isOwner;
  }));
  t.true(body.some(g => {
    return g.idx === memberGroupIdx && g.isMember && g.isDirectMember && !g.isPending && !g.isOwner;
  }));
  t.true(body.some(g => {
    return g.idx === indirectGroupIdx && g.isMember && !g.isDirectMember && !g.isPending
      && !g.isOwner;
  }));
  t.true(body.some(g => {
    return g.idx === pendingGroupIdx && !g.isMember && !g.isDirectMember && g.isPending
      && !g.isOwner;
  }));
  t.true(body.some(g => {
    return g.idx === ownerGroupIdx && !g.isMember && !g.isDirectMember && !g.isPending && g.isOwner;
  }));
});

test('member listing', async t => {
  const username = uuid();
  const password = uuid();

  let userIdx = 0;
  let ownerGroupIdx = 0;
  let groupIdx = 0;
  await model.pgDo(async tr => {
    ownerGroupIdx = await createGroup(tr, model);
    groupIdx = await createGroup(tr, model);
    await model.groups.setOwnerGroup(tr, groupIdx, ownerGroupIdx);
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en');
  }, ['users', 'group_reachable_cache']);

  const agent = request.agent(app);
  let response;

  response = await agent.get(`/api/group/${groupIdx}/members`);
  t.is(response.status, 401);

  response = await agent.post('/api/login').send({
    username,
    password,
  });
  t.is(response.status, 200);

  response = await agent.get(`/api/group/${groupIdx}/members`);
  t.is(response.status, 403);

  await model.pgDo(async tr => {
    await model.users.addUserMembership(tr, userIdx, ownerGroupIdx);
  });

  response = await agent.get(`/api/group/${groupIdx}/members`);
  t.is(response.status, 200);
  t.deepEqual(response.body, []);

  let memberUserIdx = 0;
  await model.pgDo(async tr => {
    memberUserIdx = await createUser(tr, model);
    await model.users.addUserMembership(tr, memberUserIdx, groupIdx);
  }, ['users']);

  response = await agent.get(`/api/group/${groupIdx}/members`);
  t.is(response.status, 200);
  t.is(response.body.length, 1);
  t.is(response.body[0].uid, memberUserIdx);
  t.deepEqual(response.body[0].studentNumbers, []);

  const studentNumber = uuid();
  await model.pgDo(tr => model.users.addStudentNumber(tr, memberUserIdx, studentNumber), ['users']);

  response = await agent.get(`/api/group/${groupIdx}/members`);
  t.is(response.status, 200);
  t.is(response.body.length, 1);
  t.is(response.body[0].uid, memberUserIdx);
  t.deepEqual(response.body[0].studentNumbers, [studentNumber]);
});

test('pending listing', async t => {
  const username = uuid();
  const password = uuid();

  let userIdx = 0;
  let groupIdx = 0;
  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model);
    await model.groups.setOwnerGroup(tr, groupIdx, groupIdx);
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en');
  }, ['users', 'group_reachable_cache']);

  const agent = request.agent(app);
  let response;

  response = await agent.get(`/api/group/${groupIdx}/pending`);
  t.is(response.status, 401);

  response = await agent.post('/api/login').send({
    username,
    password,
  });
  t.is(response.status, 200);

  response = await agent.get(`/api/group/${groupIdx}/pending`);
  t.is(response.status, 403);

  await model.pgDo(async tr => {
    await model.users.addUserMembership(tr, userIdx, groupIdx);
  });

  response = await agent.get(`/api/group/${groupIdx}/pending`);
  t.is(response.status, 200);
  t.deepEqual(response.body, []);

  let pendingUserIdx = 0;
  await model.pgDo(async tr => {
    pendingUserIdx = await createUser(tr, model);
    await model.users.addPendingUserMembership(tr, pendingUserIdx, groupIdx);
  }, ['users']);

  response = await agent.get(`/api/group/${groupIdx}/pending`);
  t.is(response.status, 200);
  t.is(response.body.length, 1);
  t.is(response.body[0].uid, pendingUserIdx);
  t.deepEqual(response.body[0].studentNumbers, []);

  const studentNumber = uuid();
  await model.pgDo(tr => model.users.addStudentNumber(tr, pendingUserIdx, studentNumber), [
    'users',
  ]);

  response = await agent.get(`/api/group/${groupIdx}/pending`);
  t.is(response.status, 200);
  t.is(response.body.length, 1);
  t.is(response.body[0].uid, pendingUserIdx);
  t.deepEqual(response.body[0].studentNumbers, [studentNumber]);
});

test('apply to group', async t => {
  const username = uuid();
  const password = uuid();

  let userIdx = 0;
  let groupIdx = 0;
  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model);
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en');
  }, ['users', 'group_reachable_cache']);

  const agent = request.agent(app);
  let response;

  response = await agent.post(`/api/group/${groupIdx}/apply`);
  t.is(response.status, 401);

  response = await agent.post('/api/login').send({
    username,
    password,
  });
  t.is(response.status, 200);

  response = await agent.post(`/api/group/${groupIdx}/apply`);
  t.is(response.status, 400);

  await model.pgDo(async tr => {
    await model.groups.setOwnerGroup(tr, groupIdx, groupIdx);
  });

  response = await agent.post(`/api/group/${groupIdx}/apply`);
  t.is(response.status, 200);

  response = await agent.post(`/api/group/${groupIdx}/apply`);
  t.is(response.status, 400);

  await model.pgDo(async tr => {
    const pendingIdx = await model.users.getPendingUserMembership(tr, userIdx, groupIdx);
    await model.users.deletePendingUserMembership(tr, pendingIdx);
    await model.users.addUserMembership(tr, userIdx, groupIdx);
  });

  response = await agent.post(`/api/group/${groupIdx}/apply`);
  t.is(response.status, 400);
});

test('accept group requests', async t => {
  const username = uuid();
  const password = uuid();

  let userIdx = 0;
  let memberIdx = 0;
  let groupIdx = 0;
  let ownerGroupIdx = 0;
  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model);
    ownerGroupIdx = await createGroup(tr, model);

    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en');
    await model.users.addUserMembership(tr, userIdx, ownerGroupIdx);

    memberIdx = await createUser(tr, model);
    await model.users.addStudentNumber(tr, memberIdx, uuid());
  }, ['users', 'group_reachable_cache']);

  const agent = request.agent(app);
  let response;

  await model.pgDo(async tr => {
    await model.users.addPendingUserMembership(tr, memberIdx, groupIdx);
  });

  response = await agent.post(`/api/group/${groupIdx}/accept`).send([memberIdx]);
  t.is(response.status, 401);

  response = await agent.post('/api/login').send({
    username,
    password,
  });
  t.is(response.status, 200);

  response = await agent.post(`/api/group/${groupIdx}/accept`).send([memberIdx]);
  t.is(response.status, 403);

  response = await agent.post(`/api/group/${groupIdx}/accept`).send([]);
  t.is(response.status, 400);

  await model.pgDo(async tr => {
    await model.groups.setOwnerGroup(tr, groupIdx, ownerGroupIdx);
  });

  response = await agent.post(`/api/group/${groupIdx}/accept`).send([memberIdx]);
  t.is(response.status, 200);

  response = await agent.post(`/api/group/${groupIdx}/accept`).send([memberIdx]);
  t.is(response.status, 400);
});

test('reject group requests', async t => {
  const username = uuid();
  const password = uuid();

  let userIdx = 0;
  let memberIdx = 0;
  let groupIdx = 0;
  let ownerGroupIdx = 0;
  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model);
    ownerGroupIdx = await createGroup(tr, model);

    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en');
    await model.users.addUserMembership(tr, userIdx, ownerGroupIdx);

    memberIdx = await createUser(tr, model);
    await model.users.addStudentNumber(tr, memberIdx, uuid());
  }, ['users', 'group_reachable_cache']);

  const agent = request.agent(app);
  let response;

  await model.pgDo(async tr => {
    await model.users.addPendingUserMembership(tr, memberIdx, groupIdx);
  });

  response = await agent.post(`/api/group/${groupIdx}/reject`).send([memberIdx]);
  t.is(response.status, 401);

  response = await agent.post('/api/login').send({
    username,
    password,
  });
  t.is(response.status, 200);

  response = await agent.post(`/api/group/${groupIdx}/reject`).send([memberIdx]);
  t.is(response.status, 403);

  response = await agent.post(`/api/group/${groupIdx}/reject`).send([]);
  t.is(response.status, 400);

  await model.pgDo(async tr => {
    await model.groups.setOwnerGroup(tr, groupIdx, ownerGroupIdx);
  });

  response = await agent.post(`/api/group/${groupIdx}/reject`).send([memberIdx]);
  t.is(response.status, 200);

  response = await agent.post(`/api/group/${groupIdx}/reject`).send([memberIdx]);
  t.is(response.status, 400);
});

test('leave group', async t => {
  const username = uuid();
  const password = uuid();

  let userIdx = 0;
  let groupIdx = 0;
  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model);

    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en');
    await model.users.addUserMembership(tr, userIdx, groupIdx);
  }, ['users', 'group_reachable_cache']);

  const agent = request.agent(app);
  let response;

  response = await agent.post(`/api/group/${groupIdx}/leave`);
  t.is(response.status, 401);

  response = await agent.post('/api/login').send({
    username,
    password,
  });
  t.is(response.status, 200);

  response = await agent.post(`/api/group/${groupIdx}/leave`);
  t.is(response.status, 200);
  t.false(await model.pgDo(async tr => await model.users.hasUserMembership(tr, userIdx, groupIdx)));

  response = await agent.post(`/api/group/${groupIdx}/leave`);
  t.is(response.status, 400);
});
