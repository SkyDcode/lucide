// backend/core/relationships/models/RelationshipModel.js - Modèle Relationship pour LUCIDE
const DatabaseUtils = require('../../../shared/utils/database');
const { logger, logDatabaseOperation } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError, ConflictError } = require('../../../shared/middleware/errorHandler');
const { isValidRelationshipType, RELATIONSHIP_TYPES } = require('../../../shared/constants/relationshipTypes');

/**
 * Modèle pour la gestion des relations entre entités OSINT
 * Encapsule toutes les opérations CRUD sur la table relationships
 */
class RelationshipModel {

  /**
   * Créer une nouvelle relation
   * @param {Object} relationshipData - Données de la relation
   * @param {number} relationshipData.from_entity - ID entité source (obligatoire)
   * @param {number} relationshipData.to_entity - ID entité destination (obligatoire)
   * @param {string} relationshipData.type - Type de relation (obligatoire)
   * @param {string} [relationshipData.strength='medium'] - Force de la relation
   * @param {string} [relationshipData.description] - Description de la relation
   * @returns {Promise<Object>} Relation créée avec son ID
   */
  static async create({ from_entity, to_entity, type, strength = 'medium', description = null }) {
    try {
      // Validation des données d'entrée
      if (!from_entity || isNaN(parseInt(from_entity))) {
        throw new ValidationError('L\'ID de l\'entité source est obligatoire et doit être un nombre');
      }

      if (!to_entity || isNaN(parseInt(to_entity))) {
        throw new ValidationError('L\'ID de l\'entité destination est obligatoire et doit être un nombre');
      }

      if (!type || typeof type !== 'string' || type.trim().length === 0) {
        throw new ValidationError('Le type de relation est obligatoire');
      }

      // Vérifier que le type de relation est valide
      if (!isValidRelationshipType(type.trim())) {
        throw new ValidationError(`Type de relation invalide: ${type}`);
      }

      // Vérifier que ce n'est pas une auto-relation
      if (parseInt(from_entity) === parseInt(to_entity)) {
        throw new ValidationError('Une entité ne peut pas être en relation avec elle-même');
      }

      // Vérifier que les entités existent
      const fromEntityExists = await DatabaseUtils.exists('entities', { id: parseInt(from_entity) });
      if (!fromEntityExists) {
        throw new ValidationError(`L'entité source avec l'ID ${from_entity} n'existe pas`);
      }

      const toEntityExists = await DatabaseUtils.exists('entities', { id: parseInt(to_entity) });
      if (!toEntityExists) {
        throw new ValidationError(`L'entité destination avec l'ID ${to_entity} n'existe pas`);
      }

      // Vérifier l'unicité de la relation (pas de doublon)
      const existingRelation = await this.findByEntities(from_entity, to_entity, type);
      if (existingRelation) {
        throw new ConflictError(`Une relation de type "${type}" existe déjà entre ces entités`);
      }

      // Valider la force de relation
      const validStrengths = ['weak', 'medium', 'strong'];
      const safeStrength = validStrengths.includes(strength) ? strength : 'medium';

      const trimmedType = type.trim();
      const trimmedDescription = description ? description.trim() : null;

      logDatabaseOperation('INSERT', 'relationships', { 
        from_entity, 
        to_entity, 
        type: trimmedType 
      });

      const query = `
        INSERT INTO relationships (from_entity, to_entity, type, strength, description, created_at) 
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `;

      const result = await DatabaseUtils.executeQuery(
        'INSERT',
        'relationships',
        query,
        [parseInt(from_entity), parseInt(to_entity), trimmedType, safeStrength, trimmedDescription]
      );

      // Récupérer la relation créée avec toutes ses informations
      const createdRelationship = await this.findById(result.lastID);
      
      logger.success('Relationship created successfully', { 
        relationshipId: result.lastID, 
        from_entity, 
        to_entity,
        type: trimmedType 
      });

      return createdRelationship;

    } catch (error) {
      logger.error('Error creating relationship', { 
        from_entity, to_entity, type, strength, description, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer toutes les relations d'un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de récupération
   * @returns {Promise<Array>} Liste des relations avec entités associées
   */
  static async getByFolder(folderId, options = {}) {
    try {
      if (!folderId || isNaN(parseInt(folderId))) {
        throw new ValidationError('ID du dossier invalide');
      }

      const {
        orderBy = 'created_at',
        direction = 'DESC',
        limit = null,
        type = null
      } = options;

      logDatabaseOperation('SELECT', 'relationships', { folderId, options });

      // Requête avec jointures pour récupérer les informations des entités
      let query = `
        SELECT 
          r.id,
          r.from_entity,
          r.to_entity,
          r.type,
          r.strength,
          r.description,
          r.created_at,
          e1.name as from_entity_name,
          e1.type as from_entity_type,
          e1.folder_id as from_folder_id,
          e2.name as to_entity_name,
          e2.type as to_entity_type,
          e2.folder_id as to_folder_id
        FROM relationships r
        INNER JOIN entities e1 ON r.from_entity = e1.id
        INNER JOIN entities e2 ON r.to_entity = e2.id
        WHERE (e1.folder_id = ? OR e2.folder_id = ?)
      `;

      const params = [parseInt(folderId), parseInt(folderId)];

      // Ajouter le filtre par type si spécifié
      if (type) {
        query += ` AND r.type = ?`;
        params.push(type);
      }

      // Ajouter le tri
      const allowedOrderFields = {
        'created_at': 'r.created_at',
        'type': 'r.type',
        'strength': 'r.strength'
      };

      const orderClause = DatabaseUtils.buildOrderClause(
        orderBy, 
        direction, 
        allowedOrderFields
      );
      if (orderClause) {
        query += ` ${orderClause}`;
      }

      // Ajouter la limite si spécifiée
      if (limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(limit));
      }

      const relationships = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'relationships',
        query,
        params
      );

      // Formater les résultats avec informations enrichies
      const formattedRelationships = relationships.map(rel => ({
        id: rel.id,
        from_entity: rel.from_entity,
        to_entity: rel.to_entity,
        type: rel.type,
        strength: rel.strength,
        description: rel.description,
        created_at: rel.created_at,
        from_entity_info: {
          id: rel.from_entity,
          name: rel.from_entity_name,
          type: rel.from_entity_type,
          folder_id: rel.from_folder_id
        },
        to_entity_info: {
          id: rel.to_entity,
          name: rel.to_entity_name,
          type: rel.to_entity_type,
          folder_id: rel.to_folder_id
        }
      }));

      logger.info('Relationships retrieved successfully', { 
        folderId,
        count: formattedRelationships.length,
        options 
      });

      return formattedRelationships;

    } catch (error) {
      logger.error('Error retrieving relationships by folder', { 
        folderId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer une relation par son ID
   * @param {number} id - ID de la relation
   * @returns {Promise<Object|null>} Relation trouvée ou null
   */
  static async findById(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de la relation invalide');
      }

      logDatabaseOperation('SELECT', 'relationships', { id });

      const query = `
        SELECT 
          r.id,
          r.from_entity,
          r.to_entity,
          r.type,
          r.strength,
          r.description,
          r.created_at,
          e1.name as from_entity_name,
          e1.type as from_entity_type,
          e1.folder_id as from_folder_id,
          e2.name as to_entity_name,
          e2.type as to_entity_type,
          e2.folder_id as to_folder_id
        FROM relationships r
        INNER JOIN entities e1 ON r.from_entity = e1.id
        INNER JOIN entities e2 ON r.to_entity = e2.id
        WHERE r.id = ?
      `;

      const relationship = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'relationships',
        query,
        [parseInt(id)]
      );

      if (!relationship) {
        return null;
      }

      return {
        id: relationship.id,
        from_entity: relationship.from_entity,
        to_entity: relationship.to_entity,
        type: relationship.type,
        strength: relationship.strength,
        description: relationship.description,
        created_at: relationship.created_at,
        from_entity_info: {
          id: relationship.from_entity,
          name: relationship.from_entity_name,
          type: relationship.from_entity_type,
          folder_id: relationship.from_folder_id
        },
        to_entity_info: {
          id: relationship.to_entity,
          name: relationship.to_entity_name,
          type: relationship.to_entity_type,
          folder_id: relationship.to_folder_id
        }
      };

    } catch (error) {
      logger.error('Error finding relationship by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Rechercher une relation entre deux entités
   * @param {number} fromEntity - ID entité source
   * @param {number} toEntity - ID entité destination
   * @param {string} [type] - Type de relation spécifique
   * @returns {Promise<Object|null>} Relation trouvée ou null
   */
  static async findByEntities(fromEntity, toEntity, type = null) {
    try {
      if (!fromEntity || !toEntity) {
        return null;
      }

      logDatabaseOperation('SELECT', 'relationships', { fromEntity, toEntity, type });

      let query = `
        SELECT * FROM relationships 
        WHERE ((from_entity = ? AND to_entity = ?) OR (from_entity = ? AND to_entity = ?))
      `;
      let params = [
        parseInt(fromEntity), parseInt(toEntity),
        parseInt(toEntity), parseInt(fromEntity)
      ];

      if (type) {
        query += ` AND type = ?`;
        params.push(type);
      }

      query += ` LIMIT 1`;

      const relationship = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'relationships',
        query,
        params
      );

      return relationship;

    } catch (error) {
      logger.error('Error finding relationship by entities', { 
        fromEntity, toEntity, type, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Mettre à jour une relation
   * @param {number} id - ID de la relation
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<Object>} Relation mise à jour
   */
  static async update(id, updateData) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de la relation invalide');
      }

      // Vérifier que la relation existe
      const existingRelationship = await this.findById(id);
      if (!existingRelationship) {
        throw new NotFoundError('Relation', id);
      }

      const { type, strength, description } = updateData;
      const updates = [];
      const params = [];

      // Valider et préparer les mises à jour
      if (type !== undefined) {
        if (!type || typeof type !== 'string' || type.trim().length === 0) {
          throw new ValidationError('Le type de relation ne peut pas être vide');
        }

        if (!isValidRelationshipType(type.trim())) {
          throw new ValidationError(`Type de relation invalide: ${type}`);
        }

        updates.push('type = ?');
        params.push(type.trim());
      }

      if (strength !== undefined) {
        const validStrengths = ['weak', 'medium', 'strong'];
        if (!validStrengths.includes(strength)) {
          throw new ValidationError(`Force de relation invalide: ${strength}`);
        }

        updates.push('strength = ?');
        params.push(strength);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description ? description.trim() : null);
      }

      if (updates.length === 0) {
        // Aucune mise à jour nécessaire, retourner la relation existante
        return existingRelationship;
      }

      params.push(parseInt(id));

      logDatabaseOperation('UPDATE', 'relationships', { id, updateData });

      const query = `
        UPDATE relationships 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `;

      await DatabaseUtils.executeQuery('UPDATE', 'relationships', query, params);

      // Récupérer la relation mise à jour
      const updatedRelationship = await this.findById(id);

      logger.success('Relationship updated successfully', { 
        relationshipId: id, 
        updates: updateData 
      });

      return updatedRelationship;

    } catch (error) {
      logger.error('Error updating relationship', { 
        id, 
        updateData, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Supprimer une relation
   * @param {number} id - ID de la relation
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  static async delete(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de la relation invalide');
      }

      // Vérifier que la relation existe
      const relationship = await this.findById(id);
      if (!relationship) {
        throw new NotFoundError('Relation', id);
      }

      logDatabaseOperation('DELETE', 'relationships', { id });

      const result = await DatabaseUtils.executeQuery(
        'DELETE',
        'relationships',
        'DELETE FROM relationships WHERE id = ?',
        [parseInt(id)]
      );

      const deleted = result.changes > 0;

      if (deleted) {
        logger.success('Relationship deleted successfully', { 
          relationshipId: id,
          from_entity: relationship.from_entity,
          to_entity: relationship.to_entity,
          type: relationship.type
        });
      }

      return deleted;

    } catch (error) {
      logger.error('Error deleting relationship', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir toutes les relations d'une entité
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options de récupération
   * @returns {Promise<Array>} Relations de l'entité
   */
  static async getByEntity(entityId, options = {}) {
    try {
      if (!entityId || isNaN(parseInt(entityId))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      const {
        direction = 'both', // 'in', 'out', 'both'
        type = null,
        includeEntityInfo = true
      } = options;

      logDatabaseOperation('SELECT', 'relationships', { entityId, direction, type });

      let whereConditions = [];
      let params = [];

      // Filtrer par direction
      switch (direction) {
        case 'in':
          whereConditions.push('r.to_entity = ?');
          params.push(parseInt(entityId));
          break;
        case 'out':
          whereConditions.push('r.from_entity = ?');
          params.push(parseInt(entityId));
          break;
        case 'both':
        default:
          whereConditions.push('(r.from_entity = ? OR r.to_entity = ?)');
          params.push(parseInt(entityId), parseInt(entityId));
          break;
      }

      // Filtrer par type si spécifié
      if (type) {
        whereConditions.push('r.type = ?');
        params.push(type);
      }

      let query = `
        SELECT 
          r.id,
          r.from_entity,
          r.to_entity,
          r.type,
          r.strength,
          r.description,
          r.created_at
      `;

      if (includeEntityInfo) {
        query += `,
          e1.name as from_entity_name,
          e1.type as from_entity_type,
          e2.name as to_entity_name,
          e2.type as to_entity_type
        `;
      }

      query += `
        FROM relationships r
      `;

      if (includeEntityInfo) {
        query += `
          INNER JOIN entities e1 ON r.from_entity = e1.id
          INNER JOIN entities e2 ON r.to_entity = e2.id
        `;
      }

      query += ` WHERE ${whereConditions.join(' AND ')} ORDER BY r.created_at DESC`;

      const relationships = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'relationships',
        query,
        params
      );

      // Formater les résultats selon les options
      const formattedRelationships = relationships.map(rel => {
        const formatted = {
          id: rel.id,
          from_entity: rel.from_entity,
          to_entity: rel.to_entity,
          type: rel.type,
          strength: rel.strength,
          description: rel.description,
          created_at: rel.created_at,
          // Déterminer la direction par rapport à l'entité demandée
          direction: rel.from_entity === parseInt(entityId) ? 'outgoing' : 'incoming',
          // ID de l'entité connectée
          connected_entity: rel.from_entity === parseInt(entityId) ? rel.to_entity : rel.from_entity
        };

        if (includeEntityInfo) {
          formatted.from_entity_info = {
            id: rel.from_entity,
            name: rel.from_entity_name,
            type: rel.from_entity_type
          };
          formatted.to_entity_info = {
            id: rel.to_entity,
            name: rel.to_entity_name,
            type: rel.to_entity_type
          };
          // Information sur l'entité connectée
          formatted.connected_entity_info = rel.from_entity === parseInt(entityId) 
            ? formatted.to_entity_info 
            : formatted.from_entity_info;
        }

        return formatted;
      });

      logger.info('Entity relationships retrieved successfully', { 
        entityId,
        direction,
        type,
        count: formattedRelationships.length
      });

      return formattedRelationships;

    } catch (error) {
      logger.error('Error retrieving entity relationships', { 
        entityId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des relations par dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Statistiques
   */
  static async getStatisticsByFolder(folderId) {
    try {
      if (!folderId || isNaN(parseInt(folderId))) {
        throw new ValidationError('ID du dossier invalide');
      }

      logDatabaseOperation('STATS', 'relationships', { folderId });

      // Statistiques générales
      const generalStatsQuery = `
        SELECT 
          COUNT(*) as total_relationships,
          COUNT(DISTINCT r.type) as unique_types,
          COUNT(DISTINCT r.from_entity) + COUNT(DISTINCT r.to_entity) as entities_with_relations
        FROM relationships r
        INNER JOIN entities e1 ON r.from_entity = e1.id
        INNER JOIN entities e2 ON r.to_entity = e2.id
        WHERE e1.folder_id = ? OR e2.folder_id = ?
      `;

      const generalStats = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'relationships',
        generalStatsQuery,
        [parseInt(folderId), parseInt(folderId)]
      );

      // Statistiques par type
      const typeStatsQuery = `
        SELECT 
          r.type,
          COUNT(*) as count,
          r.strength,
          COUNT(CASE WHEN r.strength = 'weak' THEN 1 END) as weak_count,
          COUNT(CASE WHEN r.strength = 'medium' THEN 1 END) as medium_count,
          COUNT(CASE WHEN r.strength = 'strong' THEN 1 END) as strong_count
        FROM relationships r
        INNER JOIN entities e1 ON r.from_entity = e1.id
        INNER JOIN entities e2 ON r.to_entity = e2.id
        WHERE e1.folder_id = ? OR e2.folder_id = ?
        GROUP BY r.type
        ORDER BY count DESC
      `;

      const typeStats = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'relationships',
        typeStatsQuery,
        [parseInt(folderId), parseInt(folderId)]
      );

      // Statistiques par force
      const strengthStatsQuery = `
        SELECT 
          r.strength,
          COUNT(*) as count
        FROM relationships r
        INNER JOIN entities e1 ON r.from_entity = e1.id
        INNER JOIN entities e2 ON r.to_entity = e2.id
        WHERE e1.folder_id = ? OR e2.folder_id = ?
        GROUP BY r.strength
      `;

      const strengthStats = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'relationships',
        strengthStatsQuery,
        [parseInt(folderId), parseInt(folderId)]
      );

      return {
        total_relationships: generalStats.total_relationships || 0,
        unique_types: generalStats.unique_types || 0,
        entities_with_relations: generalStats.entities_with_relations || 0,
        types_breakdown: typeStats.map(stat => ({
          type: stat.type,
          count: stat.count,
          percentage: generalStats.total_relationships > 0 
            ? Math.round((stat.count / generalStats.total_relationships) * 100) 
            : 0,
          weak_count: stat.weak_count || 0,
          medium_count: stat.medium_count || 0,
          strong_count: stat.strong_count || 0
        })),
        strength_breakdown: strengthStats.reduce((acc, stat) => {
          acc[stat.strength] = {
            count: stat.count,
            percentage: generalStats.total_relationships > 0 
              ? Math.round((stat.count / generalStats.total_relationships) * 100) 
              : 0
          };
          return acc;
        }, {})
      };

    } catch (error) {
      logger.error('Error getting relationships statistics', { 
        folderId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Vérifier l'existence d'une relation
   * @param {number} id - ID de la relation
   * @returns {Promise<boolean>} True si la relation existe
   */
  static async exists(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        return false;
      }

      const exists = await DatabaseUtils.exists('relationships', { id: parseInt(id) });
      return exists;

    } catch (error) {
      logger.error('Error checking relationship existence', { id, error: error.message });
      return false;
    }
  }

  /**
   * Obtenir le nombre total de relations avec filtres
   * @param {Object} filters - Filtres de comptage
   * @returns {Promise<number>} Nombre de relations
   */
  static async count(filters = {}) {
    try {
      logDatabaseOperation('COUNT', 'relationships', { filters });

      const count = await DatabaseUtils.count('relationships', filters);
      return count;

    } catch (error) {
      logger.error('Error counting relationships', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Supprimer toutes les relations d'une entité
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<number>} Nombre de relations supprimées
   */
  static async deleteByEntity(entityId) {
    try {
      if (!entityId || isNaN(parseInt(entityId))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      logDatabaseOperation('DELETE', 'relationships', { entityId, cascade: true });

      const result = await DatabaseUtils.executeQuery(
        'DELETE',
        'relationships',
        'DELETE FROM relationships WHERE from_entity = ? OR to_entity = ?',
        [parseInt(entityId), parseInt(entityId)]
      );

      const deletedCount = result.changes || 0;

      if (deletedCount > 0) {
        logger.success('Entity relationships deleted successfully', { 
          entityId,
          deletedCount
        });
      }

      return deletedCount;

    } catch (error) {
      logger.error('Error deleting entity relationships', { 
        entityId, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = RelationshipModel;