// backend/core/relationships/routes/relationshipRoutes.js - Routes pour les relations
const express = require('express');
const RelationshipController = require('../controllers/RelationshipController');
const { ValidationError } = require('../../../shared/middleware/errorHandler');

const router = express.Router();

/**
 * Middleware de validation pour les IDs
 */
const validateId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
    throw new ValidationError(`${paramName} invalide`);
  }
  req.params[paramName] = parseInt(id);
  next();
};

/**
 * Middleware de validation pour les données de relation
 */
const validateRelationshipData = (req, res, next) => {
  const { from_entity, to_entity, type } = req.body;
  
  const errors = [];
  
  if (!from_entity || isNaN(parseInt(from_entity))) {
    errors.push('from_entity is required and must be a valid number');
  }
  
  if (!to_entity || isNaN(parseInt(to_entity))) {
    errors.push('to_entity is required and must be a valid number');
  }
  
  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    errors.push('type is required and must be a non-empty string');
  }
  
  if (from_entity && to_entity && parseInt(from_entity) === parseInt(to_entity)) {
    errors.push('from_entity and to_entity cannot be the same');
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', { details: errors });
  }
  
  // Normaliser les données
  req.body.from_entity = parseInt(from_entity);
  req.body.to_entity = parseInt(to_entity);
  req.body.type = type.trim();
  
  next();
};

/**
 * Middleware de validation pour les queries de recherche
 */
const validateSearchQuery = (req, res, next) => {
  const { limit, offset } = req.query;
  
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new ValidationError('limit must be between 1 and 1000');
    }
    req.query.limit = limitNum;
  }
  
  if (offset) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      throw new ValidationError('offset must be 0 or greater');
    }
    req.query.offset = offsetNum;
  }
  
  next();
};

// ===========================================
// ROUTES PRINCIPALES CRUD
// ===========================================

/**
 * @route   POST /api/relationships
 * @desc    Créer une nouvelle relation
 * @access  Private
 */
router.post('/', validateRelationshipData, RelationshipController.createRelationship);

/**
 * @route   GET /api/relationships/:id
 * @desc    Récupérer une relation par son ID
 * @access  Private
 */
router.get('/:id', validateId('id'), RelationshipController.getRelationshipById);

/**
 * @route   PUT /api/relationships/:id
 * @desc    Mettre à jour une relation
 * @access  Private
 */
router.put('/:id', validateId('id'), RelationshipController.updateRelationship);

/**
 * @route   DELETE /api/relationships/:id
 * @desc    Supprimer une relation
 * @access  Private
 */
router.delete('/:id', validateId('id'), RelationshipController.deleteRelationship);

// ===========================================
// ROUTES PAR DOSSIER
// ===========================================

/**
 * @route   GET /api/relationships/folder/:folderId
 * @desc    Récupérer toutes les relations d'un dossier
 * @access  Private
 */
router.get('/folder/:folderId', validateId('folderId'), RelationshipController.getFolderRelationships);

/**
 * @route   GET /api/relationships/folder/:folderId/statistics
 * @desc    Obtenir les statistiques des relations d'un dossier
 * @access  Private
 */
router.get('/folder/:folderId/statistics', validateId('folderId'), RelationshipController.getFolderStatistics);

/**
 * @route   GET /api/relationships/folder/:folderId/circular
 * @desc    Détecter les relations circulaires dans un dossier
 * @access  Private
 */
router.get('/folder/:folderId/circular', validateId('folderId'), RelationshipController.detectCircularRelationships);

/**
 * @route   GET /api/relationships/folder/:folderId/graph
 * @desc    Obtenir le graphe des relations d'un dossier
 * @access  Private
 */
router.get('/folder/:folderId/graph', validateId('folderId'), RelationshipController.getRelationshipGraph);

// ===========================================
// ROUTES PAR ENTITÉ
// ===========================================

/**
 * @route   GET /api/relationships/entity/:entityId
 * @desc    Récupérer toutes les relations d'une entité
 * @access  Private
 */
router.get('/entity/:entityId', validateId('entityId'), RelationshipController.getEntityRelationships);

/**
 * @route   DELETE /api/relationships/entity/:entityId
 * @desc    Supprimer toutes les relations d'une entité
 * @access  Private
 */
router.delete('/entity/:entityId', validateId('entityId'), RelationshipController.deleteEntityRelationships);

/**
 * @route   GET /api/relationships/entity/:entityId/suggestions
 * @desc    Suggérer des relations pour une entité
 * @access  Private
 */
router.get('/entity/:entityId/suggestions', validateId('entityId'), RelationshipController.getRelationshipSuggestions);

// ===========================================
// ROUTES UTILITAIRES
// ===========================================

/**
 * @route   GET /api/relationships/types
 * @desc    Obtenir tous les types de relations disponibles
 * @access  Private
 */
router.get('/types', RelationshipController.getRelationshipTypes);

/**
 * @route   POST /api/relationships/validate
 * @desc    Valider des données de relation
 * @access  Private
 */
router.post('/validate', RelationshipController.validateRelationship);

/**
 * @route   GET /api/relationships/search
 * @desc    Rechercher des relations
 * @access  Private
 */
router.get('/search', validateSearchQuery, RelationshipController.searchRelationships);

/**
 * @route   GET /api/relationships/health
 * @desc    Health check du service relationships
 * @access  Private
 */
router.get('/health', RelationshipController.healthCheck);

// ===========================================
// ROUTES BATCH ET FUSION
// ===========================================

/**
 * @route   POST /api/relationships/batch
 * @desc    Créer plusieurs relations en batch
 * @access  Private
 */
router.post('/batch', (req, res, next) => {
  const { relationships } = req.body;
  
  if (!Array.isArray(relationships)) {
    throw new ValidationError('relationships must be an array');
  }
  
  if (relationships.length === 0) {
    throw new ValidationError('relationships array cannot be empty');
  }
  
  if (relationships.length > 100) {
    throw new ValidationError('cannot create more than 100 relationships at once');
  }
  
  // Valider chaque relation
  relationships.forEach((rel, index) => {
    const { from_entity, to_entity, type } = rel;
    
    if (!from_entity || !to_entity || !type) {
      throw new ValidationError(`Relationship at index ${index} is missing required fields`);
    }
    
    if (parseInt(from_entity) === parseInt(to_entity)) {
      throw new ValidationError(`Relationship at index ${index} cannot have same source and target`);
    }
  });
  
  next();
}, RelationshipController.createRelationshipsBatch);

/**
 * @route   POST /api/relationships/merge
 * @desc    Fusionner les relations de deux entités
 * @access  Private
 */
router.post('/merge', (req, res, next) => {
  const { sourceEntityId, targetEntityId } = req.body;
  
  if (!sourceEntityId || !targetEntityId) {
    throw new ValidationError('sourceEntityId and targetEntityId are required');
  }
  
  if (isNaN(parseInt(sourceEntityId)) || isNaN(parseInt(targetEntityId))) {
    throw new ValidationError('sourceEntityId and targetEntityId must be valid numbers');
  }
  
  if (parseInt(sourceEntityId) === parseInt(targetEntityId)) {
    throw new ValidationError('sourceEntityId and targetEntityId must be different');
  }
  
  req.body.sourceEntityId = parseInt(sourceEntityId);
  req.body.targetEntityId = parseInt(targetEntityId);
  
  next();
}, RelationshipController.mergeEntityRelationships);

// ===========================================
// ROUTES SPÉCIALES
// ===========================================

/**
 * @route   GET /api/relationships/analytics/network/:folderId
 * @desc    Analyse approfondie du réseau de relations
 * @access  Private
 */
router.get('/analytics/network/:folderId', validateId('folderId'), async (req, res, next) => {
  try {
    const { folderId } = req.params;
    const { includeMetrics = true, includeCentrality = false } = req.query;
    
    // Cette route pourrait être développée pour des analyses avancées
    // Pour l'instant, rediriger vers les statistiques standard
    const result = await RelationshipController.getFolderRelationships(req, res, () => {});
    
    if (includeMetrics === 'true') {
      // Ajouter des métriques réseau avancées ici
    }
    
    if (includeCentrality === 'true') {
      // Ajouter des calculs de centralité ici
    }
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/relationships/import
 * @desc    Importer des relations depuis un fichier
 * @access  Private
 */
router.post('/import', (req, res, next) => {
  // Cette route pourrait être développée pour importer des relations
  // depuis des formats comme CSV, JSON, Maltego, etc.
  res.status(501).json({
    success: false,
    message: 'Import functionality not yet implemented',
    data: null
  });
});

/**
 * @route   POST /api/relationships/export
 * @desc    Exporter des relations vers un fichier
 * @access  Private
 */
router.post('/export', (req, res, next) => {
  // Cette route pourrait être développée pour exporter des relations
  // vers des formats comme CSV, JSON, GraphML, etc.
  res.status(501).json({
    success: false,
    message: 'Export functionality not yet implemented',
    data: null
  });
});

// ===========================================
// MIDDLEWARE DE GESTION D'ERREURS SPÉCIFIQUE
// ===========================================

/**
 * Middleware de gestion d'erreurs spécifique aux relations
 */
router.use((error, req, res, next) => {
  // Log de l'erreur pour debug
  console.error('Relationship route error:', {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body,
    error: error.message
  });
  
  // Enrichir certaines erreurs avec du contexte
  if (error.message.includes('SQLITE_CONSTRAINT_FOREIGNKEY')) {
    error.message = 'Une ou plusieurs entités référencées n\'existent pas';
  }
  
  if (error.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
    error.message = 'Une relation identique existe déjà entre ces entités';
  }
  
  // Passer au middleware d'erreur global
  next(error);
});

module.exports = router;