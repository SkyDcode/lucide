// backend/core/media/models/MediaModel.js
const db = require('../../../shared/utils/database');

const TABLE = 'media';

async function ensureTable() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_name   TEXT NOT NULL,
      mime_type     TEXT NOT NULL,
      size          INTEGER NOT NULL,
      ext           TEXT,
      path          TEXT NOT NULL,
      url           TEXT,
      checksum      TEXT,
      folder_id     INTEGER,
      entity_id     INTEGER,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_entity ON ${TABLE}(entity_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_folder ON ${TABLE}(folder_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_${TABLE}_checksum ON ${TABLE}(checksum)`);
}

async function create(record) {
  const sql = `
    INSERT INTO ${TABLE}
      (original_name, stored_name, mime_type, size, ext, path, url, checksum, folder_id, entity_id)
    VALUES
      (:original_name, :stored_name, :mime_type, :size, :ext, :path, :url, :checksum, :folder_id, :entity_id)
  `;
  const { lastID } = await db.run(sql, record);
  return getById(lastID);
}

async function getById(id) {
  return db.get(`SELECT * FROM ${TABLE} WHERE id = :id`, { id });
}

async function updateUrl(id, url) {
  await db.run(`UPDATE ${TABLE} SET url = :url, updated_at = CURRENT_TIMESTAMP WHERE id = :id`, { id, url });
  return getById(id);
}

async function remove(id) {
  await db.run(`DELETE FROM ${TABLE} WHERE id = :id`, { id });
}

async function list({ entityId, folderId, page = 1, limit = 20 } = {}) {
  const where = [];
  const params = {};
  if (entityId) { where.push('entity_id = :entityId'); params.entityId = entityId; }
  if (folderId) { where.push('folder_id = :folderId'); params.folderId = folderId; }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const data = await db.query(`
    SELECT * FROM ${TABLE}
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT :limit OFFSET :offset
  `, { ...params, limit, offset });

  const countRow = await db.get(`SELECT COUNT(*) as c FROM ${TABLE} ${whereSql}`, params);
  return { data, metadata: { resultsCount: countRow?.c ?? 0, page, limit } };
}

module.exports = {
  ensureTable,
  create,
  getById,
  updateUrl,
  remove,
  list,
};