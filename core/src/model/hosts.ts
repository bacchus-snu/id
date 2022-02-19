import Model from './model'
import Transaction from './transaction'
import { NoSuchEntryError, AuthorizationError } from './errors'

export interface Host {
  idx: number
  name: string
  host: string
  hostGroupIdx: number | null
  hostPubkey?: Buffer
}

export interface HostGroup {
  idx: number
  name: string
  requiredPermissionIdx: number | null
}

export default class Hosts {
  constructor(private readonly model: Model) {
  }

  public async addHost(tr: Transaction, name: string, host: string, pubkey?: Uint8Array): Promise<number> {
    const query = 'INSERT INTO hosts(name, host, host_pubkey) VALUES ($1, $2, $3) RETURNING idx'
    const result = await tr.query(query, [name, host, pubkey])
    return result.rows[0].idx
  }

  public async deleteHost(tr: Transaction, idx: number): Promise<void> {
    const query = 'DELETE FROM hosts WHERE idx = $1 RETURNING idx'
    const result = await tr.query(query, [idx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async addHostGroup(tr: Transaction, name: string): Promise<number> {
    const query = 'INSERT INTO host_groups(name) VALUES ($1) RETURNING idx'
    const result = await tr.query(query, [name])
    return result.rows[0].idx
  }

  public async setHostGroupPermission(tr: Transaction, hostGroupIdx: number, permissionIdx: number): Promise<void> {
    const query = 'UPDATE host_groups SET required_permission = $1 WHERE idx = $2 RETURNING idx'
    const result = await tr.query(query, [permissionIdx, hostGroupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async addHostToGroup(tr: Transaction, hostIdx: number, hostGroupIdx: number): Promise<void> {
    const query = 'UPDATE hosts SET host_group = $1 WHERE idx = $2 RETURNING idx'
    const result = await tr.query(query, [hostGroupIdx, hostIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async getHostByInet(tr: Transaction, inet: string, unsafeBypassPubkey = false): Promise<Host> {
    // Remove occasional ipv6-mapped ipv4
    if (inet.lastIndexOf(':') !== -1) {
      inet = inet.substring(inet.lastIndexOf(':') + 1)
    }

    // forbid inet authentication with pubkey registered
    const query = `SELECT idx, name, host, host_group, host_pubkey FROM hosts
      WHERE host(host) = $1 ${unsafeBypassPubkey ? '' : 'AND host_pubkey IS NULL'}`
    const result = await tr.query(query, [inet])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToHost(result.rows[0])
  }

  public async getHostByPubkey(tr: Transaction, pubkey: Uint8Array): Promise<Host> {
    const query = 'SELECT idx, name, host, host_group, host_pubkey FROM hosts WHERE host_pubkey = $1'
    const result = await tr.query(query, [pubkey])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToHost(result.rows[0])
  }

  public async getHostGroupByIdx(tr: Transaction, hostGroupIdx: number): Promise<HostGroup> {
    const query = 'SELECT idx, name, required_permission FROM host_groups WHERE idx = $1'
    const result = await tr.query(query, [hostGroupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToHostGroup(result.rows[0])
  }

  public async authorizeUserByHost(tr: Transaction, userIdx: number, host: Host): Promise<void> {
    if (host.hostGroupIdx === null) {
      // no host group, so just pass it
      return
    }
    const hostGroup = await this.getHostGroupByIdx(tr, host.hostGroupIdx)
    if (hostGroup.requiredPermissionIdx === null) {
      // this means that no permission is required
      return
    }
    const havePermission = await this.model.permissions.checkUserHavePermission(
      tr, userIdx, hostGroup.requiredPermissionIdx)
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
      hostPubkey: row.host_pubkey || undefined,
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
