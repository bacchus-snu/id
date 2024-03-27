import test from 'ava';
import { v4 as uuid } from 'uuid';
import { model } from '../_setup.js';

test('get, add, and remove shells', async t => {
  const newShell = uuid();
  await model.pgDo(async tr => {
    await model.shells.addShell(tr, newShell);
    const result = await model.shells.getShells(tr);
    t.true(result.includes(newShell));

    await model.shells.removeShell(tr, newShell);
    const result2 = await model.shells.getShells(tr);
    t.false(result2.includes(newShell));
  });
});
