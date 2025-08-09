// backend/core/media/services/MediaStorageService.js
const path = require('path');
const fs = require('fs');
const { computeChecksum, deleteIfExists } = require('../../../shared/utils/fileHelper');
const MediaModel = require('../models/MediaModel');

async function init() {
  await MediaModel.ensureTable();
}

function buildRecordFromFile(file, { folderId = null, entityId = null } = {}) {
  return {
    original_name: file.originalname,
    stored_name: file.filename,
    mime_type: file.mimetype,
    size: file.size,
    ext: path.extname(file.filename),
    path: file.path, // chemin absolu
    url: null, // sera mis à jour après création (endpoint de download)
    checksum: null, // calculé plus bas
    folder_id: folderId ? Number(folderId) : null,
    entity_id: entityId ? Number(entityId) : null,
  };
}

async function saveUploadedFile(file, { folderId, entityId } = {}) {
  if (!file) throw Object.assign(new Error('Aucun fichier reçu'), { statusCode: 400 });
  const rec = buildRecordFromFile(file, { folderId, entityId });
  rec.checksum = await computeChecksum(file.path);
  const created = await MediaModel.create(rec);
  // URL publique via endpoint de download
  const url = `/api/media/${created.id}/download`;
  return MediaModel.updateUrl(created.id, url);
}

async function getById(id) {
  return MediaModel.getById(id);
}

async function list(opts) {
  return MediaModel.list(opts);
}

async function deleteMedia(id) {
  const row = await MediaModel.getById(id);
  if (!row) return; // idempotent
  // Suppression fichier disque
  if (row.path) deleteIfExists(row.path);
  // Suppression en DB
  await MediaModel.remove(id);
}

module.exports = {
  init,
  saveUploadedFile,
  getById,
  list,
  deleteMedia,
};