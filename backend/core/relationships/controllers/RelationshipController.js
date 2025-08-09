// backend/core/relationships/controllers/RelationshipController.js - Contrôleur pour les relations
const RelationshipService = require('../services/RelationshipService');
const RelationshipModel = require('../models/RelationshipModel');
const { logger } = require('../../../shared/middleware/logging');
const { asyncHandler, ValidationError, NotFoundError } = require('../../../shared/middleware/errorHandler');
const { RELATIONSHIP_TYPES, getAllRelationshipTypes } = require('../../../shared/constants/relationshipTypes');

/**
 * Contrôleur pour la gestion des relations entre entités
 * Gère les requêtes HTTP et coordonne avec les services
 */
class RelationshipController {

  /**
   * Créer une nouvelle relation
   * POST /api/relationships
   */
  static createRelationship = asyncHandler(async (req, res) => {
    const { from_entity, to_entity, type, strength, description, bidirectional } = req.body;

    logger.info('Creating new relationship', { 
      from_entity, to_entity, type, strength, bidirectional 
    });

    const result = await RelationshipService.createRelationship({
      from_entity,
      to_entity,
      type,
      strength,
      description,
      bidirectional
    });

    res.status(201).json({
      success: true,
      message: 'Relation créée avec succès',
      data: result.relationship,
      metadata: {
        bidirectional: result.bidirectional,
        reverseRelationshipId: result.reverseRelationship?.id
      }
    });
  });

  /**
   * Récupérer toutes les relations d'un dossier
   * GET /api/relationships/folder/:folderId
   */
  static getFolderRelationships = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { 
      orderBy = 'created_at', 
      direction = 'DESC', 
      limit, 
      type,
      includeStats = false,
      includeAnalysis = false 
    } = req.query;

    logger.info('Retrieving folder relationships', { 
      folderId, orderBy, direction, limit, type 
    });

    if (includeStats || includeAnalysis) {
      // Utiliser le service pour une réponse enrichie
      const result = await RelationshipService.getFolderRelationships(folderId, {
        orderBy,
        direction,
        limit: limit ? parseInt(limit) : null,
        type
      });

      res.json({
        success: true,
        data: result.relationships,
        statistics: includeStats ? result.statistics : undefined,
        networkAnalysis: includeAnalysis ? result.networkAnalysis : undefined,
        metadata: result.metadata
      });
    } else {
      // Utiliser directement le modèle pour une réponse simple
      const relationships = await RelationshipModel.getByFolder(folderId, {
        orderBy,
        direction,
        limit: limit ? parseInt(limit) : null,
        type
      });

      res.json({
        success: true,
        data: relationships,
        metadata: {
          total: relationships.length,
          folderId: parseInt(folderId),
          filters: { orderBy, direction, limit, type }
        }
      });
    }
  });

  /**
   * Récupérer toutes les relations d'une entité
   * GET /api/relationships/entity/:entityId
   */
  static getEntityRelationships = asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const { 
      direction = 'both', 
      type,
      includePatterns = false,
      includeSuggestions = false 
    } = req.query;

    logger.info('Retrieving entity relationships', { 
      entityId, direction, type, includePatterns, includeSuggestions 
    });

    if (includePatterns || includeSuggestions) {
      // Utiliser le service pour une réponse enrichie
      const result = await RelationshipService.getEntityRelationships(entityId, {
        direction,
        type
      });

      res.json({
        success: true,
        data: {
          entity: result.entity,
          relationships: result.relationships,
          patterns: includePatterns ? result.patterns : undefined,
          suggestions: includeSuggestions ? result.suggestions : undefined
        },
        metadata: result.metadata
      });
    } else {
      // Utiliser directement le modèle
      const relationships = await RelationshipModel.getByEntity(entityId, {
        direction,
        type,
        includeEntityInfo: true
      });

      res.json({
        success: true,
        data: relationships,
        metadata: {
          total: relationships.length,
          entityId: parseInt(entityId),
          filters: { direction, type }
        }
      });
    }
  });

  /**
   * Récupérer une relation par son ID
   * GET /api/relationships/:id
   */
  static getRelationshipById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info('Retrieving relationship by ID', { id });

    const relationship = await RelationshipModel.findById(id);
    
    if (!relationship) {
      throw new NotFoundError('Relation', id);
    }

    // Enrichir la relation
    const enrichedRelationship = {
      ...relationship,
      config: RELATIONSHIP_TYPES[relationship.type],
      reverseType: RelationshipService.getReverseRelationshipType?.(relationship.type)
    };

    res.json({
      success: true,
      data: enrichedRelationship
    });
  });

  /**
   * Mettre à jour une relation
   * PUT /api/relationships/:id
   */
  static updateRelationship = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Updating relationship', { id, updateData });

    const updatedRelationship = await RelationshipService.updateRelationship(id, updateData);

    res.json({
      success: true,
      message: 'Relation mise à jour avec succès',
      data: updatedRelationship
    });
  });

  /**
   * Supprimer une relation
   * DELETE /api/relationships/:id
   */
  static deleteRelationship = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deleteReverse = false } = req.query;

    logger.info('Deleting relationship', { id, deleteReverse });

    const result = await RelationshipService.deleteRelationship(id, {
      deleteReverse: deleteReverse === 'true'
    });

    res.json({
      success: true,
      message: 'Relation supprimée avec succès',
      data: {
        deleted: result.deleted,
        reverseDeleted: result.reverseDeleted,
        relationshipInfo: {
          from_entity: result.deletedRelationship.from_entity,
          to_entity: result.deletedRelationship.to_entity,
          type: result.deletedRelationship.type
        }
      }
    });
  });

  /**
   * Obtenir les statistiques des relations d'un dossier
   * GET /api/relationships/folder/:folderId/statistics
   */
  static getFolderStatistics = asyncHandler(async (req, res) => {
    const { folderId } = req.params;

    logger.info('Retrieving folder relationship statistics', { folderId });

    const statistics = await RelationshipModel.getStatisticsByFolder(folderId);

    res.json({
      success: true,
      data: statistics,
      metadata: {
        folderId: parseInt(folderId),
        generatedAt: new Date().toISOString()
      }
    });
  });

  /**
   * Créer plusieurs relations en batch
   * POST /api/relationships/batch
   */
  static createRelationshipsBatch = asyncHandler(async (req, res) => {
    const { relationships } = req.body;

    if (!Array.isArray(relationships) || relationships.length === 0) {
      throw new ValidationError('Une liste de relations est requise');
    }

    logger.info('Creating relationships batch', { count: relationships.length });

    const results = {
      created: [],
      errors: [],
      statistics: {
        total: relationships.length,
        successful: 0,
        failed: 0
      }
    };

    // Traiter chaque relation
    for (let i = 0; i < relationships.length; i++) {
      const relationshipData = relationships[i];
      
      try {
        const result = await RelationshipService.createRelationship(relationshipData);
        results.created.push({
          index: i,
          relationship: result.relationship,
          reverseRelationship: result.reverseRelationship
        });
        results.statistics.successful++;
      } catch (error) {
        results.errors.push({
          index: i,
          relationshipData,
          error: error.message
        });
        results.statistics.failed++;
      }
    }

    const statusCode = results.statistics.failed === 0 ? 201 : 207; // 207 = Multi-Status

    res.status(statusCode).json({
      success: results.statistics.failed === 0,
      message: `${results.statistics.successful}/${results.statistics.total} relations créées`,
      data: results
    });
  });

  /**
   * Supprimer toutes les relations d'une entité
   * DELETE /api/relationships/entity/:entityId
   */
  static deleteEntityRelationships = asyncHandler(async (req, res) => {
    const { entityId } = req.params;

    logger.info('Deleting all entity relationships', { entityId });

    const deletedCount = await RelationshipModel.deleteByEntity(entityId);

    res.json({
      success: true,
      message: `${deletedCount} relation(s) supprimée(s)`,
      data: {
        entityId: parseInt(entityId),
        deletedCount
      }
    });
  });

  /**
   * Suggérer des relations pour une entité
   * GET /api/relationships/entity/:entityId/suggestions
   */
  static getRelationshipSuggestions = asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const { limit = 10 } = req.query;

    logger.info('Getting relationship suggestions', { entityId, limit });

    const suggestions = await RelationshipService.suggestRelationsForEntity(entityId);
    
    // Limiter les résultats
    const limitedSuggestions = suggestions.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedSuggestions,
      metadata: {
        entityId: parseInt(entityId),
        total: suggestions.length,
        limit: parseInt(limit)
      }
    });
  });

  /**
   * Détecter les relations circulaires dans un dossier
   * GET /api/relationships/folder/:folderId/circular
   */
  static detectCircularRelationships = asyncHandler(async (req, res) => {
    const { folderId } = req.params;

    logger.info('Detecting circular relationships', { folderId });

    const circularPaths = await RelationshipService.detectCircularRelationships(folderId);

    res.json({
      success: true,
      data: circularPaths,
      metadata: {
        folderId: parseInt(folderId),
        circularPathsFound: circularPaths.length,
        analysis: {
          hasCircularRelations: circularPaths.length > 0,
          longestPath: circularPaths.length > 0 
            ? Math.max(...circularPaths.map(p => p.path.length))
            : 0
        }
      }
    });
  });

  /**
   * Fusionner les relations de deux entités
   * POST /api/relationships/merge
   */
  static mergeEntityRelationships = asyncHandler(async (req, res) => {
    const { sourceEntityId, targetEntityId } = req.body;

    if (!sourceEntityId || !targetEntityId) {
      throw new ValidationError('IDs des entités source et cible requis');
    }

    if (sourceEntityId === targetEntityId) {
      throw new ValidationError('Les entités source et cible doivent être différentes');
    }

    logger.info('Merging entity relationships', { sourceEntityId, targetEntityId });

    const mergeResults = await RelationshipService.mergeEntityRelationships(
      sourceEntityId, 
      targetEntityId
    );

    res.json({
      success: true,
      message: 'Relations fusionnées avec succès',
      data: mergeResults,
      metadata: {
        sourceEntityId: parseInt(sourceEntityId),
        targetEntityId: parseInt(targetEntityId),
        summary: {
          transferred: mergeResults.transferred.length,
          merged: mergeResults.merged.length,
          conflicts: mergeResults.conflicts.length,
          deleted: mergeResults.deleted.length
        }
      }
    });
  });

  /**
   * Obtenir tous les types de relations disponibles
   * GET /api/relationships/types
   */
  static getRelationshipTypes = asyncHandler(async (req, res) => {
    const { category, includeConfig = false } = req.query;

    logger.info('Retrieving relationship types', { category, includeConfig });

    let relationshipTypes = getAllRelationshipTypes();

    // Filtrer par catégorie si spécifiée
    if (category) {
      relationshipTypes = Object.fromEntries(
        Object.entries(relationshipTypes).filter(([, config]) => config.category === category)
      );
    }

    // Formater la réponse
    const formattedTypes = Object.entries(relationshipTypes).map(([key, config]) => ({
      key,
      name: config.name,
      category: config.category,
      description: config.description,
      bidirectional: config.bidirectional,
      strength: config.strength,
      color: config.color,
      config: includeConfig === 'true' ? config : undefined
    }));

    res.json({
      success: true,
      data: formattedTypes,
      metadata: {
        total: formattedTypes.length,
        category,
        includeConfig: includeConfig === 'true'
      }
    });
  });

  /**
   * Valider des données de relation
   * POST /api/relationships/validate
   */
  static validateRelationship = asyncHandler(async (req, res) => {
    const { from_entity, to_entity, type, operation = 'create' } = req.body;

    logger.info('Validating relationship data', { from_entity, to_entity, type, operation });

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Valider avec le service (sans créer)
      if (operation === 'create') {
        await RelationshipService.validateRelationshipCreation(from_entity, to_entity, type);
      }

      // Ajouter des suggestions
      if (from_entity && to_entity) {
        const suggestions = await RelationshipService.suggestRelationsForEntity(from_entity);
        const relevantSuggestions = suggestions
          .filter(s => s.targetEntity.id === parseInt(to_entity))
          .slice(0, 3);
        
        validation.suggestions = relevantSuggestions.map(s => ({
          type: s.relationType,
          confidence: s.confidence,
          reason: s.reason
        }));
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push({
        field: 'general',
        message: error.message
      });
    }

    res.json({
      success: true,
      data: validation
    });
  });

  /**
   * Rechercher des relations
   * GET /api/relationships/search
   */
  static searchRelationships = asyncHandler(async (req, res) => {
    const { 
      q: searchTerm, 
      folderId, 
      type, 
      strength, 
      entityId,
      limit = 50,
      offset = 0 
    } = req.query;

    logger.info('Searching relationships', { 
      searchTerm, folderId, type, strength, entityId, limit, offset 
    });

    let relationships = [];
    
    if (folderId) {
      relationships = await RelationshipModel.getByFolder(folderId, {
        type,
        limit: parseInt(limit) + parseInt(offset)
      });
    } else if (entityId) {
      relationships = await RelationshipModel.getByEntity(entityId, {
        type,
        includeEntityInfo: true
      });
    } else {
      throw new ValidationError('folderId ou entityId requis pour la recherche');
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      relationships = relationships.filter(rel => 
        rel.type.toLowerCase().includes(term) ||
        (rel.description && rel.description.toLowerCase().includes(term)) ||
        (rel.from_entity_info && rel.from_entity_info.name.toLowerCase().includes(term)) ||
        (rel.to_entity_info && rel.to_entity_info.name.toLowerCase().includes(term))
      );
    }

    // Filtrer par force
    if (strength) {
      relationships = relationships.filter(rel => rel.strength === strength);
    }

    // Pagination
    const total = relationships.length;
    const paginatedResults = relationships.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: paginatedResults,
      metadata: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
        searchTerm,
        filters: { folderId, type, strength, entityId }
      }
    });
  });

  /**
   * Obtenir le graphe des relations
   * GET /api/relationships/folder/:folderId/graph
   */
  static getRelationshipGraph = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { 
      includeNodes = true, 
      includeEdges = true,
      filterTypes,
      maxDepth = 3 
    } = req.query;

    logger.info('Building relationship graph', { 
      folderId, includeNodes, includeEdges, filterTypes, maxDepth 
    });

    // Récupérer les relations
    const relationships = await RelationshipModel.getByFolder(folderId, {
      type: filterTypes
    });

    const graph = {
      nodes: [],
      edges: [],
      metadata: {
        folderId: parseInt(folderId),
        nodeCount: 0,
        edgeCount: relationships.length,
        maxDepth: parseInt(maxDepth)
      }
    };

    if (includeEdges === 'true') {
      graph.edges = relationships.map(rel => ({
        id: rel.id,
        source: rel.from_entity,
        target: rel.to_entity,
        type: rel.type,
        strength: rel.strength,
        description: rel.description,
        label: rel.type,
        color: RELATIONSHIP_TYPES[rel.type]?.color || '#6b7280',
        strokeWidth: rel.strength === 'strong' ? 3 : rel.strength === 'medium' ? 2 : 1
      }));
    }

    if (includeNodes === 'true') {
      // Récupérer les entités uniques
      const EntityModel = require('../../entities/models/EntityModel');
      const entityIds = new Set();
      
      relationships.forEach(rel => {
        entityIds.add(rel.from_entity);
        entityIds.add(rel.to_entity);
      });

      // Récupérer les informations des entités
      const entities = await Promise.all(
        Array.from(entityIds).map(id => EntityModel.findById(id))
      );

      graph.nodes = entities.filter(Boolean).map(entity => ({
        id: entity.id,
        label: entity.name,
        type: entity.type,
        size: 20, // Sera calculé dynamiquement côté client
        color: this.getEntityTypeColor(entity.type),
        connectionCount: relationships.filter(rel => 
          rel.from_entity === entity.id || rel.to_entity === entity.id
        ).length
      }));

      graph.metadata.nodeCount = graph.nodes.length;
    }

    res.json({
      success: true,
      data: graph
    });
  });

  /**
   * Health check du service relationships
   * GET /api/relationships/health
   */
  static healthCheck = asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'relationships',
      checks: {
        database: 'unknown',
        relationshipTypes: 'unknown'
      }
    };

    try {
      // Test de base de données
      await RelationshipModel.count();
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Test des types de relations
      const types = Object.keys(getAllRelationshipTypes());
      health.checks.relationshipTypes = types.length > 0 ? 'healthy' : 'unhealthy';
      health.availableTypes = types.length;
    } catch (error) {
      health.checks.relationshipTypes = 'unhealthy';
      health.status = 'degraded';
    }

    res.json({
      success: true,
      data: health
    });
  });

  // ===========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ===========================================

  /**
   * Obtenir la couleur d'un type d'entité
   * @private
   */
  static getEntityTypeColor(entityType) {
    const colors = {
      person: '#ef4444',
      place: '#10b981',
      organization: '#3b82f6',
      vehicle: '#f59e0b',
      account: '#8b5cf6',
      event: '#ec4899',
      document: '#6b7280',
      phone: '#06b6d4',
      email: '#84cc16'
    };
    
    return colors[entityType] || '#9ca3af';
  }
}

module.exports = RelationshipController;