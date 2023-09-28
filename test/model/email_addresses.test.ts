import test from 'ava';

import moment from 'moment';
import { v4 as uuid } from 'uuid';

import { model } from '../_setup';
import { createEmailAddress, createUser } from '../_test_utils';

test('create extra email', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model);
    const emailAddressIdx = await createEmailAddress(tr, model);

    await model.emailAddresses.validate(tr, userIdx, emailAddressIdx);

    const query = 'SELECT owner_idx FROM email_addresses WHERE idx = $1';
    const result = await tr.query<{ owner_idx: number }>(query, [emailAddressIdx]);
    t.is(result.rows[0].owner_idx, userIdx);
  }, ['users']);
});

test('generate verification token', async t => {
  await model.pgDo(async tr => {
    await createUser(tr, model);
    const emailAddressIdx = await createEmailAddress(tr, model);
    await model.emailAddresses.generateVerificationToken(tr, emailAddressIdx);

    const query = 'SELECT * FROM email_verification_tokens WHERE email_idx = $1';
    const result = await tr.query(query, [emailAddressIdx]);
    t.is(result.rows.length, 1);
  }, ['users']);
});

test('get email address by token', async t => {
  await model.pgDo(async tr => {
    await createUser(tr, model);
    const emailLocal = uuid();
    const emailDomain = uuid();
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain);
    await model.emailAddresses.generateVerificationToken(tr, emailAddressIdx);

    const tokenResult = await tr.query<{ token: string }>(
      'SELECT token FROM email_verification_tokens WHERE email_idx = $1',
      [emailAddressIdx],
    );
    const token: string = tokenResult.rows[0].token;

    const result = await model.emailAddresses.getEmailAddressByToken(tr, token);

    t.is(result.local, emailLocal);
    t.is(result.domain, emailDomain);
  }, ['users']);
});

test('identical address should not create new row', async t => {
  await model.pgDo(async tr => {
    const emailLocal = uuid();
    const emailDomain = uuid();
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain);
    const newEmailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain);

    t.is(emailAddressIdx, newEmailAddressIdx);

    const upperCasedIdx = await model.emailAddresses.create(
      tr,
      emailLocal.toUpperCase(),
      emailDomain.toUpperCase(),
    );

    t.is(emailAddressIdx, upperCasedIdx);
  });
});

test('verification token request with identical email idx', async t => {
  await model.pgDo(async tr => {
    const emailLocal = uuid();
    const emailDomain = uuid();
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain);
    const oldToken = await model.emailAddresses.generateVerificationToken(tr, emailAddressIdx);
    const newToken = await model.emailAddresses.generateVerificationToken(tr, emailAddressIdx);

    const query = 'SELECT token FROM email_verification_tokens WHERE email_idx = $1';
    const result = await tr.query<{ token: string }>(query, [emailAddressIdx]);
    const token = result.rows[0].token;
    t.is(newToken, token);
    t.not(oldToken, token);
  });
});

test('token expiration', async t => {
  await model.pgDo(async tr => {
    const emailLocal = uuid();
    const emailDomain = uuid();
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain);
    const token = await model.emailAddresses.generateVerificationToken(tr, emailAddressIdx);
    const expiryResult = await tr.query<{ expires: string }>(
      'SELECT expires FROM email_verification_tokens WHERE token = $1',
      [token],
    );
    const originalExpires = expiryResult.rows[0].expires;

    const query = 'UPDATE email_verification_tokens SET expires = $1 WHERE token = $2';
    let newExpiry = moment(originalExpires).subtract(12, 'hours').toDate();
    await tr.query(query, [newExpiry, token]);
    await model.emailAddresses.ensureTokenNotExpired(tr, token);

    newExpiry = moment(originalExpires).subtract(1, 'day').toDate();
    await tr.query(query, [newExpiry, token]);

    try {
      await model.emailAddresses.ensureTokenNotExpired(tr, token);
    } catch (e) {
      t.pass();
      return;
    }

    t.fail();
  });
});

test('get user emails', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model);
    const emailLocal = uuid();
    const emailDomain = uuid();
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain);
    const emailAddressIdx2 = await createEmailAddress(tr, model);

    await model.emailAddresses.validate(tr, userIdx, emailAddressIdx);
    await model.emailAddresses.validate(tr, userIdx, emailAddressIdx2);

    const result = await model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx);
    t.is(result.length, 2);
    t.is(result[0].local, emailLocal);
    t.is(result[0].domain, emailDomain);
  }, ['users']);
});

test('returns empty email array if there are no emails', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model);
    const result = await model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx);
    t.is(result.length, 0);
  }, ['users']);
});

test('reset resend count of expired verification token', async t => {
  await model.pgDo(async tr => {
    const emailIdx = await model.emailAddresses.create(tr, uuid(), uuid());
    let token = await model.emailAddresses.generateVerificationToken(tr, emailIdx);
    const expiryResult = await tr.query<{ expires: string }>(
      'SELECT expires FROM email_verification_tokens WHERE token = $1',
      [token],
    );
    const originalExpires = expiryResult.rows[0].expires;
    const query =
      'UPDATE email_verification_tokens SET expires = $1, resend_count = 100 WHERE token = $2';
    const newExpiry = moment(originalExpires).subtract(2, 'day').toDate();
    await tr.query(query, [newExpiry, token]);
    token = await model.emailAddresses.generateVerificationToken(tr, emailIdx);

    const resendCount = await model.emailAddresses.getResendCount(tr, token);
    t.is(resendCount, 1);
  });
});
