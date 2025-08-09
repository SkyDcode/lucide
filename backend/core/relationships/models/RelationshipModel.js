// backend/core/relationships/models/RelationshipModel.js
const db = require('../../../shared/utils/database');

const TABLE = 'relationships';

async function ensureTable() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_entity INTEGER NOT NULL,
      to_entity   INTEGER NOT NULL,
      type        TEXT    NOT NULL,
      data        TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_from ON ${TABLE}(from_entity)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_to ON ${TABLE}(to_entity)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_type ON ${TABLE}(type)`);
  // Pour accélérer la recherche de doublons directionnels
  await db.run(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_pair ON ${TABLE}(from_entity, to_entity, type)`);
}

function rowToObj(row) {
  if (!row) return null;
  let parsed = null;
  try { parsed = row.data ? JSON.parse(row.data) : null; } catch (_) { parsed = null; }
  return { ...row, data: parsed };
}

async function create(rec) {
  const sql = `
    INSERT INTO ${TABLE} (from_entity, to_entity, type, data)
    VALUES (:from_entity, :to_entity, :type, :data)
  `;
  const payload = { ...rec, data: rec.data ? JSON.stringify(rec.data) : null };
  const { lastID } = await db.run(sql, payload);
  return getById(lastID);
}

async function update(id, patch) {
  const set = [];
  const params = { id };
  if (patch.type !== undefined) { set.push('type = :type'); params.type = patch.type; }
  if (patch.data !== undefined) { set.push('data = :data'); params.data = patch.data ? JSON.stringify(patch.data) : null; }
  if (!set.length) return getById(id);
  set.push('updated_at = CURRENT_TIMESTAMP');
  await db.run(`UPDATE ${TABLE} SET ${set.join(', ')} WHERE id = :id`, params);
  return getById(id);
}

async function remove(id) {
  await db.run(`DELETE FROM ${TABLE} WHERE id = :id`, { id });
}

async function getById(id) {
  const row = await db.get(`SELECT * FROM ${TABLE} WHERE id = :id`, { id });
  return rowToObj(row);
}

async function list({ entityId, type, page = 1, limit = 50 } = {}) {
  const where = [];
  const params = {};
  if (entityId) { where.push('(from_entity = :eid OR to_entity = :eid)'); params.eid = entityId; }
  if (type) { where.push('type = :type'); params.type = type; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const offset = (page - 1) * limit;
  const rows = await db.query(`
    SELECT * FROM ${TABLE}
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT :limit OFFSET :offset
  `, { ...params, limit, offset });
  const countRow = await db.get(`SELECT COUNT(*) as c FROM ${TABLE} ${whereSql}`, params);
  return {
    data: rows.map(rowToObj),
    metadata: { resultsCount: countRow?.c ?? 0, page, limit }
  };
}

async function findBetween(a, b, type, { bidirectional = true } = {}) {
  const params = { a, b, type };
  let sql = `SELECT * FROM ${TABLE} WHERE type = :type AND from_entity = :a AND to_entity = :b`;
  if (bidirectional) sql = `SELECT * FROM ${TABLE} WHERE type = :type AND ((from_entity = :a AND to_entity = :b) OR (from_entity = :b AND to_entity = :a))`;
  const rows = await db.query(sql, params);
  return rows.map(rowToObj);
}

module.exports = {
  ensureTable,
  create,
  update,
  remove,
  getById,
  list,
  findBetween,
};