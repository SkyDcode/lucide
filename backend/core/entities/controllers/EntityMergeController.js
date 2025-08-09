// backend/core/entities/controllers/EntityMergeController.js
const EntityMergeService = require('../services/EntityMergeService');

async function postMerge(req, res, next) {
  try {
    const { targetId, sourceIds, prefer } = req.body || {};
    const merged = await EntityMergeService.mergeEntities({ targetId, sourceIds, prefer });
    res.json({ ok: true, entity: merged });
  } catch (err) {
    next(err);
  }
}

async function getDuplicates(req, res, next) {
  try {
    const folderId = Number(req.query.folderId);
    const minScore = req.query.minScore ? Number(req.query.minScore) : 60;
    if (!folderId) return res.status(400).json({ ok: false, error: 'folderId requis' });
    const groups = await EntityMergeService.findDuplicatesInFolder(folderId, { minScore });
    res.json({ ok: true, groups });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  postMerge,
  getDuplicates,
};