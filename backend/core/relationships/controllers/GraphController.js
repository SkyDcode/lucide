// backend/core/relationships/controllers/GraphController.js
const GraphService = require('../services/GraphAnalysisService');

async function graphByFolder(req, res, next) {
  try {
    const folderId = Number(req.params.folderId);
    const includeIsolated = String(req.query.include_isolated || 'true').toLowerCase() !== 'false';
    const types = req.query.types || null; // comma-separated
    const result = await GraphService.getGraphByFolder(folderId, { types, includeIsolated });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

async function graphByEntity(req, res, next) {
  try {
    const id = Number(req.params.id);
    const depth = Number(req.query.depth || 1);
    const types = req.query.types || null; // comma-separated
    const limitNodes = Number(req.query.limit_nodes || 1000);
    const result = await GraphService.getNeighborhood(id, { depth, types, limitNodes });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

async function graphStats(req, res, next) {
  try {
    const folderId = Number(req.query.folder_id);
    if (!folderId) return res.status(400).json({ success: false, message: 'folder_id requis' });
    const types = req.query.types || null;
    const stats = await GraphService.getStatsByFolder(folderId, { types });
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
}

module.exports = {
  graphByFolder,
  graphByEntity,
  graphStats,
};