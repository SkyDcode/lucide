// backend/core/export/controllers/ExportController.js
const { db } = require('../../../shared/utils/database');

async function entityJson(req, res, next) {
  try {
    const id = Number(req.params.id);
    const entity = await db.get('SELECT * FROM entities WHERE id = ?;', [id]);
    if (!entity) return res.status(404).json({ ok: false, error: 'Entité introuvable' });

    const files = await db.all('SELECT * FROM files WHERE entity_id = ?;', [id]);
    const relsOut = await db.all('SELECT * FROM relationships WHERE from_entity = ?;', [id]);
    const relsIn = await db.all('SELECT * FROM relationships WHERE to_entity = ?;', [id]);

    const payload = {
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      entity,
      relationships: { outgoing: relsOut, incoming: relsIn },
      files,
    };

    res.json(payload);
  } catch (err) { next(err); }
}

async function folderJson(req, res, next) {
  try {
    const id = Number(req.params.id);
    const folder = await db.get('SELECT * FROM folders WHERE id = ?;', [id]);
    if (!folder) return res.status(404).json({ ok: false, error: 'Dossier introuvable' });

    const entities = await db.all('SELECT * FROM entities WHERE folder_id = ?;', [id]);
    const entIds = entities.map((e) => e.id);
    let relationships = [], files = [];

    if (entIds.length) {
      const placeholders = entIds.map(() => '?').join(',');
      relationships = await db.all(`
        SELECT * FROM relationships
        WHERE from_entity IN (${placeholders}) OR to_entity IN (${placeholders});
      `, [...entIds, ...entIds]);
      files = await db.all(`SELECT * FROM files WHERE entity_id IN (${placeholders});`, entIds);
    }

    const payload = {
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      folder,
      entities,
      relationships,
      files,
    };
    res.json(payload);
  } catch (err) { next(err); }
}

module.exports = { entityJson, folderJson };