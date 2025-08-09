// backend/core/media/controllers/MediaController.js
const fs = require('fs');
const path = require('path');
const MediaStorageService = require('../services/MediaStorageService');

// S'assurer que la table est prête quand le module est chargé
MediaStorageService.init().catch((e) => console.error('Media init error:', e));

async function upload(req, res, next) {
  try {
    const { entity_id, folder_id } = { ...req.body, ...req.query };
    const saved = await MediaStorageService.saveUploadedFile(req.file, {
      entityId: entity_id, folderId: folder_id,
    });
    res.status(201).json({ success: true, data: saved });
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const row = await MediaStorageService.getById(id);
    if (!row) return res.status(404).json({ success: false, message: 'Media not found' });
    res.json({ success: true, data: row });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { entity_id, folder_id, page = 1, limit = 20 } = req.query;
    const result = await MediaStorageService.list({
      entityId: entity_id ? Number(entity_id) : undefined,
      folderId: folder_id ? Number(folder_id) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
}

async function download(req, res, next) {
  try {
    const id = Number(req.params.id);
    const row = await MediaStorageService.getById(id);
    if (!row) return res.status(404).json({ success: false, message: 'Media not found' });
    if (!row.path || !fs.existsSync(row.path)) {
      return res.status(410).json({ success: false, message: 'File missing on server' });
    }
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(row.original_name)}"`);
    fs.createReadStream(row.path).pipe(res);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await MediaStorageService.deleteMedia(id);
    res.json({ success: true });
  } catch (e) { next(e); }
}

module.exports = {
  upload,
  getOne,
  list,
  download,
  remove,
};