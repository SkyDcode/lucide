// backend/core/export/routes/exportRoutes.js
const express = require('express');
const router = express.Router();

const ExportController = require('../controllers/ExportController');
const ReportController = require('../controllers/ReportController');

// JSON
router.get('/entity/:id/json', ExportController.entityJson);
router.get('/folder/:id/json', ExportController.folderJson);

// PDF
router.get('/entity/:id/pdf', ReportController.entityPdf);
router.get('/folder/:id/pdf', ReportController.folderPdf);

module.exports = router;