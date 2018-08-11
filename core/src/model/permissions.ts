import Model from './model'
import { Translation } from './translation'
import { PoolClient } from 'pg'
import { NoSuchEntryError } from './errors'

export default class Permissions {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, name: Translation, description: Translation): Promise<number> {
    const query = 'INSERT INTO permissions(name_ko, name_en, description_ko, ' +
      'description_en) VALUES ($1, $2, $3, $4) RETURNING idx'
    const result = await client.query(query, [name.ko, name.en, description.ko, description.en])
    return result.rows[0].idx
  }

  public async delete(client: PoolClient, permissionIdx: number): Promise<number> {
    const query = 'DELETE FROM permissions WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [permissionIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async addPermissionRequirement(client: PoolClient, groupIdx: number,
    permissionIdx: number): Promise<number> {
    const query = 'INSERT INTO permission_requirements(group_idx, permission_idx) ' +
      'VALUES ($1, $2) RETURNING idx'
    const result = await client.query(query, [groupIdx, permissionIdx])
    return result.rows[0].idx
  }

  public async deletePermissionRequirement(client: PoolClient, idx: number): Promise<number> {
    const query = 'DELETE FROM permission_requirements WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [idx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async getAllPermissionRequirements(client:PoolClient, idx: number): Promise<number> {
    const query = 'SELECT group_idx FROM permission_requirements WHERE permission_idx = $1'
    const result = await client.query(query, [idx])
    return result.rows.map(row => row.group_idx)
  }

  public async checkUserHavePermission(client: PoolClient, idx: number, userIdx: number): Promise<boolean> {
    const reachableGroups = await this.model.groups.getReachableGroup(client)
    return false
  }
}
