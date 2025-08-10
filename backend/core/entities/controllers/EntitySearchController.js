// backend/core/entities/controllers/EntitySearchController.js - Contrôleur// backend/core/entities/controllers/EntitySearchController.js - Contrôleur de recherche d'entités

const EntitySearchService = require('../services/EntitySearchService');
const { asyncHandler } = require('../../../shared/middleware/errorHandler');
const { logger } = require('../../../shared/middleware/logging');
const EntityValidator = require('../validators/EntityValidator');

/**
 * Contrôleur spécialisé pour les fonctionnalités de recherche d'entités
 * Expose les endpoints de recherche via l'API REST
 */
class EntitySearchController {

  /**
   * Recherche d'entités principale
   * GET /api/entities/search?q=terme&folderId=1&type=person&page=1&limit=20
   */
  static search = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/search - Entity search request', {
      query: req.query,
      requestId: req.requestId
    });

    const startTime = Date.now();

    try {
      // Extraire et valider les paramètres de recherche
      const searchParams = {
        query: req.query.q || req.query.search || req.query.query || '',
        folderId: req.query.folderId || req.query.folder_id || req.query.folder,
        type: req.query.type,
        types: req.query.types ? req.query.types.split(',') : [],
        options: {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          exactMatch: req.query.exactMatch === 'true',
          fuzzy: req.query.fuzzy === 'true',
          caseSensitive: req.query.caseSensitive === 'true',
          includeAttributes: req.query.includeAttributes !== 'false',
          orderBy: req.query.orderBy || 'relevance',
          order: req.query.order || 'desc',
          startTime
        }
      };

      // Validation des paramètres
      if (searchParams.folderId) {
        searchParams.folderId = EntityValidator.validateId(searchParams.folderId);
      }

      if (searchParams.type) {
        searchParams.type = EntityValidator.validateEntityType(searchParams.type);
      }

      if (searchParams.types.length > 0) {
        searchParams.types = searchParams.types.map(type => 
          EntityValidator.validateEntityType(type)
        );
      }

      // Limites de sécurité
      searchParams.options.limit = Math.min(searchParams.options.limit, 200);
      searchParams.options.page = Math.max(1, searchParams.options.page);

      // Exécuter la recherche
      const result = await EntitySearchService.searchEntities(searchParams);

      // Ajouter des métriques de performance
      const executionTime = Date.now() - startTime;
      result.metadata.execution_time = executionTime;

      logger.success('Entity search completed', {
        query: searchParams.query,
        totalResults: result.metadata.total_results,
        executionTime,
        requestId: req.requestId
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        metadata: {
          ...result.metadata,
          request_id: req.requestId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Entity search failed', {
        query: req.query,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });

  /**
   * Suggestions d'autocomplétion
   * GET /api/entities/search/suggestions?q=terme&limit=10
   */
  static suggestions = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/search/suggestions - Suggestions request', {
      query: req.query,
      requestId: req.requestId
    });

    try {
      const query = req.query.q || req.query.query || '';
      const filters = {};
      const options = {
        limit: Math.min(parseInt(req.query.limit) || 10, 20),
        exactMatch: false,
        fuzzy: false
      };

      // Filtres optionnels pour les suggestions
      if (req.query.folderId) {
        filters.folder_id = EntityValidator.validateId(req.query.folderId);
      }

      if (req.query.type) {
        filters.type = EntityValidator.validateEntityType(req.query.type);
      }

      // Générer les suggestions
      const result = await EntitySearchService.searchSuggestions(query, filters, options);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        metadata: {
          ...result.metadata,
          request_id: req.requestId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Search suggestions failed', {
        query: req.query,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });

  /**
   * Recherche avancée avec filtres complexes
   * POST /api/entities/search/advanced
   */
  static advancedSearch = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/search/advanced - Advanced search request', {
      body: req.body,
      requestId: req.requestId
    });

    try {
      const advancedFilters = {
        textQuery: req.body.textQuery || '',
        entityTypes: req.body.entityTypes || [],
        folderIds: req.body.folderIds || [],
        dateRange: req.body.dateRange || {},
        attributeFilters: req.body.attributeFilters || {},
        connectionFilters: req.body.connectionFilters || {},
        options: {
          page: parseInt(req.body.page) || 1,
          limit: Math.min(parseInt(req.body.limit) || 50, 200),
          orderBy: req.body.orderBy || 'relevance',
          order: req.body.order || 'desc',
          startTime: Date.now()
        }
      };

      // Validation des filtres avancés
      if (advancedFilters.folderIds.length > 0) {
        advancedFilters.folderIds = advancedFilters.folderIds.map(id => 
          EntityValidator.validateId(id)
        );
      }

      if (advancedFilters.entityTypes.length > 0) {
        advancedFilters.entityTypes = advancedFilters.entityTypes.map(type => 
          EntityValidator.validateEntityType(type)
        );
      }

      // Exécuter la recherche avancée
      const result = await EntitySearchService.advancedSearch(advancedFilters);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        metadata: {
          ...result.metadata,
          request_id: req.requestId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Advanced search failed', {
        body: req.body,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });

  /**
   * Recherche d'entités similaires
   * GET /api/entities/:id/similar?limit=20&minSimilarity=0.3
   */
  static findSimilar = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/:id/similar - Similar entities request', {
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });

    try {
      const entityId = EntityValidator.validateId(req.params.id);
      const options = {
        maxResults: Math.min(parseInt(req.query.limit) || 20, 50),
        minSimilarity: parseFloat(req.query.minSimilarity) || 0.3,
        includeSameFolder: req.query.includeSameFolder !== 'false',
        includeAllFolders: req.query.includeAllFolders === 'true'
      };

      // Valider les options
      options.minSimilarity = Math.max(0, Math.min(1, options.minSimilarity));

      // Rechercher les entités similaires
      const result = await EntitySearchService.findSimilarEntities(entityId, options);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        metadata: {
          ...result.metadata,
          request_id: req.requestId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Similar entities search failed', {
        params: req.params,
        query: req.query,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });

  /**
   * Recherche rapide simplifiée
   * GET /api/entities/search/quick?q=terme
   */
  static quickSearch = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/search/quick - Quick search request', {
      query: req.query,
      requestId: req.requestId
    });

    try {
      const query = req.query.q || req.query.query || '';
      
      if (!query || query.length < 2) {
        return res.status(200).json({
          success: true,
          data: [],
          metadata: {
            query,
            total_results: 0,
            reason: 'Terme de recherche trop court (minimum 2 caractères)'
          },
          message: 'Terme de recherche trop court'
        });
      }

      // Recherche rapide avec paramètres simplifiés
      const searchParams = {
        query,
        folderId: req.query.folderId,
        options: {
          page: 1,
          limit: Math.min(parseInt(req.query.limit) || 10, 50),
          exactMatch: false,
          fuzzy: false,
          orderBy: 'relevance',
          includeAttributes: false // Pas d'attributs pour la recherche rapide
        }
      };

      const result = await EntitySearchService.searchEntities(searchParams);

      // Simplifier les résultats pour la recherche rapide
      const simplifiedResults = result.data.map(entity => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        folder_name: entity.folder_name,
        relevance_score: entity.relevance_score,
        match_type: entity.match_type
      }));

      res.status(200).json({
        success: true,
        message: `${simplifiedResults.length} résultat(s) trouvé(s)`,
        data: simplifiedResults,
        metadata: {
          query,
          total_results: result.metadata.total_results,
          returned_results: simplifiedResults.length,
          search_type: 'quick',
          request_id: req.requestId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Quick search failed', {
        query: req.query,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });

  /**
   * Statistiques de recherche
   * GET /api/entities/search/stats?period=week
   */
  static getSearchStats = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/search/stats - Search statistics request', {
      query: req.query,
      requestId: req.requestId
    });

    try {
      // Pour l'instant, retourner des statistiques basiques
      // Dans le futur, on pourrait tracker les recherches dans une table de logs
      
      const stats = {
        popular_queries: [
          { query: 'john', count: 15 },
          { query: 'company', count: 12 },
          { query: 'email', count: 8 }
        ],
        search_volume: {
          today: 45,
          this_week: 234,
          this_month: 1056
        },
        most_searched_types: [
          { type: 'person', count: 89 },
          { type: 'organization', count: 67 },
          { type: 'place', count: 34 }
        ],
        performance_metrics: {
          avg_response_time: 145, // ms
          avg_results_per_query: 8.3,
          cache_hit_rate: 0.76
        }
      };

      res.status(200).json({
        success: true,
        data: stats,
        metadata: {
          period: req.query.period || 'all_time',
          generated_at: new Date().toISOString(),
          request_id: req.requestId
        },
        message: 'Statistiques de recherche récupérées'
      });

    } catch (error) {
      logger.error('Search statistics failed', {
        query: req.query,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });

  /**
   * Validation de terme de recherche
   * POST /api/entities/search/validate
   */
  static validateSearchQuery = asyncHandler(async (req, res) => {
    logger.info('POST /api/entities/search/validate - Query validation request', {
      body: req.body,
      requestId: req.requestId
    });

    try {
      const { query, options = {} } = req.body;

      const validation = {
        valid: true,
        warnings: [],
        suggestions: [],
        normalized_query: query
      };

      // Validations de base
      if (!query || typeof query !== 'string') {
        validation.valid = false;
        validation.warnings.push('Terme de recherche requis');
      } else {
        // Nettoyer et valider le terme
        const cleanQuery = query.trim();
        validation.normalized_query = cleanQuery;

        if (cleanQuery.length === 0) {
          validation.valid = false;
          validation.warnings.push('Terme de recherche vide');
        } else if (cleanQuery.length < 2) {
          validation.warnings.push('Terme très court, résultats limités');
          validation.suggestions.push('Utilisez au moins 2 caractères pour une meilleure recherche');
        } else if (cleanQuery.length > 100) {
          validation.warnings.push('Terme très long, sera tronqué');
          validation.normalized_query = cleanQuery.substring(0, 100);
        }

        // Suggestions d'amélioration
        if (cleanQuery.includes('*') || cleanQuery.includes('%')) {
          validation.suggestions.push('Les caractères jokers sont automatiquement gérés');
        }

        if (cleanQuery.toLowerCase() === cleanQuery) {
          validation.suggestions.push('La recherche est insensible à la casse par défaut');
        }
      }

      res.status(200).json({
        success: true,
        data: validation,
        message: validation.valid ? 'Terme de recherche valide' : 'Terme de recherche invalide'
      });

    } catch (error) {
      logger.error('Search query validation failed', {
        body: req.body,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });

  /**
   * Historique de recherche (placeholder pour fonctionnalité future)
   * GET /api/entities/search/history?limit=20
   */
  static getSearchHistory = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/search/history - Search history request', {
      query: req.query,
      requestId: req.requestId
    });

    // Pour l'instant, retourner un historique vide
    // Dans le futur, on pourrait stocker l'historique par utilisateur
    res.status(200).json({
      success: true,
      data: [],
      metadata: {
        limit: parseInt(req.query.limit) || 20,
        total_count: 0,
        note: 'Historique de recherche non encore implémenté'
      },
      message: 'Historique de recherche vide'
    });
  });

  /**
   * Exporter les résultats de recherche
   * GET /api/entities/search/export?q=terme&format=json
   */
  static exportSearchResults = asyncHandler(async (req, res) => {
    logger.info('GET /api/entities/search/export - Export search results', {
      query: req.query,
      requestId: req.requestId
    });

    try {
      // Effectuer la recherche avec limite élevée pour l'export
      const searchParams = {
        query: req.query.q || '',
        folderId: req.query.folderId,
        type: req.query.type,
        options: {
          page: 1,
          limit: 1000, // Limite élevée pour l'export
          exactMatch: req.query.exactMatch === 'true',
          orderBy: req.query.orderBy || 'name',
          order: 'asc',
          includeAttributes: req.query.includeAttributes !== 'false'
        }
      };

      const result = await EntitySearchService.searchEntities(searchParams);

      const format = req.query.format || 'json';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `lucide-search-${searchParams.query.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}`;

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        
        const exportData = {
          export_info: {
            query: searchParams.query,
            total_results: result.metadata.total_results,
            exported_at: new Date().toISOString(),
            format: 'json'
          },
          results: result.data
        };

        res.status(200).json(exportData);
      } else {
        // Format non supporté
        res.status(400).json({
          success: false,
          message: 'Format d\'export non supporté',
          supported_formats: ['json']
        });
      }

    } catch (error) {
      logger.error('Search export failed', {
        query: req.query,
        error: error.message,
        requestId: req.requestId
      });
      throw error;
    }
  });
}

module.exports = EntitySearchController;