// backend/core/export/controllers/ReportController.js
const { db } = require('../../../shared/utils/database');
const TemplateService = require('../services/TemplateService');
const PDFService = require('../services/PDFService');

function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

async function getEntityWithContext(entityId) {
  const entity = await db.get('SELECT * FROM entities WHERE id = ?;', [entityId]);
  if (!entity) return null;
  const folder = await db.get('SELECT * FROM folders WHERE id = ?;', [entity.folder_id]);
  const files = await db.all('SELECT * FROM files WHERE entity_id = ?;', [entityId]);

  const outRels = await db.all(`
    SELECT r.*, e2.name AS to_name, e2.type AS to_type
    FROM relationships r
    JOIN entities e2 ON e2.id = r.to_entity
    WHERE r.from_entity = ?
    ORDER BY r.created_at DESC;`, [entityId]);

  const inRels = await db.all(`
    SELECT r.*, e1.name AS from_name, e1.type AS from_type
    FROM relationships r
    JOIN entities e1 ON e1.id = r.from_entity
    WHERE r.to_entity = ?
    ORDER BY r.created_at DESC;`, [entityId]);

  let data = {};
  try { data = JSON.parse(entity.data || '{}'); } catch (e) {}

  const attributes = Object.entries(data).map(([k, v]) => ({ key: k, value: typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v) }));

  const filesView = files.map((f) => ({
    id: f.id,
    filename: f.filename,
    path: f.path,
    mime_type: f.mime_type || '',
    size: f.size || null,
    size_h: humanSize(f.size),
    sha256: f.sha256 || '',
    captured_at: f.captured_at || '',
    source_url: f.source_url || '',
  }));

  return { entity, folder, attributes, files: filesView, outRels, inRels };
}

async function entityPdf(req, res, next) {
  try {
    const id = Number(req.params.id);
    const ctx = await getEntityWithContext(id);
    if (!ctx) return res.status(404).json({ ok: false, error: 'Entité introuvable' });

    const html = TemplateService.render('entity-report', { ...ctx });
    const pdf = await PDFService.htmlToPdfBuffer(html, {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="entity-${id}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
}

async function getFolderWithContext(folderId) {
  const folder = await db.get('SELECT * FROM folders WHERE id = ?;', [folderId]);
  if (!folder) return null;
  const entities = await db.all('SELECT * FROM entities WHERE folder_id = ? ORDER BY created_at DESC;', [folderId]);
  const ids = entities.map((e) => e.id);

  let rels = [];
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    rels = await db.all(`
      SELECT r.* FROM relationships r
      WHERE r.from_entity IN (${placeholders}) OR r.to_entity IN (${placeholders});
    `, [...ids, ...ids]);
  }

  // Degrés
  const degreeMap = new Map();
  rels.forEach((r) => {
    degreeMap.set(r.from_entity, (degreeMap.get(r.from_entity) || 0) + 1);
    degreeMap.set(r.to_entity, (degreeMap.get(r.to_entity) || 0) + 1);
  });
  const entitiesView = entities.map((e) => ({
    ...e,
    degree: degreeMap.get(e.id) || 0,
  }));

  const stats = {
    entities: entities.length,
    relationships: rels.length,
  };

  return { folder, entities: entitiesView, stats };
}

async function folderPdf(req, res, next) {
  try {
    const id = Number(req.params.id);
    const ctx = await getFolderWithContext(id);
    if (!ctx) return res.status(404).json({ ok: false, error: 'Dossier introuvable' });
    const html = TemplateService.render('folder-summary', { ...ctx });
    const pdf = await PDFService.htmlToPdfBuffer(html, {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="folder-${id}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
}

module.exports = { entityPdf, folderPdf };