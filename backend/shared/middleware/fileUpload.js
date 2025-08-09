// backend/shared/middleware/fileUpload.js
const { makeMulter } = require('../../config/multer'); // <= ce chemin suppose le fichier ci-dessus

function mapMulterError(err) {
  if (!err) return null;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return Object.assign(new Error('Fichier trop volumineux'), { statusCode: 413 });
  }
  if (err.message && err.message.startsWith('Unsupported file type')) {
    return Object.assign(new Error(err.message), { statusCode: 415 });
  }
  return Object.assign(new Error('Erreur upload'), { statusCode: 400, details: err.message });
}

function uploadSingle(field = 'file') {
  const uploader = makeMulter().single(field);
  return (req, res, next) => {
    uploader(req, res, (err) => {
      const mapped = mapMulterError(err);
      if (mapped) return next(mapped);
      if (!req.file) return next(Object.assign(new Error('Aucun fichier'), { statusCode: 400 }));
      next();
    });
  };
}

function uploadArray(field = 'files', maxCount = 10) {
  const uploader = makeMulter().array(field, maxCount);
  return (req, res, next) => {
    uploader(req, res, (err) => {
      const mapped = mapMulterError(err);
      if (mapped) return next(mapped);
      if (!req.files || !req.files.length) return next(Object.assign(new Error('Aucun fichier'), { statusCode: 400 }));
      next();
    });
  };
}

module.exports = { uploadSingle, uploadArray };
