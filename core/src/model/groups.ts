import Model from './model'
import { Translation } from './translation'
import { PoolClient } from 'pg'
import { NoSuchEntryError } from './errors'

export default class Groups {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, name: Translation, description: Translation): Promise<number> {
    const query = 'INSERT INTO groups(name_ko, name_en, description_ko, ' +
      'description_en) VALUES ($1, $2, $3, $4) RETURNING group_idx'
    const result = await client.query(query, [name.ko, name.en, description.ko, description.en])
    return result.rows[0].group_idx
  }

  public async delete(client: PoolClient, groupIdx: number): Promise<number> {
    const query = 'DELETE FROM groups WHERE group_idx = $1 RETURNING group_idx'
    const result = await client.query(query, [groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].group_idx
  }

  public async addGroupRelation(client: PoolClient, supergroupIdx: number, subgroupIdx: number): Promise<number> {
    const query = 'INSERT INTO group_relations(supergroup_idx, subgroup_idx) ' +
      'VALUES ($1, $2) RETURNING group_relation_idx'
    const result = await client.query(query, [supergroupIdx, subgroupIdx])
    return result.rows[0].group_relation_idx
  }

  public async deleteGroupRelation(client: PoolClient, groupRelationIdx: number) {
    const query = 'DELETE FROM group_relations WHERE group_relation_idx = $1 RETURNING group_relation_idx'
    const result = await client.query(query, [groupRelationIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].group_relation_idx
  }
}
