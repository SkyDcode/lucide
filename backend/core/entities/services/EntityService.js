// backend/core/entities/services/EntityService.js - Service métier pour les entités LUCIDE

const EntityModel = require('../models/EntityModel');
const EntityValidator = require('../validators/EntityValidator');
const EntityValidationService = require('./EntityValidationService');
const EntityTypeModel = require('../models/EntityTypeModel');
const { logger } = require('../../../shared/middleware/logging');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/middleware/errorHandler');

/**
 * Service métier pour la gestion des entités OSINT
 * Encapsule la logique métier et orchestre les appels aux modèles
 */
class EntityService {
  /**
   * Créer une nouvelle entité
   * @param {Object} entityData - Données de l'entité
   * @returns {Promise<Object>} Entité créée avec métadonnées
   */
  static async createEntity(entityData) {
    try {
      logger.info('Creating new entity', { inputData: entityData });

      // Validation complète avec le service de validation
      const validationResult = await EntityValidationService.validateEntity(entityData, 'create');

      if (!validationResult.valid) {
        const errorMessage = validationResult.errors.map(e => e.message).join(', ');
        throw new ValidationError(`Données d'entité invalides: ${errorMessage}`, validationResult.errors);
      }

      // Vérifications métier supplémentaires
      await this.validateEntityCreation(validationResult.sanitizedData);

      // Création de l'entité
      const createdEntity = await EntityModel.create(validationResult.sanitizedData);

      // Enrichir avec des métadonnées
      const enrichedEntity = await this.enrichEntityData(createdEntity);

      logger.success('Entity created successfully', {
        entityId: createdEntity.id,
        entityName: createdEntity.name,
        entityType: createdEntity.type
      });

      return {
        success: true,
        data: enrichedEntity,
        message: `Entité "${createdEntity.name}" créée avec succès`,
        validation: {
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions
        }
      };
    } catch (error) {
      logger.error('Error in createEntity service', { entityData, error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer toutes les entités d'un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Liste des entités avec métadonnées
   */
  static async getEntitiesByFolder(folderId, options = {}) {
    try {
      logger.info('Retrieving entities by folder', { folderId, options });

      // Validation de l'ID du dossier
      const validatedFolderId = EntityValidator.validateId(folderId);

      // Validation des options
      const validatedOptions = EntityValidator.validateQueryOptions(options);

      // Vérifier que le dossier existe
      const DatabaseUtils = require('../../../shared/utils/database');
      const folderExists = await DatabaseUtils.exists('folders', { id: validatedFolderId });
      if (!folderExists) {
        throw new NotFoundError('Dossier', validatedFolderId);
      }

      // Récupération des entités
      const entities = await EntityModel.getByFolder(validatedFolderId, validatedOptions);

      // Enrichissement des données
      const enrichedEntities = await Promise.all(entities.map(entity => this.enrichEntityData(entity)));

      // Calcul des métadonnées
      const metadata = await this.buildEntitiesMetadata(validatedFolderId, validatedOptions, entities.length);

      logger.info('Entities retrieved successfully', {
        folderId: validatedFolderId,
        count: enrichedEntities.length,
        options: validatedOptions
      });

      return {
        success: true,
        data: enrichedEntities,
        metadata,
        message: `${enrichedEntities.length} entité(s) récupérée(s)`
      };
    } catch (error) {
      logger.error('Error in getEntitiesByFolder service', { folderId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer une entité par son ID
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<Object>} Entité avec détails complets
   */
  static async getEntityById(entityId) {
    try {
      logger.info('Retrieving entity by ID', { entityId });

      // Validation de l'ID
      const validatedId = EntityValidator.validateId(entityId);

      // Récupération de l'entité
      const entity = await EntityModel.findById(validatedId);
      if (!entity) {
        throw new NotFoundError('Entité', validatedId);
      }

      // Enrichissement avec détails complets
      const enrichedEntity = await this.enrichEntityData(entity, true);

      logger.info('Entity retrieved successfully', {
        entityId: validatedId,
        entityName: entity.name,
        entityType: entity.type
      });

      return {
        success: true,
        data: enrichedEntity,
        message: `Entité "${entity.name}" récupérée avec succès`
      };
    } catch (error) {
      logger.error('Error in getEntityById service', { entityId, error: error.message });
      throw error;
    }
  }

  /**
   * Mettre à jour une entité
   * @param {number} entityId - ID de l'entité
   * @param {Object} updateData - Données de mise à jour
   * @returns {Promise<Object>} Entité mise à jour
   */
  static async updateEntity(entityId, updateData) {
    try {
      logger.info('Updating entity', { entityId, updateData });

      // Validation de l'ID
      const validatedId = EntityValidator.validateId(entityId);

      // Vérifier que l'entité existe
      const existingEntity = await EntityModel.findById(validatedId);
      if (!existingEntity) {
        throw new NotFoundError('Entité', validatedId);
      }

      // Validation complète avec contexte
      const validationResult = await EntityValidationService.validateEntity(updateData, 'update', { existingEntity });
      if (!validationResult.valid) {
        const errorMessage = validationResult.errors.map(e => e.message).join(', ');
        throw new ValidationError(`Données de mise à jour invalides: ${errorMessage}`, validationResult.errors);
      }

      // Vérifications métier pour la mise à jour
      await this.validateEntityUpdate(validatedId, validationResult.sanitizedData, existingEntity);

      // Mise à jour de l'entité
      const updatedEntity = await EntityModel.update(validatedId, validationResult.sanitizedData);

      // Enrichissement des données
      const enrichedEntity = await this.enrichEntityData(updatedEntity);

      logger.success('Entity updated successfully', {
        entityId: validatedId,
        entityName: updatedEntity.name,
        changes: validationResult.sanitizedData
      });

      return {
        success: true,
        data: enrichedEntity,
        message: `Entité "${updatedEntity.name}" mise à jour avec succès`,
        validation: {
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions
        }
      };
    } catch (error) {
      logger.error('Error in updateEntity service', { entityId, updateData, error: error.message });
      throw error;
    }
  }

  /**
   * Mettre à jour uniquement la position d'une entité
   * @param {number} entityId - ID de l'entité
   * @param {Object} positionData - Données de position {x, y}
   * @returns {Promise<Object>} Résultat de la mise à jour
   */
  static async updateEntityPosition(entityId, positionData) {
    try {
      logger.info('Updating entity position', { entityId, positionData });

      // Validation de l'ID et de la position
      const validatedId = EntityValidator.validateId(entityId);
      const validatedPosition = EntityValidator.validatePosition(positionData);

      // Vérifier que l'entité existe
      const exists = await EntityModel.exists(validatedId);
      if (!exists) {
        throw new NotFoundError('Entité', validatedId);
      }

      // Mise à jour de la position
      const result = await EntityModel.updatePosition(validatedId, validatedPosition);

      logger.success('Entity position updated successfully', {
        entityId: validatedId,
        position: validatedPosition
      });

      return {
        success: true,
        data: result,
        message: 'Position mise à jour avec succès'
      };
    } catch (error) {
      logger.error('Error in updateEntityPosition service', { entityId, positionData, error: error.message });
      throw error;
    }
  }

  /**
   * Supprimer une entité
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<Object>} Résultat de la suppression
   */
  static async deleteEntity(entityId) {
    try {
      logger.info('Deleting entity', { entityId });

      // Validation de l'ID
      const validatedId = EntityValidator.validateId(entityId);

      // Vérifier que l'entité existe
      const existingEntity = await EntityModel.findById(validatedId);
      if (!existingEntity) {
        throw new NotFoundError('Entité', validatedId);
      }

      // Vérifications métier pour la suppression
      await this.validateEntityDeletion(validatedId, existingEntity);

      // Suppression de l'entité
      const deleted = await EntityModel.delete(validatedId);
      if (!deleted) {
        throw new Error("La suppression de l'entité a échoué");
      }

      logger.success('Entity deleted successfully', {
        entityId: validatedId,
        entityName: existingEntity.name,
        entityType: existingEntity.type
      });

      return {
        success: true,
        data: {
          id: validatedId,
          name: existingEntity.name,
          type: existingEntity.type,
          deleted: true
        },
        message: `Entité "${existingEntity.name}" supprimée avec succès`
      };
    } catch (error) {
      logger.error('Error in deleteEntity service', { entityId, error: error.message });
      throw error;
    }
  }

  /**
   * Rechercher des entités
   * @param {number} folderId - ID du dossier (0 = tous les dossiers)
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Résultats de recherche
   */
  static async searchEntities(folderId, searchTerm, options = {}) {
    try {
      logger.info('Searching entities', { folderId, searchTerm, options });

      // Validation du terme de recherche
      const validatedSearchTerm = EntityValidator.validateSearchTerm(searchTerm);
      if (!validatedSearchTerm) {
        return {
          success: true,
          data: [],
          metadata: { searchTerm: '', resultsCount: 0 },
          message: 'Aucun terme de recherche fourni'
        };
      }

      // Validation des options
      const validatedOptions = EntityValidator.validateSearchOptions(options);

      // Validation de l'ID du dossier si fourni
      let validatedFolderId = 0;
      if (folderId && folderId > 0) {
        validatedFolderId = EntityValidator.validateId(folderId);

        // Vérifier que le dossier existe
        const DatabaseUtils = require('../../../shared/utils/database');
        const folderExists = await DatabaseUtils.exists('folders', { id: validatedFolderId });
        if (!folderExists) {
          throw new NotFoundError('Dossier', validatedFolderId);
        }
      }

      // Recherche des entités
      const searchResults = await EntityModel.search(validatedFolderId, validatedSearchTerm, validatedOptions);

      // Enrichissement des résultats
      const enrichedResults = await Promise.all(searchResults.map(entity => this.enrichEntityData(entity)));

      // Métadonnées de recherche
      const metadata = {
        searchTerm: validatedSearchTerm,
        folderId: validatedFolderId,
        resultsCount: enrichedResults.length,
        options: validatedOptions
      };

      logger.info('Entity search completed', {
        searchTerm: validatedSearchTerm,
        folderId: validatedFolderId,
        resultsCount: enrichedResults.length
      });

      return {
        success: true,
        data: enrichedResults,
        metadata,
        message: `${enrichedResults.length} entité(s) trouvée(s) pour "${validatedSearchTerm}"`
      };
    } catch (error) {
      logger.error('Error in searchEntities service', { folderId, searchTerm, options, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les entités connectées à une entité
   * @param {number} entityId - ID de l'entité source
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Entités connectées
   */
  static async getConnectedEntities(entityId, options = {}) {
    try {
      logger.info('Getting connected entities', { entityId, options });

      // Validation de l'ID
      const validatedId = EntityValidator.validateId(entityId);

      // Vérifier que l'entité existe
      const entity = await EntityModel.findById(validatedId);
      if (!entity) {
        throw new NotFoundError('Entité', validatedId);
      }

      const { maxDepth = 2 } = options;

      // Récupération des entités connectées
      const connectedEntities = await EntityModel.getConnectedEntities(validatedId, maxDepth);

      // Enrichissement des données
      const enrichedEntities = await Promise.all(connectedEntities.map(connectedEntity => this.enrichEntityData(connectedEntity)));

      logger.info('Connected entities retrieved', {
        entityId: validatedId,
        connectedCount: enrichedEntities.length,
        maxDepth
      });

      return {
        success: true,
        data: enrichedEntities,
        metadata: {
          sourceEntity: { id: entity.id, name: entity.name, type: entity.type },
          maxDepth,
          connectedCount: enrichedEntities.length
        },
        message: `${enrichedEntities.length} entité(s) connectée(s) trouvée(s)`
      };
    } catch (error) {
      logger.error('Error in getConnectedEntities service', { entityId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des entités par dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Statistiques complètes
   */
  static async getEntitiesStatistics(folderId) {
    try {
      logger.info('Retrieving entities statistics', { folderId });

      // Validation de l'ID du dossier
      const validatedFolderId = EntityValidator.validateId(folderId);

      // Vérifier que le dossier existe
      const DatabaseUtils = require('../../../shared/utils/database');
      const folderExists = await DatabaseUtils.exists('folders', { id: validatedFolderId });
      if (!folderExists) {
        throw new NotFoundError('Dossier', validatedFolderId);
      }

      // Récupération des statistiques de base
      const basicStats = await EntityModel.getStatisticsByFolder(validatedFolderId);

      // Enrichissement avec des statistiques calculées
      const enrichedStats = await this.enrichStatistics(basicStats, validatedFolderId);

      logger.info('Entities statistics retrieved', { folderId: validatedFolderId, stats: enrichedStats });

      return {
        success: true,
        data: enrichedStats,
        message: 'Statistiques des entités récupérées avec succès'
      };
    } catch (error) {
      logger.error('Error in getEntitiesStatistics service', { folderId, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les types d'entités disponibles
   * @returns {Promise<Object>} Types d'entités avec configuration
   */
  static async getEntityTypes() {
    try {
      logger.info('Retrieving entity types');

      const entityTypes = await EntityTypeModel.getAllTypes();

      logger.info('Entity types retrieved', { typesCount: Object.keys(entityTypes).length });

      return {
        success: true,
        data: entityTypes,
        message: `${Object.keys(entityTypes).length} type(s) d'entité disponible(s)`
      };
    } catch (error) {
      logger.error('Error in getEntityTypes service', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir la configuration d'un type d'entité
   * @param {string} typeKey - Clé du type d'entité
   * @returns {Promise<Object>} Configuration du type
   */
  static async getEntityType(typeKey) {
    try {
      logger.info('Retrieving entity type', { typeKey });

      const entityType = await EntityTypeModel.getType(typeKey);
      if (!entityType) {
        throw new NotFoundError("Type d'entité", typeKey);
      }

      logger.info('Entity type retrieved', { typeKey, attributeCount: entityType.attributeCount });

      return {
        success: true,
        data: entityType,
        message: `Configuration du type "${entityType.name}" récupérée`
      };
    } catch (error) {
      logger.error('Error in getEntityType service', { typeKey, error: error.message });
      throw error;
    }
  }

  /**
   * Valider des données d'entité sans les sauvegarder
   * @param {Object} entityData - Données à valider
   * @param {string} operation - Opération (create, update)
   * @returns {Promise<Object>} Résultat de validation
   */
  static async validateEntityData(entityData, operation = 'create') {
    try {
      logger.info('Validating entity data', { entityData, operation });

      const validationResult = await EntityValidationService.validateEntity(entityData, operation);

      return {
        success: validationResult.valid,
        data: {
          valid: validationResult.valid,
          sanitizedData: validationResult.sanitizedData,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions
        },
        message: validationResult.valid ? 'Données valides' : 'Données invalides'
      };
    } catch (error) {
      logger.error('Error in validateEntityData service', { entityData, operation, error: error.message });
      throw error;
    }
  }

  // =============================================
  // MÉTHODES PRIVÉES D'AIDE
  // =============================================

  /**
   * Valider la création d'une entité (règles métier)
   * @param {Object} entityData - Données de l'entité
   * @private
   */
  static async validateEntityCreation(entityData) {
    // Vérifier que le dossier parent existe
    const DatabaseUtils = require('../../../shared/utils/database');
    const folderExists = await DatabaseUtils.exists('folders', { id: entityData.folder_id });
    if (!folderExists) {
      throw new ValidationError(`Le dossier avec l'ID ${entityData.folder_id} n'existe pas`);
    }

    // Autres vérifications métier si nécessaire (limites, permissions, etc.)
  }

  /**
   * Valider la mise à jour d'une entité (règles métier)
   * @param {number} entityId - ID de l'entité
   * @param {Object} updateData - Données de mise à jour
   * @param {Object} existingEntity - Entité existante
   * @private
   */
  static async validateEntityUpdate(entityId, updateData, existingEntity) {
    // Vérifier si la mise à jour change des données critiques
    if (updateData.type && updateData.type !== existingEntity.type) {
      throw new ValidationError("Le type d'une entité ne peut pas être modifié après création");
    }

    // Autres vérifications métier (permissions, contraintes spéciales, etc.)
  }

  /**
   * Valider la suppression d'une entité (règles métier)
   * @param {number} entityId - ID de l'entité
   * @param {Object} existingEntity - Entité existante
   * @private
   */
  static async validateEntityDeletion(entityId, existingEntity) {
    // Vérifier les contraintes de suppression
    if (existingEntity.connection_count > 10) {
      logger.warn('Deleting highly connected entity', {
        entityId,
        connectionCount: existingEntity.connection_count
      });
    }

    // Autres vérifications métier (permissions, entités protégées, etc.)
  }

  /**
   * Enrichir les données d'une entité avec des informations calculées
   * @param {Object} entity - Entité de base
   * @param {boolean} detailed - Inclure les détails complets
   * @returns {Promise<Object>} Entité enrichie
   * @private
   */
  static async enrichEntityData(entity, detailed = false) {
    const enriched = { ...entity };

    // Calculs de base
    enriched.is_connected = (entity.connection_count || 0) > 0;
    enriched.has_files = (entity.file_count || 0) > 0;
    enriched.connection_level = this.categorizeConnectionLevel(entity.connection_count || 0);

    // Calculs temporels
    const now = new Date();
    const createdAt = new Date(entity.created_at);
    const updatedAt = new Date(entity.updated_at || entity.created_at);

    enriched.age_days = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    enriched.last_modified_days = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
    enriched.is_recent = enriched.last_modified_days <= 7;
    enriched.is_stale = enriched.last_modified_days > 30;

    // Configuration du type d'entité
    try {
      const typeConfig = await EntityTypeModel.getType(entity.type);
      if (typeConfig) {
        enriched.type_config = {
          name: typeConfig.name,
          category: typeConfig.category,
          icon: typeConfig.icon,
          color: typeConfig.color
        };
      }
    } catch (error) {
      logger.warn('Could not load entity type config', { entityType: entity.type, error: error.message });
    }

    // Détails supplémentaires si demandés
    if (detailed) {
      // Analyse des attributs
      if (entity.attributes && Object.keys(entity.attributes).length > 0) {
        enriched.attributes_summary = this.analyzeAttributes(entity.attributes, entity.type);
      }

      // Position sur le graphe
      enriched.position_info = {
        x: entity.x || 0,
        y: entity.y || 0,
        is_positioned: (entity.x !== 0 || entity.y !== 0)
      };
    }

    return enriched;
  }

  /**
   * Catégoriser le niveau de connexions d'une entité
   * @param {number} connectionCount - Nombre de connexions
   * @returns {string} Niveau de connexion
   * @private
   */
  static categorizeConnectionLevel(connectionCount) {
    if (connectionCount === 0) return 'isolated';
    if (connectionCount <= 2) return 'low';
    if (connectionCount <= 5) return 'medium';
    if (connectionCount <= 10) return 'high';
    return 'very_high';
  }

  /**
   * Analyser les attributs d'une entité
   * @param {Object} attributes - Attributs de l'entité
   * @param {string} entityType - Type d'entité
   * @returns {Object} Analyse des attributs
   * @private
   */
  static analyzeAttributes(attributes, entityType) {
    const analysis = {
      total_count: Object.keys(attributes).length,
      filled_count: 0,
      empty_count: 0,
      types_breakdown: {},
      completeness_percentage: 0
    };

    // Analyser chaque attribut
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        analysis.filled_count++;
      } else {
        analysis.empty_count++;
      }

      // Catégoriser par type de données
      const valueType = this.getAttributeValueType(value);
      analysis.types_breakdown[valueType] = (analysis.types_breakdown[valueType] || 0) + 1;
    });

    // Calculer le pourcentage de complétude
    if (analysis.total_count > 0) {
      analysis.completeness_percentage = Math.round((analysis.filled_count / analysis.total_count) * 100);
    }

    return analysis;
  }

  /**
   * Déterminer le type d'une valeur d'attribut
   * @param {any} value - Valeur à analyser
   * @returns {string} Type de la valeur
   * @private
   */
  static getAttributeValueType(value) {
    if (value === null || value === undefined || value === '') {
      return 'empty';
    }

    if (typeof value === 'string') {
      // Détecter les types spéciaux
      if (value.includes('@')) return 'email';
      if (value.startsWith('http')) return 'url';
      if (/^\+?[\d\s\-\(\)]+$/.test(value)) return 'phone';
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      return 'text';
    }

    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';

    return 'unknown';
  }

  /**
   * Construire les métadonnées des entités
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de requête
   * @param {number} currentCount - Nombre d'éléments retournés
   * @returns {Promise<Object>} Métadonnées
   * @private
   */
  static async buildEntitiesMetadata(folderId, options, currentCount) {
    const metadata = { folderId, currentCount, options };

    // Statistiques de base
    try {
      const totalCount = await EntityModel.count({ folder_id: folderId });
      metadata.totalCount = totalCount;

      // Pagination si applicable
      if (options.limit) {
        const page = options.page || 1;
        const limit = options.limit;

        metadata.pagination = {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1
        };
      }

      // Indication de filtres
      if (currentCount > 0) {
        metadata.hasFilters = !!(options.search || options.type);
      }
    } catch (error) {
      logger.warn('Could not build complete metadata', { folderId, error: error.message });
    }

    return metadata;
  }

  /**
   * Enrichir les statistiques avec des calculs supplémentaires
   * @param {Object} basicStats - Statistiques de base
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Statistiques enrichies
   * @private
   */
  static async enrichStatistics(basicStats, folderId) {
    const enriched = { ...basicStats };

    // Calculs de densité de réseau
    if (enriched.total_entities > 0) {
      enriched.network_density = Math.round((enriched.avg_connections * 100) / enriched.total_entities);
    } else {
      enriched.network_density = 0;
    }

    // Analyse de la diversité des types
    enriched.type_diversity = {
      count: enriched.unique_types,
      dominance: Array.isArray(enriched.types_breakdown) && enriched.types_breakdown.length > 0
        ? Math.max(...enriched.types_breakdown.map(t => t.percentage))
        : 0
    };

    // Recommandations basées sur les statistiques
    enriched.recommendations = this.generateStatsRecommendations(enriched);

    // Santé du réseau
    enriched.network_health = this.calculateNetworkHealth(enriched);

    return enriched;
  }

  /**
   * Calculer la santé du réseau d'entités
   * @param {Object} stats - Statistiques
   * @returns {string} État de santé
   * @private
   */
  static calculateNetworkHealth(stats) {
    const entitiesCount = stats.total_entities || 0;
    const avgConnections = stats.avg_connections || 0;
    const typesDiversity = stats.unique_types || 0;

    if (entitiesCount >= 10 && avgConnections >= 2 && typesDiversity >= 3) return 'excellent';
    if (entitiesCount >= 5 && avgConnections >= 1 && typesDiversity >= 2) return 'good';
    if (entitiesCount >= 2 && typesDiversity >= 1) return 'fair';
    return 'poor';
  }

  /**
   * Générer des recommandations basées sur les statistiques
   * @param {Object} stats - Statistiques
   * @returns {Array} Recommandations
   * @private
   */
  static generateStatsRecommendations(stats) {
    const recommendations = [];

    const entitiesCount = stats.total_entities || 0;
    const avgConnections = stats.avg_connections || 0;

    if (entitiesCount === 0) {
      recommendations.push({
        type: 'creation',
        priority: 'high',
        message: 'Aucune entité dans ce dossier',
        action: "Commencer par créer des entités pour structurer votre enquête"
      });
    } else if (entitiesCount < 5) {
      recommendations.push({
        type: 'expansion',
        priority: 'medium',
        message: "Peu d'entités dans ce dossier",
        action: "Ajouter plus d'entités pour enrichir l'analyse"
      });
    }

    if (avgConnections < 1 && entitiesCount > 1) {
      recommendations.push({
        type: 'relationships',
        priority: 'high',
        message: 'Entités peu connectées',
        action: 'Créer des relations entre les entités pour révéler les liens'
      });
    }

    if ((stats.unique_types || 0) === 1 && entitiesCount > 3) {
      recommendations.push({
        type: 'diversity',
        priority: 'medium',
        message: "Manque de diversité dans les types d'entités",
        action: "Ajouter différents types d'entités pour une vue complète"
      });
    }

    return recommendations;
  }

  /**
   * Valider les permissions d'accès (pour extension future)
   * @param {string} operation - Type d'opération
   * @param {Object} user - Utilisateur (pour extension future)
   * @param {Object} entity - Entité concernée
   * @returns {boolean} True si autorisé
   * @private
   */
  static validatePermissions(operation, user = null, entity = null) {
    // Pour l'instant, toutes les opérations sont autorisées
    // Cette méthode sera étendue quand l'authentification sera implémentée
    return true;
  }

  /**
   * Nettoyer et optimiser les données de retour
   * @param {Object} data - Données à nettoyer
   * @returns {Object} Données nettoyées
   * @private
   */
  static cleanupResponseData(data) {
    // Supprimer les champs internes ou sensibles si nécessaire
    const cleaned = { ...data };

    // Convertir les dates en format ISO si ce ne sont pas déjà des strings
    ['created_at', 'updated_at'].forEach(field => {
      if (cleaned[field] && cleaned[field] instanceof Date) {
        cleaned[field] = cleaned[field].toISOString();
      }
    });

    // Arrondir les nombres décimaux
    ;['x', 'y', 'avg_connections'].forEach(field => {
      if (typeof cleaned[field] === 'number') {
        cleaned[field] = Math.round(cleaned[field] * 100) / 100;
      }
    });

    return cleaned;
  }

  /**
   * Logger une action utilisateur (pour audit futur)
   * @param {string} action - Action effectuée
   * @param {Object} details - Détails de l'action
   * @param {Object} user - Utilisateur (pour extension future)
   * @private
   */
  static logUserAction(action, details, user = null) {
    logger.info(`User action: ${action}`, {
      action,
      details,
      user: user ? user.id : 'anonymous',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtenir des entités par lot (pour optimiser les requêtes frontend)
   * @param {Array<number>} entityIds - IDs des entités à récupérer
   * @returns {Promise<Object>} Entités récupérées
   */
  static async getEntitiesBatch(entityIds) {
    try {
      logger.info('Getting entities batch', { entityIds });

      // Validation des IDs
      const validatedIds = EntityValidator.validateBatchIds(entityIds, 100);

      const results = [];
      const errors = [];

      // Récupérer chaque entité
      for (const entityId of validatedIds) {
        try {
          const entity = await EntityModel.findById(entityId);
          if (entity) {
            const enrichedEntity = await this.enrichEntityData(entity);
            results.push(enrichedEntity);
          } else {
            errors.push({ entityId, error: 'Entité non trouvée' });
          }
        } catch (error) {
          errors.push({ entityId, error: error.message });
        }
      }

      logger.info('Entities batch retrieved', {
        requested: validatedIds.length,
        found: results.length,
        errors: errors.length
      });

      return {
        success: true,
        data: {
          entities: results,
          errors,
          stats: {
            requested: validatedIds.length,
            found: results.length,
            errors: errors.length
          }
        },
        message: `${results.length} entité(s) récupérée(s) sur ${validatedIds.length} demandée(s)`
      };
    } catch (error) {
      logger.error('Error in getEntitiesBatch service', { entityIds, error: error.message });
      throw error;
    }
  }

  /**
   * Dupliquer une entité
   * @param {number} entityId - ID de l'entité à dupliquer
   * @param {Object} overrides - Données à remplacer dans la copie
   * @returns {Promise<Object>} Entité dupliquée
   */
  static async duplicateEntity(entityId, overrides = {}) {
    try {
      logger.info('Duplicating entity', { entityId, overrides });

      // Validation de l'ID
      const validatedId = EntityValidator.validateId(entityId);

      // Récupérer l'entité originale
      const originalEntity = await EntityModel.findById(validatedId);
      if (!originalEntity) {
        throw new NotFoundError('Entité', validatedId);
      }

      // Préparer les données pour la copie
      const duplicateData = {
        folder_id: originalEntity.folder_id,
        type: originalEntity.type,
        name: overrides.name || `${originalEntity.name} (Copie)`,
        x: overrides.x !== undefined ? overrides.x : (originalEntity.x || 0) + 50, // Décaler légèrement
        y: overrides.y !== undefined ? overrides.y : (originalEntity.y || 0) + 50,
        attributes: { ...(originalEntity.attributes || {}), ...(overrides.attributes || {}) }
      };

      // Créer l'entité dupliquée
      const result = await this.createEntity(duplicateData);

      logger.success('Entity duplicated successfully', {
        originalId: validatedId,
        duplicateId: result.data.id,
        originalName: originalEntity.name,
        duplicateName: result.data.name
      });

      return {
        success: true,
        data: {
          original: { id: originalEntity.id, name: originalEntity.name, type: originalEntity.type },
          duplicate: result.data
        },
        message: `Entité "${originalEntity.name}" dupliquée avec succès`
      };
    } catch (error) {
      logger.error('Error in duplicateEntity service', { entityId, overrides, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir des suggestions d'entités à créer
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Suggestions d'entités
   */
  static async getEntitySuggestions(folderId) {
    try {
      logger.info('Getting entity suggestions', { folderId });

      // Validation de l'ID du dossier
      const validatedFolderId = EntityValidator.validateId(folderId);

      // Récupérer les entités existantes pour analyser
      const existingEntities = await EntityModel.getByFolder(validatedFolderId);

      // Analyser les types présents
      const typesPresent = new Set(existingEntities.map(e => e.type));
      const allTypes = await EntityTypeModel.getAllTypes();

      // Générer des suggestions basées sur l'analyse
      const suggestions = [];

      // Suggestions de types manquants
      Object.entries(allTypes).forEach(([typeKey, typeConfig]) => {
        if (!typesPresent.has(typeKey)) {
          suggestions.push({
            type: 'missing_type',
            priority: this.getTypePriority(typeKey, existingEntities),
            entityType: typeKey,
            entityTypeName: typeConfig.name,
            reason: `Aucune entité de type "${typeConfig.name}" dans ce dossier`,
            action: `Ajouter une entité de type "${typeConfig.name}"`
          });
        }
      });

      // Suggestions basées sur les attributs des entités existantes
      existingEntities.forEach(entity => {
        const attributeSuggestions = this.analyzeEntityForSuggestions(entity, allTypes);
        suggestions.push(...attributeSuggestions);
      });

      // Trier par priorité
      suggestions.sort((a, b) => {
        const priorities = { high: 3, medium: 2, low: 1 };
        return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
      });

      // Limiter le nombre de suggestions
      const limitedSuggestions = suggestions.slice(0, 10);

      logger.info('Entity suggestions generated', { folderId: validatedFolderId, suggestionsCount: limitedSuggestions.length });

      return {
        success: true,
        data: {
          suggestions: limitedSuggestions,
          analysis: {
            existingEntitiesCount: existingEntities.length,
            typesPresent: Array.from(typesPresent),
            availableTypes: Object.keys(allTypes).length
          }
        },
        message: `${limitedSuggestions.length} suggestion(s) générée(s)`
      };
    } catch (error) {
      logger.error('Error in getEntitySuggestions service', { folderId, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir la priorité d'un type d'entité pour les suggestions
   * @param {string} typeKey - Clé du type
   * @param {Array} existingEntities - Entités existantes
   * @returns {string} Priorité (high, medium, low)
   * @private
   */
  static getTypePriority(typeKey, existingEntities) {
    // Types prioritaires pour les enquêtes OSINT
    const highPriorityTypes = ['person', 'place', 'organization'];
    const mediumPriorityTypes = ['event', 'document', 'website'];

    if (highPriorityTypes.includes(typeKey)) return 'high';
    if (mediumPriorityTypes.includes(typeKey)) return 'medium';
    return 'low';
  }

  /**
   * Analyser une entité pour générer des suggestions
   * @param {Object} entity - Entité à analyser
   * @param {Object} allTypes - Tous les types disponibles
   * @returns {Array} Suggestions pour cette entité
   * @private
   */
  static analyzeEntityForSuggestions(entity, allTypes) {
    const suggestions = [];

    // Analyser les attributs pour détecter des références à d'autres entités
    if (entity.attributes) {
      Object.values(entity.attributes).forEach(value => {
        if (typeof value === 'string') {
          // Détecter les emails (suggérer entité person)
          const emailMatch = value.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
          if (emailMatch && entity.type !== 'person') {
            suggestions.push({
              type: 'related_entity',
              priority: 'medium',
              entityType: 'person',
              entityTypeName: 'Personne',
              reason: `Email détecté: ${emailMatch[0]}`,
              action: 'Créer une entité Personne avec cet email',
              relatedData: { email: emailMatch[0] }
            });
          }

          // Détecter les URLs (suggérer entité website)
          const urlMatch = value.match(/https?:\/\/[^\s]+/);
          if (urlMatch && entity.type !== 'website') {
            suggestions.push({
              type: 'related_entity',
              priority: 'medium',
              entityType: 'website',
              entityTypeName: 'Site Web',
              reason: `URL détectée: ${urlMatch[0]}`,
              action: 'Créer une entité Site Web',
              relatedData: { url: urlMatch[0] }
            });
          }
        }
      });
    }

    return suggestions;
  }

  /**
   * Exporter des entités au format JSON
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options d'export
   * @returns {Promise<Object>} Données d'export
   */
  static async exportEntities(folderId, options = {}) {
    try {
      logger.info('Exporting entities', { folderId, options });

      // Validation de l'ID du dossier
      const validatedFolderId = EntityValidator.validateId(folderId);

      const { includeAttributes = true, includeRelationships = false, entityTypes = [] } = options;

      // Récupérer les entités
      const queryOptions = entityTypes.length > 0 ? { type: entityTypes[0] } : {};
      const entities = await EntityModel.getByFolder(validatedFolderId, queryOptions);

      // Filtrer par types si spécifié
      let filteredEntities = entities;
      if (entityTypes.length > 0) {
        filteredEntities = entities.filter(entity => entityTypes.includes(entity.type));
      }

      // Préparer les données d'export
      const exportData = {
        export_info: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          folder_id: validatedFolderId,
          total_entities: filteredEntities.length,
          options,
          exported_by: 'LUCIDE System' // À remplacer par l'utilisateur réel plus tard
        },
        entities: filteredEntities.map(entity => {
          const exported = {
            id: entity.id,
            type: entity.type,
            name: entity.name,
            x: entity.x,
            y: entity.y,
            created_at: entity.created_at,
            updated_at: entity.updated_at
          };

          if (includeAttributes && entity.attributes) {
            exported.attributes = entity.attributes;
          }

          return exported;
        })
      };

      // Ajouter les relations si demandé (placeholder en attendant le module relationships)
      if (includeRelationships) {
        exportData.relationships = [];
      }

      logger.success('Entities exported successfully', { folderId: validatedFolderId, count: filteredEntities.length });

      return {
        success: true,
        data: exportData,
        message: `${filteredEntities.length} entité(s) exportée(s) avec succès`
      };
    } catch (error) {
      logger.error('Error exporting entities', { folderId, options, error: error.message });
      throw error;
    }
  }
}

module.exports = EntityService;