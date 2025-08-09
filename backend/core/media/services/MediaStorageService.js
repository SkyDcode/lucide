// backend/core/media/services/MediaStorageService.js - Service de stockage des médias

const path = require('path');
const fs = require('fs');
const FileHelper = require('../../../shared/utils/fileHelper');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError, FileUploadError } = require('../../../shared/middleware/errorHandler');
const { getFileType, generateSecureFilename, getDestinationPath } = require('../../../config/multer');

/**
 * Service de gestion du stockage des fichiers médias
 * Gère l'organisation, le stockage et la récupération des fichiers
 */
class MediaStorageService {

  /**
   * Initialiser le service de stockage
   * @param {Object} config - Configuration du stockage
   */
  constructor(config = {}) {
    this.baseUploadPath = config.baseUploadPath || path.join(__dirname, '../../../uploads');
    this.maxFileSize = config.maxFileSize || 200 * 1024 * 1024; // 200MB par défaut
    this.allowedTypes = config.allowedTypes || ['image', 'document', 'video', 'audio', 'archive'];
    
    this.ensureBaseDirectories();
  }

  /**
   * S'assurer que les dossiers de base existent
   */
  async ensureBaseDirectories() {
    try {
      const structure = {
        entities: {
          image: {},
          document: {},
          video: {},
          audio: {},
          archive: {},
          other: {}
        },
        temp: {},
        exports: {},
        thumbnails: {}
      };

      await FileHelper.createUploadStructure(this.baseUploadPath, structure);
      logger.info('Upload directory structure initialized', { 
        baseUploadPath: this.baseUploadPath 
      });

    } catch (error) {
      logger.error('Failed to initialize upload directories', { 
        error: error.message 
      });
      throw new Error('Impossible d\'initialiser les dossiers de stockage');
    }
  }

  /**
   * Stocker un fichier uploadé
   * @param {Object} file - Fichier Multer
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options de stockage
   * @returns {Promise<Object>} Informations du fichier stocké
   */
  async storeFile(file, entityId, options = {}) {
    try {
      if (!file) {
        throw new ValidationError('Aucun fichier fourni');
      }

      if (!entityId) {
        throw new ValidationError('ID de l\'entité requis');
      }

      // Valider le fichier
      const validation = await this.validateFile(file);
      if (!validation.valid) {
        throw new FileUploadError('Fichier invalide', { errors: validation.errors });
      }

      const fileType = getFileType(file.mimetype);
      const secureFilename = file.filename || generateSecureFilename(file.originalname);
      const destinationPath = getDestinationPath(entityId, fileType);
      const finalPath = path.join(destinationPath, secureFilename);

      // Déplacer le fichier temporaire vers sa destination finale si nécessaire
      if (file.path !== finalPath) {
        const moved = await FileHelper.moveFile(file.path, finalPath);
        if (!moved) {
          throw new FileUploadError('Impossible de déplacer le fichier vers sa destination');
        }
      }

      // Générer les métadonnées
      const metadata = await this.generateFileMetadata(finalPath, file, entityId, options);

      // Créer le fichier de métadonnées
      await FileHelper.createMetadataFile(finalPath, metadata);

      // Générer une miniature si c'est une image
      if (fileType === 'image') {
        await this.generateThumbnail(finalPath, entityId);
      }

      logger.success('File stored successfully', {
        entityId,
        filename: secureFilename,
        fileType,
        size: file.size,
        path: finalPath
      });

      return {
        filename: secureFilename,
        originalName: file.originalname,
        path: finalPath,
        relativePath: path.relative(this.baseUploadPath, finalPath),
        size: file.size,
        mimeType: file.mimetype,
        fileType: fileType,
        metadata: metadata
      };

    } catch (error) {
      // Nettoyer le fichier temporaire en cas d'erreur
      if (file && file.path && await FileHelper.exists(file.path)) {
        await FileHelper.deleteFile(file.path);
      }

      logger.error('Error storing file', {
        entityId,
        filename: file?.originalname,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Récupérer un fichier stocké
   * @param {string} filePath - Chemin du fichier
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Informations du fichier
   */
  async retrieveFile(filePath, options = {}) {
    try {
      const { includeMetadata = false, verifyIntegrity = false } = options;

      if (!await FileHelper.exists(filePath)) {
        throw new ValidationError('Fichier non trouvé');
      }

      const fileInfo = await FileHelper.getFileInfo(filePath);
      if (!fileInfo) {
        throw new ValidationError('Impossible de lire les informations du fichier');
      }

      const result = {
        ...fileInfo,
        relativePath: path.relative(this.baseUploadPath, filePath),
        fileType: getFileType(fileInfo.mimeType)
      };

      // Inclure les métadonnées si demandé
      if (includeMetadata) {
        const metadata = await FileHelper.readMetadataFile(filePath);
        result.metadata = metadata;

        // Vérifier l'intégrité si demandé et si on a un hash
        if (verifyIntegrity && metadata && metadata.hash) {
          result.integrityValid = await FileHelper.verifyFileIntegrity(
            filePath, 
            metadata.hash
          );
        }
      }

      return result;

    } catch (error) {
      logger.error('Error retrieving file', {
        filePath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Supprimer un fichier stocké
   * @param {string} filePath - Chemin du fichier
   * @param {Object} options - Options de suppression
   * @returns {Promise<boolean>} True si supprimé avec succès
   */
  async deleteFile(filePath, options = {}) {
    try {
      const { deleteThumbnail = true, deleteMetadata = true } = options;

      if (!await FileHelper.exists(filePath)) {
        logger.warn('File does not exist for deletion', { filePath });
        return false;
      }

      // Supprimer la miniature si elle existe
      if (deleteThumbnail) {
        const thumbnailPath = this.getThumbnailPath(filePath);
        if (await FileHelper.exists(thumbnailPath)) {
          await FileHelper.deleteFile(thumbnailPath);
        }
      }

      // Supprimer le fichier de métadonnées
      if (deleteMetadata) {
        const metadataPath = filePath + '.meta.json';
        if (await FileHelper.exists(metadataPath)) {
          await FileHelper.deleteFile(metadataPath);
        }
      }

      // Supprimer le fichier principal
      const deleted = await FileHelper.deleteFile(filePath);

      if (deleted) {
        logger.success('File deleted successfully', { filePath });
      }

      return deleted;

    } catch (error) {
      logger.error('Error deleting file', {
        filePath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Déplacer un fichier vers un nouvel emplacement
   * @param {string} sourcePath - Chemin source
   * @param {number} newEntityId - Nouvel ID d'entité
   * @returns {Promise<string>} Nouveau chemin du fichier
   */
  async moveFile(sourcePath, newEntityId) {
    try {
      if (!await FileHelper.exists(sourcePath)) {
        throw new ValidationError('Fichier source non trouvé');
      }

      const fileInfo = await FileHelper.getFileInfo(sourcePath);
      const fileType = getFileType(fileInfo.mimeType);
      const newDestinationPath = getDestinationPath(newEntityId, fileType);
      const newFilePath = path.join(newDestinationPath, fileInfo.name);

      // Déplacer le fichier principal
      const moved = await FileHelper.moveFile(sourcePath, newFilePath);
      if (!moved) {
        throw new FileUploadError('Impossible de déplacer le fichier');
      }

      // Déplacer les métadonnées
      const oldMetadataPath = sourcePath + '.meta.json';
      const newMetadataPath = newFilePath + '.meta.json';
      if (await FileHelper.exists(oldMetadataPath)) {
        await FileHelper.moveFile(oldMetadataPath, newMetadataPath);
      }

      // Déplacer la miniature si elle existe
      const oldThumbnailPath = this.getThumbnailPath(sourcePath);
      const newThumbnailPath = this.getThumbnailPath(newFilePath);
      if (await FileHelper.exists(oldThumbnailPath)) {
        await FileHelper.moveFile(oldThumbnailPath, newThumbnailPath);
      }

      logger.success('File moved successfully', {
        from: sourcePath,
        to: newFilePath,
        newEntityId
      });

      return newFilePath;

    } catch (error) {
      logger.error('Error moving file', {
        sourcePath,
        newEntityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Copier un fichier
   * @param {string} sourcePath - Chemin source
   * @param {number} targetEntityId - ID de l'entité cible
   * @returns {Promise<string>} Chemin du fichier copié
   */
  async copyFile(sourcePath, targetEntityId) {
    try {
      if (!await FileHelper.exists(sourcePath)) {
        throw new ValidationError('Fichier source non trouvé');
      }

      const fileInfo = await FileHelper.getFileInfo(sourcePath);
      const fileType = getFileType(fileInfo.mimeType);
      const destinationPath = getDestinationPath(targetEntityId, fileType);
      
      // Générer un nom unique pour éviter les conflits
      const uniqueFilename = await FileHelper.generateUniqueFilename(
        fileInfo.name, 
        destinationPath
      );
      const newFilePath = path.join(destinationPath, uniqueFilename);

      // Copier le fichier principal
      const copied = await FileHelper.copyFile(sourcePath, newFilePath);
      if (!copied) {
        throw new FileUploadError('Impossible de copier le fichier');
      }

      // Copier les métadonnées en les mettant à jour
      const metadata = await FileHelper.readMetadataFile(sourcePath);
      if (metadata) {
        const newMetadata = {
          ...metadata,
          copiedFrom: sourcePath,
          copiedAt: new Date().toISOString(),
          entityId: targetEntityId
        };
        await FileHelper.createMetadataFile(newFilePath, newMetadata);
      }

      // Copier la miniature si elle existe
      const thumbnailPath = this.getThumbnailPath(sourcePath);
      if (await FileHelper.exists(thumbnailPath)) {
        const newThumbnailPath = this.getThumbnailPath(newFilePath);
        await FileHelper.copyFile(thumbnailPath, newThumbnailPath);
      }

      logger.success('File copied successfully', {
        from: sourcePath,
        to: newFilePath,
        targetEntityId
      });

      return newFilePath;

    } catch (error) {
      logger.error('Error copying file', {
        sourcePath,
        targetEntityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Nettoyer les fichiers d'une entité
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<number>} Nombre de fichiers supprimés
   */
  async cleanupEntityFiles(entityId) {
    try {
      const entityPath = path.join(this.baseUploadPath, 'entities', entityId.toString());
      
      if (!await FileHelper.exists(entityPath)) {
        return 0;
      }

      let deletedCount = 0;
      const fileTypes = ['image', 'document', 'video', 'audio', 'archive', 'other'];

      for (const fileType of fileTypes) {
        const typePath = path.join(entityPath, fileType);
        if (await FileHelper.exists(typePath)) {
          const files = await FileHelper.listDirectory(typePath, { filesOnly: true });
          
          for (const file of files) {
            const deleted = await this.deleteFile(file.path);
            if (deleted) {
              deletedCount++;
            }
          }

          // Supprimer le dossier s'il est vide
          try {
            await FileHelper.deleteDirectory(typePath);
          } catch (error) {
            // Ignorer si le dossier n'est pas vide
          }
        }
      }

      // Supprimer le dossier de l'entité s'il est vide
      try {
        await FileHelper.deleteDirectory(entityPath);
      } catch (error) {
        // Ignorer si le dossier n'est pas vide
      }

      logger.success('Entity files cleaned up', {
        entityId,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Error cleaning up entity files', {
        entityId,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Obtenir les statistiques de stockage
   * @param {number} entityId - ID de l'entité (optionnel)
   * @returns {Promise<Object>} Statistiques de stockage
   */
  async getStorageStatistics(entityId = null) {
    try {
      const basePath = entityId 
        ? path.join(this.baseUploadPath, 'entities', entityId.toString())
        : this.baseUploadPath;

      if (!await FileHelper.exists(basePath)) {
        return {
          totalFiles: 0,
          totalSize: 0,
          totalSizeFormatted: '0 B',
          fileTypes: {},
          entityId
        };
      }

      const stats = await FileHelper.getFileStatistics(basePath);

      return {
        ...stats,
        entityId,
        analysisDate: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting storage statistics', {
        entityId,
        error: error.message
      });
      return {
        totalFiles: 0,
        totalSize: 0,
        totalSizeFormatted: '0 B',
        fileTypes: {},
        entityId,
        error: error.message
      };
    }
  }

  /**
   * Nettoyer les fichiers temporaires
   * @param {number} maxAge - Âge maximum en millisecondes
   * @returns {Promise<number>} Nombre de fichiers supprimés
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const tempPath = path.join(this.baseUploadPath, 'temp');
      const deletedCount = await FileHelper.cleanupTempFiles(tempPath, maxAge);

      logger.info('Temp files cleanup completed', {
        deletedCount,
        maxAge
      });

      return deletedCount;

    } catch (error) {
      logger.error('Error cleaning up temp files', {
        error: error.message
      });
      return 0;
    }
  }

  // === MÉTHODES PRIVÉES ===

  /**
   * Valider un fichier avant stockage
   * @param {Object} file - Fichier à valider
   * @returns {Promise<Object>} Résultat de validation
   */
  async validateFile(file) {
    const errors = [];

    // Vérifier la taille
    if (file.size > this.maxFileSize) {
      errors.push(`Fichier trop volumineux (${FileHelper.formatFileSize(file.size)} > ${FileHelper.formatFileSize(this.maxFileSize)})`);
    }

    // Vérifier le type
    const fileType = getFileType(file.mimetype);
    if (!this.allowedTypes.includes(fileType)) {
      errors.push(`Type de fichier non autorisé: ${fileType}`);
    }

    // Vérifier l'existence du fichier temporaire
    if (file.path && !await FileHelper.exists(file.path)) {
      errors.push('Fichier temporaire non trouvé');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Générer les métadonnées d'un fichier
   * @param {string} filePath - Chemin du fichier
   * @param {Object} file - Objet fichier Multer
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} Métadonnées générées
   */
  async generateFileMetadata(filePath, file, entityId, options = {}) {
    try {
      const fileInfo = await FileHelper.getFileInfo(filePath);
      const hash = await FileHelper.generateFileHash(filePath);

      return {
        entityId,
        uploadedBy: options.userId || null,
        uploadedAt: new Date().toISOString(),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        hash: hash,
        fileType: getFileType(file.mimetype),
        ...fileInfo,
        ...options.customMetadata
      };

    } catch (error) {
      logger.error('Error generating file metadata', {
        filePath,
        error: error.message
      });
      return {};
    }
  }

  /**
   * Générer une miniature pour une image
   * @param {string} imagePath - Chemin de l'image
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<string|null>} Chemin de la miniature ou null
   */
  async generateThumbnail(imagePath, entityId) {
    try {
      // Cette fonctionnalité nécessiterait une librairie comme Sharp ou Jimp
      // Pour l'instant, on retourne null (à implémenter plus tard)
      const thumbnailPath = this.getThumbnailPath(imagePath);
      
      // TODO: Implémenter la génération de miniatures avec Sharp
      // const sharp = require('sharp');
      // await sharp(imagePath)
      //   .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      //   .jpeg({ quality: 80 })
      //   .toFile(thumbnailPath);

      logger.info('Thumbnail generation skipped (not implemented)', {
        imagePath,
        thumbnailPath
      });

      return null;

    } catch (error) {
      logger.error('Error generating thumbnail', {
        imagePath,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Obtenir le chemin de la miniature d'un fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {string} Chemin de la miniature
   */
  getThumbnailPath(filePath) {
    const fileInfo = path.parse(filePath);
    const thumbnailDir = path.join(this.baseUploadPath, 'thumbnails');
    return path.join(thumbnailDir, `${fileInfo.name}_thumb.jpg`);
  }

  /**
   * Vérifier l'intégrité de tous les fichiers d'une entité
   * @param {number} entityId - ID de l'entité
   * @returns {Promise<Object>} Rapport d'intégrité
   */
  async verifyEntityFilesIntegrity(entityId) {
    try {
      const entityPath = path.join(this.baseUploadPath, 'entities', entityId.toString());
      
      if (!await FileHelper.exists(entityPath)) {
        return {
          entityId,
          totalFiles: 0,
          validFiles: 0,
          corruptedFiles: 0,
          missingFiles: 0,
          files: []
        };
      }

      const allFiles = [];
      const fileTypes = ['image', 'document', 'video', 'audio', 'archive', 'other'];

      // Collecter tous les fichiers
      for (const fileType of fileTypes) {
        const typePath = path.join(entityPath, fileType);
        if (await FileHelper.exists(typePath)) {
          const files = await FileHelper.listDirectory(typePath, { filesOnly: true });
          allFiles.push(...files);
        }
      }

      const report = {
        entityId,
        totalFiles: allFiles.length,
        validFiles: 0,
        corruptedFiles: 0,
        missingFiles: 0,
        files: []
      };

      // Vérifier chaque fichier
      for (const file of allFiles) {
        const fileReport = {
          path: file.path,
          name: file.name,
          exists: true,
          integrityValid: null,
          error: null
        };

        try {
          // Vérifier l'existence
          if (!await FileHelper.exists(file.path)) {
            fileReport.exists = false;
            report.missingFiles++;
          } else {
            // Vérifier l'intégrité avec les métadonnées
            const metadata = await FileHelper.readMetadataFile(file.path);
            
            if (metadata && metadata.hash) {
              const integrityValid = await FileHelper.verifyFileIntegrity(
                file.path, 
                metadata.hash
              );
              
              fileReport.integrityValid = integrityValid;
              
              if (integrityValid) {
                report.validFiles++;
              } else {
                report.corruptedFiles++;
              }
            } else {
              fileReport.error = 'Métadonnées manquantes';
              report.validFiles++; // Considérer comme valide si pas de hash
            }
          }
        } catch (error) {
          fileReport.error = error.message;
          report.corruptedFiles++;
        }

        report.files.push(fileReport);
      }

      logger.info('Entity files integrity check completed', {
        entityId,
        totalFiles: report.totalFiles,
        validFiles: report.validFiles,
        corruptedFiles: report.corruptedFiles,
        missingFiles: report.missingFiles
      });

      return report;

    } catch (error) {
      logger.error('Error verifying entity files integrity', {
        entityId,
        error: error.message
      });
      
      return {
        entityId,
        totalFiles: 0,
        validFiles: 0,
        corruptedFiles: 0,
        missingFiles: 0,
        files: [],
        error: error.message
      };
    }
  }

  /**
   * Créer une sauvegarde des fichiers d'une entité
   * @param {number} entityId - ID de l'entité
   * @param {string} backupPath - Chemin de sauvegarde
   * @returns {Promise<boolean>} True si sauvegarde réussie
   */
  async backupEntityFiles(entityId, backupPath) {
    try {
      const entityPath = path.join(this.baseUploadPath, 'entities', entityId.toString());
      
      if (!await FileHelper.exists(entityPath)) {
        logger.warn('No files to backup for entity', { entityId });
        return true;
      }

      // Créer le dossier de sauvegarde
      await FileHelper.createDirectory(backupPath);

      // Copier tous les fichiers récursivement
      const copyDirectory = async (source, destination) => {
        const items = await FileHelper.listDirectory(source, { withStats: true });
        
        for (const item of items) {
          const destPath = path.join(destination, item.name);
          
          if (item.isDirectory) {
            await FileHelper.createDirectory(destPath);
            await copyDirectory(item.path, destPath);
          } else {
            await FileHelper.copyFile(item.path, destPath);
          }
        }
      };

      await copyDirectory(entityPath, backupPath);

      // Créer un fichier de métadonnées de sauvegarde
      const backupMetadata = {
        entityId,
        backupDate: new Date().toISOString(),
        originalPath: entityPath,
        backupPath: backupPath
      };

      await fs.promises.writeFile(
        path.join(backupPath, 'backup-metadata.json'),
        JSON.stringify(backupMetadata, null, 2),
        'utf8'
      );

      logger.success('Entity files backup completed', {
        entityId,
        backupPath
      });

      return true;

    } catch (error) {
      logger.error('Error backing up entity files', {
        entityId,
        backupPath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Restaurer les fichiers d'une entité depuis une sauvegarde
   * @param {number} entityId - ID de l'entité
   * @param {string} backupPath - Chemin de la sauvegarde
   * @returns {Promise<boolean>} True si restauration réussie
   */
  async restoreEntityFiles(entityId, backupPath) {
    try {
      if (!await FileHelper.exists(backupPath)) {
        throw new ValidationError('Sauvegarde non trouvée');
      }

      // Vérifier les métadonnées de sauvegarde
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      if (await FileHelper.exists(metadataPath)) {
        const metadata = JSON.parse(
          await fs.promises.readFile(metadataPath, 'utf8')
        );
        
        if (metadata.entityId !== entityId) {
          logger.warn('Backup entity ID mismatch', {
            expectedEntityId: entityId,
            backupEntityId: metadata.entityId
          });
        }
      }

      // Nettoyer les fichiers existants
      await this.cleanupEntityFiles(entityId);

      const entityPath = path.join(this.baseUploadPath, 'entities', entityId.toString());

      // Restaurer les fichiers
      const restoreDirectory = async (source, destination) => {
        const items = await FileHelper.listDirectory(source, { withStats: true });
        
        for (const item of items) {
          // Ignorer le fichier de métadonnées de sauvegarde
          if (item.name === 'backup-metadata.json') {
            continue;
          }

          const destPath = path.join(destination, item.name);
          
          if (item.isDirectory) {
            await FileHelper.createDirectory(destPath);
            await restoreDirectory(item.path, destPath);
          } else {
            await FileHelper.copyFile(item.path, destPath);
          }
        }
      };

      await restoreDirectory(backupPath, entityPath);

      logger.success('Entity files restoration completed', {
        entityId,
        backupPath,
        entityPath
      });

      return true;

    } catch (error) {
      logger.error('Error restoring entity files', {
        entityId,
        backupPath,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Obtenir l'URL publique d'un fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {string} URL publique
   */
  getPublicUrl(filePath) {
    const relativePath = path.relative(this.baseUploadPath, filePath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  /**
   * Vérifier les quotas de stockage
   * @param {number} entityId - ID de l'entité
   * @param {number} additionalSize - Taille supplémentaire à ajouter
   * @returns {Promise<Object>} Informations sur les quotas
   */
  async checkStorageQuota(entityId, additionalSize = 0) {
    try {
      const stats = await this.getStorageStatistics(entityId);
      const currentSize = stats.totalSize || 0;
      const projectedSize = currentSize + additionalSize;
      
      // Quotas par défaut (configurables)
      const quotas = {
        maxEntitySize: 1024 * 1024 * 1024, // 1GB par entité
        maxTotalSize: 10 * 1024 * 1024 * 1024, // 10GB total
        maxFiles: 1000 // 1000 fichiers par entité
      };

      const globalStats = await this.getStorageStatistics();
      const projectedTotalSize = (globalStats.totalSize || 0) + additionalSize;

      return {
        entityId,
        currentSize,
        currentSizeFormatted: FileHelper.formatFileSize(currentSize),
        projectedSize,
        projectedSizeFormatted: FileHelper.formatFileSize(projectedSize),
        additionalSize,
        additionalSizeFormatted: FileHelper.formatFileSize(additionalSize),
        quotas,
        withinEntityQuota: projectedSize <= quotas.maxEntitySize,
        withinTotalQuota: projectedTotalSize <= quotas.maxTotalSize,
        withinFileCountQuota: (stats.totalFiles || 0) < quotas.maxFiles,
        canUpload: projectedSize <= quotas.maxEntitySize && 
                  projectedTotalSize <= quotas.maxTotalSize &&
                  (stats.totalFiles || 0) < quotas.maxFiles
      };

    } catch (error) {
      logger.error('Error checking storage quota', {
        entityId,
        additionalSize,
        error: error.message
      });

      return {
        entityId,
        currentSize: 0,
        projectedSize: additionalSize,
        additionalSize,
        canUpload: false,
        error: error.message
      };
    }
  }
}

// Instance singleton par défaut
let defaultStorageService = null;

/**
 * Obtenir l'instance par défaut du service de stockage
 * @returns {MediaStorageService} Instance du service
 */
function getDefaultStorageService() {
  if (!defaultStorageService) {
    defaultStorageService = new MediaStorageService();
  }
  return defaultStorageService;
}

module.exports = {
  MediaStorageService,
  getDefaultStorageService
};