export async function removeUserId(conn: Connection, userId: number): Promise<QueryResult> {
  throw new Error('Not implemented');
}

export async function exists(conn: Connection, userId: number, nodeId: number): Promise<boolean> {
  const select = await conn.query(`select count(*) from users_masks where user_id = $1 and
    node_id = $2`);
  return select.rows[0].count !== 0;
}
