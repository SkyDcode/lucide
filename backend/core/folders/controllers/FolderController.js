// backend/core/folders/controllers/FolderController.js - Contrôleur REST pour les dossiers LUCIDE
const FolderService = require('../services/FolderService');
const { asyncHandler } = require('../../../shared/middleware/errorHandler');
const { logger } = require('../../../shared/middleware/logging');

/**
 * Contrôleur REST pour la gestion des dossiers d'enquête
 * Gère les requêtes HTTP et délègue la logique métier au service
 */
class FolderController {

  /**
   * Créer un nouveau dossier
   * POST /api/folders
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static createFolder = asyncHandler(async (req, res) => {
    logger.info('POST /api/folders - Creating new folder', { 
      body: req.body,
      requestId: req.requestId 
    });

    const result = await FolderService.createFolder(req.body);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Récupérer tous les dossiers
   * GET /api/folders
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getAllFolders = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders - Retrieving all folders', { 
      query: req.query,
      requestId: req.requestId 
    });

    const options = {
      orderBy: req.query.orderBy,
      direction: req.query.direction,
      limit: req.query.limit,
      search: req.query.search,
      page: req.query.page
    };

    const result = await FolderService.getAllFolders(options);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Récupérer un dossier par son ID
   * GET /api/folders/:id
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFolderById = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/:id - Retrieving folder by ID', { 
      params: req.params,
      requestId: req.requestId 
    });

    const result = await FolderService.getFolderById(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Mettre à jour un dossier
   * PUT /api/folders/:id
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static updateFolder = asyncHandler(async (req, res) => {
    logger.info('PUT /api/folders/:id - Updating folder', { 
      params: req.params,
      body: req.body,
      requestId: req.requestId 
    });

    const result = await FolderService.updateFolder(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Supprimer un dossier
   * DELETE /api/folders/:id
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static deleteFolder = asyncHandler(async (req, res) => {
    logger.info('DELETE /api/folders/:id - Deleting folder', { 
      params: req.params,
      query: req.query,
      requestId: req.requestId 
    });

    const options = {
      force: req.query.force === 'true' || req.query.force === true
    };

    const result = await FolderService.deleteFolder(req.params.id, options);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Rechercher des dossiers
   * GET /api/folders/search
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static searchFolders = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/search - Searching folders', { 
      query: req.query,
      requestId: req.requestId 
    });

    const searchTerm = req.query.q || req.query.search || '';
    const options = {
      limit: req.query.limit,
      orderBy: req.query.orderBy,
      direction: req.query.direction
    };

    const result = await FolderService.searchFolders(searchTerm, options);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir les statistiques des dossiers
   * GET /api/folders/statistics
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFolderStatistics = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/statistics - Retrieving folder statistics', { 
      requestId: req.requestId 
    });

    const result = await FolderService.getFolderStatistics();

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir les dossiers récents
   * GET /api/folders/recent
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getRecentFolders = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/recent - Retrieving recent folders', { 
      query: req.query,
      requestId: req.requestId 
    });

    const limit = req.query.limit || 10;
    const result = await FolderService.getRecentFolders(limit);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Vérifier l'existence d'un dossier
   * HEAD /api/folders/:id
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static checkFolderExists = asyncHandler(async (req, res) => {
    logger.info('HEAD /api/folders/:id - Checking folder existence', { 
      params: req.params,
      requestId: req.requestId 
    });

    const result = await FolderService.checkFolderExists(req.params.id);

    if (result.data.exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }
  });

  /**
   * Obtenir l'existence d'un dossier avec détails
   * GET /api/folders/:id/exists
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFolderExistence = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/:id/exists - Getting folder existence details', { 
      params: req.params,
      requestId: req.requestId 
    });

    const result = await FolderService.checkFolderExists(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Valider l'intégrité du système de dossiers
   * GET /api/folders/system/integrity
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static validateSystemIntegrity = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/system/integrity - Validating system integrity', { 
      requestId: req.requestId 
    });

    const result = await FolderService.validateSystemIntegrity();

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir des recommandations pour l'organisation des dossiers
   * GET /api/folders/recommendations
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFolderRecommendations = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/recommendations - Getting folder recommendations', { 
      requestId: req.requestId 
    });

    const result = await FolderService.getFolderRecommendations();

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Exporter des dossiers
   * POST /api/folders/export
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static exportFolders = asyncHandler(async (req, res) => {
    logger.info('POST /api/folders/export - Exporting folders', { 
      body: req.body,
      requestId: req.requestId 
    });

    const folderIds = req.body.folderIds || [];
    const result = await FolderService.exportFolders(folderIds);

    // Définir les headers pour le téléchargement
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `lucide-folders-export-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).json(result.data);
  });

  /**
   * Mise à jour partielle d'un dossier (PATCH)
   * PATCH /api/folders/:id
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static patchFolder = asyncHandler(async (req, res) => {
    logger.info('PATCH /api/folders/:id - Partial folder update', { 
      params: req.params,
      body: req.body,
      requestId: req.requestId 
    });

    // PATCH utilise la même logique que PUT pour ce modèle simple
    const result = await FolderService.updateFolder(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir le nombre total de dossiers
   * GET /api/folders/count
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFolderCount = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/count - Getting folder count', { 
      query: req.query,
      requestId: req.requestId 
    });

    // Utiliser les options de filtrage si fournies
    const options = {
      search: req.query.search
    };

    // Pour obtenir le compte, on récupère les dossiers sans limite et on compte
    const result = await FolderService.getAllFolders(options);
    const count = result.data.length;

    res.status(200).json({
      success: true,
      message: `${count} dossier(s) trouvé(s)`,
      data: { count },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Validation d'un dossier avant création/modification (dry-run)
   * POST /api/folders/validate
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static validateFolder = asyncHandler(async (req, res) => {
    logger.info('POST /api/folders/validate - Validating folder data', { 
      body: req.body,
      requestId: req.requestId 
    });

    try {
      // Utiliser le validator directement pour tester la validation
      const FolderValidator = require('../validators/FolderValidator');
      const operation = req.body.operation || 'create';
      
      let validatedData;
      if (operation === 'create') {
        validatedData = FolderValidator.validateAndSanitize(req.body, 'create');
      } else if (operation === 'update') {
        validatedData = FolderValidator.validateAndSanitize(req.body, 'update');
      } else {
        throw new Error('Opération de validation non supportée');
      }

      res.status(200).json({
        success: true,
        message: 'Données valides',
        data: {
          valid: true,
          validatedData,
          operation
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Données invalides',
        data: {
          valid: false,
          errors: error.details || [{ message: error.message }],
          operation: req.body.operation || 'create'
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Middleware pour valider les paramètres communs
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Function} next - Fonction next
   */
  static validateCommonParams = (req, res, next) => {
    // Valider les paramètres de pagination s'ils sont présents
    if (req.query.page || req.query.limit) {
      try {
        const FolderValidator = require('../validators/FolderValidator');
        const paginationParams = FolderValidator.validatePagination({
          page: req.query.page,
          limit: req.query.limit
        });
        req.query.page = paginationParams.page;
        req.query.limit = paginationParams.limit;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres de pagination invalides',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Nettoyer les paramètres booléens
    if (req.query.force !== undefined) {
      req.query.force = req.query.force === 'true' || req.query.force === true;
    }

    next();
  };

  /**
   * Middleware pour logger les actions utilisateur
   * @param {string} action - Action effectuée
   * @returns {Function} Middleware Express
   */
  static logAction = (action) => {
    return (req, res, next) => {
      // Capturer la réponse pour logger le résultat
      const originalSend = res.send;
      res.send = function(data) {
        // Logger l'action avec le résultat
        logger.info(`User action completed: ${action}`, {
          action,
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          params: req.params,
          query: req.query,
          statusCode: res.statusCode,
          success: res.statusCode < 400
        });

        originalSend.call(this, data);
      };

      next();
    };
  };

  /**
   * Gestionnaire d'erreur spécifique aux dossiers
   * @param {Error} error - Erreur capturée
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Function} next - Fonction next
   */
  static handleFolderError = (error, req, res, next) => {
    logger.error('Folder operation failed', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body,
      requestId: req.requestId
    });

    // Laisser le middleware d'erreur global gérer la réponse
    next(error);
  };

  /**
   * Obtenir les métriques de performance des dossiers
   * GET /api/folders/metrics
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFolderMetrics = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/metrics - Getting folder metrics', { 
      requestId: req.requestId 
    });

    const stats = await FolderService.getFolderStatistics();
    
    // Calculer des métriques de performance
    const metrics = {
      response_time_ms: Date.now() - req.startTime,
      total_folders: stats.data.total_folders,
      active_folders: stats.data.active_folders,
      empty_folders: stats.data.empty_folders,
      system_health: stats.data.health_status,
      usage_level: stats.data.usage_level,
      database_size_estimate: stats.data.total_folders * 1024, // Estimation simple
      last_activity: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Métriques de performance récupérées',
      data: metrics,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir le schéma de validation des dossiers
   * GET /api/folders/schema
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFolderSchema = asyncHandler(async (req, res) => {
    logger.info('GET /api/folders/schema - Getting folder validation schema', { 
      requestId: req.requestId 
    });

    const FolderValidator = require('../validators/FolderValidator');
    const schema = FolderValidator.getValidationRules();

    res.status(200).json({
      success: true,
      message: 'Schéma de validation récupéré',
      data: {
        schema,
        endpoints: {
          create: 'POST /api/folders',
          getAll: 'GET /api/folders',
          getById: 'GET /api/folders/:id',
          update: 'PUT /api/folders/:id',
          patch: 'PATCH /api/folders/:id',
          delete: 'DELETE /api/folders/:id',
          search: 'GET /api/folders/search',
          statistics: 'GET /api/folders/statistics',
          recent: 'GET /api/folders/recent',
          export: 'POST /api/folders/export'
        }
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Health check spécifique aux dossiers
   * GET /api/folders/health
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static healthCheck = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Test basique : compter les dossiers
      const result = await FolderService.getAllFolders({ limit: 1 });
      const responseTime = Date.now() - startTime;
      
      const health = {
        status: 'healthy',
        service: 'folders',
        response_time_ms: responseTime,
        database_accessible: true,
        total_folders: result.data.length > 0 ? 'has_data' : 'empty',
        timestamp: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        message: 'Service des dossiers opérationnel',
        data: health
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const health = {
        status: 'unhealthy',
        service: 'folders',
        response_time_ms: responseTime,
        database_accessible: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      res.status(503).json({
        success: false,
        message: 'Service des dossiers indisponible',
        data: health
      });
    }
  });

  /**
   * Dupliquer un dossier (créer une copie)
   * POST /api/folders/:id/duplicate
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static duplicateFolder = asyncHandler(async (req, res) => {
    logger.info('POST /api/folders/:id/duplicate - Duplicating folder', { 
      params: req.params,
      body: req.body,
      requestId: req.requestId 
    });

    // Récupérer le dossier original
    const originalResult = await FolderService.getFolderById(req.params.id);
    const originalFolder = originalResult.data;

    // Préparer les données pour la copie
    const newName = req.body.name || `${originalFolder.name} (Copie)`;
    const newDescription = req.body.description !== undefined 
      ? req.body.description 
      : originalFolder.description;

    const duplicateData = {
      name: newName,
      description: newDescription
    };

    // Créer le dossier dupliqué
    const result = await FolderService.createFolder(duplicateData);

    res.status(201).json({
      success: true,
      message: `Dossier "${originalFolder.name}" dupliqué avec succès`,
      data: {
        original: {
          id: originalFolder.id,
          name: originalFolder.name
        },
        duplicate: result.data
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Archiver un dossier (marquer comme archivé)
   * POST /api/folders/:id/archive
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static archiveFolder = asyncHandler(async (req, res) => {
    logger.info('POST /api/folders/:id/archive - Archiving folder', { 
      params: req.params,
      requestId: req.requestId 
    });

    // Pour l'instant, on simule l'archivage en ajoutant un préfixe au nom
    const folderResult = await FolderService.getFolderById(req.params.id);
    const folder = folderResult.data;

    const archivedName = folder.name.startsWith('[ARCHIVÉ]') 
      ? folder.name 
      : `[ARCHIVÉ] ${folder.name}`;

    const updateData = {
      name: archivedName,
      description: folder.description ? 
        `${folder.description}\n\n[Archivé le ${new Date().toLocaleDateString('fr-FR')}]` :
        `[Archivé le ${new Date().toLocaleDateString('fr-FR')}]`
    };

    const result = await FolderService.updateFolder(req.params.id, updateData);

    res.status(200).json({
      success: true,
      message: `Dossier "${folder.name}" archivé avec succès`,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Restaurer un dossier archivé
   * POST /api/folders/:id/restore
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static restoreFolder = asyncHandler(async (req, res) => {
    logger.info('POST /api/folders/:id/restore - Restoring folder', { 
      params: req.params,
      requestId: req.requestId 
    });

    const folderResult = await FolderService.getFolderById(req.params.id);
    const folder = folderResult.data;

    if (!folder.name.startsWith('[ARCHIVÉ]')) {
      return res.status(400).json({
        success: false,
        message: 'Ce dossier n\'est pas archivé',
        timestamp: new Date().toISOString()
      });
    }

    const restoredName = folder.name.replace(/^\[ARCHIVÉ\]\s*/, '');
    const restoredDescription = folder.description ? 
      folder.description.replace(/\n\n\[Archivé le.*?\]$/, '') : 
      null;

    const updateData = {
      name: restoredName,
      description: restoredDescription
    };

    const result = await FolderService.updateFolder(req.params.id, updateData);

    res.status(200).json({
      success: true,
      message: `Dossier "${restoredName}" restauré avec succès`,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir les dossiers par batch (pour optimiser les requêtes frontend)
   * POST /api/folders/batch
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFoldersBatch = asyncHandler(async (req, res) => {
    logger.info('POST /api/folders/batch - Getting folders batch', { 
      body: req.body,
      requestId: req.requestId 
    });

    const { folderIds = [] } = req.body;

    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Liste des IDs de dossiers requise',
        timestamp: new Date().toISOString()
      });
    }

    if (folderIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 dossiers par batch',
        timestamp: new Date().toISOString()
      });
    }

    const results = [];
    const errors = [];

    for (const folderId of folderIds) {
      try {
        const result = await FolderService.getFolderById(folderId);
        results.push(result.data);
      } catch (error) {
        errors.push({
          folderId,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `${results.length} dossier(s) récupéré(s) sur ${folderIds.length} demandé(s)`,
      data: {
        folders: results,
        errors,
        stats: {
          requested: folderIds.length,
          found: results.length,
          errors: errors.length
        }
      },
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = FolderController;