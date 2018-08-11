import Model from './model'
import { Translation } from './translation'
import { PoolClient } from 'pg'
import { NoSuchEntryError } from './errors'

export interface Group {
  idx: number
  ownerUserIdx: number | null
  ownerGroupIdx: number | null
  name: Translation
  description: Translation
}

interface GroupReachable {
  [groupIdx: number]: Array<number>
}

export interface GroupRelation {
  supergroupIdx: number
  subgroupIdx: number
}

export default class Groups {
  private reachableGroupCache: GroupReachable

  constructor(private readonly model: Model) {
    this.reachableGroupCache = {}
  }

  public async create(client: PoolClient, name: Translation, description: Translation): Promise<number> {
    const query = 'INSERT INTO groups(name_ko, name_en, description_ko, ' +
      'description_en) VALUES ($1, $2, $3, $4) RETURNING idx'
    const result = await client.query(query, [name.ko, name.en, description.ko, description.en])
    return result.rows[0].idx
  }

  public async getAllIdx(client: PoolClient): Promise<Array<number>> {
    const query = 'SELECT idx FROM groups'
    const result = await client.query(query)

    return result.rows.map(row => row.idx)
  }

  public async getReachableGroup(client: PoolClient): Promise<GroupReachable> {
    let groupIdxArray: Array<number> = []
    let groupRelationArray: Array<GroupRelation> = []
    const firstGroupReachable: GroupReachable = {}
    const dp: GroupReachable = {}

    groupIdxArray = await this.getAllIdx(client)
    groupRelationArray = await this.getAllGroupRelation(client)

    groupIdxArray.forEach(groupIdx => {
      firstGroupReachable[groupIdx] = []
    })

    groupRelationArray.forEach(groupRelation => {
      const si = groupRelation.supergroupIdx
      // maybe can use Set?
      if (!firstGroupReachable[si].includes(groupRelation.subgroupIdx)) {
        firstGroupReachable[si].push(groupRelation.subgroupIdx)
      }
    })

    groupIdxArray.forEach(gi => {
      this.dfsGroup(gi, dp, firstGroupReachable)
    })

    return dp
  }

  public async getByIdx(client: PoolClient, idx: number): Promise<Group> {
    const query = 'SELECT * FROM groups WHERE idx = $1'
    const result = await client.query(query, [idx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToGroup(result.rows[0])
  }

  public async delete(client: PoolClient, groupIdx: number): Promise<number> {
    const query = 'DELETE FROM groups WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async setOwnerUser(client: PoolClient, groupIdx: number, ownerUserIdx: number | null): Promise<void> {
    const query = 'UPDATE groups SET owner_user_idx = $1 WHERE idx = $2 RETURNING idx'
    const result = await client.query(query, [ownerUserIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async setOwnerGroup(client: PoolClient, groupIdx: number, ownerGroupIdx: number | null): Promise<void> {
    const query = 'UPDATE groups SET owner_group_idx = $1 WHERE idx = $2 RETURNING idx'
    const result = await client.query(query, [ownerGroupIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async addGroupRelation(client: PoolClient, supergroupIdx: number, subgroupIdx: number): Promise<number> {
    const query = 'INSERT INTO group_relations(supergroup_idx, subgroup_idx) ' +
      'VALUES ($1, $2) RETURNING idx'
    const result = await client.query(query, [supergroupIdx, subgroupIdx])
    return result.rows[0].idx
  }

  public async deleteGroupRelation(client: PoolClient, groupRelationIdx: number): Promise<number> {
    const query = 'DELETE FROM group_relations WHERE idx = $1 RETURNING idx'
    const result = await client.query(query, [groupRelationIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return result.rows[0].idx
  }

  public async getAllGroupRelation(client: PoolClient): Promise<Array<GroupRelation>> {
    const query = 'SELECT supergroup_idx, subgroup_idx FROM group_relations'
    const result = await client.query(query)
    return result.rows.map(row => this.rowToGroupRelation(row))
  }

  private dfsGroup(groupIdx: number, dp: GroupReachable, firstGroupReachable: GroupReachable): Array<number> {
    if (groupIdx in dp) {
      return dp[groupIdx]
    }

    const firstReachable: Array<number> = firstGroupReachable[groupIdx]
    let newReachable: Array<number> = []

    firstReachable.forEach(gi => {
      newReachable = newReachable.concat(this.dfsGroup(gi, dp, firstGroupReachable))
    })

    const indexSet = new Set(newReachable.concat(firstReachable))
    indexSet.add(groupIdx)

    dp[groupIdx] = Array.from(indexSet)
    return dp[groupIdx]
  }

  private rowToGroup(row: any): Group {
    return {
      idx: row.idx,
      ownerUserIdx: row.owner_user_idx,
      ownerGroupIdx: row.owner_group_idx,
      name: {
        ko: row.name_ko,
        en: row.name_en,
      },
      description: {
        ko: row.description_ko,
        en: row.description_en,
      },
    }
  }

  private rowToGroupRelation(row: any): GroupRelation {
    return {
      supergroupIdx: row.supergroup_idx,
      subgroupIdx: row.subgroup_idx,
    }
  }
}
