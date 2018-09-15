import test from 'ava'
import * as uuid from 'uuid/v4'
import { model } from '../setup'

test('get, add, and remove shells', async t => {
  const newShell = uuid()
  await model.pgDo(async tr => {
    await model.shells.addShell(tr, newShell)
    const result = await model.shells.getShells(tr)
    t.true(result.includes(newShell))

    await model.shells.removeShell(tr, newShell)
    const result2 = await model.shells.getShells(tr)
    t.false(result2.includes(newShell))
  })
})
