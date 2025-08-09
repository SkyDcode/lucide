// backend/core/relationships/routes/relationshipRoutes.js
const express = require('express');
const Controller = require('../controllers/RelationshipController');

const router = express.Router();

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