// backend/core/folders/models/FolderModel.js - Modèle Folder pour LUCIDE
const DatabaseUtils = require('../../../shared/utils/database');
const { logger, logDatabaseOperation } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError, ConflictError } = require('../../../shared/middleware/errorHandler');

/**
 * Modèle pour la gestion des dossiers d'enquête
 * Encapsule toutes les opérations CRUD sur la table folders
 */
class FolderModel {

  /**
   * Créer un nouveau dossier d'enquête
   * @param {Object} folderData - Données du dossier
   * @param {string} folderData.name - Nom du dossier (obligatoire)
   * @param {string} [folderData.description] - Description du dossier
   * @returns {Promise<Object>} Dossier créé avec son ID
   */
  static async create({ name, description = null }) {
    try {
      // Validation des données d'entrée
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('Le nom du dossier est obligatoire');
      }

      if (name.trim().length > 255) {
        throw new ValidationError('Le nom du dossier ne peut pas dépasser 255 caractères');
      }

      // Vérifier l'unicité du nom
      const existing = await this.findByName(name.trim());
      if (existing) {
        throw new ConflictError(`Un dossier avec le nom "${name.trim()}" existe déjà`);
      }

      const trimmedName = name.trim();
      const trimmedDescription = description ? description.trim() : null;

      logDatabaseOperation('INSERT', 'folders', { name: trimmedName });

      const query = `
        INSERT INTO folders (name, description, created_at, updated_at) 
        VALUES (?, ?, datetime('now'), datetime('now'))
      `;

      const result = await DatabaseUtils.executeQuery(
        'INSERT',
        'folders',
        query,
        [trimmedName, trimmedDescription]
      );

      // Récupérer le dossier créé avec toutes ses informations
      const createdFolder = await this.findById(result.lastID);
      
      logger.success('Folder created successfully', { 
        folderId: result.lastID, 
        name: trimmedName 
      });

      return createdFolder;

    } catch (error) {
      logger.error('Error creating folder', { 
        name, 
        description, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer tous les dossiers avec leurs statistiques
   * @param {Object} options - Options de récupération
   * @param {string} [options.orderBy='created_at'] - Champ de tri
   * @param {string} [options.direction='DESC'] - Direction du tri
   * @param {number} [options.limit] - Limite de résultats
   * @param {string} [options.search] - Terme de recherche
   * @returns {Promise<Array>} Liste des dossiers avec statistiques
   */
  static async getAll(options = {}) {
    try {
      const {
        orderBy = 'created_at',
        direction = 'DESC',
        limit = null,
        search = null
      } = options;

      logDatabaseOperation('SELECT', 'folders', { options });

      // Construire la requête avec jointures pour les statistiques
      let query = `
        SELECT 
          f.id,
          f.name,
          f.description,
          f.created_at,
          f.updated_at,
          COUNT(DISTINCT e.id) as entity_count,
          COUNT(DISTINCT r.id) as relationship_count,
          COUNT(DISTINCT fi.id) as file_count,
          MAX(e.updated_at) as last_activity
        FROM folders f
        LEFT JOIN entities e ON f.id = e.folder_id
        LEFT JOIN relationships r ON (e.id = r.from_entity OR e.id = r.to_entity)
        LEFT JOIN files fi ON e.id = fi.entity_id
      `;

      const params = [];

      // Ajouter la recherche si spécifiée
      if (search) {
        query += ` WHERE f.name LIKE ? OR f.description LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ` GROUP BY f.id`;

      // Ajouter le tri
      const allowedOrderFields = {
        'name': 'f.name',
        'created_at': 'f.created_at',
        'updated_at': 'f.updated_at',
        'entity_count': 'entity_count',
        'last_activity': 'last_activity'
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

      const folders = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'folders',
        query,
        params
      );

      // Formater les résultats
      const formattedFolders = folders.map(folder => ({
        ...folder,
        entity_count: folder.entity_count || 0,
        relationship_count: folder.relationship_count || 0,
        file_count: folder.file_count || 0,
        last_activity: folder.last_activity || folder.updated_at
      }));

      logger.info('Folders retrieved successfully', { 
        count: formattedFolders.length,
        options 
      });

      return formattedFolders;

    } catch (error) {
      logger.error('Error retrieving folders', { options, error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer un dossier par son ID
   * @param {number} id - ID du dossier
   * @returns {Promise<Object|null>} Dossier trouvé ou null
   */
  static async findById(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID du dossier invalide');
      }

      logDatabaseOperation('SELECT', 'folders', { id });

      const query = `
        SELECT 
          f.id,
          f.name,
          f.description,
          f.created_at,
          f.updated_at,
          COUNT(DISTINCT e.id) as entity_count,
          COUNT(DISTINCT r.id) as relationship_count,
          COUNT(DISTINCT fi.id) as file_count,
          MAX(e.updated_at) as last_activity
        FROM folders f
        LEFT JOIN entities e ON f.id = e.folder_id
        LEFT JOIN relationships r ON (e.id = r.from_entity OR e.id = r.to_entity)
        LEFT JOIN files fi ON e.id = fi.entity_id
        WHERE f.id = ?
        GROUP BY f.id
      `;

      const folder = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'folders',
        query,
        [parseInt(id)]
      );

      if (!folder) {
        return null;
      }

      return {
        ...folder,
        entity_count: folder.entity_count || 0,
        relationship_count: folder.relationship_count || 0,
        file_count: folder.file_count || 0,
        last_activity: folder.last_activity || folder.updated_at
      };

    } catch (error) {
      logger.error('Error finding folder by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer un dossier par son nom
   * @param {string} name - Nom du dossier
   * @returns {Promise<Object|null>} Dossier trouvé ou null
   */
  static async findByName(name) {
    try {
      if (!name || typeof name !== 'string') {
        return null;
      }

      logDatabaseOperation('SELECT', 'folders', { name });

      const query = `SELECT * FROM folders WHERE name = ? LIMIT 1`;
      const folder = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'folders',
        query,
        [name.trim()]
      );

      return folder;

    } catch (error) {
      logger.error('Error finding folder by name', { name, error: error.message });
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier
   * @param {number} id - ID du dossier
   * @param {Object} updateData - Données à mettre à jour
   * @param {string} [updateData.name] - Nouveau nom
   * @param {string} [updateData.description] - Nouvelle description
   * @returns {Promise<Object>} Dossier mis à jour
   */
  static async update(id, updateData) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID du dossier invalide');
      }

      // Vérifier que le dossier existe
      const existingFolder = await this.findById(id);
      if (!existingFolder) {
        throw new NotFoundError('Dossier', id);
      }

      const { name, description } = updateData;
      const updates = [];
      const params = [];

      // Valider et préparer les mises à jour
      if (name !== undefined) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          throw new ValidationError('Le nom du dossier ne peut pas être vide');
        }

        if (name.trim().length > 255) {
          throw new ValidationError('Le nom du dossier ne peut pas dépasser 255 caractères');
        }

        // Vérifier l'unicité du nouveau nom (sauf pour le dossier actuel)
        const existingByName = await this.findByName(name.trim());
        if (existingByName && existingByName.id !== parseInt(id)) {
          throw new ConflictError(`Un dossier avec le nom "${name.trim()}" existe déjà`);
        }

        updates.push('name = ?');
        params.push(name.trim());
      }

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description ? description.trim() : null);
      }

      if (updates.length === 0) {
        // Aucune mise à jour nécessaire, retourner le dossier existant
        return existingFolder;
      }

      // Ajouter la mise à jour du timestamp
      updates.push('updated_at = datetime(\'now\')');
      params.push(parseInt(id));

      logDatabaseOperation('UPDATE', 'folders', { id, updateData });

      const query = `
        UPDATE folders 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `;

      await DatabaseUtils.executeQuery('UPDATE', 'folders', query, params);

      // Récupérer le dossier mis à jour
      const updatedFolder = await this.findById(id);

      logger.success('Folder updated successfully', { 
        folderId: id, 
        updates: updateData 
      });

      return updatedFolder;

    } catch (error) {
      logger.error('Error updating folder', { 
        id, 
        updateData, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Supprimer un dossier
   * @param {number} id - ID du dossier
   * @param {Object} options - Options de suppression
   * @param {boolean} [options.force=false] - Forcer la suppression même si contient des entités
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  static async delete(id, options = {}) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID du dossier invalide');
      }

      const { force = false } = options;

      // Vérifier que le dossier existe
      const folder = await this.findById(id);
      if (!folder) {
        throw new NotFoundError('Dossier', id);
      }

      // Vérifier s'il y a des entités dans le dossier
      if (!force && folder.entity_count > 0) {
        throw new ConflictError(
          `Impossible de supprimer le dossier "${folder.name}" car il contient ${folder.entity_count} entité(s). Utilisez l'option force pour forcer la suppression.`
        );
      }

      logDatabaseOperation('DELETE', 'folders', { id, force });

      // Utiliser une transaction pour la suppression
      const deleted = await DatabaseUtils.transaction(async (db) => {
        if (force && folder.entity_count > 0) {
          // Supprimer d'abord toutes les relations liées aux entités du dossier
          await DatabaseUtils.executeQuery(
            'DELETE',
            'relationships',
            `DELETE FROM relationships 
             WHERE from_entity IN (SELECT id FROM entities WHERE folder_id = ?) 
                OR to_entity IN (SELECT id FROM entities WHERE folder_id = ?)`,
            [parseInt(id), parseInt(id)]
          );

          // Supprimer tous les fichiers liés aux entités du dossier
          await DatabaseUtils.executeQuery(
            'DELETE',
            'files',
            `DELETE FROM files 
             WHERE entity_id IN (SELECT id FROM entities WHERE folder_id = ?)`,
            [parseInt(id)]
          );

          // Supprimer toutes les entités du dossier
          await DatabaseUtils.executeQuery(
            'DELETE',
            'entities',
            'DELETE FROM entities WHERE folder_id = ?',
            [parseInt(id)]
          );
        }

        // Supprimer le dossier
        const result = await DatabaseUtils.executeQuery(
          'DELETE',
          'folders',
          'DELETE FROM folders WHERE id = ?',
          [parseInt(id)]
        );

        return result.changes > 0;
      });

      if (deleted) {
        logger.success('Folder deleted successfully', { 
          folderId: id, 
          folderName: folder.name,
          force 
        });
      }

      return deleted;

    } catch (error) {
      logger.error('Error deleting folder', { 
        id, 
        options, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Vérifier l'existence d'un dossier
   * @param {number} id - ID du dossier
   * @returns {Promise<boolean>} True si le dossier existe
   */
  static async exists(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        return false;
      }

      const exists = await DatabaseUtils.exists('folders', { id: parseInt(id) });
      return exists;

    } catch (error) {
      logger.error('Error checking folder existence', { id, error: error.message });
      return false;
    }
  }

  /**
   * Obtenir le nombre total de dossiers
   * @param {Object} filters - Filtres de comptage
   * @returns {Promise<number>} Nombre de dossiers
   */
  static async count(filters = {}) {
    try {
      logDatabaseOperation('COUNT', 'folders', { filters });

      const count = await DatabaseUtils.count('folders', filters);
      return count;

    } catch (error) {
      logger.error('Error counting folders', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Rechercher des dossiers par terme
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Array>} Dossiers correspondants
   */
  static async search(searchTerm, options = {}) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return [];
      }

      const { limit = 50 } = options;

      logDatabaseOperation('SEARCH', 'folders', { searchTerm, options });

      const folders = await DatabaseUtils.fullTextSearch(
        'folders',
        ['name', 'description'],
        searchTerm.trim(),
        {}
      );

      // Limiter les résultats
      const limitedResults = folders.slice(0, parseInt(limit));

      logger.info('Folder search completed', { 
        searchTerm, 
        resultsCount: limitedResults.length 
      });

      return limitedResults;

    } catch (error) {
      logger.error('Error searching folders', { 
        searchTerm, 
        options, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques globales des dossiers
   * @returns {Promise<Object>} Statistiques
   */
  static async getStatistics() {
    try {
      logDatabaseOperation('STATS', 'folders');

      const query = `
        SELECT 
          COUNT(*) as total_folders,
          SUM(CASE WHEN entity_count > 0 THEN 1 ELSE 0 END) as active_folders,
          SUM(CASE WHEN entity_count = 0 THEN 1 ELSE 0 END) as empty_folders,
          AVG(entity_count) as avg_entities_per_folder,
          MAX(entity_count) as max_entities_in_folder,
          MIN(created_at) as oldest_folder_date,
          MAX(created_at) as newest_folder_date
        FROM (
          SELECT 
            f.id,
            f.created_at,
            COUNT(e.id) as entity_count
          FROM folders f
          LEFT JOIN entities e ON f.id = e.folder_id
          GROUP BY f.id
        )
      `;

      const stats = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'folders',
        query
      );

      const formattedStats = {
        total_folders: stats.total_folders || 0,
        active_folders: stats.active_folders || 0,
        empty_folders: stats.empty_folders || 0,
        avg_entities_per_folder: parseFloat((stats.avg_entities_per_folder || 0).toFixed(2)),
        max_entities_in_folder: stats.max_entities_in_folder || 0,
        oldest_folder_date: stats.oldest_folder_date,
        newest_folder_date: stats.newest_folder_date
      };

      logger.info('Folder statistics retrieved', { stats: formattedStats });

      return formattedStats;

    } catch (error) {
      logger.error('Error getting folder statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les dossiers récemment modifiés
   * @param {number} limit - Nombre de dossiers à retourner
   * @returns {Promise<Array>} Dossiers récents
   */
  static async getRecentlyModified(limit = 10) {
    try {
      const options = {
        orderBy: 'updated_at',
        direction: 'DESC',
        limit: parseInt(limit)
      };

      return await this.getAll(options);

    } catch (error) {
      logger.error('Error getting recently modified folders', { 
        limit, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = FolderModel;