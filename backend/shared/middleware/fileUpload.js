// backend/shared/middleware/fileUpload.js - Middleware pour l'upload de fichiers

const { ValidationError, FileUploadError } = require('./errorHandler');
const { logger } = require('./logging');
const EntityModel = require('../../core/entities/models/EntityModel');
const { getDefaultStorageService } = require('../../core/media/services/MediaStorageService');

/**
 * Middleware de validation avant upload de fichiers
 * Vérifie l'existence de l'entité et les quotas
 */
const validateUploadRequest = async (req, res, next) => {
  try {
    const { entityId } = req.params;

    // Vérifier que l'ID de l'entité est valide
    if (!entityId || isNaN(parseInt(entityId))) {
      throw new ValidationError('ID de l\'entité invalide');
    }

    // Vérifier que l'entité existe
    const entityExists = await EntityModel.exists(parseInt(entityId));
    if (!entityExists) {
      throw new ValidationError(`L'entité avec l'ID ${entityId} n'existe pas`);
    }

    // Stocker l'ID de l'entité dans la requête pour les étapes suivantes
    req.validatedEntityId = parseInt(entityId);

    logger.info('Upload request validated', {
      entityId: req.validatedEntityId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    next();

  } catch (error) {
    logger.error('Upload validation failed', {
      entityId: req.params.entityId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Middleware de vérification des quotas avant upload
 * Vérifie que l'upload ne dépassera pas les quotas de stockage
 */
const checkUploadQuotas = async (req, res, next) => {
  try {
    const entityId = req.validatedEntityId || parseInt(req.params.entityId);
    
    if (!entityId) {
      throw new ValidationError('ID de l\'entité non validé');
    }

    // Calculer la taille totale des fichiers à uploader
    let totalUploadSize = 0;
    
    if (req.files && Array.isArray(req.files)) {
      totalUploadSize = req.files.reduce((sum, file) => sum + file.size, 0);
    } else if (req.file) {
      totalUploadSize = req.file.size;
    }

    if (totalUploadSize === 0) {
      throw new ValidationError('Aucun fichier fourni ou fichiers vides');
    }

    // Vérifier les quotas
    const storageService = getDefaultStorageService();
    const quotaCheck = await storageService.checkStorageQuota(entityId, totalUploadSize);

    if (!quotaCheck.canUpload) {
      const reasons = [];
      
      if (!quotaCheck.withinEntityQuota) {
        reasons.push(`Quota de l'entité dépassé (${quotaCheck.projectedSizeFormatted} > ${storageService.formatFileSize(quotaCheck.quotas.maxEntitySize)})`);
      }
      
      if (!quotaCheck.withinTotalQuota) {
        reasons.push(`Quota total dépassé`);
      }
      
      if (!quotaCheck.withinFileCountQuota) {
        reasons.push(`Nombre maximum de fichiers atteint`);
      }

      throw new FileUploadError(
        `Upload refusé: ${reasons.join(', ')}`,
        { quotaInfo: quotaCheck }
      );
    }

    // Stocker les informations de quota pour utilisation ultérieure
    req.quotaInfo = quotaCheck;

    logger.info('Upload quotas validated', {
      entityId,
      totalUploadSize: storageService.formatFileSize(totalUploadSize),
      currentSize: quotaCheck.currentSizeFormatted,
      projectedSize: quotaCheck.projectedSizeFormatted
    });

    next();

  } catch (error) {
    logger.error('Upload quota check failed', {
      entityId: req.validatedEntityId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Middleware de validation des types de fichiers
 * Vérifie que tous les fichiers sont des types autorisés
 */
const validateFileTypes = (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      throw new ValidationError('Aucun fichier fourni');
    }

    const invalidFiles = [];
    
    for (const file of files) {
      // Les validations de type MIME sont déjà faites par Multer
      // Ici on peut ajouter des validations supplémentaires
      
      // Vérifier que le fichier a bien été uploadé
      if (!file.filename || !file.path) {
        invalidFiles.push({
          originalName: file.originalname,
          error: 'Échec de l\'upload du fichier'
        });
        continue;
      }

      // Vérifier la cohérence entre nom original et nom sécurisé
      if (!file.originalname || file.originalname.trim().length === 0) {
        invalidFiles.push({
          originalName: file.originalname,
          error: 'Nom de fichier original manquant'
        });
        continue;
      }

      // Vérifier que la taille est cohérente
      if (!file.size || file.size <= 0) {
        invalidFiles.push({
          originalName: file.originalname,
          error: 'Taille de fichier invalide'
        });
        continue;
      }
    }

    if (invalidFiles.length > 0) {
      throw new FileUploadError(
        'Certains fichiers sont invalides',
        { invalidFiles }
      );
    }

    logger.info('File types validated', {
      entityId: req.validatedEntityId,
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });

    next();

  } catch (error) {
    logger.error('File type validation failed', {
      entityId: req.validatedEntityId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Middleware de nettoyage en cas d'erreur
 * Supprime les fichiers temporaires si l'upload échoue
 */
const cleanupOnError = (error, req, res, next) => {
  // Ce middleware ne s'exécute que s'il y a une erreur
  if (error) {
    const files = req.files || (req.file ? [req.file] : []);
    
    // Nettoyer les fichiers temporaires
    files.forEach(file => {
      if (file.path) {
        const fs = require('fs');
        fs.unlink(file.path, (unlinkError) => {
          if (unlinkError) {
            logger.warn('Failed to cleanup temp file', {
              filePath: file.path,
              error: unlinkError.message
            });
          } else {
            logger.info('Temp file cleaned up', {
              filePath: file.path
            });
          }
        });
      }
    });

    logger.error('Upload failed, temp files cleaned', {
      entityId: req.validatedEntityId,
      fileCount: files.length,
      error: error.message
    });
  }

  next(error);
};

/**
 * Middleware de limitation de débit (rate limiting) pour les uploads
 * Limite le nombre d'uploads par IP/utilisateur
 */
const rateLimitUploads = (() => {
  const uploadAttempts = new Map();
  const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
  const MAX_UPLOADS = 50; // Maximum 50 uploads par fenêtre

  return (req, res, next) => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    
    // Nettoyer les anciennes entrées
    const cutoff = now - WINDOW_SIZE;
    for (const [key, attempts] of uploadAttempts.entries()) {
      uploadAttempts.set(key, attempts.filter(time => time > cutoff));
      if (uploadAttempts.get(key).length === 0) {
        uploadAttempts.delete(key);
      }
    }

    // Vérifier les tentatives actuelles
    const currentAttempts = uploadAttempts.get(identifier) || [];
    
    if (currentAttempts.length >= MAX_UPLOADS) {
      logger.warn('Upload rate limit exceeded', {
        identifier,
        attempts: currentAttempts.length,
        window: WINDOW_SIZE / 1000 / 60
      });

      return res.status(429).json({
        error: 'TooManyRequests',
        message: `Trop d'uploads. Limite: ${MAX_UPLOADS} uploads par ${WINDOW_SIZE / 1000 / 60} minutes`,
        retry_after: Math.ceil((currentAttempts[0] + WINDOW_SIZE - now) / 1000)
      });
    }

    // Enregistrer cette tentative
    currentAttempts.push(now);
    uploadAttempts.set(identifier, currentAttempts);

    next();
  };
})();

/**
 * Middleware de logging détaillé pour les uploads
 * Log toutes les informations pertinentes sur l'upload
 */
const logUploadDetails = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  
  logger.info('Upload request details', {
    entityId: req.validatedEntityId,
    fileCount: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    files: files.map(file => ({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      fieldName: file.fieldname
    })),
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  next();
};

/**
 * Middleware de validation de sécurité supplémentaire
 * Vérifie les contenus suspects dans les fichiers
 */
const securityValidation = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      // Vérifier les extensions dangereuses
      const dangerousExtensions = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
        '.app', '.deb', '.pkg', '.dmg', '.iso', '.msi', '.sh', '.ps1'
      ];
      
      const fileExtension = require('path').extname(file.originalname).toLowerCase();
      
      if (dangerousExtensions.includes(fileExtension)) {
        throw new FileUploadError(
          `Type de fichier potentiellement dangereux: ${fileExtension}`,
          { filename: file.originalname, extension: fileExtension }
        );
      }

      // Vérifier les noms de fichiers suspects
      const suspiciousPatterns = [
        /autorun\.inf/i,
        /desktop\.ini/i,
        /thumbs\.db/i,
        /\.htaccess/i,
        /web\.config/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
        throw new FileUploadError(
          `Nom de fichier suspect: ${file.originalname}`,
          { filename: file.originalname }
        );
      }
    }

    next();

  } catch (error) {
    logger.error('Security validation failed', {
      entityId: req.validatedEntityId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Middleware combiné pour l'upload complet
 * Combine tous les middlewares d'upload dans l'ordre correct
 */
const completeUploadValidation = [
  rateLimitUploads,
  validateUploadRequest,
  securityValidation,
  validateFileTypes,
  checkUploadQuotas,
  logUploadDetails
];

module.exports = {
  // Middlewares individuels
  validateUploadRequest,
  checkUploadQuotas,
  validateFileTypes,
  cleanupOnError,
  rateLimitUploads,
  logUploadDetails,
  securityValidation,
  
  // Middleware combiné
  completeUploadValidation
};