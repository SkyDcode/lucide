// backend/shared/utils/fileHelper.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(str) {
  return String(str)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_\.]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function safeBasename(name) {
  const n = path.parse(name).name;
  return slugify(n) || 'file';
}

function getExtFromMimetype(mime, originalName = '') {
  const map = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/bmp': '.bmp', 'image/tiff': '.tiff',
    'application/pdf': '.pdf', 'text/plain': '.txt', 'text/csv': '.csv', 'application/json': '.json',
    'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg',
    'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/x-msvideo': '.avi', 'video/x-matroska': '.mkv',
    'application/msword': '.doc', 'application/vnd.ms-excel': '.xls', 'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  };
  if (map[mime]) return map[mime];
  const ext = path.extname(originalName || '');
  return ext || '';
}

function computeChecksum(filePath, algo = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function deleteIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    // on journalise mais on ne jette pas
    console.warn('deleteIfExists warning:', e?.message);
  }
}

module.exports = {
  ensureDirExists,
  safeBasename,
  slugify,
  getExtFromMimetype,
  computeChecksum,
  deleteIfExists,
};