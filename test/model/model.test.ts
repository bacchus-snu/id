import test from 'ava';
import { model } from '../_setup';
import { delay } from '../_test_utils';

test('resolve deadlock', async t => {
  const transactionStages: Array<number> = [0, 0];
  const promises: Array<Promise<void>> = [];

  const ensureStageReach = async (transactionIdx: number, stage: number) => {
    while (transactionStages[transactionIdx] < stage) {
      await delay(200);
    }
  };

  await model.pgDo(async tr => {
    await tr.query(
      'CREATE TABLE IF NOT EXISTS dead_lock_test_1 (idx serial primary key, value int)',
    );
    await tr.query(
      'CREATE TABLE IF NOT EXISTS dead_lock_test_2 (idx serial primary key, value int)',
    );
    await tr.query('TRUNCATE TABLE dead_lock_test_1');
    await tr.query('TRUNCATE TABLE dead_lock_test_2');
  });

  try {
    promises[0] = model.pgDo(async tr => {
      await tr.query('LOCK TABLE dead_lock_test_1 IN ACCESS EXCLUSIVE MODE');
      transactionStages[0]++;
      await ensureStageReach(1, 1);
      await tr.query('LOCK TABLE dead_lock_test_2 IN ACCESS EXCLUSIVE MODE');
      await tr.query('INSERT INTO dead_lock_test_1 (value) VALUES (50)');
      await tr.query('INSERT INTO dead_lock_test_2 (value) VALUES (51)');
    });

    promises[1] = model.pgDo(async tr => {
      await tr.query('LOCK TABLE dead_lock_test_2 IN ACCESS EXCLUSIVE MODE');
      transactionStages[1]++;
      await ensureStageReach(0, 1);
      await tr.query('LOCK TABLE dead_lock_test_1 IN ACCESS EXCLUSIVE MODE');
      await tr.query('INSERT INTO dead_lock_test_1 (value) VALUES (10)');
      await tr.query('INSERT INTO dead_lock_test_2 (value) VALUES (11)');
    });

    await Promise.all(promises);

    const results: Array<Array<number>> = [[], [], []];

    await model.pgDo(async tr => {
      for (let table = 1; table <= 2; table++) {
        for (let idx = 1; idx <= 2; idx++) {
          const result = await tr.query<{ value: number }>(
            'SELECT value FROM dead_lock_test_' + table + ' WHERE idx = ' + idx,
          );
          t.is(result.rowCount, 1);
          results[table][idx] = result.rows[0].value;
        }
      }
    });

    t.is(results[1][1] === 50 || results[1][1] === 10, true, 'results[1][1]: ' + results[1][1]);
    t.is(
      (results[1][2] === 50 || results[1][2] === 10) && results[1][2] !== results[1][1],
      true,
      'results[1][2]: ' + results[1][2],
    );
    t.is(results[2][1], results[1][1] + 1);
    t.is(results[2][2], results[1][2] + 1);
  } finally {
    await model.pgDo(async tr => {
      await tr.query('DROP TABLE dead_lock_test_1');
      await tr.query('DROP TABLE dead_lock_test_2');
    });
  }
});

test('resolve serialization failure', async t => {
  const transactionStages: Array<number> = [0, 0];
  const promises: Array<Promise<void>> = [];

  const ensureStageReach = async (transactionIdx: number, stage: number) => {
    while (transactionStages[transactionIdx] < stage) {
      await delay(200);
    }
  };

  await model.pgDo(async tr => {
    await tr.query(
      'CREATE TABLE IF NOT EXISTS serialization_error_test (idx serial primary key, value int)',
    );
    await tr.query('TRUNCATE TABLE serialization_error_test');
    await tr.query('INSERT INTO serialization_error_test (value) VALUES (100)');
  });

  try {
    promises[0] = model.pgDo(async tr => {
      await tr.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      transactionStages[0]++;
      await ensureStageReach(1, 1);
      const queryResult = await tr.query<{ value: number }>(
        'SELECT value from serialization_error_test WHERE idx = 1',
      );
      t.is(queryResult.rowCount, 1);
      const oldValue = queryResult.rows[0].value;
      transactionStages[0]++;
      await ensureStageReach(1, 2);
      await tr.query('UPDATE serialization_error_test SET value = $1 WHERE idx = 1', [
        oldValue + 100,
      ]);
      await tr.query('SELECT value from serialization_error_test WHERE idx = 1');
    });

    promises[1] = model.pgDo(async tr => {
      await tr.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      transactionStages[1]++;
      await ensureStageReach(0, 1);
      const queryResult = await tr.query<{ value: number }>(
        'SELECT value from serialization_error_test WHERE idx = 1',
      );
      t.is(queryResult.rowCount, 1);
      const oldValue = queryResult.rows[0].value;
      transactionStages[1]++;
      await ensureStageReach(0, 2);
      await tr.query('UPDATE serialization_error_test SET value = $1 WHERE idx = 1', [
        oldValue + 100,
      ]);
      await tr.query('SELECT value from serialization_error_test WHERE idx = 1');
    });

    await Promise.all(promises);
    await model.pgDo(async tr => {
      const queryResult = await tr.query<{ value: number }>(
        'SELECT value from serialization_error_test WHERE idx = 1',
      );
      t.is(queryResult.rowCount, 1);
      const value = queryResult.rows[0].value;
      t.is(value, 300);
    });
  } finally {
    await model.pgDo(async tr => {
      await tr.query('DROP TABLE serialization_error_test');
    });
  }
});
