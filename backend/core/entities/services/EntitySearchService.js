// backend/core/entities/services/EntitySearchService.js
// Recherche basique avec fallback :
// - Si table FTS5 `entities_fts` existe => MATCH
// - Sinon LIKE sur name + data JSON brut

const { db } = require('../../../shared/utils/database');

async function hasFTS() {
  const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='entities_fts';");
  return !!row;
}

function buildWhere({ folderId, type }) {
  const where = [];
  const params = [];
  if (folderId) { where.push('e.folder_id = ?'); params.push(folderId); }
  if (type) { where.push('e.type = ?'); params.push(type); }
  return { where: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

async function searchEntities({ q = '', folderId, type, limit = 20, offset = 0 }) {
  limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  offset = Math.max(Number(offset) || 0, 0);
  const useFts = await hasFTS();

  if (useFts && q && q.trim()) {
    // FTS: on suppose index sur name + data (texte) + type + folder_id
    const { where, params } = buildWhere({ folderId, type });
    const sql = `
      SELECT e.*
      FROM entities e
      JOIN entities_fts f ON e.id = f.rowid
      ${where ? where : ''}
      AND f MATCH ?
      ORDER BY e.updated_at DESC, e.created_at DESC
      LIMIT ? OFFSET ?;
    `;
    return db.all(sql, [...params, q, limit, offset]);
  }

  // Fallback LIKE : name ou extrait de data
  const { where, params } = buildWhere({ folderId, type });
  const like = `%${q}%`;
  const sql = `
    SELECT e.*
    FROM entities e
    ${where ? where : 'WHERE 1=1'}
    AND (
      e.name LIKE ?
      OR e.data LIKE ?
    )
    ORDER BY e.updated_at DESC, e.created_at DESC
    LIMIT ? OFFSET ?;
  `;
  return db.all(sql, [...params, like, like, limit, offset]);
}

module.exports = {
  searchEntities,
};