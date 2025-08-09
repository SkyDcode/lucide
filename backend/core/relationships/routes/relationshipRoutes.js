// backend/core/relationships/routes/relationshipRoutes.js
const express = require('express');
const Controller = require('../controllers/RelationshipController');
const GraphController = require('../controllers/GraphController');

const router = express.Router();

// ---- Graph endpoints ----
// GET /api/relationships/graph/folder/:folderId?types=a,b&include_isolated=true
router.get('/graph/folder/:folderId', GraphController.graphByFolder);
// GET /api/relationships/graph/entity/:id?depth=2&types=a,b&limit_nodes=1000
router.get('/graph/entity/:id', GraphController.graphByEntity);
// GET /api/relationships/graph/stats?folder_id=123&types=a,b
router.get('/graph/stats', GraphController.graphStats);

// ---- CRUD relationships ----
// GET /api/relationships?entity_id=&type=&page=&limit=
router.get('/', Controller.list);
// GET /api/relationships/:id
router.get('/:id', Controller.getOne);
// POST /api/relationships
router.post('/', Controller.create);
// PUT /api/relationships/:id
router.put('/:id', Controller.update);
// DELETE /api/relationships/:id
router.delete('/:id', Controller.remove);

module.exports = router;