import test from 'ava'
import * as uuid from 'uuid/v4'

import { createGroup, createUser, createGroupRelation } from '../test_utils'
import { model } from '../setup'

test('get, add, and remove shells', async t => {
  const newShell = uuid()
  await model.pgDo(async c => {
    await model.shells.addShell(c, newShell)
    const result = await model.shells.getShells(c)
    t.true(result.includes(newShell))

    await model.shells.removeShell(c, newShell)
    const result2 = await model.shells.getShells(c)
    t.false(result2.includes(newShell))
  })
})
