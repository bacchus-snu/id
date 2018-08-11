import Model from './model'
import { Translation } from './translation'
import { PoolClient } from 'pg'
import { NoSuchEntryError } from './errors'

export default class Permissions {
  constructor(private readonly model: Model) {
  }

  public async create(client: PoolClient, name: Translation): Promise<number> {
    const query = 'INSERT INTO permissions(name_ko, name_en) VALUES ($1, $2) RETURNING permission_idx'
    const result = await client.query(query, [name.ko, name.en])
    return result.rows[0].permission_idx
  }

  public async delete(client: PoolClient, permissionIdx: number): Promise<number> {
    const query = 'DELETE FROM permissions WHERE permission_idx = $1 RETURNING permission_idx'
    const result = await client.query(query, [permissionIdx])
    return result.rows[0].permission_idx
  }

  public async addPermissionRequirement(client: PoolClient, groupIdx: number,
    permissionIdx: number): Promise<number> {
    const query = 'INSERT INTO permission_requirements(group_idx, permission_idx) ' +
      'VALUES ($1, $2) RETURNING permission_requirement_idx'
    const result = await client.query(query, [groupIdx, permissionIdx])
    return result.rows[0].permission_requirement_idx
  }

  public async deletePermissionRequirement(client: PoolClient, permissionRequirementIdx: number): Promise<number> {
    const query = 'DELETE FROM permission_requirements ' +
      'WHERE permission_requirement_idx = $1 RETURNING permission_requirement_idx'
    const result = await client.query(query, [permissionRequirementIdx])
    return result.rows[0].permission_requirement_idx
  }
}
