// backend/core/entities/controllers/EntityController.js - Contrôleur REST pour les entités LUCIDE
'use strict';

const EntityService = require('../services/EntityService');
const { asyncHandler } = require('../../../shared/middleware/errorHandler');
const { logger } = require('../../../shared/middleware/logging');
const EntityValidator = require('../validators/EntityValidator');


/**
 * Helpers de parsing sûrs pour les query params
 */
const toInt = (v, def = undefined) => {
  if (v === undefined || v === null || v === '') return def;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
};
const toBool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return def;
};

/**
 * Contrôleur REST pour la gestion des entités OSINT
 * Gère les requêtes HTTP et délègue la logique métier au service
 */
class EntityController {
  /**
   * Créer une nouvelle entité
   * POST /api/entities
   */
  static createEntity = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities - Creating new entity', {
      body: req.body,
      requestId: req.requestId
    });

    const result = await EntityService.createEntity(req.body);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
      validation: result.validation,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Middleware: validation de paramètres communs (pagination, etc.)
   */
  static validateCommonParams = (req, res, next) => {
    try {
      // Pagination standard ?page=&limit=
      if (req.query.page || req.query.limit) {
        const { page, limit } = EntityValidator.validatePagination({
          page: req.query.page,
          limit: req.query.limit
        });
        req.pagination = { page, limit };
      }

      // Optionnel: sécuriser quelques filtres fréquents
      if (req.query.type) {
        req.query.type = EntityValidator.validateEntityType(req.query.type);
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  /**
   * Middleware: ajoute un timestamp de début pour métriques per-request
   */
  static addRequestTiming = (req, res, next) => {
    req.startTime = Date.now();
    next();
  };

  /**
   * Middleware factory: définit des headers de cache pour les GET
   */
  static setCacheHeaders = (seconds = 300) => (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${seconds}, must-revalidate`);
      res.set('Vary', 'Accept-Encoding, Origin');
    }
    next();
  };

  /**
   * Middleware: contrôle de quotas (placeholder, prêt pour une implémentation réelle)
   */
  static checkQuotas = (req, res, next) => {
    // TODO: brancher sur un vrai système de quotas si nécessaire
    next();
  };

  /**
   * Middleware factory: trace une action utilisateur / API
   */
  static logAction = (action) => async (req, res, next) => {
    try {
      await EntityService.logUserAction(action, {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent') || null
      });
    } catch (e) {
      // On n'échoue pas la requête pour un log
    }
    next();
  };

  /**
   * HEAD /:id — renvoie 200 si l’entité existe, 404 sinon
   */
  static checkEntityExists = asyncHandler(async (req, res) => {
    const entity = await EntityService.getEntityById(req.params.id);
    if (entity && (entity.data || entity.id)) {
      return res.status(200).end();
    }
    return res.status(404).end();
  });

  /**
   * GET /:id/exists — payload booléen
   */
  static getEntityExistence = asyncHandler(async (req, res) => {
    const entity = await EntityService.getEntityById(req.params.id);
    const exists = !!(entity && (entity.data || entity.id));
    res.status(exists ? 200 : 404).json({
      success: exists,
      exists,
      id: req.params.id,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /count — nombre d’entités correspondant aux filtres
   */
  static getEntitiesCount = asyncHandler(async (req, res) => {
    const folderId = req.query.folder_id;
    const search = req.query.q || '';
    const options = {
      limit: parseInt(req.query.limit || '0', 10) || 0,
      page: parseInt(req.query.page || '1', 10) || 1
    };
    const result = await EntityService.searchEntities(folderId, search, options);
    const count =
      (result && result.metadata && typeof result.metadata.resultsCount === 'number')
        ? result.metadata.resultsCount
        : (Array.isArray(result?.data) ? result.data.length : 0);

    res.json({
      success: true,
      count,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /recent — dernières entités
   */
  static getRecentEntities = asyncHandler(async (req, res) => {
    const folderId = req.query.folder_id;
    const limit = parseInt(req.query.limit || '10', 10);
    const result = await EntityService.searchEntities(folderId, '', {
      limit,
      page: 1,
      orderBy: 'created_at',
      order: 'desc'
    });
    res.json({
      success: true,
      data: result?.data || [],
      metadata: result?.metadata || {},
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /orphaned — entités sans relations (placeholder si non supporté par le modèle)
   */
  static getOrphanedEntities = asyncHandler(async (req, res) => {
    // Si tu as un modèle/DAO pour détecter les orphelins, branche-le ici.
    // Réponse neutre pour ne pas casser les routes:
    res.status(501).json({
      success: false,
      message: 'Détection des entités orphelines non implémentée',
      data: [],
      timestamp: new Date().toISOString()
    });
  });

  /**
   * POST /analyze — petite analyse (ex. suggestions) sur un payload d’entités
   */
  static analyzeEntities = asyncHandler(async (req, res) => {
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    // Exemple simple: suggestions sur la première entité
    const first = payload[0] || {};
    const suggestions = await EntityService.analyzeEntityForSuggestions(first);
    res.json({
      success: true,
      data: { suggestions },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /schema — expose (succinctement) le schéma de validation
   */
  static getEntitySchema = asyncHandler(async (req, res) => {
    // On ne “dump” pas Joi, on expose juste les sections disponibles
    res.json({
      success: true,
      schemas: [
        'create', 'update', 'search', 'batch', 'position'
      ],
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /metrics — métriques simples au niveau contrôleur
   */
  static getEntityMetrics = asyncHandler(async (req, res) => {
    const now = Date.now();
    const started = req.startTime || now;
    res.json({
      success: true,
      metrics: {
        requestDurationMs: now - started
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /health — healthcheck du module entités
   */
  static healthCheck = (req, res) => {
    res.json({
      status: 'OK',
      module: 'entities',
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Middleware d’erreur spécifique au router des entités
   * (branché avec router.use(...) en fin de fichier routes)
   */
  static handleEntityError = (err, req, res, next) => {
    // Log basique
    logger.error('Entity route error', {
      message: err?.message,
      code: err?.code,
      requestId: req.requestId
    });

    const status = err?.statusCode || 500;
    res.status(status).json({
      success: false,
      error: {
        message: err?.message || 'Erreur interne',
        code: err?.code || 'ENTITY_ERROR',
        details: err?.details || null
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  };
  
  /**
   * Récupérer toutes les entités d'un dossier
   * GET /api/entities/folder/:folderId
   */
  static getEntitiesByFolder = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/folder/:folderId - Retrieving entities by folder', {
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });

    const options = {
      orderBy: req.query.orderBy,
      direction: (req.query.direction || '').toLowerCase() === 'desc' ? 'desc' : 'asc',
      limit: toInt(req.query.limit),
      search: req.query.search,
      type: req.query.type,
      page: toInt(req.query.page, 1)
    };

    const result = await EntityService.getEntitiesByFolder(req.params.folderId, options);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Récupérer une entité par son ID
   * GET /api/entities/:id
   */
  static getEntityById = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/:id - Retrieving entity by ID', {
      params: req.params,
      requestId: req.requestId
    });

    const result = await EntityService.getEntityById(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Mettre à jour une entité
   * PUT /api/entities/:id
   */
  static updateEntity = asyncHandler(async (req, res) => {
    logger.info('PUT /api/entities/:id - Updating entity', {
      params: req.params,
      body: req.body,
      requestId: req.requestId
    });

    const result = await EntityService.updateEntity(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      validation: result.validation,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Mettre à jour la position d'une entité
   * PATCH /api/entities/:id/position
   */
  static updateEntityPosition = asyncHandler(async (req, res) => {
    logger.info('PATCH /api/entities/:id/position - Updating entity position', {
      params: req.params,
      body: req.body,
      requestId: req.requestId
    });

    const result = await EntityService.updateEntityPosition(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Supprimer une entité
   * DELETE /api/entities/:id
   */
  static deleteEntity = asyncHandler(async (req, res) => {
    logger.info('DELETE /api/entities/:id - Deleting entity', {
      params: req.params,
      requestId: req.requestId
    });

    const result = await EntityService.deleteEntity(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Rechercher des entités
   * GET /api/entities/search
   */
  static searchEntities = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/search - Searching entities', {
      query: req.query,
      requestId: req.requestId
    });

    const searchTerm = req.query.q || req.query.search || '';
    const folderId = req.query.folderId || req.query.folder || 0;
    const options = {
      limit: toInt(req.query.limit),
      type: req.query.type,
      exactMatch: toBool(req.query.exactMatch, false)
    };

    const result = await EntityService.searchEntities(folderId, searchTerm, options);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir les entités connectées à une entité
   * GET /api/entities/:id/connected
   */
  static getConnectedEntities = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/:id/connected - Getting connected entities', {
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });

    const options = {
      maxDepth: toInt(req.query.maxDepth, 2)
    };

    const result = await EntityService.getConnectedEntities(req.params.id, options);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir les statistiques des entités d'un dossier
   * GET /api/entities/folder/:folderId/statistics
   */
  static getEntitiesStatistics = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/folder/:folderId/statistics - Getting entities statistics', {
      params: req.params,
      requestId: req.requestId
    });

    const result = await EntityService.getEntitiesStatistics(req.params.folderId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir tous les types d'entités disponibles
   * GET /api/entities/types
   */
  static getEntityTypes = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/types - Getting entity types', {
      requestId: req.requestId
    });

    const result = await EntityService.getEntityTypes();

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir la configuration d'un type d'entité
   * GET /api/entities/types/:typeKey
   */
  static getEntityType = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/types/:typeKey - Getting entity type', {
      params: req.params,
      requestId: req.requestId
    });

    const result = await EntityService.getEntityType(req.params.typeKey);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Valider des données d'entité (dry-run)
   * POST /api/entities/validate
   */
  static validateEntity = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/validate - Validating entity data', {
      body: req.body,
      requestId: req.requestId
    });

    const operation = req.body.operation || req.query.operation || 'create';
    const result = await EntityService.validateEntityData(req.body, operation);

    const statusCode = result.success ? 200 : 400;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      validation: result.validation,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir des entités par lot (batch)
   * POST /api/entities/batch
   */
  static getEntitiesBatch = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/batch - Getting entities batch', {
      body: req.body,
      requestId: req.requestId
    });

    const { entityIds = [] } = req.body;

    if (!Array.isArray(entityIds) || entityIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste des IDs d'entités requise",
        timestamp: new Date().toISOString()
      });
    }

    const result = await EntityService.getEntitiesBatch(entityIds);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Dupliquer une entité
   * POST /api/entities/:id/duplicate
   */
  static duplicateEntity = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/:id/duplicate - Duplicating entity', {
      params: req.params,
      body: req.body,
      requestId: req.requestId
    });

    const overrides = req.body || {};
    const result = await EntityService.duplicateEntity(req.params.id, overrides);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir des suggestions d'entités à créer
   * GET /api/entities/folder/:folderId/suggestions
   */
  static getEntitySuggestions = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/folder/:folderId/suggestions - Getting entity suggestions', {
      params: req.params,
      requestId: req.requestId
    });

    const result = await EntityService.getEntitySuggestions(req.params.folderId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Exporter des entités
   * GET /api/entities/folder/:folderId/export
   */
  static exportEntities = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/folder/:folderId/export - Exporting entities', {
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });

    const options = {
      includeAttributes: req.query.includeAttributes !== 'false',
      includeRelationships: toBool(req.query.includeRelationships, false),
      entityTypes: req.query.types ? String(req.query.types).split(',') : []
    };

    const result = await EntityService.exportEntities(req.params.folderId, options);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `lucide-entities-${req.params.folderId}-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).json(result.data);
  });

  /**
   * Mise à jour partielle d'une entité (PATCH)
   * PATCH /api/entities/:id
   */
  static patchEntity = asyncHandler(async (req, res) => {
    logger.info('PATCH /api/entities/:id - Partial entity update', {
      params: req.params,
      body: req.body,
      requestId: req.requestId
    });

    const result = await EntityService.patchEntity(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      validation: result.validation,
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = EntityController;
