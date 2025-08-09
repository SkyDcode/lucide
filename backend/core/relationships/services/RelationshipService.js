// backend/core/relationships/services/RelationshipService.js - Service métier pour les relations
const RelationshipModel = require('../models/RelationshipModel');
const EntityModel = require('../../entities/models/EntityModel');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError, ConflictError } = require('../../../shared/middleware/errorHandler');
const { 
  isValidRelationshipType, 
  getSuggestedRelations,
  getReverseRelationshipType,
  formatRelationshipForDisplay,
  RELATIONSHIP_TYPES 
} = require('../../../shared/constants/relationshipTypes');

/**
 * Service métier pour la gestion des relations entre entités
 * Contient la logique business pour les opérations sur les relations
 */
class RelationshipService {

  /**
   * Créer une nouvelle relation avec validation métier
   * @param {Object} relationshipData - Données de la relation
   * @returns {Promise<Object>} Relation créée
   */
  static async createRelationship(relationshipData) {
    try {
      const { from_entity, to_entity, type, strength, description, bidirectional = false } = relationshipData;

      // Validation métier approfondie
      await this.validateRelationshipCreation(from_entity, to_entity, type);

      // Créer la relation principale
      const relationship = await RelationshipModel.create({
        from_entity,
        to_entity,
        type,
        strength: strength || 'medium',
        description
      });

      // Créer la relation inverse si bidirectionnelle
      let reverseRelationship = null;
      if (bidirectional) {
        const relationConfig = RELATIONSHIP_TYPES[type];
        if (relationConfig && relationConfig.bidirectional) {
          const reverseType = getReverseRelationshipType(type) || type;
          
          try {
            reverseRelationship = await RelationshipModel.create({
              from_entity: to_entity,
              to_entity: from_entity,
              type: reverseType,
              strength: strength || 'medium',
              description: description ? `[Inverse] ${description}` : null
            });
          } catch (error) {
            // Si la relation inverse échoue, on continue quand même
            logger.warn('Failed to create reverse relationship', {
              originalRelationshipId: relationship.id,
              error: error.message
            });
          }
        }
      }

      logger.success('Relationship created with business logic', {
        relationshipId: relationship.id,
        reverseRelationshipId: reverseRelationship?.id,
        bidirectional
      });

      return {
        relationship,
        reverseRelationship,
        bidirectional: !!reverseRelationship
      };

    } catch (error) {
      logger.error('Error in relationship service creation', { 
        relationshipData, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les relations d'un dossier avec enrichissement
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Relations enrichies avec métadonnées
   */
  static async getFolderRelationships(folderId, options = {}) {
    try {
      // Récupérer les relations de base
      const relationships = await RelationshipModel.getByFolder(folderId, options);

      // Enrichir chaque relation avec des métadonnées
      const enrichedRelationships = relationships.map(rel => this.enrichRelationship(rel));

      // Calculer les statistiques
      const statistics = await RelationshipModel.getStatisticsByFolder(folderId);

      // Analyser le réseau
      const networkAnalysis = this.analyzeRelationshipNetwork(enrichedRelationships);

      return {
        relationships: enrichedRelationships,
        statistics,
        networkAnalysis,
        metadata: {
          total: enrichedRelationships.length,
          folderId,
          options
        }
      };

    } catch (error) {
      logger.error('Error getting folder relationships', { 
        folderId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les relations d'une entité avec analyse
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Relations avec analyse
   */
  static async getEntityRelationships(entityId, options = {}) {
    try {
      // Vérifier que l'entité existe
      const entity = await EntityModel.findById(entityId);
      if (!entity) {
        throw new NotFoundError('Entité', entityId);
      }

      // Récupérer les relations
      const relationships = await RelationshipModel.getByEntity(entityId, {
        ...options,
        includeEntityInfo: true
      });

      // Enrichir et analyser
      const enrichedRelationships = relationships.map(rel => this.enrichRelationship(rel));
      
      // Analyser les patterns de relations
      const relationshipPatterns = this.analyzeEntityRelationshipPatterns(enrichedRelationships, entityId);

      // Suggérer de nouvelles relations
      const suggestions = await this.suggestRelationsForEntity(entityId);

      return {
        entity,
        relationships: enrichedRelationships,
        patterns: relationshipPatterns,
        suggestions,
        metadata: {
          total: enrichedRelationships.length,
          incoming: enrichedRelationships.filter(r => r.direction === 'incoming').length,
          outgoing: enrichedRelationships.filter(r => r.direction === 'outgoing').length
        }
      };

    } catch (error) {
      logger.error('Error getting entity relationships', { 
        entityId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Mettre à jour une relation avec validation
   * @param {number} relationshipId - ID de la relation
   * @param {Object} updateData - Données de mise à jour
   * @returns {Promise<Object>} Relation mise à jour
   */
  static async updateRelationship(relationshipId, updateData) {
    try {
      // Vérifier que la relation existe
      const existingRelationship = await RelationshipModel.findById(relationshipId);
      if (!existingRelationship) {
        throw new NotFoundError('Relation', relationshipId);
      }

      // Valider les données de mise à jour
      await this.validateRelationshipUpdate(existingRelationship, updateData);

      // Effectuer la mise à jour
      const updatedRelationship = await RelationshipModel.update(relationshipId, updateData);

      // Enrichir le résultat
      const enrichedRelationship = this.enrichRelationship(updatedRelationship);

      logger.success('Relationship updated successfully', {
        relationshipId,
        updateData
      });

      return enrichedRelationship;

    } catch (error) {
      logger.error('Error updating relationship', { 
        relationshipId, updateData, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Supprimer une relation avec nettoyage
   * @param {number} relationshipId - ID de la relation
   * @param {Object} options - Options de suppression
   * @returns {Promise<Object>} Résultat de la suppression
   */
  static async deleteRelationship(relationshipId, options = {}) {
    try {
      const { deleteReverse = false } = options;

      // Récupérer la relation avant suppression
      const relationship = await RelationshipModel.findById(relationshipId);
      if (!relationship) {
        throw new NotFoundError('Relation', relationshipId);
      }

      // Supprimer la relation principale
      const deleted = await RelationshipModel.delete(relationshipId);

      // Supprimer la relation inverse si demandé
      let reverseDeleted = false;
      if (deleteReverse) {
        const reverseType = getReverseRelationshipType(relationship.type);
        if (reverseType) {
          const reverseRelationship = await RelationshipModel.findByEntities(
            relationship.to_entity, 
            relationship.from_entity, 
            reverseType
          );
          
          if (reverseRelationship) {
            reverseDeleted = await RelationshipModel.delete(reverseRelationship.id);
          }
        }
      }

      logger.success('Relationship deleted with cleanup', {
        relationshipId,
        reverseDeleted,
        relationship: {
          from_entity: relationship.from_entity,
          to_entity: relationship.to_entity,
          type: relationship.type
        }
      });

      return {
        deleted,
        reverseDeleted,
        deletedRelationship: relationship
      };

    } catch (error) {
      logger.error('Error deleting relationship', { 
        relationshipId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Fusionner deux entités en gérant leurs relations
   * @param {number} sourceEntityId - ID entité source (sera supprimée)
   * @param {number} targetEntityId - ID entité cible (restera)
   * @returns {Promise<Object>} Résultat de la fusion
   */
  static async mergeEntityRelationships(sourceEntityId, targetEntityId) {
    try {
      // Vérifier que les entités existent
      const [sourceEntity, targetEntity] = await Promise.all([
        EntityModel.findById(sourceEntityId),
        EntityModel.findById(targetEntityId)
      ]);

      if (!sourceEntity) {
        throw new NotFoundError('Entité source', sourceEntityId);
      }
      if (!targetEntity) {
        throw new NotFoundError('Entité cible', targetEntityId);
      }

      // Récupérer toutes les relations de l'entité source
      const sourceRelationships = await RelationshipModel.getByEntity(sourceEntityId);

      const mergeResults = {
        transferred: [],
        merged: [],
        conflicts: [],
        deleted: []
      };

      // Traiter chaque relation
      for (const rel of sourceRelationships) {
        try {
          if (rel.from_entity === sourceEntityId) {
            // Relation sortante : changer la source
            await this.transferRelationship(rel, 'from', targetEntityId, mergeResults);
          } else {
            // Relation entrante : changer la destination
            await this.transferRelationship(rel, 'to', targetEntityId, mergeResults);
          }
        } catch (error) {
          mergeResults.conflicts.push({
            relationshipId: rel.id,
            error: error.message,
            relationship: rel
          });
        }
      }

      logger.success('Entity relationships merged successfully', {
        sourceEntityId,
        targetEntityId,
        results: {
          transferred: mergeResults.transferred.length,
          merged: mergeResults.merged.length,
          conflicts: mergeResults.conflicts.length,
          deleted: mergeResults.deleted.length
        }
      });

      return mergeResults;

    } catch (error) {
      logger.error('Error merging entity relationships', { 
        sourceEntityId, targetEntityId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Suggérer des relations pour une entité
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<Array>} Suggestions de relations
   */
  static async suggestRelationsForEntity(entityId) {
    try {
      const entity = await EntityModel.findById(entityId);
      if (!entity) {
        throw new NotFoundError('Entité', entityId);
      }

      // Récupérer les entités du même dossier
      const folderEntities = await EntityModel.getByFolder(entity.folder_id);
      
      // Récupérer les relations existantes
      const existingRelationships = await RelationshipModel.getByEntity(entityId);
      const connectedEntityIds = new Set(
        existingRelationships.map(r => r.connected_entity)
      );

      const suggestions = [];

      // Analyser chaque entité potentielle
      for (const potentialEntity of folderEntities) {
        if (potentialEntity.id === entityId || connectedEntityIds.has(potentialEntity.id)) {
          continue; // Skip self and already connected entities
        }

        // Obtenir les types de relations suggérées
        const suggestedTypes = getSuggestedRelations(entity.type, potentialEntity.type);
        
        for (const relationType of suggestedTypes) {
          const suggestion = {
            targetEntity: {
              id: potentialEntity.id,
              name: potentialEntity.name,
              type: potentialEntity.type
            },
            relationType,
            relationConfig: RELATIONSHIP_TYPES[relationType],
            confidence: this.calculateRelationConfidence(entity, potentialEntity, relationType),
            reason: this.getRelationSuggestionReason(entity, potentialEntity, relationType)
          };

          suggestions.push(suggestion);
        }
      }

      // Trier par confiance et limiter
      const sortedSuggestions = suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);

      return sortedSuggestions;

    } catch (error) {
      logger.error('Error suggesting relationships', { 
        entityId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Détecter les relations circulaires
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Array>} Relations circulaires détectées
   */
  static async detectCircularRelationships(folderId) {
    try {
      const relationships = await RelationshipModel.getByFolder(folderId);
      const circularPaths = [];
      const visited = new Set();
      const path = [];

      // Construire un graphe des relations
      const graph = new Map();
      relationships.forEach(rel => {
        if (!graph.has(rel.from_entity)) {
          graph.set(rel.from_entity, []);
        }
        graph.get(rel.from_entity).push({
          to: rel.to_entity,
          relationshipId: rel.id,
          type: rel.type
        });
      });

      // DFS pour détecter les cycles
      const detectCycles = (nodeId, pathSet) => {
        if (pathSet.has(nodeId)) {
          // Cycle détecté
          const cycleStart = path.indexOf(nodeId);
          const cyclePath = path.slice(cycleStart);
          cyclePath.push(nodeId); // Fermer le cycle
          
          circularPaths.push({
            path: cyclePath,
            relationships: this.getRelationshipsInPath(cyclePath, relationships)
          });
          return;
        }

        if (visited.has(nodeId)) {
          return;
        }

        visited.add(nodeId);
        pathSet.add(nodeId);
        path.push(nodeId);

        const neighbors = graph.get(nodeId) || [];
        for (const neighbor of neighbors) {
          detectCycles(neighbor.to, new Set(pathSet));
        }

        path.pop();
        pathSet.delete(nodeId);
      };

      // Démarrer la détection depuis chaque nœud
      for (const rel of relationships) {
        if (!visited.has(rel.from_entity)) {
          detectCycles(rel.from_entity, new Set());
        }
      }

      return circularPaths;

    } catch (error) {
      logger.error('Error detecting circular relationships', { 
        folderId, error: error.message 
      });
      throw error;
    }
  }

  // ===========================================
  // MÉTHODES PRIVÉES
  // ===========================================

  /**
   * Valider la création d'une relation
   * @private
   */
  static async validateRelationshipCreation(fromEntity, toEntity, type) {
    // Validation basique
    if (!fromEntity || !toEntity || !type) {
      throw new ValidationError('Entités source, destination et type requis');
    }

    if (fromEntity === toEntity) {
      throw new ValidationError('Une entité ne peut pas être en relation avec elle-même');
    }

    if (!isValidRelationshipType(type)) {
      throw new ValidationError(`Type de relation invalide: ${type}`);
    }

    // Vérifier l'existence des entités
    const [sourceExists, targetExists] = await Promise.all([
      EntityModel.exists(fromEntity),
      EntityModel.exists(toEntity)
    ]);

    if (!sourceExists) {
      throw new NotFoundError('Entité source', fromEntity);
    }
    if (!targetExists) {
      throw new NotFoundError('Entité destination', toEntity);
    }

    // Vérifier les relations existantes
    const existingRelation = await RelationshipModel.findByEntities(fromEntity, toEntity, type);
    if (existingRelation) {
      throw new ConflictError(`Une relation de type "${type}" existe déjà entre ces entités`);
    }
  }

  /**
   * Valider la mise à jour d'une relation
   * @private
   */
  static async validateRelationshipUpdate(existingRelationship, updateData) {
    if (updateData.type && !isValidRelationshipType(updateData.type)) {
      throw new ValidationError(`Type de relation invalide: ${updateData.type}`);
    }

    if (updateData.strength && !['weak', 'medium', 'strong'].includes(updateData.strength)) {
      throw new ValidationError(`Force de relation invalide: ${updateData.strength}`);
    }

    // Si on change le type, vérifier qu'il n'y a pas de conflit
    if (updateData.type && updateData.type !== existingRelationship.type) {
      const conflictingRelation = await RelationshipModel.findByEntities(
        existingRelationship.from_entity,
        existingRelationship.to_entity,
        updateData.type
      );

      if (conflictingRelation && conflictingRelation.id !== existingRelationship.id) {
        throw new ConflictError(`Une relation de type "${updateData.type}" existe déjà entre ces entités`);
      }
    }
  }

  /**
   * Enrichir une relation avec des métadonnées
   * @private
   */
  static enrichRelationship(relationship) {
    const relationType = RELATIONSHIP_TYPES[relationship.type];
    
    return {
      ...relationship,
      config: relationType,
      displayName: relationType?.name || relationship.type,
      category: relationType?.category || 'generic',
      color: relationType?.color || '#6b7280',
      bidirectional: relationType?.bidirectional || false,
      formatted: formatRelationshipForDisplay(
        relationship.type, 
        relationship.strength, 
        'forward'
      )
    };
  }

  /**
   * Analyser le réseau de relations
   * @private
   */
  static analyzeRelationshipNetwork(relationships) {
    const entityConnections = new Map();
    const typeFrequency = new Map();
    const strengthDistribution = { weak: 0, medium: 0, strong: 0 };

    relationships.forEach(rel => {
      // Compter les connexions par entité
      [rel.from_entity, rel.to_entity].forEach(entityId => {
        entityConnections.set(entityId, (entityConnections.get(entityId) || 0) + 1);
      });

      // Fréquence des types
      typeFrequency.set(rel.type, (typeFrequency.get(rel.type) || 0) + 1);

      // Distribution des forces
      strengthDistribution[rel.strength] = (strengthDistribution[rel.strength] || 0) + 1;
    });

    // Trouver les entités centrales
    const centralEntities = Array.from(entityConnections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([entityId, connections]) => ({ entityId, connections }));

    // Types les plus fréquents
    const mostFrequentTypes = Array.from(typeFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalConnections: relationships.length,
      uniqueEntities: entityConnections.size,
      averageConnections: entityConnections.size > 0 
        ? (relationships.length * 2) / entityConnections.size 
        : 0,
      centralEntities,
      mostFrequentTypes,
      strengthDistribution,
      networkDensity: this.calculateNetworkDensity(entityConnections.size, relationships.length)
    };
  }

  /**
   * Analyser les patterns de relations d'une entité
   * @private
   */
  static analyzeEntityRelationshipPatterns(relationships, entityId) {
    const patterns = {
      totalRelations: relationships.length,
      incomingCount: 0,
      outgoingCount: 0,
      typeDistribution: new Map(),
      strengthDistribution: { weak: 0, medium: 0, strong: 0 },
      categoryDistribution: new Map()
    };

    relationships.forEach(rel => {
      // Direction
      if (rel.direction === 'incoming') {
        patterns.incomingCount++;
      } else {
        patterns.outgoingCount++;
      }

      // Type
      patterns.typeDistribution.set(
        rel.type, 
        (patterns.typeDistribution.get(rel.type) || 0) + 1
      );

      // Force
      patterns.strengthDistribution[rel.strength]++;

      // Catégorie
      const category = rel.config?.category || 'generic';
      patterns.categoryDistribution.set(
        category,
        (patterns.categoryDistribution.get(category) || 0) + 1
      );
    });

    return patterns;
  }

  /**
   * Transférer une relation lors d'une fusion d'entités
   * @private
   */
  static async transferRelationship(relationship, direction, newEntityId, results) {
    const updateData = {};
    
    if (direction === 'from') {
      updateData.from_entity = newEntityId;
    } else {
      updateData.to_entity = newEntityId;
    }

    // Vérifier s'il existe déjà une relation similaire
    const fromEntity = direction === 'from' ? newEntityId : relationship.from_entity;
    const toEntity = direction === 'to' ? newEntityId : relationship.to_entity;
    
    const existingRelation = await RelationshipModel.findByEntities(
      fromEntity, 
      toEntity, 
      relationship.type
    );

    if (existingRelation && existingRelation.id !== relationship.id) {
      // Conflit : fusionner les descriptions et garder la relation existante
      const mergedDescription = [
        existingRelation.description,
        relationship.description
      ].filter(Boolean).join(' | ');

      await RelationshipModel.update(existingRelation.id, {
        description: mergedDescription
      });

      await RelationshipModel.delete(relationship.id);

      results.merged.push({
        kept: existingRelation.id,
        deleted: relationship.id,
        mergedDescription
      });
    } else {
      // Pas de conflit : mettre à jour la relation
      await RelationshipModel.update(relationship.id, updateData);
      results.transferred.push({
        relationshipId: relationship.id,
        direction,
        newEntityId
      });
    }
  }

  /**
   * Calculer la confiance d'une suggestion de relation
   * @private
   */
  static calculateRelationConfidence(entity1, entity2, relationType) {
    let confidence = 0.5; // Base

    // Bonus pour les types compatibles
    const suggestedTypes = getSuggestedRelations(entity1.type, entity2.type);
    if (suggestedTypes.includes(relationType)) {
      confidence += 0.3;
    }

    // Bonus pour les entités du même dossier
    if (entity1.folder_id === entity2.folder_id) {
      confidence += 0.1;
    }

    // Malus pour les relations génériques
    if (['connected', 'related'].includes(relationType)) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Obtenir la raison d'une suggestion de relation
   * @private
   */
  static getRelationSuggestionReason(entity1, entity2, relationType) {
    const reasons = [];

    if (entity1.type === 'person' && entity2.type === 'person') {
      reasons.push('Deux personnes dans la même enquête');
    }

    if (entity1.type === 'person' && entity2.type === 'organization') {
      reasons.push('Relation personne-organisation fréquente');
    }

    if (entity1.folder_id === entity2.folder_id) {
      reasons.push('Entités du même dossier');
    }

    const suggestedTypes = getSuggestedRelations(entity1.type, entity2.type);
    if (suggestedTypes.includes(relationType)) {
      reasons.push(`Type de relation recommandé pour ${entity1.type} → ${entity2.type}`);
    }

    return reasons.join(', ') || 'Relation potentielle détectée';
  }

  /**
   * Calculer la densité du réseau
   * @private
   */
  static calculateNetworkDensity(nodeCount, edgeCount) {
    if (nodeCount < 2) return 0;
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    return (edgeCount * 2) / maxPossibleEdges; // *2 car les arêtes sont directionnelles
  }

  /**
   * Obtenir les relations dans un chemin
   * @private
   */
  static getRelationshipsInPath(path, allRelationships) {
    const pathRelationships = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const fromEntity = path[i];
      const toEntity = path[i + 1];
      
      const relationship = allRelationships.find(rel => 
        rel.from_entity === fromEntity && rel.to_entity === toEntity
      );
      
      if (relationship) {
        pathRelationships.push(relationship);
      }
    }
    
    return pathRelationships;
  }
}

module.exports = RelationshipService;