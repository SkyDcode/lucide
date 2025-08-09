// backend/core/media/models/MediaModel.js - Modèle Media pour LUCIDE

const DatabaseUtils = require('../../../shared/utils/database');
const { logger, logDatabaseOperation } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError, ConflictError } = require('../../../shared/middleware/errorHandler');
const path = require('path');
const fs = require('fs');

/**
 * Modèle pour la gestion des fichiers/médias attachés aux entités
 * Encapsule toutes les opérations CRUD sur la table files
 */
class MediaModel {

  /**
   * Ajouter un fichier à une entité
   * @param {Object} fileData - Données du fichier
   * @param {number} fileData.entity_id - ID de l'entité (obligatoire)
   * @param {string} fileData.filename - Nom de fichier sécurisé (obligatoire)
   * @param {string} fileData.original_name - Nom original du fichier (obligatoire)
   * @param {string} fileData.path - Chemin du fichier (obligatoire)
   * @param {number} fileData.size - Taille en bytes
   * @param {string} fileData.mime_type - Type MIME du fichier
   * @returns {Promise<Object>} Fichier créé avec son ID
   */
  static async create({ entity_id, filename, original_name, path: filePath, size, mime_type }) {
    try {
      // Validation des données d'entrée
      if (!entity_id || isNaN(parseInt(entity_id))) {
        throw new ValidationError('L\'ID de l\'entité est obligatoire et doit être un nombre');
      }

      if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
        throw new ValidationError('Le nom de fichier est obligatoire');
      }

      if (!original_name || typeof original_name !== 'string' || original_name.trim().length === 0) {
        throw new ValidationError('Le nom original du fichier est obligatoire');
      }

      if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
        throw new ValidationError('Le chemin du fichier est obligatoire');
      }

      // Vérifier que l'entité parent existe
      const entityExists = await DatabaseUtils.exists('entities', { id: parseInt(entity_id) });
      if (!entityExists) {
        throw new ValidationError(`L'entité avec l'ID ${entity_id} n'existe pas`);
      }

      // Vérifier que le fichier existe physiquement
      if (!fs.existsSync(filePath)) {
        throw new ValidationError(`Le fichier ${filePath} n'existe pas sur le disque`);
      }

      // Obtenir la taille du fichier si non fournie
      let fileSize = size;
      if (!fileSize) {
        try {
          const stats = fs.statSync(filePath);
          fileSize = stats.size;
        } catch (error) {
          throw new ValidationError('Impossible de lire les informations du fichier');
        }
      }

      // Valider la taille
      if (fileSize && fileSize > 200 * 1024 * 1024) { // 200MB max
        throw new ValidationError('Le fichier est trop volumineux (max 200MB)');
      }

      const trimmedFilename = filename.trim();
      const trimmedOriginalName = original_name.trim();
      const trimmedPath = filePath.trim();
      const safeMimeType = mime_type || 'application/octet-stream';

      logDatabaseOperation('INSERT', 'files', { 
        entity_id, 
        filename: trimmedFilename,
        original_name: trimmedOriginalName
      });

      const query = `
        INSERT INTO files (entity_id, filename, original_name, path, size, mime_type, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      const result = await DatabaseUtils.executeQuery(
        'INSERT',
        'files',
        query,
        [parseInt(entity_id), trimmedFilename, trimmedOriginalName, trimmedPath, fileSize, safeMimeType]
      );

      // Récupérer le fichier créé avec toutes ses informations
      const createdFile = await this.findById(result.lastID);
      
      logger.success('File created successfully', { 
        fileId: result.lastID, 
        filename: trimmedFilename,
        entity_id: entity_id,
        size: fileSize
      });

      return createdFile;

    } catch (error) {
      logger.error('Error creating file', { 
        entity_id, filename, original_name, path: filePath, size, mime_type,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer tous les fichiers d'une entité
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options de récupération
   * @param {string} [options.orderBy='created_at'] - Champ de tri
   * @param {string} [options.direction='DESC'] - Direction du tri
   * @param {string} [options.mimeType] - Filtrer par type MIME
   * @returns {Promise<Array>} Liste des fichiers
   */
  static async getByEntity(entityId, options = {}) {
    try {
      if (!entityId || isNaN(parseInt(entityId))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      const {
        orderBy = 'created_at',
        direction = 'DESC',
        mimeType = null
      } = options;

      logDatabaseOperation('SELECT', 'files', { entityId, options });

      let query = `
        SELECT 
          f.id,
          f.entity_id,
          f.filename,
          f.original_name,
          f.path,
          f.size,
          f.mime_type,
          f.created_at,
          e.name as entity_name,
          e.type as entity_type
        FROM files f
        LEFT JOIN entities e ON f.entity_id = e.id
        WHERE f.entity_id = ?
      `;

      const params = [parseInt(entityId)];

      // Ajouter le filtre par type MIME si spécifié
      if (mimeType) {
        query += ` AND f.mime_type = ?`;
        params.push(mimeType);
      }

      // Ajouter le tri
      const allowedOrderFields = {
        'filename': 'f.filename',
        'original_name': 'f.original_name',
        'size': 'f.size',
        'mime_type': 'f.mime_type',
        'created_at': 'f.created_at'
      };

      const orderClause = DatabaseUtils.buildOrderClause(
        orderBy, 
        direction, 
        allowedOrderFields
      );
      if (orderClause) {
        query += ` ${orderClause}`;
      }

      const files = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'files',
        query,
        params
      );

      // Enrichir les résultats avec des informations calculées
      const enrichedFiles = files.map(file => ({
        ...file,
        file_exists: fs.existsSync(file.path),
        file_type: this.getFileTypeFromMime(file.mime_type),
        size_formatted: this.formatFileSize(file.size),
        extension: path.extname(file.original_name).toLowerCase()
      }));

      logger.info('Files retrieved successfully', { 
        entityId,
        count: enrichedFiles.length,
        options 
      });

      return enrichedFiles;

    } catch (error) {
      logger.error('Error retrieving files by entity', { 
        entityId, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer un fichier par son ID
   * @param {number} id - ID du fichier
   * @returns {Promise<Object|null>} Fichier trouvé ou null
   */
  static async findById(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID du fichier invalide');
      }

      logDatabaseOperation('SELECT', 'files', { id });

      const query = `
        SELECT 
          f.id,
          f.entity_id,
          f.filename,
          f.original_name,
          f.path,
          f.size,
          f.mime_type,
          f.created_at,
          e.name as entity_name,
          e.type as entity_type,
          e.folder_id,
          fo.name as folder_name
        FROM files f
        LEFT JOIN entities e ON f.entity_id = e.id
        LEFT JOIN folders fo ON e.folder_id = fo.id
        WHERE f.id = ?
      `;

      const file = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'files',
        query,
        [parseInt(id)]
      );

      if (!file) {
        return null;
      }

      return {
        ...file,
        file_exists: fs.existsSync(file.path),
        file_type: this.getFileTypeFromMime(file.mime_type),
        size_formatted: this.formatFileSize(file.size),
        extension: path.extname(file.original_name).toLowerCase()
      };

    } catch (error) {
      logger.error('Error finding file by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Supprimer un fichier
   * @param {number} id - ID du fichier
   * @param {boolean} deletePhysical - Supprimer aussi le fichier physique
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  static async delete(id, deletePhysical = true) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID du fichier invalide');
      }

      // Récupérer les informations du fichier avant suppression
      const file = await this.findById(id);
      if (!file) {
        throw new NotFoundError('Fichier', id);
      }

      logDatabaseOperation('DELETE', 'files', { id, deletePhysical });

      // Supprimer l'enregistrement de la base de données
      const result = await DatabaseUtils.executeQuery(
        'DELETE',
        'files',
        'DELETE FROM files WHERE id = ?',
        [parseInt(id)]
      );

      const deleted = result.changes > 0;

      // Supprimer le fichier physique si demandé et si suppression DB réussie
      if (deleted && deletePhysical && file.file_exists) {
        try {
          fs.unlinkSync(file.path);
          logger.info('Physical file deleted', { path: file.path });
        } catch (error) {
          logger.warn('Failed to delete physical file', { 
            path: file.path, 
            error: error.message 
          });
          // Ne pas faire échouer la suppression si le fichier physique ne peut être supprimé
        }
      }

      if (deleted) {
        logger.success('File deleted successfully', { 
          fileId: id, 
          filename: file.filename,
          entityId: file.entity_id
        });
      }

      return deleted;

    } catch (error) {
      logger.error('Error deleting file', { 
        id, deletePhysical, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Mettre à jour les métadonnées d'un fichier
   * @param {number} id - ID du fichier
   * @param {Object} updateData - Données à mettre à jour
   * @param {string} [updateData.original_name] - Nouveau nom original
   * @returns {Promise<Object>} Fichier mis à jour
   */
  static async update(id, updateData) {
    try {
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('ID du fichier invalide');
      }

      // Vérifier que le fichier existe
      const existingFile = await this.findById(id);
      if (!existingFile) {
        throw new NotFoundError('Fichier', id);
      }

      const { original_name } = updateData;
      const updates = [];
      const params = [];

      // Valider et préparer les mises à jour
      if (original_name !== undefined) {
        if (!original_name || typeof original_name !== 'string' || original_name.trim().length === 0) {
          throw new ValidationError('Le nom original du fichier ne peut pas être vide');
        }

        if (original_name.trim().length > 255) {
          throw new ValidationError('Le nom du fichier ne peut pas dépasser 255 caractères');
        }

        updates.push('original_name = ?');
        params.push(original_name.trim());
      }

      if (updates.length === 0) {
        // Aucune mise à jour nécessaire, retourner le fichier existant
        return existingFile;
      }

      params.push(parseInt(id));

      logDatabaseOperation('UPDATE', 'files', { id, updateData });

      const query = `
        UPDATE files 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `;

      await DatabaseUtils.executeQuery('UPDATE', 'files', query, params);

      // Récupérer le fichier mis à jour
      const updatedFile = await this.findById(id);

      logger.success('File updated successfully', { 
        fileId: id, 
        updates: updateData 
      });

      return updatedFile;

    } catch (error) {
      logger.error('Error updating file', { 
        id, 
        updateData, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Rechercher des fichiers par nom ou type
   * @param {number} folderId - ID du dossier (optionnel, 0 = tous les dossiers)
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Array>} Fichiers correspondants
   */
  static async search(folderId, searchTerm, options = {}) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return [];
      }

      const { 
        limit = 50, 
        mimeType = null,
        minSize = null,
        maxSize = null
      } = options;

      logDatabaseOperation('SEARCH', 'files', { folderId, searchTerm, options });

      let query = `
        SELECT 
          f.*,
          e.name as entity_name,
          e.type as entity_type,
          fo.name as folder_name
        FROM files f
        LEFT JOIN entities e ON f.entity_id = e.id
        LEFT JOIN folders fo ON e.folder_id = fo.id
        WHERE 1=1
      `;

      const params = [];

      // Filtrer par dossier si spécifié
      if (folderId && folderId > 0) {
        query += ` AND e.folder_id = ?`;
        params.push(parseInt(folderId));
      }

      // Filtrer par type MIME si spécifié
      if (mimeType) {
        query += ` AND f.mime_type = ?`;
        params.push(mimeType);
      }

      // Filtrer par taille
      if (minSize) {
        query += ` AND f.size >= ?`;
        params.push(parseInt(minSize));
      }

      if (maxSize) {
        query += ` AND f.size <= ?`;
        params.push(parseInt(maxSize));
      }

      // Recherche dans le nom original et nom de fichier
      query += ` AND (f.original_name LIKE ? OR f.filename LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);

      query += ` 
        ORDER BY 
          CASE 
            WHEN f.original_name = ? THEN 1
            WHEN f.original_name LIKE ? THEN 2
            ELSE 3
          END,
          f.created_at DESC
        LIMIT ?
      `;

      params.push(searchTerm, `${searchTerm}%`, parseInt(limit));

      const files = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'files',
        query,
        params
      );

      // Enrichir les résultats
      const enrichedFiles = files.map(file => ({
        ...file,
        file_exists: fs.existsSync(file.path),
        file_type: this.getFileTypeFromMime(file.mime_type),
        size_formatted: this.formatFileSize(file.size),
        extension: path.extname(file.original_name).toLowerCase()
      }));

      logger.info('File search completed', { 
        folderId,
        searchTerm, 
        resultsCount: enrichedFiles.length 
      });

      return enrichedFiles;

    } catch (error) {
      logger.error('Error searching files', { 
        folderId, searchTerm, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des fichiers par entité
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<Object>} Statistiques
   */
  static async getStatisticsByEntity(entityId) {
    try {
      if (!entityId || isNaN(parseInt(entityId))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      logDatabaseOperation('STATS', 'files', { entityId });

      const query = `
        SELECT 
          COUNT(*) as total_files,
          COUNT(DISTINCT mime_type) as unique_types,
          SUM(size) as total_size,
          AVG(size) as avg_size,
          MIN(size) as min_size,
          MAX(size) as max_size,
          mime_type,
          COUNT(*) as count_per_type
        FROM files
        WHERE entity_id = ?
        GROUP BY mime_type
      `;

      const typeStats = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'files',
        query,
        [parseInt(entityId)]
      );

      const totalQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(size) as total_size,
          AVG(size) as avg_size
        FROM files
        WHERE entity_id = ?
      `;

      const totalStats = await DatabaseUtils.executeQuery(
        'SELECT_ONE',
        'files',
        totalQuery,
        [parseInt(entityId)]
      );

      return {
        total_files: totalStats.total || 0,
        total_size: totalStats.total_size || 0,
        total_size_formatted: this.formatFileSize(totalStats.total_size || 0),
        avg_size: parseFloat((totalStats.avg_size || 0).toFixed(2)),
        avg_size_formatted: this.formatFileSize(totalStats.avg_size || 0),
        unique_types: typeStats.length,
        types_breakdown: typeStats.map(stat => ({
          mime_type: stat.mime_type,
          file_type: this.getFileTypeFromMime(stat.mime_type),
          count: stat.count_per_type,
          total_size: stat.total_size || 0,
          total_size_formatted: this.formatFileSize(stat.total_size || 0),
          percentage: totalStats.total > 0 
            ? Math.round((stat.count_per_type / totalStats.total) * 100) 
            : 0
        }))
      };

    } catch (error) {
      logger.error('Error getting files statistics', { 
        entityId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Supprimer tous les fichiers d'une entité
   * @param {number} entityId - ID de l'entité
   * @param {boolean} deletePhysical - Supprimer aussi les fichiers physiques
   * @returns {Promise<number>} Nombre de fichiers supprimés
   */
  static async deleteByEntity(entityId, deletePhysical = true) {
    try {
      if (!entityId || isNaN(parseInt(entityId))) {
        throw new ValidationError('ID de l\'entité invalide');
      }

      // Récupérer tous les fichiers de l'entité
      const files = await this.getByEntity(entityId);

      logDatabaseOperation('DELETE', 'files', { entityId, count: files.length });

      let deletedCount = 0;

      // Supprimer chaque fichier
      for (const file of files) {
        try {
          const deleted = await this.delete(file.id, deletePhysical);
          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          logger.warn('Failed to delete file', { 
            fileId: file.id, 
            error: error.message 
          });
        }
      }

      logger.success('Entity files deleted', { 
        entityId, 
        deletedCount,
        totalFiles: files.length
      });

      return deletedCount;

    } catch (error) {
      logger.error('Error deleting entity files', { 
        entityId, deletePhysical, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Vérifier l'existence d'un fichier
   * @param {number} id - ID du fichier
   * @returns {Promise<boolean>} True si le fichier existe
   */
  static async exists(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        return false;
      }

      const exists = await DatabaseUtils.exists('files', { id: parseInt(id) });
      return exists;

    } catch (error) {
      logger.error('Error checking file existence', { id, error: error.message });
      return false;
    }
  }

  /**
   * Obtenir le nombre total de fichiers avec filtres
   * @param {Object} filters - Filtres de comptage
   * @returns {Promise<number>} Nombre de fichiers
   */
  static async count(filters = {}) {
    try {
      logDatabaseOperation('COUNT', 'files', { filters });

      const count = await DatabaseUtils.count('files', filters);
      return count;

    } catch (error) {
      logger.error('Error counting files', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Nettoyer les fichiers orphelins (fichiers sans entité)
   * @returns {Promise<number>} Nombre de fichiers nettoyés
   */
  static async cleanupOrphanedFiles() {
    try {
      logDatabaseOperation('CLEANUP', 'files', {});

      // Trouver les fichiers orphelins
      const orphanedQuery = `
        SELECT f.* 
        FROM files f
        LEFT JOIN entities e ON f.entity_id = e.id
        WHERE e.id IS NULL
      `;

      const orphanedFiles = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'files',
        orphanedQuery,
        []
      );

      let cleanedCount = 0;

      // Supprimer chaque fichier orphelin
      for (const file of orphanedFiles) {
        try {
          const deleted = await this.delete(file.id, true);
          if (deleted) {
            cleanedCount++;
          }
        } catch (error) {
          logger.warn('Failed to cleanup orphaned file', { 
            fileId: file.id, 
            error: error.message 
          });
        }
      }

      logger.success('Orphaned files cleaned up', { 
        cleanedCount,
        totalOrphaned: orphanedFiles.length
      });

      return cleanedCount;

    } catch (error) {
      logger.error('Error cleaning up orphaned files', { error: error.message });
      throw error;
    }
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Obtenir le type de fichier à partir du type MIME
   * @param {string} mimeType - Type MIME
   * @returns {string} Type de fichier
   */
  static getFileTypeFromMime(mimeType) {
    if (!mimeType) return 'unknown';

    const type = mimeType.toLowerCase();
    
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('pdf')) return 'document';
    if (type.includes('document') || type.includes('word') || type.includes('excel') || 
        type.includes('powerpoint') || type.includes('text')) return 'document';
    if (type.includes('zip') || type.includes('rar') || type.includes('tar') || 
        type.includes('gzip') || type.includes('7z')) return 'archive';
    
    return 'other';
  }

  /**
   * Formater la taille d'un fichier en format lisible
   * @param {number} bytes - Taille en bytes
   * @returns {string} Taille formatée
   */
  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Valider qu'un fichier peut être attaché à une entité
   * @param {number} entityId - ID de l'entité
   * @param {string} filePath - Chemin du fichier
   * @returns {Promise<Object>} Résultat de validation
   */
  static async validateFileForEntity(entityId, filePath) {
    try {
      // Vérifier que l'entité existe
      const entityExists = await DatabaseUtils.exists('entities', { id: parseInt(entityId) });
      if (!entityExists) {
        return {
          valid: false,
          error: `L'entité avec l'ID ${entityId} n'existe pas`
        };
      }

      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        return {
          valid: false,
          error: `Le fichier ${filePath} n'existe pas`
        };
      }

      // Vérifier la taille du fichier
      const stats = fs.statSync(filePath);
      if (stats.size > 200 * 1024 * 1024) { // 200MB max
        return {
          valid: false,
          error: 'Le fichier est trop volumineux (max 200MB)'
        };
      }

      return {
        valid: true,
        fileSize: stats.size,
        lastModified: stats.mtime
      };

    } catch (error) {
      return {
        valid: false,
        error: `Erreur lors de la validation: ${error.message}`
      };
    }
  }
}

module.exports = MediaModel;