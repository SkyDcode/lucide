// backend/core/relationships/controllers/RelationshipController.js
const Service = require('../services/RelationshipService');

// Init à l'import pour s'assurer des tables
Service.init().catch((e) => console.error('Relationships init error:', e));

async function create(req, res, next) {
  try {
    const payload = {
      from_entity: Number(req.body.from_entity || req.query.from_entity),
      to_entity: Number(req.body.to_entity || req.query.to_entity),
      type: String(req.body.type || req.query.type || ''),
      data: req.body.data || null,
    };
    const out = await Service.create(payload);
    const status = out.created ? 201 : 200;
    res.status(status).json({ success: true, data: out.record });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const patch = { type: req.body.type, data: req.body.data };
    const updated = await Service.update(id, patch);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try { await Service.remove(Number(req.params.id)); res.json({ success: true }); }
  catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const row = await Service.getById(Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Relation introuvable' });
    res.json({ success: true, data: row });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { entity_id, type, page = 1, limit = 50 } = req.query;
    const result = await Service.list({
      entityId: entity_id ? Number(entity_id) : undefined,
      type: type || undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
}

module.exports = {
  create,
  update,
  remove,
  getOne,
  list,
};