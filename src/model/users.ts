import { begin } from './utils';

/**
 * Create a user with granted node
 * Returns userId of the created user
 */
export async function createUser(nodeId: number, expireAfter: Date | null,
  name: string, realname: string | null, snuidBachelor: number | null,
  snuidMaster: number | null, snuidDoctor: number | null, snuidMasterDoctor: number | null,
  shellId: number | null, timezone: string | null): Promise<number> {
  const transaction = await begin();
  await transaction.query(
    `insert into users (name, realname, snuidBachelor, snuidMaster, snuidDoctor,
     snuidMasterDoctor, shellId, timezone)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
     [name, realname, snuidBachelor, snuidMaster, snuidDoctor, snuidMasterDoctor, shellId,
     timezone],
  );
  await transaction.commit();
  return 1;
}
