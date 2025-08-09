// backend/core/media/routes/mediaRoutes.js
const express = require('express');
const MediaController = require('../controllers/MediaController');
const { uploadSingle } = require('../../../shared/middleware/fileUpload');

const router = express.Router();

// GET /api/media?entity_id=&folder_id=&page=&limit=
router.get('/', MediaController.list);
// GET /api/media/:id
router.get('/:id', MediaController.getOne);
// GET /api/media/:id/download
router.get('/:id/download', MediaController.download);
// POST /api/media  (body: file=<fichier>, [entity_id], [folder_id])
router.post('/', uploadSingle('file'), MediaController.upload);
// DELETE /api/media/:id
router.delete('/:id', MediaController.remove);

module.exports = router;