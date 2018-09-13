import Model from './model'
import { PoolClient } from 'pg'
import { NoSuchEntryError, AuthorizationError } from './errors'

export interface Host {
  idx: number
  name: string
  host: string
  hostGroupIdx: number | null
}

export interface HostGroup {
  idx: number
  name: string
  requiredPermissionIdx: number | null
}

export default class Hosts {
  constructor(private readonly model: Model) {
  }

  public async addHost(client: PoolClient, name: string, host: string): Promise<number> {
    const query = 'INSERT INTO hosts(name, host) VALUES ($1, $2) RETURNING idx'
    const result = await client.query(query, [name, host])
    return result.rows[0].idx
  }

  public async deleteHost(client: PoolClient, idx: number): Promise<void> {
    const query = 'DELETE FROM hosts WHERE idx = $1'
    const result = await client.query(query, [idx])
  }

  public async addHostGroup(client: PoolClient, name: string): Promise<number> {
    const query = 'INSERT INTO host_groups(name) VALUES ($1) RETURNING idx'
    const result = await client.query(query, [name])
    return result.rows[0].idx
  }

  public async setHostGroupPermission(client: PoolClient, hostGroupIdx: number, permissionIdx: number): Promise<void> {
    const query = 'UPDATE host_groups SET required_permission = $1 WHERE idx = $2'
    const result = await client.query(query, [permissionIdx, hostGroupIdx])
  }

  public async addHostToGroup(client: PoolClient, hostIdx: number, hostGroupIdx: number): Promise<void> {
    const query = 'UPDATE hosts SET host_group = $1 WHERE idx = $2'
    const result = await client.query(query, [hostGroupIdx, hostIdx])
  }

  public async getHostByInet(client: PoolClient, inet: string): Promise<Host> {
    const query = 'SELECT idx, name, host, host_group FROM hosts WHERE host(host) = $1'
    const result = await client.query(query, [inet])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToHost(result.rows[0])
  }

  public async getHostGroupByIdx(client: PoolClient, hostGroupIdx: number): Promise<HostGroup> {
    const query = 'SELECT idx, name, required_permission FROM host_groups WHERE idx = $1'
    const result = await client.query(query, [hostGroupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToHostGroup(result.rows[0])
  }

  public async authorizeUserByHost(client: PoolClient, userIdx: number, host: Host): Promise<void> {
    if (host.hostGroupIdx === null) {
      // unknown host
      throw new AuthorizationError()
    }
    const hostGroup = await this.getHostGroupByIdx(client, host.hostGroupIdx)
    if (hostGroup.requiredPermissionIdx === null) {
      // this means that no permission is required
      return
    }
    const havePermission = await this.model.permissions.checkUserHavePermission(
      client, userIdx, hostGroup.requiredPermissionIdx)
    if (!havePermission) {
      throw new AuthorizationError()
    }
  }

  private rowToHost(row: any): Host {
    return {
      idx: row.idx,
      name: row.name,
      host: row.host,
      hostGroupIdx: row.host_group,
    }
  }

  private rowToHostGroup(row: any): HostGroup {
    return {
      idx: row.idx,
      name: row.name,
      requiredPermissionIdx: row.required_permission,
    }
  }
}
