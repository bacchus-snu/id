import test from 'ava'
import { model } from '../setup'
import { delay } from '../test_utils'

test('resolve deadlock', async t => {
  const transactionStages: Array<number> = [0, 0]
  const promises: Array<Promise<void>> = []

  const ensureStageReach = async (transactionIdx: number, stage: number) => {
    while (transactionStages[transactionIdx] < stage) {
      await delay(200)
    }
  }

  await model.pgDo(async tr => {
    await tr.query('CREATE TABLE IF NOT EXISTS dead_lock_test_1 (value int)')
    await tr.query('CREATE TABLE IF NOT EXISTS dead_lock_test_2 (value int)')
  })

  try {
    promises[0] = model.pgDo(async tr => {
      await tr.query('LOCK TABLE dead_lock_test_1 IN ACCESS EXCLUSIVE MODE')
      transactionStages[0] = 1
      await ensureStageReach(1, 1)
      await tr.query('LOCK TABLE dead_lock_test_2 IN ACCESS EXCLUSIVE MODE')
    })

    promises[1] = model.pgDo(async tr => {
      await tr.query('LOCK TABLE dead_lock_test_2 IN ACCESS EXCLUSIVE MODE')
      transactionStages[1] = 1
      await ensureStageReach(0, 1)
      await tr.query('LOCK TABLE dead_lock_test_1 IN ACCESS EXCLUSIVE MODE')
    })

    await Promise.all(promises)
    t.pass()
  } finally {
    await model.pgDo(async tr => {
      await tr.query('DROP TABLE dead_lock_test_1')
      await tr.query('DROP TABLE dead_lock_test_2')
    })
  }
})
