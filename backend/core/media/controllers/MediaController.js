// backend/core/media/controllers/MediaController.js - Contrôleur Media pour LUCIDE

const MediaModel = require('../models/MediaModel');
const { getDefaultStorageService } = require('../services/MediaStorageService');
const { logger } = require('../../../shared/middleware/logging');
const { asyncHandler, ValidationError, NotFoundError } = require('../../../shared/middleware/errorHandler');
const path = require('path');
const fs = require('fs');

/**
 * Contrôleur pour la gestion des fichiers/médias
 * Gère les requêtes HTTP pour les opérations CRUD sur les fichiers
 */
class MediaController {

  /**
   * Uploader un ou plusieurs fichiers pour une entité
   * POST /api/media/upload/:entityId
   */
  static uploadFiles = asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const files = req.files || [];

    logger.info('File upload request received', {
      entityId,
      fileCount: files.length,
      userAgent: req.get('User-Agent')
    });

    if (!files || files.length === 0) {
      throw new ValidationError('Aucun fichier fourni');
    }

    if (!entityId || isNaN(parseInt(entityId))) {
      throw new ValidationError('ID de l\'entité invalide');
    }

    const storageService = getDefaultStorageService();
    const uploadedFiles = [];
    const errors = [];

    // Vérifier les quotas avant upload
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const quotaCheck = await storageService.checkStorageQuota(entityId, totalSize);
    
    if (!quotaCheck.canUpload) {
      throw new ValidationError('Quota de stockage dépassé', {
        quotaInfo: quotaCheck
      });
    }

    // Traiter chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Stocker le fichier
        const storedFile = await storageService.storeFile(file, entityId, {
          userId: req.user?.id || null,
          uploadSession: req.sessionID,
          userAgent: req.get('User-Agent'),
          uploadIndex: i
        });

        // Enregistrer en base de données
        const mediaRecord = await MediaModel.create({
          entity_id: parseInt(entityId),
          filename: storedFile.filename,
          original_name: storedFile.originalName,
          path: storedFile.path,
          size: storedFile.size,
          mime_type: storedFile.mimeType
        });

        uploadedFiles.push({
          id: mediaRecord.id,
          filename: mediaRecord.filename,
          original_name: mediaRecord.original_name,
          size: mediaRecord.size,
          size_formatted: MediaModel.formatFileSize(mediaRecord.size),
          mime_type: mediaRecord.mime_type,
          file_type: MediaModel.getFileTypeFromMime(mediaRecord.mime_type),
          url: storageService.getPublicUrl(mediaRecord.path),
          created_at: mediaRecord.created_at
        });

      } catch (error) {
        logger.error('Error uploading individual file', {
          filename: file.originalname,
          entityId,
          error: error.message
        });

        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    const response = {
      success: uploadedFiles.length > 0,
      uploaded_count: uploadedFiles.length,
      error_count: errors.length,
      files: uploadedFiles
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    logger.success('File upload completed', {
      entityId,
      uploadedCount: uploadedFiles.length,
      errorCount: errors.length
    });

    res.status(201).json(response);
  });

  /**
   * Récupérer tous les fichiers d'une entité
   * GET /api/media/entity/:entityId
   */
  static getEntityFiles = asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const { 
      orderBy = 'created_at',
      direction = 'DESC',
      mimeType = null,
      search = null 
    } = req.query;

    if (!entityId || isNaN(parseInt(entityId))) {
      throw new ValidationError('ID de l\'entité invalide');
    }

    logger.info('Get entity files request', {
      entityId,
      orderBy,
      direction,
      mimeType
    });

    const options = {
      orderBy,
      direction,
      mimeType
    };

    let files;
    
    if (search) {
      // Utiliser la recherche si un terme est fourni
      files = await MediaModel.search(0, search, { 
        ...options,
        entityId: parseInt(entityId)
      });
    } else {
      // Récupération normale
      files = await MediaModel.getByEntity(parseInt(entityId), options);
    }

    const storageService = getDefaultStorageService();

    // Enrichir les résultats avec les URLs
    const enrichedFiles = files.map(file => ({
      ...file,
      url: storageService.getPublicUrl(file.path),
      download_url: `/api/media/download/${file.id}`,
      thumbnail_url: file.file_type === 'image' 
        ? `/api/media/thumbnail/${file.id}` 
        : null
    }));

    // Obtenir les statistiques
    const stats = await MediaModel.getStatisticsByEntity(parseInt(entityId));

    logger.success('Entity files retrieved', {
      entityId,
      fileCount: enrichedFiles.length
    });

    res.json({
      entity_id: parseInt(entityId),
      files: enrichedFiles,
      total_count: enrichedFiles.length,
      statistics: stats
    });
  });

  /**
   * Récupérer un fichier par son ID
   * GET /api/media/:id
   */
  static getFile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    logger.info('Get file request', { fileId: id });

    const file = await MediaModel.findById(parseInt(id));
    
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    const storageService = getDefaultStorageService();

    const enrichedFile = {
      ...file,
      url: storageService.getPublicUrl(file.path),
      download_url: `/api/media/download/${file.id}`,
      thumbnail_url: file.file_type === 'image' 
        ? `/api/media/thumbnail/${file.id}` 
        : null
    };

    res.json(enrichedFile);
  });

  /**
   * Télécharger un fichier
   * GET /api/media/download/:id
   */
  static downloadFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { inline = false } = req.query;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    logger.info('Download file request', { fileId: id, inline });

    const file = await MediaModel.findById(parseInt(id));
    
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    if (!file.file_exists) {
      logger.error('File exists in database but not on disk', {
        fileId: id,
        path: file.path
      });
      throw new NotFoundError('Fichier physique');
    }

    // Définir les headers
    const disposition = inline === 'true' ? 'inline' : 'attachment';
    
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 heure
    
    // Log du téléchargement
    logger.info('File download started', {
      fileId: id,
      filename: file.original_name,
      size: file.size,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Streamer le fichier
    const fileStream = fs.createReadStream(file.path);
    
    fileStream.on('error', (error) => {
      logger.error('Error streaming file', {
        fileId: id,
        error: error.message
      });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors de la lecture du fichier' });
      }
    });

    fileStream.on('end', () => {
      logger.success('File download completed', {
        fileId: id,
        filename: file.original_name
      });
    });

    fileStream.pipe(res);
  });

  /**
   * Obtenir la miniature d'une image
   * GET /api/media/thumbnail/:id
   */
  static getThumbnail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    const file = await MediaModel.findById(parseInt(id));
    
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    if (file.file_type !== 'image') {
      throw new ValidationError('Ce fichier n\'est pas une image');
    }

    const storageService = getDefaultStorageService();
    const thumbnailPath = storageService.getThumbnailPath(file.path);

    // Si la miniature n'existe pas, retourner l'image originale redimensionnée
    // ou une miniature par défaut
    if (!fs.existsSync(thumbnailPath)) {
      logger.info('Thumbnail not found, serving original image', {
        fileId: id,
        thumbnailPath
      });
      
      // Pour l'instant, rediriger vers l'image originale
      return res.redirect(`/api/media/download/${id}?inline=true`);
    }

    // Servir la miniature
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
    
    const thumbnailStream = fs.createReadStream(thumbnailPath);
    thumbnailStream.pipe(res);
  });

  /**
   * Mettre à jour les métadonnées d'un fichier
   * PUT /api/media/:id
   */
  static updateFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { original_name } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    logger.info('Update file request', { fileId: id, updateData: req.body });

    const updateData = {};
    if (original_name !== undefined) {
      updateData.original_name = original_name;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    const updatedFile = await MediaModel.update(parseInt(id), updateData);
    
    const storageService = getDefaultStorageService();
    const enrichedFile = {
      ...updatedFile,
      url: storageService.getPublicUrl(updatedFile.path),
      download_url: `/api/media/download/${updatedFile.id}`,
      thumbnail_url: updatedFile.file_type === 'image' 
        ? `/api/media/thumbnail/${updatedFile.id}` 
        : null
    };

    logger.success('File updated successfully', { fileId: id });

    res.json(enrichedFile);
  });

  /**
   * Supprimer un fichier
   * DELETE /api/media/:id
   */
  static deleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    logger.info('Delete file request', { fileId: id });

    // Récupérer les informations du fichier avant suppression
    const file = await MediaModel.findById(parseInt(id));
    
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    // Supprimer de la base de données et du disque
    const deleted = await MediaModel.delete(parseInt(id), true);

    if (!deleted) {
      throw new Error('Échec de la suppression du fichier');
    }

    logger.success('File deleted successfully', {
      fileId: id,
      filename: file.original_name
    });

    res.json({
      success: true,
      message: 'Fichier supprimé avec succès',
      deleted_file: {
        id: file.id,
        filename: file.original_name
      }
    });
  });

  /**
   * Rechercher des fichiers
   * GET /api/media/search
   */
  static searchFiles = asyncHandler(async (req, res) => {
    const { 
      q: searchTerm,
      folder_id = 0,
      mime_type = null,
      min_size = null,
      max_size = null,
      limit = 50
    } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
      throw new ValidationError('Terme de recherche requis');
    }

    logger.info('Search files request', {
      searchTerm,
      folderId: folder_id,
      mimeType: mime_type,
      limit
    });

    const options = {
      limit: parseInt(limit),
      mimeType: mime_type,
      minSize: min_size ? parseInt(min_size) : null,
      maxSize: max_size ? parseInt(max_size) : null
    };

    const files = await MediaModel.search(
      parseInt(folder_id),
      searchTerm.trim(),
      options
    );

    const storageService = getDefaultStorageService();

    // Enrichir les résultats
    const enrichedFiles = files.map(file => ({
      ...file,
      url: storageService.getPublicUrl(file.path),
      download_url: `/api/media/download/${file.id}`,
      thumbnail_url: file.file_type === 'image' 
        ? `/api/media/thumbnail/${file.id}` 
        : null
    }));

    logger.success('File search completed', {
      searchTerm,
      resultCount: enrichedFiles.length
    });

    res.json({
      search_term: searchTerm,
      folder_id: parseInt(folder_id),
      results: enrichedFiles,
      total_count: enrichedFiles.length,
      search_options: options
    });
  });

  /**
   * Obtenir les statistiques de stockage
   * GET /api/media/statistics
   */
  static getStorageStatistics = asyncHandler(async (req, res) => {
    const { entity_id = null } = req.query;

    logger.info('Get storage statistics request', { entityId: entity_id });

    const storageService = getDefaultStorageService();
    const stats = await storageService.getStorageStatistics(
      entity_id ? parseInt(entity_id) : null
    );

    // Ajouter les quotas
    if (entity_id) {
      const quotaInfo = await storageService.checkStorageQuota(parseInt(entity_id));
      stats.quota_info = quotaInfo;
    }

    res.json(stats);
  });

  /**
   * Nettoyer les fichiers orphelins
   * POST /api/media/cleanup/orphaned
   */
  static cleanupOrphanedFiles = asyncHandler(async (req, res) => {
    logger.info('Cleanup orphaned files request');

    const cleanedCount = await MediaModel.cleanupOrphanedFiles();

    logger.success('Orphaned files cleanup completed', { cleanedCount });

    res.json({
      success: true,
      message: 'Nettoyage des fichiers orphelins terminé',
      cleaned_count: cleanedCount
    });
  });

/**
   * Nettoyer les fichiers temporaires
   * POST /api/media/cleanup/temp
   */
  static cleanupTempFiles = asyncHandler(async (req, res) => {
    const { max_age_hours = 24 } = req.body;

    logger.info('Cleanup temp files request', { maxAgeHours: max_age_hours });

    const storageService = getDefaultStorageService();
    const maxAge = parseInt(max_age_hours) * 60 * 60 * 1000; // Convertir en millisecondes
    const cleanedCount = await storageService.cleanupTempFiles(maxAge);

    logger.success('Temp files cleanup completed', { cleanedCount });

    res.json({
      success: true,
      message: 'Nettoyage des fichiers temporaires terminé',
      cleaned_count: cleanedCount,
      max_age_hours: parseInt(max_age_hours)
    });
  });

  /**
   * Vérifier l'intégrité des fichiers d'une entité
   * POST /api/media/verify/:entityId
   */
  static verifyEntityFiles = asyncHandler(async (req, res) => {
    const { entityId } = req.params;

    if (!entityId || isNaN(parseInt(entityId))) {
      throw new ValidationError('ID de l\'entité invalide');
    }

    logger.info('Verify entity files request', { entityId });

    const storageService = getDefaultStorageService();
    const integrityReport = await storageService.verifyEntityFilesIntegrity(parseInt(entityId));

    logger.success('Entity files verification completed', {
      entityId,
      totalFiles: integrityReport.totalFiles,
      validFiles: integrityReport.validFiles,
      corruptedFiles: integrityReport.corruptedFiles
    });

    res.json(integrityReport);
  });

  /**
   * Dupliquer un fichier vers une autre entité
   * POST /api/media/:id/duplicate
   */
  static duplicateFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { target_entity_id } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    if (!target_entity_id || isNaN(parseInt(target_entity_id))) {
      throw new ValidationError('ID de l\'entité cible invalide');
    }

    logger.info('Duplicate file request', {
      fileId: id,
      targetEntityId: target_entity_id
    });

    // Récupérer le fichier source
    const sourceFile = await MediaModel.findById(parseInt(id));
    if (!sourceFile) {
      throw new NotFoundError('Fichier', id);
    }

    const storageService = getDefaultStorageService();

    // Vérifier les quotas de l'entité cible
    const quotaCheck = await storageService.checkStorageQuota(
      parseInt(target_entity_id),
      sourceFile.size
    );

    if (!quotaCheck.canUpload) {
      throw new ValidationError('Quota de stockage dépassé pour l\'entité cible', {
        quotaInfo: quotaCheck
      });
    }

    // Copier le fichier physique
    const newFilePath = await storageService.copyFile(
      sourceFile.path,
      parseInt(target_entity_id)
    );

    // Créer l'enregistrement en base de données
    const duplicatedFile = await MediaModel.create({
      entity_id: parseInt(target_entity_id),
      filename: path.basename(newFilePath),
      original_name: `Copy of ${sourceFile.original_name}`,
      path: newFilePath,
      size: sourceFile.size,
      mime_type: sourceFile.mime_type
    });

    const enrichedFile = {
      ...duplicatedFile,
      url: storageService.getPublicUrl(duplicatedFile.path),
      download_url: `/api/media/download/${duplicatedFile.id}`,
      thumbnail_url: duplicatedFile.file_type === 'image' 
        ? `/api/media/thumbnail/${duplicatedFile.id}` 
        : null
    };

    logger.success('File duplicated successfully', {
      sourceFileId: id,
      duplicatedFileId: duplicatedFile.id,
      targetEntityId: target_entity_id
    });

    res.status(201).json({
      success: true,
      message: 'Fichier dupliqué avec succès',
      duplicated_file: enrichedFile,
      source_file_id: parseInt(id)
    });
  });

  /**
   * Déplacer un fichier vers une autre entité
   * POST /api/media/:id/move
   */
  static moveFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { target_entity_id } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    if (!target_entity_id || isNaN(parseInt(target_entity_id))) {
      throw new ValidationError('ID de l\'entité cible invalide');
    }

    logger.info('Move file request', {
      fileId: id,
      targetEntityId: target_entity_id
    });

    // Récupérer le fichier
    const file = await MediaModel.findById(parseInt(id));
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    const storageService = getDefaultStorageService();

    // Déplacer le fichier physique
    const newFilePath = await storageService.moveFile(
      file.path,
      parseInt(target_entity_id)
    );

    // Mettre à jour l'enregistrement en base de données
    const updatedFile = await MediaModel.update(parseInt(id), {
      entity_id: parseInt(target_entity_id),
      path: newFilePath
    });

    const enrichedFile = {
      ...updatedFile,
      url: storageService.getPublicUrl(updatedFile.path),
      download_url: `/api/media/download/${updatedFile.id}`,
      thumbnail_url: updatedFile.file_type === 'image' 
        ? `/api/media/thumbnail/${updatedFile.id}` 
        : null
    };

    logger.success('File moved successfully', {
      fileId: id,
      oldEntityId: file.entity_id,
      newEntityId: target_entity_id
    });

    res.json({
      success: true,
      message: 'Fichier déplacé avec succès',
      moved_file: enrichedFile,
      old_entity_id: file.entity_id,
      new_entity_id: parseInt(target_entity_id)
    });
  });

  /**
   * Obtenir les informations d'un fichier sans le télécharger
   * HEAD /api/media/download/:id
   */
  static getFileInfo = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    const file = await MediaModel.findById(parseInt(id));
    
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    if (!file.file_exists) {
      return res.status(404).end();
    }

    // Définir les headers sans envoyer le contenu
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Last-Modified', new Date(file.created_at).toUTCString());
    
    res.status(200).end();
  });

  /**
   * Batch operations sur plusieurs fichiers
   * POST /api/media/batch
   */
  static batchOperations = asyncHandler(async (req, res) => {
    const { operation, file_ids, ...operationParams } = req.body;

    if (!operation || typeof operation !== 'string') {
      throw new ValidationError('Opération requise');
    }

    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      throw new ValidationError('Liste des IDs de fichiers requise');
    }

    logger.info('Batch operation request', {
      operation,
      fileCount: file_ids.length,
      operationParams
    });

    const results = [];
    const errors = [];

    for (const fileId of file_ids) {
      try {
        let result = null;

        switch (operation) {
          case 'delete':
            result = await MediaModel.delete(parseInt(fileId), true);
            break;

          case 'move':
            if (!operationParams.target_entity_id) {
              throw new ValidationError('target_entity_id requis pour l\'opération move');
            }
            
            const file = await MediaModel.findById(parseInt(fileId));
            if (file) {
              const storageService = getDefaultStorageService();
              const newPath = await storageService.moveFile(
                file.path,
                parseInt(operationParams.target_entity_id)
              );
              
              result = await MediaModel.update(parseInt(fileId), {
                entity_id: parseInt(operationParams.target_entity_id),
                path: newPath
              });
            }
            break;

          case 'duplicate':
            if (!operationParams.target_entity_id) {
              throw new ValidationError('target_entity_id requis pour l\'opération duplicate');
            }
            
            const sourceFile = await MediaModel.findById(parseInt(fileId));
            if (sourceFile) {
              const storageService = getDefaultStorageService();
              const copiedPath = await storageService.copyFile(
                sourceFile.path,
                parseInt(operationParams.target_entity_id)
              );
              
              result = await MediaModel.create({
                entity_id: parseInt(operationParams.target_entity_id),
                filename: path.basename(copiedPath),
                original_name: `Copy of ${sourceFile.original_name}`,
                path: copiedPath,
                size: sourceFile.size,
                mime_type: sourceFile.mime_type
              });
            }
            break;

          default:
            throw new ValidationError(`Opération non supportée: ${operation}`);
        }

        results.push({
          file_id: parseInt(fileId),
          success: true,
          result: result
        });

      } catch (error) {
        errors.push({
          file_id: parseInt(fileId),
          success: false,
          error: error.message
        });
      }
    }

    logger.success('Batch operation completed', {
      operation,
      successCount: results.length,
      errorCount: errors.length
    });

    res.json({
      operation,
      total_files: file_ids.length,
      success_count: results.length,
      error_count: errors.length,
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });
  });

  /**
   * Obtenir l'historique des modifications d'un fichier
   * GET /api/media/:id/history
   */
  static getFileHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    const file = await MediaModel.findById(parseInt(id));
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    // Pour l'instant, retourner un historique basique
    // Dans une implémentation complète, on aurait une table d'audit
    const history = [
      {
        action: 'created',
        timestamp: file.created_at,
        details: {
          original_name: file.original_name,
          size: file.size,
          mime_type: file.mime_type
        }
      }
    ];

    // Si le fichier a été modifié, ajouter l'entrée
    if (file.updated_at && file.updated_at !== file.created_at) {
      history.push({
        action: 'modified',
        timestamp: file.updated_at,
        details: {
          // Ici on pourrait stocker les changements spécifiques
        }
      });
    }

    res.json({
      file_id: parseInt(id),
      filename: file.original_name,
      history: history
    });
  });

  /**
   * Obtenir les métadonnées étendues d'un fichier
   * GET /api/media/:id/metadata
   */
  static getFileMetadata = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    const file = await MediaModel.findById(parseInt(id));
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    const storageService = getDefaultStorageService();
    
    // Récupérer les métadonnées détaillées
    const detailedInfo = await storageService.retrieveFile(file.path, {
      includeMetadata: true,
      verifyIntegrity: true
    });

    res.json({
      file_id: parseInt(id),
      basic_info: file,
      detailed_info: detailedInfo,
      public_urls: {
        download: `/api/media/download/${id}`,
        thumbnail: file.file_type === 'image' ? `/api/media/thumbnail/${id}` : null,
        preview: `/api/media/download/${id}?inline=true`
      }
    });
  });

  /**
   * Régénérer la miniature d'une image
   * POST /api/media/:id/regenerate-thumbnail
   */
  static regenerateThumbnail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('ID du fichier invalide');
    }

    const file = await MediaModel.findById(parseInt(id));
    if (!file) {
      throw new NotFoundError('Fichier', id);
    }

    if (file.file_type !== 'image') {
      throw new ValidationError('Ce fichier n\'est pas une image');
    }

    const storageService = getDefaultStorageService();
    
    // Régénérer la miniature
    const thumbnailPath = await storageService.generateThumbnail(file.path, file.entity_id);

    logger.success('Thumbnail regenerated', {
      fileId: id,
      thumbnailPath
    });

    res.json({
      success: true,
      message: 'Miniature régénérée avec succès',
      thumbnail_url: `/api/media/thumbnail/${id}`,
      thumbnail_path: thumbnailPath
    });
  });
}

module.exports = MediaController;