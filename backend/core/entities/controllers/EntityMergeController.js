// backend/core/entities/controllers/EntityMergeController.js - Contrôleur REST pour la fusion d'entités
'use strict';

const EntityMergeService = require('../services/EntityMergeService');
const { asyncHandler } = require('../../../shared/middleware/errorHandler');
const { logger } = require('../../../shared/middleware/logging');

/**
 * Contrôleur REST pour la gestion de la fusion d'entités OSINT
 * Gère les requêtes HTTP et délègue la logique métier au service
 */
class EntityMergeController {

  /**
   * Analyser la compatibilité de fusion entre deux entités
   * POST /api/entities/merge/analyze
   * Body: { sourceEntityId, targetEntityId }
   */
  static analyzeMergeCompatibility = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/merge/analyze - Analyzing merge compatibility', {
      body: req.body,
      requestId: req.requestId
    });

    const { sourceEntityId, targetEntityId } = req.body;

    if (!sourceEntityId || !targetEntityId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'IDs des entités source et cible requis',
          code: 'MISSING_ENTITY_IDS'
        },
        timestamp: new Date().toISOString()
      });
    }

    const analysis = await EntityMergeService.analyzeMergeCompatibility(
      sourceEntityId, 
      targetEntityId
    );

    res.status(200).json({
      success: true,
      data: analysis,
      message: analysis.compatible 
        ? 'Entités compatibles pour la fusion' 
        : 'Entités non compatibles pour la fusion',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Fusionner deux entités
   * POST /api/entities/merge/execute
   * Body: { sourceEntityId, targetEntityId, options }
   */
  static executeMerge = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/merge/execute - Executing entity merge', {
      body: req.body,
      requestId: req.requestId
    });

    const { sourceEntityId, targetEntityId, options = {} } = req.body;

    if (!sourceEntityId || !targetEntityId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'IDs des entités source et cible requis',
          code: 'MISSING_ENTITY_IDS'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await EntityMergeService.mergeEntities(
      sourceEntityId, 
      targetEntityId, 
      options
    );

    res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Suggérer des candidats de fusion pour une entité
   * GET /api/entities/:id/merge/candidates
   */
  static getMergeCandidates = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/:id/merge/candidates - Getting merge candidates', {
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });

    const entityId = parseInt(req.params.id);
    const options = {
      sameTypeOnly: req.query.sameTypeOnly !== 'false',
      sameFolderOnly: req.query.sameFolderOnly !== 'false',
      minSimilarity: parseFloat(req.query.minSimilarity) || 0.5,
      maxCandidates: parseInt(req.query.maxCandidates) || 10
    };

    const suggestions = await EntityMergeService.suggestMergeCandidates(entityId, options);

    res.status(200).json({
      success: true,
      data: suggestions,
      message: `${suggestions.candidates.length} candidat(s) de fusion trouvé(s)`,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Annuler une fusion
   * POST /api/entities/merge/:mergeLogId/undo
   */
  static undoMerge = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/merge/:mergeLogId/undo - Undoing entity merge', {
      params: req.params,
      requestId: req.requestId
    });

    const { mergeLogId } = req.params;

    const result = await EntityMergeService.undoMerge(mergeLogId);

    res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir l'historique des fusions d'un dossier
   * GET /api/entities/merge/history/:folderId
   */
  static getMergeHistory = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/merge/history/:folderId - Getting merge history', {
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });

    const { folderId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Placeholder pour l'historique des fusions
    // TODO: Implémenter quand la table merge_logs sera créée
    const mockHistory = {
      merges: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0
      }
    };

    res.status(200).json({
      success: true,
      data: mockHistory,
      message: 'Historique des fusions récupéré',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Prévisualiser le résultat d'une fusion sans l'exécuter
   * POST /api/entities/merge/preview
   * Body: { sourceEntityId, targetEntityId, options }
   */
  static previewMerge = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/merge/preview - Previewing entity merge', {
      body: req.body,
      requestId: req.requestId
    });

    const { sourceEntityId, targetEntityId, options = {} } = req.body;

    if (!sourceEntityId || !targetEntityId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'IDs des entités source et cible requis',
          code: 'MISSING_ENTITY_IDS'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Analyser la compatibilité
    const analysis = await EntityMergeService.analyzeMergeCompatibility(
      sourceEntityId, 
      targetEntityId
    );

    if (!analysis.compatible) {
      return res.status(400).json({
        success: false,
        data: analysis,
        error: {
          message: 'Entités non compatibles pour la fusion',
          code: 'INCOMPATIBLE_ENTITIES'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Construire un aperçu du résultat
    const preview = {
      analysis,
      mergePreview: {
        resultingEntity: {
          id: targetEntityId,
          name: options.preserveSourceName 
            ? analysis.sourceEntity.name 
            : analysis.targetEntity.name,
          type: analysis.targetEntity.type,
          estimatedAttributes: `${Object.keys(analysis.sourceEntity.attributes || {}).length + Object.keys(analysis.targetEntity.attributes || {}).length} attribut(s)`
        },
        changes: {
          willDeleteSource: options.deleteSource !== false,
          willTransferRelationships: options.transferRelationships !== false,
          relationshipsToTransfer: analysis.relationshipImpact.sourceRelationshipsCount,
          relationshipsToMerge: analysis.relationshipImpact.potentialMerges.length
        },
        warnings: analysis.conflicts.filter(c => c.severity === 'high'),
        recommendations: analysis.recommendations
      }
    };

    res.status(200).json({
      success: true,
      data: preview,
      message: 'Aperçu de fusion généré',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir les statistiques de fusion d'un dossier
   * GET /api/entities/merge/stats/:folderId
   */
  static getMergeStatistics = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/merge/stats/:folderId - Getting merge statistics', {
      params: req.params,
      requestId: req.requestId
    });

    const { folderId } = req.params;

    // Placeholder pour les statistiques de fusion
    // TODO: Implémenter les vraies statistiques
    const mockStats = {
      totalMergesPerformed: 0,
      entitiesInvolved: 0,
      averageConfidenceScore: 0,
      commonMergeTypes: [],
      lastMergeDate: null,
      potentialDuplicates: 0
    };

    res.status(200).json({
      success: true,
      data: mockStats,
      message: 'Statistiques de fusion récupérées',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Détecter automatiquement les doublons potentiels dans un dossier
   * GET /api/entities/merge/detect-duplicates/:folderId
   */
  static detectDuplicates = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/merge/detect-duplicates/:folderId - Detecting duplicates', {
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });

    const { folderId } = req.params;
    const {
      minSimilarity = 0.7,
      sameTypeOnly = true,
      maxResults = 20
    } = req.query;

    // Récupérer toutes les entités du dossier
    const EntityService = require('../services/EntityService');
    const entitiesResult = await EntityService.getEntitiesByFolder(folderId);
    const entities = entitiesResult.data || [];

    const duplicatePairs = [];

    // Comparer chaque entité avec les autres
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        // Filtrer par type si demandé
        if (sameTypeOnly && entity1.type !== entity2.type) {
          continue;
        }

        try {
          // Analyser la compatibilité
          const analysis = await EntityMergeService.analyzeMergeCompatibility(
            entity1.id, 
            entity2.id
          );

          if (analysis.compatible && analysis.confidence >= parseFloat(minSimilarity)) {
            duplicatePairs.push({
              entity1: {
                id: entity1.id,
                name: entity1.name,
                type: entity1.type
              },
              entity2: {
                id: entity2.id,
                name: entity2.name,
                type: entity2.type
              },
              similarity: analysis.confidence,
              reasons: analysis.recommendations
                .filter(r => r.type === 'success')
                .map(r => r.message)
            });
          }
        } catch (error) {
          // Ignorer les erreurs pour cette paire
          logger.warn('Error analyzing duplicate pair', {
            entity1Id: entity1.id,
            entity2Id: entity2.id,
            error: error.message
          });
        }
      }
    }

    // Trier par similarité décroissante et limiter
    const sortedDuplicates = duplicatePairs
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, parseInt(maxResults));

    res.status(200).json({
      success: true,
      data: {
        duplicates: sortedDuplicates,
        metadata: {
          folderId: parseInt(folderId),
          totalEntitiesAnalyzed: entities.length,
          duplicatesFound: sortedDuplicates.length,
          criteria: {
            minSimilarity: parseFloat(minSimilarity),
            sameTypeOnly: sameTypeOnly === 'true',
            maxResults: parseInt(maxResults)
          }
        }
      },
      message: `${sortedDuplicates.length} doublon(s) potentiel(s) détecté(s)`,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Valider les paramètres de fusion
   * POST /api/entities/merge/validate
   */
  static validateMergeParams = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/merge/validate - Validating merge parameters', {
      body: req.body,
      requestId: req.requestId
    });

    const { sourceEntityId, targetEntityId, options = {} } = req.body;

    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Validation des IDs
    if (!sourceEntityId) {
      validation.valid = false;
      validation.errors.push('ID de l\'entité source requis');
    }

    if (!targetEntityId) {
      validation.valid = false;
      validation.errors.push('ID de l\'entité cible requis');
    }

    if (sourceEntityId === targetEntityId) {
      validation.valid = false;
      validation.errors.push('Les entités source et cible doivent être différentes');
    }

    // Validation des options
    const validMergeStrategies = ['source_priority', 'target_priority', 'merge_all'];
    if (options.mergeAttributes && !validMergeStrategies.includes(options.mergeAttributes)) {
      validation.warnings.push(`Stratégie de fusion d'attributs invalide: ${options.mergeAttributes}`);
    }

    // Si les IDs sont valides, vérifier l'existence des entités
    if (validation.valid) {
      try {
        const EntityService = require('../services/EntityService');
        const [sourceResult, targetResult] = await Promise.all([
          EntityService.getEntityById(sourceEntityId),
          EntityService.getEntityById(targetEntityId)
        ]);

        if (!sourceResult.data) {
          validation.valid = false;
          validation.errors.push(`Entité source ${sourceEntityId} non trouvée`);
        }

        if (!targetResult.data) {
          validation.valid = false;
          validation.errors.push(`Entité cible ${targetEntityId} non trouvée`);
        }
      } catch (error) {
        validation.valid = false;
        validation.errors.push('Erreur lors de la vérification des entités');
      }
    }

    const statusCode = validation.valid ? 200 : 400;

    res.status(statusCode).json({
      success: validation.valid,
      data: validation,
      message: validation.valid 
        ? 'Paramètres de fusion valides' 
        : 'Paramètres de fusion invalides',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Middleware d'erreur spécifique au contrôleur de fusion
   */
  static handleMergeError = (err, req, res, next) => {
    logger.error('Entity merge route error', {
      message: err?.message,
      code: err?.code,
      requestId: req.requestId
    });

    const status = err?.statusCode || 500;
    
    // Messages d'erreur spécifiques à la fusion
    let userMessage = err?.message || 'Erreur lors de la fusion d\'entités';
    
    if (err?.code === 'ENTITY_NOT_FOUND') {
      userMessage = 'Une des entités à fusionner n\'existe pas';
    } else if (err?.code === 'INCOMPATIBLE_ENTITIES') {
      userMessage = 'Les entités ne peuvent pas être fusionnées';
    } else if (err?.code === 'MERGE_CONFLICT') {
      userMessage = 'Conflit détecté lors de la fusion';
    }

    res.status(status).json({
      success: false,
      error: {
        message: userMessage,
        code: err?.code || 'MERGE_ERROR',
        details: err?.details || null
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  };
}

module.exports = EntityMergeController;