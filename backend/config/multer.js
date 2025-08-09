// backend/config/multer.js
// Configuration Multer (stockage disque) pour les uploads média
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { ensureDirExists, safeBasename, getExtFromMimetype } = require('../shared/utils/fileHelper');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_UPLOAD_DIR = process.env.MEDIA_UPLOAD_DIR || process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads', 'media');

// Liste blanche de MIME types (ajoute si besoin)
const ALLOWED_MIMES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  // Documents
  'application/pdf', 'text/plain', 'text/csv', 'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  // Audio/Video (optionnel)
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
]);

function computeSubdirByDate(d = new Date()) {
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return path.join(y, m); // e.g. 2025/08
}

function destinationCallback(req, file, cb) {
  try {
    const root = DEFAULT_UPLOAD_DIR;
    const dated = computeSubdirByDate();
    const dest = path.join(root, dated);
    ensureDirExists(dest);
    cb(null, dest);
  } catch (e) {
    cb(e);
  }
}

function filenameCallback(req, file, cb) {
  try {
    const base = safeBasename(path.parse(file.originalname).name);
    const rand = crypto.randomBytes(6).toString('hex');
    const ext = getExtFromMimetype(file.mimetype, file.originalname);
    const now = Date.now();
    const name = `${base}-${now}-${rand}${ext}`;
    cb(null, name);
  } catch (e) {
    cb(e);
  }
}

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.size && !ALLOWED_MIMES.has(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
  cb(null, true);
}

function makeMulter() {
  const storage = multer.diskStorage({ destination: destinationCallback, filename: filenameCallback });
  const limits = {
    fileSize: Number(process.env.MEDIA_MAX_FILESIZE || 50 * 1024 * 1024), // 50MB par défaut
    files: Number(process.env.MEDIA_MAX_FILES || 10)
  };
  return multer({ storage, fileFilter, limits });
}

module.exports = {
  makeMulter,
  ALLOWED_MIMES,
  DEFAULT_UPLOAD_DIR,
};