import Model from './model'
import { User } from './users'
import { Translation } from './translation'
import Transaction from './transaction'
import { NoSuchEntryError } from './errors'

export interface Group {
  idx: number
  ownerUserIdx: number | null
  ownerGroupIdx: number | null
  name: Translation
  description: Translation
  isMember?: boolean
  isPending?: boolean
  isOwner?: boolean
}

interface GroupReachable {
  [groupIdx: number]: Array<number>
}

export interface GroupRelationship {
  supergroupIdx: number
  subgroupIdx: number
}

interface UserMembership {
  idx: number
  userIdx: number
  groupIdx: number
  pending: boolean
}

export default class Groups {
  constructor(private readonly model: Model) {
  }

  public async create(tr: Transaction, name: Translation, description: Translation): Promise<number> {
    const query = 'INSERT INTO groups(name_ko, name_en, description_ko, ' +
      'description_en) VALUES ($1, $2, $3, $4) RETURNING idx'
    const result = await tr.query(query, [name.ko, name.en, description.ko, description.en])
    await this.updateGroupReachableCache(tr)
    return result.rows[0].idx
  }

  public async delete(tr: Transaction, groupIdx: number): Promise<number> {
    const query = 'DELETE FROM groups WHERE idx = $1 RETURNING idx'
    const result = await tr.query(query, [groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    await this.updateGroupReachableCache(tr)
    return result.rows[0].idx
  }

  public async getGroupReachableArray(tr: Transaction, groupIdx: number): Promise<Array<number>> {
    const query = 'SELECT subgroup_idx FROM group_reachable_cache WHERE supergroup_idx = $1'
    const result = await tr.query(query, [groupIdx])
    return result.rows.map(row => row.subgroup_idx)
  }

  public async getByIdx(tr: Transaction, idx: number): Promise<Group> {
    const query = 'SELECT * FROM groups WHERE idx = $1'
    const result = await tr.query(query, [idx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    return this.rowToGroup(result.rows[0])
  }

  public async setOwnerUser(tr: Transaction, groupIdx: number, ownerUserIdx: number | null): Promise<void> {
    const query = 'UPDATE groups SET owner_user_idx = $1 WHERE idx = $2 RETURNING idx'
    const result = await tr.query(query, [ownerUserIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async setOwnerGroup(tr: Transaction, groupIdx: number, ownerGroupIdx: number | null): Promise<void> {
    const query = 'UPDATE groups SET owner_group_idx = $1 WHERE idx = $2 RETURNING idx'
    const result = await tr.query(query, [ownerGroupIdx, groupIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
  }

  public async getUserGroupList(tr: Transaction, userIdx: number): Promise<Array<Group>> {
    const query = 'SELECT g.*,' +
      '$1 IN (SELECT user_idx FROM pending_user_memberships WHERE group_idx = g.idx) AS is_pending ' +
      '$1 IN (SELECT user_idx FROM user_memberships WHERE group_idx IN (SELECT supergroup_idx FROM group_reachable_cache WHERE subgroup_idx = g.idx)) AS is_member ' +
      '$1 IN (SELECT user_idx FROM user_memberships WHERE group_idx = g.owner_group_idx) AS is_owner ' +
      'FROM groups AS g WHERE owner_group_idx IS NOT NULL ORDER BY idx'
    const result = await tr.query(query)

    const groups: Array<Group> = []
    result.rows.forEach(row => {
      groups.push(this.rowToGroup(row))
    })
    return groups
  }

  public async addGroupRelation(tr: Transaction, supergroupIdx: number, subgroupIdx: number): Promise<number> {
    const query = 'INSERT INTO group_relations(supergroup_idx, subgroup_idx) ' +
      'VALUES ($1, $2) RETURNING idx'
    const result = await tr.query(query, [supergroupIdx, subgroupIdx])
    await this.updateGroupReachableCache(tr)
    return result.rows[0].idx
  }

  public async deleteGroupRelation(tr: Transaction, groupRelationIdx: number): Promise<number> {
    const query = 'DELETE FROM group_relations WHERE idx = $1 RETURNING idx'
    const result = await tr.query(query, [groupRelationIdx])
    if (result.rows.length === 0) {
      throw new NoSuchEntryError()
    }
    await this.updateGroupReachableCache(tr)
    return result.rows[0].idx
  }

  public async updateGroupReachableCache(tr: Transaction): Promise<void> {
    let groupIdxArray: Array<number> = []
    let groupRelationArray: Array<GroupRelationship> = []
    const firstGroupReachable: GroupReachable = {}
    const cache: GroupReachable = {}

    tr.ensureHasAccessExclusiveLock('group_reachable_cache')
    // this will acquire ACCESS EXCLUSIVE lock for cache table
    await tr.query('TRUNCATE group_reachable_cache')

    // these queries should be executed AFTER acquiring lock
    groupIdxArray = await this.getAllIdx(tr)
    groupRelationArray = await this.getAllGroupRelation(tr)

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
      this.dfsGroup(gi, cache, firstGroupReachable)
    })

    // build cache table
    for (const supergroupIdx of Object.keys(cache)) {
      for (const subgroupIdx of cache[Number(supergroupIdx)]) {
        const query = 'INSERT INTO group_reachable_cache(supergroup_idx, subgroup_idx) VALUES ($1, $2)'
        await tr.query(query, [Number(supergroupIdx), Number(subgroupIdx)])
      }
    }
  }

  public async addPendingUserMembership(tr: Transaction, userIdx: number, groupIdx: number): Promise<UserMembership> {
    const query = 'INSERT INTO pending_user_memberships (user_idx, group_idx) VALUES ($1, $2) RETURNING idx'
    const result = await tr.query(query, [userIdx, groupIdx])
    const ret: UserMembership = {
      idx: result.rows[0].idx,
      userIdx,
      groupIdx,
      pending: true,
    }
    return ret
  }

  public async removePendingUserMembership(tr: Transaction, idx: number): Promise<void> {
    const query = 'DELETE FROM pending_user_memberships WHERE idx = $1'
    await tr.query(query, [idx])
  }

  public async getAllPendingMembershipUsers(tr: Transaction, groupIdx: number): Promise<Array<User>> {
    const query = 'SELECT u.*, sn.student_number FROM pending_user_memberships AS pum INNER JOIN users AS u ' +
      'ON pum.user_idx = u.idx INNER JOIN student_numbers AS sn ON sn.owner_idx = u.idx ' +
      'WHERE pum.group_idx = $1'
    const result = await tr.query(query, [groupIdx])
    return result.rows.map(row => this.rowToUser(row))
  }

  private async getAllGroupRelation(tr: Transaction): Promise<Array<GroupRelationship>> {
    const query = 'SELECT supergroup_idx, subgroup_idx FROM group_relations'
    const result = await tr.query(query)
    return result.rows.map(row => this.rowToGroupRelation(row))
  }

  private dfsGroup(groupIdx: number, cache: GroupReachable, firstGroupReachable: GroupReachable): Array<number> {
    if (groupIdx in cache) {
      return cache[groupIdx]
    }

    const firstReachable: Array<number> = firstGroupReachable[groupIdx]
    let newReachable: Array<number> = []

    firstReachable.forEach(gi => {
      newReachable = newReachable.concat(this.dfsGroup(gi, cache, firstGroupReachable))
    })

    const indexSet = new Set(newReachable.concat(firstReachable))
    indexSet.add(groupIdx)

    cache[groupIdx] = Array.from(indexSet)
    return cache[groupIdx]
  }

  private async getAllIdx(tr: Transaction): Promise<Array<number>> {
    const query = 'SELECT idx FROM groups'
    const result = await tr.query(query)

    return result.rows.map(row => row.idx)
  }

  private rowToUser(row: any): User {
    const user: User = {
      idx: row.idx,
      username: row.username,
      name: row.name,
      uid: row.uid,
      shell: row.shell,
      preferredLanguage: row.preferred_language,
    }

    if (row.student_number) {
      user.studentNumber = row.student_number
    }

    return user
  }

  private rowToGroup(row: any): Group {
    const group: Group = {
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

    if (row.is_pending) {
      group.isPending = true
    }
    if (row.is_member) {
      group.isMember = true
    }
    if (row.is_owner) {
      group.isOwner = true
    }

    return group
  }

  private rowToUserMembership(row: any): UserMembership {
    return {
      idx: row.idx,
      userIdx: row.user_idx,
      groupIdx: row.group_idx,
      pending: false,
    }
  }

  private rowToPendingUserMembership(row: any): UserMembership {
    return {
      idx: row.idx,
      userIdx: row.user_idx,
      groupIdx: row.group_idx,
      pending: true,
    }
  }

  private rowToGroupRelation(row: any): GroupRelationship {
    return {
      supergroupIdx: row.supergroup_idx,
      subgroupIdx: row.subgroup_idx,
    }
  }
}
