// backend/core/entities/controllers/EntitySearchController.js
const EntitySearchService = require('../services/EntitySearchService');

async function search(req, res, next) {
  try {
    const { q = '', folderId, type, limit, offset } = req.query || {};
    const results = await EntitySearchService.searchEntities({ q, folderId: folderId ? Number(folderId) : undefined, type, limit, offset });
    res.json({ ok: true, results });
  } catch (err) {
    next(err);
  }
}

module.exports = { search };