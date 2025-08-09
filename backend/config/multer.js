// backend/config/multer.js - Configuration upload fichiers avec Multer

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { FileUploadError } = require('../shared/middleware/errorHandler');

/**
 * Configuration des types MIME autorisés par catégorie
 */
const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml'
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml'
  ],
  archives: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar'
  ],
  videos: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo'
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/webm'
  ]
};

// Tous les types MIME autorisés
const ALL_ALLOWED_TYPES = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.archives,
  ...ALLOWED_MIME_TYPES.videos,
  ...ALLOWED_MIME_TYPES.audio
];

/**
 * Configuration des tailles maximales par type (en bytes)
 */
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,      // 10MB pour les images
  document: 25 * 1024 * 1024,   // 25MB pour les documents
  archive: 100 * 1024 * 1024,   // 100MB pour les archives
  video: 200 * 1024 * 1024,     // 200MB pour les vidéos
  audio: 50 * 1024 * 1024,      // 50MB pour l'audio
  default: 50 * 1024 * 1024     // 50MB par défaut
};

/**
 * Obtenir le type de fichier basé sur le MIME type
 * @param {string} mimeType - Type MIME du fichier
 * @returns {string} Type de fichier
 */
function getFileType(mimeType) {
  if (ALLOWED_MIME_TYPES.images.includes(mimeType)) return 'image';
  if (ALLOWED_MIME_TYPES.documents.includes(mimeType)) return 'document';
  if (ALLOWED_MIME_TYPES.archives.includes(mimeType)) return 'archive';
  if (ALLOWED_MIME_TYPES.videos.includes(mimeType)) return 'video';
  if (ALLOWED_MIME_TYPES.audio.includes(mimeType)) return 'audio';
  return 'other';
}

/**
 * Créer le dossier d'upload s'il n'existe pas
 * @param {string} uploadPath - Chemin du dossier
 */
function ensureUploadDirectory(uploadPath) {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
}

/**
 * Générer un nom de fichier unique et sécurisé
 * @param {string} originalName - Nom original du fichier
 * @returns {string} Nom de fichier sécurisé
 */
function generateSecureFilename(originalName) {
  // Extraire l'extension
  const ext = path.extname(originalName).toLowerCase();
  
  // Générer un hash unique
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('md5')
    .update(`${originalName}-${timestamp}-${randomBytes}`)
    .digest('hex')
    .substring(0, 16);
  
  return `${hash}-${timestamp}${ext}`;
}

/**
 * Obtenir le chemin de destination basé sur l'entité et le type de fichier
 * @param {number} entityId - ID de l'entité
 * @param {string} fileType - Type de fichier
 * @returns {string} Chemin du dossier de destination
 */
function getDestinationPath(entityId, fileType) {
  const baseUploadPath = path.join(__dirname, '../uploads');
  const entityPath = path.join(baseUploadPath, 'entities', entityId.toString(), fileType);
  
  ensureUploadDirectory(entityPath);
  return entityPath;
}

/**
 * Configuration de stockage Multer
 */
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    try {
      const entityId = req.params.entityId || req.body.entity_id;
      
      if (!entityId) {
        return cb(new FileUploadError('Entity ID is required for file upload'));
      }

      const fileType = getFileType(file.mimetype);
      const destinationPath = getDestinationPath(entityId, fileType);
      
      cb(null, destinationPath);
    } catch (error) {
      cb(new FileUploadError('Failed to determine upload destination'));
    }
  },

  filename: function(req, file, cb) {
    try {
      const secureFilename = generateSecureFilename(file.originalname);
      
      // Stocker le nom original pour référence
      file.secureFilename = secureFilename;
      
      cb(null, secureFilename);
    } catch (error) {
      cb(new FileUploadError('Failed to generate secure filename'));
    }
  }
});

/**
 * Fonction de filtrage des fichiers
 * @param {Object} req - Requête Express
 * @param {Object} file - Fichier uploadé
 * @param {Function} cb - Callback
 */
function fileFilter(req, file, cb) {
  try {
    // Vérifier le type MIME
    if (!ALL_ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new FileUploadError(
        `Type de fichier non autorisé: ${file.mimetype}`,
        { allowedTypes: ALL_ALLOWED_TYPES }
      ));
    }

    // Vérifier l'extension (sécurité supplémentaire)
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg',
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.xml',
      // Archives
      '.zip', '.rar', '.7z', '.tar', '.gz',
      // Vidéos
      '.mp4', '.webm', '.ogg', '.avi', '.mov',
      // Audio
      '.mp3', '.wav', '.ogg', '.m4a', '.webm'
    ];

    if (!allowedExtensions.includes(ext)) {
      return cb(new FileUploadError(
        `Extension de fichier non autorisée: ${ext}`,
        { allowedExtensions }
      ));
    }

    // Vérifier la cohérence MIME/extension
    const expectedMimeTypes = {
      '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'],
      '.png': ['image/png'], '.gif': ['image/gif'],
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.zip': ['application/zip', 'application/x-zip-compressed'],
      '.mp4': ['video/mp4', 'audio/mp4']
    };

    if (expectedMimeTypes[ext] && !expectedMimeTypes[ext].includes(file.mimetype)) {
      return cb(new FileUploadError(
        `Incohérence entre l'extension ${ext} et le type MIME ${file.mimetype}`
      ));
    }

    cb(null, true);
  } catch (error) {
    cb(new FileUploadError('Erreur lors de la validation du fichier'));
  }
}

/**
 * Fonction de limitation de taille dynamique
 * @param {Object} req - Requête Express
 * @param {Object} file - Fichier uploadé
 * @returns {number} Taille maximale autorisée
 */
function getFileSize(req, file) {
  const fileType = getFileType(file.mimetype);
  return MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.default;
}

/**
 * Configuration Multer pour les entités
 */
const entityUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: function(req, file) {
      return getFileSize(req, file);
    },
    files: 10, // Maximum 10 fichiers par requête
    fields: 20, // Maximum 20 champs de formulaire
    fieldNameSize: 50, // Maximum 50 caractères pour les noms de champs
    fieldSize: 1024 * 1024 // Maximum 1MB pour les valeurs de champs
  }
});

/**
 * Configuration Multer pour upload simple (un seul fichier)
 */
const singleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZES.default,
    files: 1
  }
});

/**
 * Configuration Multer pour upload multiple (plusieurs fichiers)
 */
const multipleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZES.default,
    files: 10
  }
});

/**
 * Middleware pour gérer les erreurs Multer
 * @param {Error} error - Erreur Multer
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
function handleMulterError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        const fileType = req.file ? getFileType(req.file.mimetype) : 'unknown';
        const maxSize = MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.default;
        return res.status(400).json({
          error: 'FileUploadError',
          message: 'Fichier trop volumineux',
          details: {
            maxSize: `${Math.round(maxSize / (1024 * 1024))}MB`,
            fileType: fileType
          }
        });
        
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'FileUploadError',
          message: 'Trop de fichiers',
          details: { maxFiles: 10 }
        });
        
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'FileUploadError',
          message: 'Champ de fichier inattendu',
          details: { field: error.field }
        });
        
      default:
        return res.status(400).json({
          error: 'FileUploadError',
          message: 'Erreur lors de l\'upload',
          details: { code: error.code }
        });
    }
  }
  
  if (error instanceof FileUploadError) {
    return res.status(400).json({
      error: 'FileUploadError',
      message: error.message,
      details: error.details
    });
  }
  
  next(error);
}

/**
 * Utilitaires pour la gestion des fichiers
 */
const fileUtils = {
  /**
   * Obtenir les informations d'un fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {Object} Informations du fichier
   */
  getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = this.getMimeTypeFromExtension(ext);
      
      return {
        size: stats.size,
        mimeType: mimeType,
        fileType: getFileType(mimeType),
        lastModified: stats.mtime,
        created: stats.birthtime
      };
    } catch (error) {
      return null;
    }
  },

  /**
   * Obtenir le type MIME depuis l'extension
   * @param {string} extension - Extension du fichier
   * @returns {string} Type MIME
   */
  getMimeTypeFromExtension(extension) {
    const mimeMap = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg'
    };
    
    return mimeMap[extension] || 'application/octet-stream';
  },

  /**
   * Supprimer un fichier de façon sécurisée
   * @param {string} filePath - Chemin du fichier
   * @returns {boolean} True si supprimé avec succès
   */
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur suppression fichier:', error);
      return false;
    }
  },

  /**
   * Vérifier si un fichier existe
   * @param {string} filePath - Chemin du fichier
   * @returns {boolean} True si le fichier existe
   */
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  },

  /**
   * Créer un dossier de façon sécurisée
   * @param {string} dirPath - Chemin du dossier
   * @returns {boolean} True si créé avec succès
   */
  createDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Erreur création dossier:', error);
      return false;
    }
  }
};

module.exports = {
  // Configurations Multer
  entityUpload,
  singleUpload,
  multipleUpload,
  
  // Middleware d'erreurs
  handleMulterError,
  
  // Utilitaires
  fileUtils,
  getFileType,
  generateSecureFilename,
  getDestinationPath,
  
  // Constantes
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_TYPES,
  MAX_FILE_SIZES
};