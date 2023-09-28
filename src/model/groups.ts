import { NoSuchEntryError } from './errors';
import Transaction from './transaction';
import { Translation } from './translation';

interface GroupRow {
  idx: number;
  owner_group_idx: number | null;
  name_ko: string;
  name_en: string;
  description_ko: string;
  description_en: string;
  identifier: string;
}

export interface Group {
  idx: number;
  ownerGroupIdx: number | null;
  name: Translation;
  description: Translation;
  identifier: string;
}

interface GroupUserInfoRow {
  idx: number;
  name_ko: string;
  name_en: string;
  description_ko: string;
  description_en: string;
  identifier: string;
  is_pending: boolean;
  is_member: boolean;
  is_direct_member: boolean;
  is_owner: boolean;
}

export interface GroupUserInfo {
  idx: number;
  name: Translation;
  description: Translation;
  identifier: string;
  isMember: boolean;
  isDirectMember: boolean;
  isPending: boolean;
  isOwner: boolean;
}

interface GroupReachable {
  [groupIdx: number]: Array<number>;
}

interface GroupRelationshipRow {
  supergroup_idx: number;
  subgroup_idx: number;
}

export interface GroupRelationship {
  supergroupIdx: number;
  subgroupIdx: number;
}

export default class Groups {
  constructor() {
  }

  public async create(
    tr: Transaction,
    name: Translation,
    description: Translation,
    identifier: string,
  ): Promise<number> {
    const query = 'INSERT INTO groups(name_ko, name_en, description_ko, '
      + 'description_en, identifier) VALUES ($1, $2, $3, $4, $5) RETURNING idx';
    const result = await tr.query<{ idx: number }>(query, [
      name.ko,
      name.en,
      description.ko,
      description.en,
      identifier,
    ]);
    await this.updateGroupReachableCache(tr);
    return result.rows[0].idx;
  }

  public async delete(tr: Transaction, groupIdx: number): Promise<number> {
    const query = 'DELETE FROM groups WHERE idx = $1 RETURNING idx';
    const result = await tr.query<{ idx: number }>(query, [groupIdx]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    await this.updateGroupReachableCache(tr);
    return result.rows[0].idx;
  }

  public async getGroupReachableArray(tr: Transaction, groupIdx: number): Promise<Array<number>> {
    const query = 'SELECT subgroup_idx FROM group_reachable_cache WHERE supergroup_idx = $1';
    const result = await tr.query<{ subgroup_idx: number }>(query, [groupIdx]);
    return result.rows.map(row => row.subgroup_idx);
  }

  public async getByIdx(tr: Transaction, idx: number): Promise<Group> {
    const query = 'SELECT * FROM groups WHERE idx = $1';
    const result = await tr.query<GroupRow>(query, [idx]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    return this.rowToGroup(result.rows[0]);
  }

  public async setOwnerGroup(
    tr: Transaction,
    groupIdx: number,
    ownerGroupIdx: number | null,
  ): Promise<void> {
    const query = 'UPDATE groups SET owner_group_idx = $1 WHERE idx = $2 RETURNING idx';
    const result = await tr.query(query, [ownerGroupIdx, groupIdx]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
  }

  public async getUserGroupList(tr: Transaction, userIdx: number): Promise<Array<GroupUserInfo>> {
    const query = `
    WITH
      umem AS (SELECT user_idx, group_idx FROM user_memberships WHERE user_idx = $1),
      pend_umem AS (SELECT user_idx, group_idx FROM pending_user_memberships WHERE user_idx = $1)
    SELECT DISTINCT ON (g.idx)
      g.idx,
      g.name_ko,
      g.name_en,
      g.description_ko,
      g.description_en,
      g.identifier,
      (umem.user_idx IS NOT NULL) AS is_member,
      (dir.user_idx IS NOT NULL) AS is_direct_member,
      (pend_umem.user_idx IS NOT NULL) AS is_pending,
      (EXISTS (SELECT 1 FROM umem WHERE umem.group_idx = g.owner_group_idx)) AS is_owner
    FROM umem
    RIGHT JOIN group_reachable_cache gr ON umem.group_idx = gr.supergroup_idx
    RIGHT JOIN groups g ON g.idx = gr.subgroup_idx
    LEFT JOIN umem dir ON dir.group_idx = g.idx
    LEFT JOIN pend_umem ON pend_umem.group_idx = g.idx
    WHERE g.owner_group_idx IS NOT NULL
    ORDER BY g.idx, umem.user_idx
    `;
    const result = await tr.query<GroupUserInfoRow>(query, [userIdx]);
    return result.rows.map(row => this.rowToGroupUserInfo(row));
  }

  public async checkOwner(tr: Transaction, groupIdx: number, userIdx: number): Promise<boolean> {
    const query = 'SELECT EXISTS (SELECT 1 FROM user_memberships mem INNER JOIN groups g '
      + 'ON g.owner_group_idx = mem.group_idx WHERE mem.user_idx = $1 AND g.idx = $2)';
    const result = await tr.query<{ exists: boolean }>(query, [userIdx, groupIdx]);
    return result.rows[0].exists;
  }

  public async addGroupRelation(
    tr: Transaction,
    supergroupIdx: number,
    subgroupIdx: number,
  ): Promise<number> {
    const query = 'INSERT INTO group_relations(supergroup_idx, subgroup_idx) '
      + 'VALUES ($1, $2) RETURNING idx';
    const result = await tr.query<{ idx: number }>(query, [supergroupIdx, subgroupIdx]);
    await this.updateGroupReachableCache(tr);
    return result.rows[0].idx;
  }

  public async deleteGroupRelation(tr: Transaction, groupRelationIdx: number): Promise<number> {
    const query = 'DELETE FROM group_relations WHERE idx = $1 RETURNING idx';
    const result = await tr.query<{ idx: number }>(query, [groupRelationIdx]);
    if (result.rows.length === 0) {
      throw new NoSuchEntryError();
    }
    await this.updateGroupReachableCache(tr);
    return result.rows[0].idx;
  }

  public async updateGroupReachableCache(tr: Transaction): Promise<void> {
    let groupIdxArray: Array<number> = [];
    let groupRelationArray: Array<GroupRelationship> = [];
    const firstGroupReachable: GroupReachable = {};
    const cache: GroupReachable = {};

    tr.ensureHasAccessExclusiveLock('group_reachable_cache');
    // this will acquire ACCESS EXCLUSIVE lock for cache table
    await tr.query('TRUNCATE group_reachable_cache');

    // these queries should be executed AFTER acquiring lock
    groupIdxArray = await this.getAllIdx(tr);
    groupRelationArray = await this.getAllGroupRelation(tr);

    groupIdxArray.forEach(groupIdx => {
      firstGroupReachable[groupIdx] = [];
    });

    groupRelationArray.forEach(groupRelation => {
      const si = groupRelation.supergroupIdx;
      // maybe can use Set?
      if (!firstGroupReachable[si].includes(groupRelation.subgroupIdx)) {
        firstGroupReachable[si].push(groupRelation.subgroupIdx);
      }
    });

    groupIdxArray.forEach(gi => {
      this.dfsGroup(gi, cache, firstGroupReachable);
    });

    // build cache table
    for (const supergroupIdx of Object.keys(cache)) {
      for (const subgroupIdx of cache[Number(supergroupIdx)]) {
        const query =
          'INSERT INTO group_reachable_cache(supergroup_idx, subgroup_idx) VALUES ($1, $2)';
        await tr.query(query, [Number(supergroupIdx), Number(subgroupIdx)]);
      }
    }
  }

  private async getAllGroupRelation(tr: Transaction): Promise<Array<GroupRelationship>> {
    const query = 'SELECT supergroup_idx, subgroup_idx FROM group_relations';
    const result = await tr.query<GroupRelationshipRow>(query);
    return result.rows.map(row => this.rowToGroupRelation(row));
  }

  private dfsGroup(
    groupIdx: number,
    cache: GroupReachable,
    firstGroupReachable: GroupReachable,
  ): Array<number> {
    if (groupIdx in cache) {
      return cache[groupIdx];
    }

    const firstReachable: Array<number> = firstGroupReachable[groupIdx];
    let newReachable: Array<number> = [];

    firstReachable.forEach(gi => {
      newReachable = newReachable.concat(this.dfsGroup(gi, cache, firstGroupReachable));
    });

    const indexSet = new Set(newReachable.concat(firstReachable));
    indexSet.add(groupIdx);

    cache[groupIdx] = Array.from(indexSet);
    return cache[groupIdx];
  }

  private async getAllIdx(tr: Transaction): Promise<Array<number>> {
    const query = 'SELECT idx FROM groups';
    const result = await tr.query<{ idx: number }>(query);

    return result.rows.map(row => row.idx);
  }

  private rowToGroup(row: GroupRow): Group {
    return {
      idx: row.idx,
      ownerGroupIdx: row.owner_group_idx,
      name: {
        ko: row.name_ko,
        en: row.name_en,
      },
      description: {
        ko: row.description_ko,
        en: row.description_en,
      },
      identifier: row.identifier,
    };
  }

  private rowToGroupUserInfo(row: GroupUserInfoRow): GroupUserInfo {
    return {
      idx: row.idx,
      name: {
        ko: row.name_ko,
        en: row.name_en,
      },
      description: {
        ko: row.description_ko,
        en: row.description_en,
      },
      identifier: row.identifier,
      isPending: row.is_pending,
      isMember: row.is_member,
      isDirectMember: row.is_direct_member,
      isOwner: row.is_owner,
    };
  }

  private rowToGroupRelation(row: GroupRelationshipRow): GroupRelationship {
    return {
      supergroupIdx: row.supergroup_idx,
      subgroupIdx: row.subgroup_idx,
    };
  }
}
