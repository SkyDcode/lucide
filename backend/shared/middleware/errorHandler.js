// backend/shared/middleware/errorHandler.js - Gestion centralisée des erreurs
const fs = require('fs');
const path = require('path');

/**
 * Classes d'erreurs personnalisées pour LUCIDE
 */

class LucideError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capturer la stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      details: this.details
    };
  }
}

class ValidationError extends LucideError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class NotFoundError extends LucideError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
    this.resourceId = id;
  }
}

class ConflictError extends LucideError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

class DatabaseError extends LucideError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

class FileUploadError extends LucideError {
  constructor(message, details = null) {
    super(message, 400, 'FILE_UPLOAD_ERROR', details);
  }
}

class UnauthorizedError extends LucideError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends LucideError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Logger pour les erreurs
 */
class ErrorLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  logError(error, req = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN'
      },
      request: req ? {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      } : null
    };

    // Log en console pour développement
    if (process.env.NODE_ENV !== 'production') {
      console.error('🚨 ERREUR DÉTECTÉE:', JSON.stringify(logEntry, null, 2));
    }

    // Log dans fichier pour production
    const logFile = path.join(this.logDir, `error-${timestamp.split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error('❌ Erreur écriture log:', err);
      }
    });
  }
}

const errorLogger = new ErrorLogger();

/**
 * Middleware principal de gestion d'erreurs Express
 * DOIT être le dernier middleware dans app.js
 */
function errorHandler(error, req, res, next) {
  // Log de l'erreur
  errorLogger.logError(error, req);

  // Erreur personnalisée LUCIDE
  if (error instanceof LucideError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Erreurs de validation Joi
  if (error.isJoi) {
    const validationError = new ValidationError(
      'Données invalides',
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
    );
    return res.status(400).json(validationError.toJSON());
  }

  // Erreurs SQLite
  if (error.code && error.code.startsWith('SQLITE_')) {
    const dbError = handleSQLiteError(error);
    return res.status(dbError.statusCode).json(dbError.toJSON());
  }

  // Erreurs Multer (upload de fichiers)
  if (error.code && error.code.includes('LIMIT_')) {
    const uploadError = handleMulterError(error);
    return res.status(uploadError.statusCode).json(uploadError.toJSON());
  }

  // Erreur JSON malformé
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    const syntaxError = new ValidationError('JSON malformé dans la requête');
    return res.status(400).json(syntaxError.toJSON());
  }

  // Erreur 404 pour routes non trouvées
  if (error.status === 404) {
    const notFoundError = new NotFoundError('Route');
    return res.status(404).json(notFoundError.toJSON());
  }

  // Erreur générique par défaut
  const genericError = new LucideError(
    process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : error.message,
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? null : {
      stack: error.stack,
      originalError: error.toString()
    }
  );

  res.status(500).json(genericError.toJSON());
}

/**
 * Gestion spécifique des erreurs SQLite
 */
function handleSQLiteError(error) {
  switch (error.code) {
    case 'SQLITE_CONSTRAINT_UNIQUE':
      return new ConflictError(
        'Cette ressource existe déjà',
        { constraint: 'unique', details: error.message }
      );
      
    case 'SQLITE_CONSTRAINT_FOREIGNKEY':
      return new ValidationError(
        'Référence invalide vers une ressource inexistante',
        { constraint: 'foreign_key', details: error.message }
      );
      
    case 'SQLITE_CONSTRAINT_CHECK':
      return new ValidationError(
        'Données invalides selon les contraintes',
        { constraint: 'check', details: error.message }
      );
      
    case 'SQLITE_CONSTRAINT_NOTNULL':
      return new ValidationError(
        'Champ obligatoire manquant',
        { constraint: 'not_null', details: error.message }
      );
      
    case 'SQLITE_BUSY':
      return new LucideError(
        'Base de données temporairement indisponible, réessayez',
        503,
        'DATABASE_BUSY'
      );
      
    case 'SQLITE_LOCKED':
      return new LucideError(
        'Base de données verrouillée, réessayez',
        503,
        'DATABASE_LOCKED'
      );
      
    default:
      return new DatabaseError(
        'Erreur de base de données',
        error
      );
  }
}

/**
 * Gestion spécifique des erreurs Multer (upload)
 */
function handleMulterError(error) {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new FileUploadError(
        'Fichier trop volumineux',
        { maxSize: '50MB', received: error.field }
      );
      
    case 'LIMIT_FILE_COUNT':
      return new FileUploadError(
        'Trop de fichiers uploadés',
        { maxCount: error.limit }
      );
      
    case 'LIMIT_FIELD_KEY':
      return new FileUploadError(
        'Nom de champ trop long',
        { field: error.field }
      );
      
    case 'LIMIT_FIELD_VALUE':
      return new FileUploadError(
        'Valeur de champ trop longue',
        { field: error.field }
      );
      
    case 'LIMIT_UNEXPECTED_FILE':
      return new FileUploadError(
        'Fichier inattendu',
        { field: error.field }
      );
      
    default:
      return new FileUploadError(
        'Erreur lors de l\'upload du fichier',
        { originalError: error.message }
      );
  }
}

/**
 * Middleware pour capturer les 404
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError('Route', req.originalUrl);
  next(error);
}

/**
 * Middleware pour capturer les erreurs async
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Helper pour créer des erreurs personnalisées
 */
function createError(message, statusCode = 500, code = 'CUSTOM_ERROR', details = null) {
  return new LucideError(message, statusCode, code, details);
}

/**
 * Validation d'existence d'une ressource
 */
function assertExists(resource, resourceName = 'Resource', id = null) {
  if (!resource) {
    throw new NotFoundError(resourceName, id);
  }
  return resource;
}

/**
 * Validation de droits d'accès
 */
function assertAuthorized(condition, message = 'Accès non autorisé') {
  if (!condition) {
    throw new ForbiddenError(message);
  }
}

/**
 * Validation de données
 */
function assertValid(condition, message = 'Données invalides', details = null) {
  if (!condition) {
    throw new ValidationError(message, details);
  }
}

module.exports = {
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Classes d'erreurs
  LucideError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  FileUploadError,
  UnauthorizedError,
  ForbiddenError,
  
  // Helpers
  createError,
  assertExists,
  assertAuthorized,
  assertValid,
  
  // Logger
  errorLogger
};