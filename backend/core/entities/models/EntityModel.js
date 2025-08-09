// backend/core/entities/models/EntityModel.js - Modèle Entity pour LUCIDE
const DatabaseUtils = require('../../../shared/utils/database');
const { logger, logDatabaseOperation } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError, ConflictError } = require('../../../shared/middleware/errorHandler');
const { validateEntityAttributes } = require('../../../shared/constants/entityTypes');

/**
 * Modèle pour la gestion des entités OSINT
 * Encapsule toutes les opérations CRUD sur la table entities
 */
class EntityModel {

  /**
   * Créer une nouvelle entité
   * @param {Object} entityData - Données de l'entité
   * @param {number} entityData.folder_id - ID du dossier parent (obligatoire)
   * @param {string} entityData.type - Type d'entité (obligatoire)
   * @param {string} entityData.name - Nom de l'entité (obligatoire)
   * @param {number} [entityData.x=0] - Position X sur le graphe
   * @param {number} [entityData.y=0] - Position Y sur le graphe
   * @param {Object} [entityData.attributes={}] - Attributs flexibles JSON
   * @returns {Promise<Object>} Entité créée avec son ID
   */
  static async create({ folder_id, type, name, x = 0, y = 0, attributes = {} }) {
    try {
      // Validation des données d'entrée
      if (!folder_id || isNaN(parseInt(folder_id))) {
        throw new ValidationError('L\'ID du dossier est obligatoire et doit être un nombre');
      }

      if (!type || typeof type !== 'string' || type.trim().length === 0) {
        throw new ValidationError('Le type d\'entité est obligatoire');
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('Le nom de l\'entité est obligatoire');
      }

      if (name.trim().length > 255) {
        throw new ValidationError('Le nom de l\'entité ne peut pas dépasser 255 caractères');
      }

      // Vérifier que le dossier parent existe
      const folderExists = await DatabaseUtils.exists('folders', { id: parseInt(folder_id) });
      if (!folderExists) {
        throw new ValidationError(`Le dossier avec l'ID ${folder_id} n'existe pas`);
      }

      // Valider les attributs selon le type d'entité
      const attributeValidation = validateEntityAttributes(type, attributes);
      if (!attributeValidation.valid) {
        throw new ValidationError(`Attributs invalides: ${attributeValidation.errors.join(', ')}`);
      }

      const trimmedName = name.trim();
      const trimmedType = type.trim();
      const safeX = parseFloat(x) || 0;
      const safeY = parseFloat(y) || 0;
      const attributesJSON = DatabaseUtils.attributesToJSON(attributes);

      logDatabaseOperation('INSERT', 'entities', { 
        folder_id, 
        type: trimmedType, 
        name: trimmedName 
      });

      const query = `
        INSERT INTO entities (folder_id, type, name, x, y, attributes, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;

      const result = await DatabaseUtils.executeQuery(
        'INSERT',
        'entities',
        query,
        [parseInt(folder_id), trimmedType, trimmedName, safeX, safeY, attributesJSON]
      );

      // Récupérer l'entité créée avec toutes ses informations
      const createdEntity = await this.findById(result.lastID);
      
      logger.success('Entity created successfully', { 
        entityId: result.lastID, 
        name: trimmedName,
        type: trimmedType,
        folder_id 
      });

      return createdEntity;

    } catch (error) {
      logger.error('Error creating entity', { 
        folder_id, type, name, x, y, attributes, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer toutes les entités d'un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de récupération
   * @param {string} [options.orderBy='created_at'] - Champ de tri
   * @param {string} [options.direction='DESC'] - Direction du tri
   * @param {number} [options.limit] - Limite de résultats
   * @param {string} [options.search] - Terme de recherche
   * @param {string} [options.type] - Filtrer par type d'entité
   * @returns {Promise<Array>} Liste des entités avec statistiques
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
        search = null,
        type = null
      } = options;

      logDatabaseOperation('SELECT', 'entities', { folderId, options });

      // Construire la requête avec jointures pour les statistiques
      let query = `
        SELECT 
          e.id,
          e.folder_id,
          e.type,
          e.name,
          e.x,
          e.y,
          e.attributes,
          e.created_at,
          e.updated_at,
          COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as connection_count,
          COUNT(DISTINCT f.id) as file_count
        FROM entities e
        LEFT JOIN relationships r1 ON e.id = r1.from_entity
        LEFT JOIN relationships r2 ON e.id = r2.to_entity
        LEFT JOIN files f ON e.id = f.entity_id
        WHERE e.folder_id = ?
      `;

      const params = [parseInt(folderId)];

      // Ajouter le filtre par type si spécifié
      if (type) {
        query += ` AND e.type = ?`;
        params.push(type);
      }

      // Ajouter la recherche si spécifiée
      if (search) {
        query += ` AND (e.name LIKE ? OR e.attributes LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ` GROUP BY e.id`;

      // Ajouter le tri
      const allowedOrderFields = {
        'name': 'e.name',
        'type': 'e.type',
        'created_at': 'e.created_at',
        'updated_at': 'e.updated_at',
        'connection_count': 'connection_count'
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

      const entities = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'entities',
        query,
        params
      );

      // Formater les résultats
      const formattedEntities = entities.map(entity => ({
        ...entity,
        attributes: DatabaseUtils.attributesFromJSON(entity.attributes),
        connection_count: entity.connection_count || 0,
        file_count: entity.file_count || 0
      }));

      logger.info('Entities retrieved successfully', { 
        folderId,
        count: formattedEntities.length,
        options 
      });

      return formattedEntities;

    } catch (error) {
      logger.error('Error retrieving entities by folder', { 
        folderId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer une entité par son ID
   * @param {number} id - ID de l'entité
   * @returns {Promise<Object|null>} Entité trouvée ou null
   */
  static async findById(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      logDatabaseOperation('SELECT', 'entities', { id });

      const query = `
        SELECT 
          e.id,
          e.folder_id,
          e.type,
          e.name,
          e.x,
          e.y,
          e.attributes,
          e.created_at,
          e.updated_at,
          COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as connection_count,
          COUNT(DISTINCT f.id) as file_count,
          fo.name as folder_name
        FROM entities e
        LEFT JOIN relationships r1 ON e.id = r1.from_entity
        LEFT JOIN relationships r2 ON e.id = r2.to_entity
        LEFT JOIN files f ON e.id = f.entity_id
        LEFT JOIN folders fo ON e.folder_id = fo.id
        WHERE e.id = ?
        GROUP BY e.id
      `;

      const entity = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'entities',
        query,
        [parseInt(id)]
      );

      if (!entity) {
        return null;
      }

      return {
        ...entity,
        attributes: DatabaseUtils.attributesFromJSON(entity.attributes),
        connection_count: entity.connection_count || 0,
        file_count: entity.file_count || 0
      };

    } catch (error) {
      logger.error('Error finding entity by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Mettre à jour une entité
   * @param {number} id - ID de l'entité
   * @param {Object} updateData - Données à mettre à jour
   * @param {string} [updateData.name] - Nouveau nom
   * @param {number} [updateData.x] - Nouvelle position X
   * @param {number} [updateData.y] - Nouvelle position Y
   * @param {Object} [updateData.attributes] - Nouveaux attributs
   * @returns {Promise<Object>} Entité mise à jour
   */
  static async update(id, updateData) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      // Vérifier que l'entité existe
      const existingEntity = await this.findById(id);
      if (!existingEntity) {
        throw new NotFoundError('Entité', id);
      }

      const { name, x, y, attributes } = updateData;
      const updates = [];
      const params = [];

      // Valider et préparer les mises à jour
      if (name !== undefined) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          throw new ValidationError('Le nom de l\'entité ne peut pas être vide');
        }

        if (name.trim().length > 255) {
          throw new ValidationError('Le nom de l\'entité ne peut pas dépasser 255 caractères');
        }

        updates.push('name = ?');
        params.push(name.trim());
      }

      if (x !== undefined) {
        updates.push('x = ?');
        params.push(parseFloat(x) || 0);
      }

      if (y !== undefined) {
        updates.push('y = ?');
        params.push(parseFloat(y) || 0);
      }

      if (attributes !== undefined) {
        // Valider les attributs selon le type d'entité
        const attributeValidation = validateEntityAttributes(existingEntity.type, attributes);
        if (!attributeValidation.valid) {
          throw new ValidationError(`Attributs invalides: ${attributeValidation.errors.join(', ')}`);
        }

        updates.push('attributes = ?');
        params.push(DatabaseUtils.attributesToJSON(attributes));
      }

      if (updates.length === 0) {
        // Aucune mise à jour nécessaire, retourner l'entité existante
        return existingEntity;
      }

      // Ajouter la mise à jour du timestamp
      updates.push('updated_at = datetime(\'now\')');
      params.push(parseInt(id));

      logDatabaseOperation('UPDATE', 'entities', { id, updateData });

      const query = `
        UPDATE entities 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `;

      await DatabaseUtils.executeQuery('UPDATE', 'entities', query, params);

      // Récupérer l'entité mise à jour
      const updatedEntity = await this.findById(id);

      logger.success('Entity updated successfully', { 
        entityId: id, 
        updates: updateData 
      });

      return updatedEntity;

    } catch (error) {
      logger.error('Error updating entity', { 
        id, 
        updateData, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Supprimer une entité
   * @param {number} id - ID de l'entité
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  static async delete(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      // Vérifier que l'entité existe
      const entity = await this.findById(id);
      if (!entity) {
        throw new NotFoundError('Entité', id);
      }

      logDatabaseOperation('DELETE', 'entities', { id });

      // Utiliser une transaction pour la suppression
      const deleted = await DatabaseUtils.transaction(async () => {
        // Supprimer d'abord toutes les relations liées
        await DatabaseUtils.executeQuery(
          'DELETE',
          'relationships',
          'DELETE FROM relationships WHERE from_entity = ? OR to_entity = ?',
          [parseInt(id), parseInt(id)]
        );

        // Supprimer tous les fichiers liés
        await DatabaseUtils.executeQuery(
          'DELETE',
          'files',
          'DELETE FROM files WHERE entity_id = ?',
          [parseInt(id)]
        );

        // Supprimer l'entité
        const result = await DatabaseUtils.executeQuery(
          'DELETE',
          'entities',
          'DELETE FROM entities WHERE id = ?',
          [parseInt(id)]
        );

        return result.changes > 0;
      });

      if (deleted) {
        logger.success('Entity deleted successfully', { 
          entityId: id, 
          entityName: entity.name,
          entityType: entity.type
        });
      }

      return deleted;

    } catch (error) {
      logger.error('Error deleting entity', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Mettre à jour uniquement la position d'une entité (optimisé pour le graphe)
   * @param {number} id - ID de l'entité
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @returns {Promise<Object>} Entité avec nouvelle position
   */
  static async updatePosition(id, { x, y }) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      logDatabaseOperation('UPDATE', 'entities', { id, position: { x, y } });

      const query = `
        UPDATE entities 
        SET x = ?, y = ?, updated_at = datetime('now') 
        WHERE id = ?
      `;

      const result = await DatabaseUtils.executeQuery(
        'UPDATE', 
        'entities', 
        query, 
        [parseFloat(x) || 0, parseFloat(y) || 0, parseInt(id)]
      );

      if (result.changes === 0) {
        throw new NotFoundError('Entité', id);
      }

      return { id: parseInt(id), x: parseFloat(x) || 0, y: parseFloat(y) || 0 };

    } catch (error) {
      logger.error('Error updating entity position', { 
        id, x, y, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Rechercher des entités par terme
   * @param {number} folderId - ID du dossier (optionnel, 0 = tous les dossiers)
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Array>} Entités correspondantes
   */
  static async search(folderId, searchTerm, options = {}) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return [];
      }

      const { 
        limit = 50, 
        type = null,
        exactMatch = false 
      } = options;

      logDatabaseOperation('SEARCH', 'entities', { folderId, searchTerm, options });

      let query = `
        SELECT 
          e.*,
          COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as connection_count,
          fo.name as folder_name
        FROM entities e
        LEFT JOIN relationships r1 ON e.id = r1.from_entity
        LEFT JOIN relationships r2 ON e.id = r2.to_entity
        LEFT JOIN folders fo ON e.folder_id = fo.id
        WHERE 1=1
      `;

      const params = [];

      // Filtrer par dossier si spécifié
      if (folderId && folderId > 0) {
        query += ` AND e.folder_id = ?`;
        params.push(parseInt(folderId));
      }

      // Filtrer par type si spécifié
      if (type) {
        query += ` AND e.type = ?`;
        params.push(type);
      }

      // Recherche dans le nom et les attributs
      if (exactMatch) {
        query += ` AND (e.name = ? OR e.attributes LIKE ?)`;
        params.push(searchTerm, `%"${searchTerm}"%`);
      } else {
        query += ` AND (e.name LIKE ? OR e.attributes LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }

      query += ` 
        GROUP BY e.id
        ORDER BY 
          CASE 
            WHEN e.name = ? THEN 1
            WHEN e.name LIKE ? THEN 2
            ELSE 3
          END,
          e.name ASC
        LIMIT ?
      `;

      params.push(searchTerm, `${searchTerm}%`, parseInt(limit));

      const entities = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'entities',
        query,
        params
      );

      // Formater les résultats
      const formattedEntities = entities.map(entity => ({
        ...entity,
        attributes: DatabaseUtils.attributesFromJSON(entity.attributes),
        connection_count: entity.connection_count || 0
      }));

      logger.info('Entity search completed', { 
        folderId,
        searchTerm, 
        resultsCount: formattedEntities.length 
      });

      return formattedEntities;

    } catch (error) {
      logger.error('Error searching entities', { 
        folderId, searchTerm, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les entités connectées à une entité donnée
   * @param {number} entityId - ID de l'entité source
   * @param {number} maxDepth - Profondeur maximale de recherche
   * @returns {Promise<Array>} Entités connectées
   */
  static async getConnectedEntities(entityId, maxDepth = 2) {
    try {
      if (!entityId || isNaN(parseInt(entityId))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      logDatabaseOperation('SELECT', 'entities', { entityId, connected: true });

      const query = `
        WITH RECURSIVE connected_entities(entity_id, depth) AS (
          SELECT ?, 0
          UNION
          SELECT 
            CASE 
              WHEN r.from_entity = ce.entity_id THEN r.to_entity
              ELSE r.from_entity
            END,
            ce.depth + 1
          FROM connected_entities ce
          JOIN relationships r ON (r.from_entity = ce.entity_id OR r.to_entity = ce.entity_id)
          WHERE ce.depth < ?
        )
        SELECT DISTINCT 
          e.*,
          ce.depth,
          COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as connection_count
        FROM connected_entities ce
        JOIN entities e ON e.id = ce.entity_id
        LEFT JOIN relationships r1 ON e.id = r1.from_entity
        LEFT JOIN relationships r2 ON e.id = r2.to_entity
        WHERE ce.entity_id != ?
        GROUP BY e.id
        ORDER BY ce.depth, e.name
      `;

      const connectedEntities = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'entities',
        query,
        [parseInt(entityId), maxDepth, parseInt(entityId)]
      );

      return connectedEntities.map(entity => ({
        ...entity,
        attributes: DatabaseUtils.attributesFromJSON(entity.attributes),
        connection_count: entity.connection_count || 0
      }));

    } catch (error) {
      logger.error('Error getting connected entities', { 
        entityId, maxDepth, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des entités par dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Statistiques
   */
  static async getStatisticsByFolder(folderId) {
    try {
      if (!folderId || isNaN(parseInt(folderId))) {
        throw new ValidationError('ID du dossier invalide');
      }

      logDatabaseOperation('STATS', 'entities', { folderId });

      const query = `
        SELECT 
          COUNT(*) as total_entities,
          COUNT(DISTINCT type) as unique_types,
          type,
          COUNT(*) as count_per_type
        FROM entities
        WHERE folder_id = ?
        GROUP BY type
      `;

      const typeStats = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'entities',
        query,
        [parseInt(folderId)]
      );

      const totalQuery = `
        SELECT 
          COUNT(*) as total,
          AVG(
            (SELECT COUNT(*) FROM relationships r 
             WHERE r.from_entity = e.id OR r.to_entity = e.id)
          ) as avg_connections
        FROM entities e
        WHERE folder_id = ?
      `;

      const totalStats = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'entities',
        totalQuery,
        [parseInt(folderId)]
      );

      return {
        total_entities: totalStats.total || 0,
        avg_connections: parseFloat((totalStats.avg_connections || 0).toFixed(2)),
        unique_types: typeStats.length,
        types_breakdown: typeStats.map(stat => ({
          type: stat.type,
          count: stat.count_per_type,
          percentage: totalStats.total > 0 
            ? Math.round((stat.count_per_type / totalStats.total) * 100) 
            : 0
        }))
      };

    } catch (error) {
      logger.error('Error getting entities statistics', { 
        folderId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Vérifier l'existence d'une entité
   * @param {number} id - ID de l'entité
   * @returns {Promise<boolean>} True si l'entité existe
   */
  static async exists(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        return false;
      }

      const exists = await DatabaseUtils.exists('entities', { id: parseInt(id) });
      return exists;

    } catch (error) {
      logger.error('Error checking entity existence', { id, error: error.message });
      return false;
    }
  }

  /**
   * Obtenir le nombre total d'entités avec filtres
   * @param {Object} filters - Filtres de comptage
   * @returns {Promise<number>} Nombre d'entités
   */
  static async count(filters = {}) {
    try {
      logDatabaseOperation('COUNT', 'entities', { filters });

      const count = await DatabaseUtils.count('entities', filters);
      return count;

    } catch (error) {
      logger.error('Error counting entities', { filters, error: error.message });
      throw error;
    }
  }
}

module.exports = EntityModel;