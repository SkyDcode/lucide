// frontend/src/modules/relationships/services/relationshipService.js - Service API pour les relations
import apiClient, { ApiError, apiUtils } from '../../../shared/services/api';

/**
 * Service pour la gestion des relations entre entités
 * Encapsule toutes les interactions avec l'API backend relationships
 */
class RelationshipService {
  
  /**
   * Endpoint de base pour les relations
   */
  static endpoint = '/relationships';

  /**
   * Créer une nouvelle relation
   * @param {Object} relationshipData - Données de la relation
   * @param {number} relationshipData.from_entity - ID entité source
   * @param {number} relationshipData.to_entity - ID entité destination
   * @param {string} relationshipData.type - Type de relation
   * @param {string} [relationshipData.strength='medium'] - Force de la relation
   * @param {string} [relationshipData.description] - Description
   * @param {boolean} [relationshipData.bidirectional=false] - Relation bidirectionnelle
   * @returns {Promise<Object>} Relation créée
   */
  static async createRelationship(relationshipData) {
    try {
      const response = await apiClient.post(this.endpoint, relationshipData);
      return this.formatRelationshipResponse(response.data);
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la création de la relation');
    }
  }

  /**
   * Récupérer toutes les relations d'un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Relations du dossier avec métadonnées
   */
  static async getFolderRelationships(folderId, options = {}) {
    try {
      this.validateId(folderId, 'folderId');
      
      const params = this.buildQueryParams(options);
      const response = await apiClient.get(`${this.endpoint}/folder/${folderId}`, { params });
      
      return {
        relationships: response.data.map(rel => this.formatRelationshipResponse(rel)),
        statistics: response.statistics || null,
        networkAnalysis: response.networkAnalysis || null,
        metadata: response.metadata || {}
      };
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la récupération des relations du dossier ${folderId}`);
    }
  }

  /**
   * Récupérer toutes les relations d'une entité
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Relations de l'entité
   */
  static async getEntityRelationships(entityId, options = {}) {
    try {
      this.validateId(entityId, 'entityId');
      
      const params = this.buildQueryParams(options);
      const response = await apiClient.get(`${this.endpoint}/entity/${entityId}`, { params });
      
      return {
        relationships: Array.isArray(response.data) 
          ? response.data.map(rel => this.formatRelationshipResponse(rel))
          : response.data.relationships?.map(rel => this.formatRelationshipResponse(rel)) || [],
        entity: response.data.entity || null,
        patterns: response.data.patterns || null,
        suggestions: response.data.suggestions || null,
        metadata: response.metadata || {}
      };
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la récupération des relations de l'entité ${entityId}`);
    }
  }

  /**
   * Récupérer une relation par son ID
   * @param {number} relationshipId - ID de la relation
   * @returns {Promise<Object>} Relation trouvée
   */
  static async getRelationshipById(relationshipId) {
    try {
      this.validateId(relationshipId);
      const response = await apiClient.get(`${this.endpoint}/${relationshipId}`);
      return this.formatRelationshipResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la récupération de la relation ${relationshipId}`);
    }
  }

  /**
   * Mettre à jour une relation
   * @param {number} relationshipId - ID de la relation
   * @param {Object} updateData - Données de mise à jour
   * @returns {Promise<Object>} Relation mise à jour
   */
  static async updateRelationship(relationshipId, updateData) {
    try {
      this.validateId(relationshipId);
      const response = await apiClient.put(`${this.endpoint}/${relationshipId}`, updateData);
      return this.formatRelationshipResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la mise à jour de la relation ${relationshipId}`);
    }
  }

  /**
   * Supprimer une relation
   * @param {number} relationshipId - ID de la relation
   * @param {Object} options - Options de suppression
   * @returns {Promise<Object>} Résultat de la suppression
   */
  static async deleteRelationship(relationshipId, options = {}) {
    try {
      this.validateId(relationshipId);
      const params = this.buildQueryParams(options);
      const response = await apiClient.delete(`${this.endpoint}/${relationshipId}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la suppression de la relation ${relationshipId}`);
    }
  }

  /**
   * Créer plusieurs relations en batch
   * @param {Array} relationships - Liste des relations à créer
   * @returns {Promise<Object>} Résultats de la création batch
   */
  static async createRelationshipsBatch(relationships) {
    try {
      if (!Array.isArray(relationships) || relationships.length === 0) {
        throw new Error('Une liste de relations est requise');
      }

      if (relationships.length > 100) {
        throw new Error('Maximum 100 relations par batch');
      }

      const response = await apiClient.post(`${this.endpoint}/batch`, { relationships });
      
      return {
        created: response.data.created.map(item => ({
          ...item,
          relationship: this.formatRelationshipResponse(item.relationship)
        })),
        errors: response.data.errors,
        statistics: response.data.statistics
      };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la création batch de relations');
    }
  }

  /**
   * Supprimer toutes les relations d'une entité
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<Object>} Résultat de la suppression
   */
  static async deleteEntityRelationships(entityId) {
    try {
      this.validateId(entityId, 'entityId');
      const response = await apiClient.delete(`${this.endpoint}/entity/${entityId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la suppression des relations de l'entité ${entityId}`);
    }
  }

  /**
   * Obtenir les suggestions de relations pour une entité
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options de suggestion
   * @returns {Promise<Array>} Suggestions de relations
   */
  static async getRelationshipSuggestions(entityId, options = {}) {
    try {
      this.validateId(entityId, 'entityId');
      
      const params = this.buildQueryParams(options);
      const response = await apiClient.get(`${this.endpoint}/entity/${entityId}/suggestions`, { params });
      
      return response.data || [];
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la récupération des suggestions pour l'entité ${entityId}`);
    }
  }

  /**
   * Détecter les relations circulaires dans un dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Array>} Relations circulaires détectées
   */
  static async detectCircularRelationships(folderId) {
    try {
      this.validateId(folderId, 'folderId');
      const response = await apiClient.get(`${this.endpoint}/folder/${folderId}/circular`);
      return response.data || [];
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la détection de relations circulaires dans le dossier ${folderId}`);
    }
  }

  /**
   * Fusionner les relations de deux entités
   * @param {number} sourceEntityId - ID entité source (sera supprimée)
   * @param {number} targetEntityId - ID entité cible (restera)
   * @returns {Promise<Object>} Résultat de la fusion
   */
  static async mergeEntityRelationships(sourceEntityId, targetEntityId) {
    try {
      this.validateId(sourceEntityId, 'sourceEntityId');
      this.validateId(targetEntityId, 'targetEntityId');
      
      if (sourceEntityId === targetEntityId) {
        throw new Error('Les entités source et cible doivent être différentes');
      }

      const response = await apiClient.post(`${this.endpoint}/merge`, {
        sourceEntityId,
        targetEntityId
      });
      
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la fusion des relations des entités ${sourceEntityId} et ${targetEntityId}`);
    }
  }

  /**
   * Obtenir le graphe des relations d'un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options du graphe
   * @returns {Promise<Object>} Graphe avec nœuds et arêtes
   */
  static async getRelationshipGraph(folderId, options = {}) {
    try {
      this.validateId(folderId, 'folderId');
      
      const params = this.buildQueryParams(options);
      const response = await apiClient.get(`${this.endpoint}/folder/${folderId}/graph`, { params });
      
      return response.data || { nodes: [], edges: [], metadata: {} };
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la récupération du graphe du dossier ${folderId}`);
    }
  }

  /**
   * Obtenir les statistiques des relations d'un dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Statistiques
   */
  static async getFolderStatistics(folderId) {
    try {
      this.validateId(folderId, 'folderId');
      const response = await apiClient.get(`${this.endpoint}/folder/${folderId}/statistics`);
      return response.data || {};
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la récupération des statistiques du dossier ${folderId}`);
    }
  }

  /**
   * Obtenir tous les types de relations disponibles
   * @param {Object} options - Options de récupération
   * @returns {Promise<Array>} Types de relations
   */
  static async getRelationshipTypes(options = {}) {
    try {
      const params = this.buildQueryParams(options);
      const response = await apiClient.get(`${this.endpoint}/types`, { params });
      return response.data || [];
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la récupération des types de relations');
    }
  }

  /**
   * Valider des données de relation
   * @param {Object} relationshipData - Données à valider
   * @returns {Promise<Object>} Résultat de la validation
   */
  static async validateRelationship(relationshipData) {
    try {
      const response = await apiClient.post(`${this.endpoint}/validate`, relationshipData);
      return response.data || { valid: false, errors: [], warnings: [], suggestions: [] };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la validation de la relation');
    }
  }

  /**
   * Rechercher des relations
   * @param {Object} searchParams - Paramètres de recherche
   * @returns {Promise<Object>} Résultats de recherche
   */
  static async searchRelationships(searchParams) {
    try {
      const params = this.buildQueryParams(searchParams);
      const response = await apiClient.get(`${this.endpoint}/search`, { params });
      
      return {
        relationships: response.data.map(rel => this.formatRelationshipResponse(rel)),
        metadata: response.metadata || {}
      };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la recherche de relations');
    }
  }

  /**
   * Vérifier l'existence d'une relation
   * @param {number} relationshipId - ID de la relation
   * @returns {Promise<boolean>} True si la relation existe
   */
  static async relationshipExists(relationshipId) {
    try {
      this.validateId(relationshipId);
      const response = await apiClient.head(`${this.endpoint}/${relationshipId}`);
      return response.ok;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw this.handleError(error, `Erreur lors de la vérification de la relation ${relationshipId}`);
    }
  }

  /**
   * Health check du service relationships
   * @returns {Promise<Object>} État du service
   */
  static async healthCheck() {
    try {
      const response = await apiClient.get(`${this.endpoint}/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Erreur lors du health check');
    }
  }

  // ===========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ===========================================

  /**
   * Construire les paramètres de requête
   * @param {Object} options - Options
   * @returns {Object} Paramètres formatés
   * @private
   */
  static buildQueryParams(options = {}) {
    const params = {};
    
    // Paramètres de tri
    if (options.orderBy) params.orderBy = options.orderBy;
    if (options.direction) params.direction = options.direction.toUpperCase();
    
    // Pagination
    if (options.limit) params.limit = Math.min(Math.max(1, parseInt(options.limit)), 1000);
    if (options.offset) params.offset = Math.max(0, parseInt(options.offset));
    if (options.page) params.page = Math.max(1, parseInt(options.page));
    
    // Filtres
    if (options.type) params.type = options.type;
    if (options.strength) params.strength = options.strength;
    if (options.direction) params.direction = options.direction;
    if (options.search) params.q = options.search.trim();
    if (options.folderId) params.folderId = options.folderId;
    if (options.entityId) params.entityId = options.entityId;
    
    // Options booléennes
    if (options.includeStats !== undefined) params.includeStats = options.includeStats;
    if (options.includeAnalysis !== undefined) params.includeAnalysis = options.includeAnalysis;
    if (options.includePatterns !== undefined) params.includePatterns = options.includePatterns;
    if (options.includeSuggestions !== undefined) params.includeSuggestions = options.includeSuggestions;
    if (options.includeNodes !== undefined) params.includeNodes = options.includeNodes;
    if (options.includeEdges !== undefined) params.includeEdges = options.includeEdges;
    if (options.includeConfig !== undefined) params.includeConfig = options.includeConfig;
    if (options.deleteReverse !== undefined) params.deleteReverse = options.deleteReverse;
    
    // Graphe
    if (options.filterTypes) params.filterTypes = options.filterTypes;
    if (options.maxDepth) params.maxDepth = options.maxDepth;
    if (options.category) params.category = options.category;
    
    return params;
  }

  /**
   * Valider un ID
   * @param {any} id - ID à valider
   * @param {string} fieldName - Nom du champ pour l'erreur
   * @throws {Error} Si l'ID est invalide
   * @private
   */
  static validateId(id, fieldName = 'ID') {
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      throw new Error(`${fieldName} invalide`);
    }
  }

  /**
   * Formater la réponse d'une relation
   * @param {Object} relationship - Relation brute de l'API
   * @returns {Object} Relation formatée
   * @private
   */
  static formatRelationshipResponse(relationship) {
    if (!relationship) return null;

    return {
      id: relationship.id,
      from_entity: relationship.from_entity,
      to_entity: relationship.to_entity,
      type: relationship.type,
      strength: relationship.strength || 'medium',
      description: relationship.description,
      createdAt: new Date(relationship.created_at),
      
      // Informations sur les entités (si disponibles)
      from_entity_info: relationship.from_entity_info || null,
      to_entity_info: relationship.to_entity_info || null,
      connected_entity_info: relationship.connected_entity_info || null,
      
      // Métadonnées enrichies (si disponibles)
      direction: relationship.direction || null,
      connected_entity: relationship.connected_entity || null,
      config: relationship.config || null,
      displayName: relationship.displayName || relationship.type,
      category: relationship.category || 'generic',
      color: relationship.color || '#6b7280',
      bidirectional: relationship.bidirectional || false,
      formatted: relationship.formatted || null,
      
      // Données brutes pour compatibilité
      raw: relationship
    };
  }

  /**
   * Gérer les erreurs de l'API
   * @param {Error} error - Erreur originale
   * @param {string} defaultMessage - Message par défaut
   * @returns {Error} Erreur formatée
   * @private
   */
  static handleError(error, defaultMessage) {
    if (error instanceof ApiError) {
      // Enrichir l'erreur avec un contexte spécifique aux relations
      const enrichedError = new ApiError(
        error.getUserFriendlyMessage(),
        error.status,
        {
          ...error.data,
          context: 'relationships',
          defaultMessage
        }
      );
      return enrichedError;
    }

    // Erreur générique
    return new Error(defaultMessage + ': ' + error.message);
  }

  /**
   * Créer un AbortController pour annuler les requêtes
   * @returns {AbortController} Contrôleur d'annulation
   */
  static createAbortController() {
    return apiUtils.createAbortController();
  }

  // ===========================================
  // MÉTHODES UTILITAIRES PUBLIQUES
  // ===========================================

  /**
   * Valider les données d'une relation côté client
   * @param {Object} relationshipData - Données de la relation
   * @returns {Object} Résultat de la validation
   */
  static validateRelationshipDataClient(relationshipData) {
    const errors = [];

    // Validation des entités
    if (!relationshipData.from_entity) {
      errors.push({
        field: 'from_entity',
        message: 'L\'entité source est obligatoire'
      });
    }

    if (!relationshipData.to_entity) {
      errors.push({
        field: 'to_entity',
        message: 'L\'entité destination est obligatoire'
      });
    }

    if (relationshipData.from_entity && relationshipData.to_entity && 
        relationshipData.from_entity === relationshipData.to_entity) {
      errors.push({
        field: 'entities',
        message: 'Une entité ne peut pas être en relation avec elle-même'
      });
    }

    // Validation du type
    if (!relationshipData.type || relationshipData.type.trim().length === 0) {
      errors.push({
        field: 'type',
        message: 'Le type de relation est obligatoire'
      });
    }

    // Validation de la force
    if (relationshipData.strength && 
        !['weak', 'medium', 'strong'].includes(relationshipData.strength)) {
      errors.push({
        field: 'strength',
        message: 'La force de relation doit être weak, medium ou strong'
      });
    }

    // Validation de la description
    if (relationshipData.description && relationshipData.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'La description ne peut pas dépasser 500 caractères'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtenir les options de tri disponibles
   * @returns {Array} Options de tri
   */
  static getSortOptions() {
    return [
      { value: 'created_at', label: 'Date de création', direction: 'DESC' },
      { value: 'type', label: 'Type de relation', direction: 'ASC' },
      { value: 'strength', label: 'Force de relation', direction: 'DESC' }
    ];
  }

  /**
   * Obtenir les forces de relation avec leurs labels
   * @returns {Object} Forces de relation
   */
  static getRelationshipStrengths() {
    return {
      weak: { label: 'Faible', description: 'Relation faible ou occasionnelle', color: '#9ca3af' },
      medium: { label: 'Moyenne', description: 'Relation régulière ou importante', color: '#f59e0b' },
      strong: { label: 'Forte', description: 'Relation forte ou cruciale', color: '#ef4444' }
    };
  }

  /**
   * Calculer des métriques sur une liste de relations
   * @param {Array} relationships - Liste des relations
   * @returns {Object} Métriques calculées
   */
  static calculateMetrics(relationships = []) {
    if (relationships.length === 0) {
      return {
        total: 0,
        byType: {},
        byStrength: { weak: 0, medium: 0, strong: 0 },
        byCategory: {},
        avgConnectionsPerEntity: 0,
        uniqueEntities: 0
      };
    }

    const metrics = {
      total: relationships.length,
      byType: {},
      byStrength: { weak: 0, medium: 0, strong: 0 },
      byCategory: {},
      uniqueEntities: new Set()
    };

    relationships.forEach(rel => {
      // Compter par type
      metrics.byType[rel.type] = (metrics.byType[rel.type] || 0) + 1;
      
      // Compter par force
      const strength = rel.strength || 'medium';
      metrics.byStrength[strength] = (metrics.byStrength[strength] || 0) + 1;
      
      // Compter par catégorie
      const category = rel.category || 'generic';
      metrics.byCategory[category] = (metrics.byCategory[category] || 0) + 1;
      
      // Compter les entités uniques
      metrics.uniqueEntities.add(rel.from_entity);
      metrics.uniqueEntities.add(rel.to_entity);
    });

    // Calculer la moyenne de connexions par entité
    metrics.avgConnectionsPerEntity = metrics.uniqueEntities.size > 0 
      ? Math.round((relationships.length * 2) / metrics.uniqueEntities.size * 100) / 100
      : 0;
    
    metrics.uniqueEntities = metrics.uniqueEntities.size;

    return metrics;
  }

  /**
   * Filtrer une liste de relations selon des critères
   * @param {Array} relationships - Liste des relations
   * @param {Object} filters - Critères de filtrage
   * @returns {Array} Relations filtrées
   */
  static filterRelationships(relationships = [], filters = {}) {
    return relationships.filter(rel => {
      // Filtre par type
      if (filters.type && rel.type !== filters.type) {
        return false;
      }

      // Filtre par force
      if (filters.strength && rel.strength !== filters.strength) {
        return false;
      }

      // Filtre par catégorie
      if (filters.category && rel.category !== filters.category) {
        return false;
      }

      // Filtre par entité
      if (filters.entityId && 
          rel.from_entity !== filters.entityId && 
          rel.to_entity !== filters.entityId) {
        return false;
      }

      // Filtre par recherche textuelle
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesType = rel.type.toLowerCase().includes(searchTerm);
        const matchesDescription = rel.description && 
          rel.description.toLowerCase().includes(searchTerm);
        const matchesEntityNames = 
          (rel.from_entity_info?.name && 
           rel.from_entity_info.name.toLowerCase().includes(searchTerm)) ||
          (rel.to_entity_info?.name && 
           rel.to_entity_info.name.toLowerCase().includes(searchTerm));
        
        if (!matchesType && !matchesDescription && !matchesEntityNames) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Trier une liste de relations
   * @param {Array} relationships - Liste des relations
   * @param {string} orderBy - Champ de tri
   * @param {string} direction - Direction (ASC/DESC)
   * @returns {Array} Relations triées
   */
  static sortRelationships(relationships = [], orderBy = 'created_at', direction = 'DESC') {
    const sortedRelationships = [...relationships];
    
    sortedRelationships.sort((a, b) => {
      let valueA, valueB;

      switch (orderBy) {
        case 'type':
          valueA = a.type.toLowerCase();
          valueB = b.type.toLowerCase();
          break;
        case 'strength':
          const strengthOrder = { weak: 1, medium: 2, strong: 3 };
          valueA = strengthOrder[a.strength] || 2;
          valueB = strengthOrder[b.strength] || 2;
          break;
        case 'created_at':
          valueA = a.createdAt;
          valueB = b.createdAt;
          break;
        default:
          valueA = a.createdAt;
          valueB = b.createdAt;
      }

      if (valueA < valueB) return direction === 'ASC' ? -1 : 1;
      if (valueA > valueB) return direction === 'ASC' ? 1 : -1;
      return 0;
    });

    return sortedRelationships;
  }

  /**
   * Formater une erreur pour l'affichage utilisateur
   * @param {Error} error - Erreur à formater
   * @returns {Object} Erreur formatée
   */
  static formatErrorForUser(error) {
    if (error instanceof ApiError) {
      return apiUtils.formatError(error);
    }

    return {
      message: error.message || 'Une erreur inattendue s\'est produite',
      technical: error.toString(),
      status: 0,
      timestamp: new Date().toISOString()
    };
  }
}

export default RelationshipService;