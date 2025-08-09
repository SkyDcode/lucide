// backend/core/relationships/models/RelationshipTypeModel.js
const db = require('../../../shared/utils/database');

const TABLE = 'relationship_types';

async function ensureTable() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      label TEXT,
      color TEXT,
      bidirectional INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${TABLE}_key ON ${TABLE}(key)`);
}

async function seedFromConstants() {
  let CONSTS = null;
  try { CONSTS = require('../../../shared/constants/relationshipTypes'); } catch (_) { /* pas de seed */ }
  if (!CONSTS || !Array.isArray(CONSTS) || !CONSTS.length) return;

  for (const t of CONSTS) {
    const existing = await getByKey(t.key);
    if (!existing) await create({
      key: t.key,
      label: t.label || t.key,
      color: t.color || null,
      bidirectional: typeof t.bidirectional === 'boolean' ? (t.bidirectional ? 1 : 0) : 1,
    });
  }
}

function rowToObj(row) {
  if (!row) return null;
  return {
    ...row,
    bidirectional: !!row.bidirectional,
  };
}

async function create(rec) {
  const sql = `INSERT INTO ${TABLE} (key, label, color, bidirectional) VALUES (:key, :label, :color, :bidirectional)`;
  const { lastID } = await db.run(sql, rec);
  return getById(lastID);
}

async function getById(id) {
  const row = await db.get(`SELECT * FROM ${TABLE} WHERE id = :id`, { id });
  return rowToObj(row);
}

async function getByKey(key) {
  const row = await db.get(`SELECT * FROM ${TABLE} WHERE key = :key`, { key });
  return rowToObj(row);
}

async function list() {
  const rows = await db.query(`SELECT * FROM ${TABLE} ORDER BY key ASC`);
  return rows.map(rowToObj);
}

module.exports = {
  ensureTable,
  seedFromConstants,
  create,
  getById,
  getByKey,
  list,
};