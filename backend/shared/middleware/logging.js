// backend/shared/middleware/logging.js - Middleware de logging personnalisé
const fs = require('fs');
const path = require('path');

/**
 * Configuration du logging
 */
const LOGGING_CONFIG = {
  enabled: true,
  logToFile: process.env.NODE_ENV === 'production',
  logToConsole: process.env.NODE_ENV !== 'production',
  logDir: path.join(__dirname, '../../logs'),
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5,
  sensitiveFields: ['password', 'token', 'authorization', 'cookie']
};

/**
 * Niveaux de log avec couleurs pour console
 */
const LOG_LEVELS = {
  INFO: { level: 'INFO', color: '\x1b[36m', priority: 1 }, // Cyan
  WARN: { level: 'WARN', color: '\x1b[33m', priority: 2 }, // Jaune
  ERROR: { level: 'ERROR', color: '\x1b[31m', priority: 3 }, // Rouge
  DEBUG: { level: 'DEBUG', color: '\x1b[35m', priority: 0 }, // Magenta
  SUCCESS: { level: 'SUCCESS', color: '\x1b[32m', priority: 1 } // Vert
};

/**
 * Classe Logger principal
 */
class Logger {
  constructor() {
    this.logDir = LOGGING_CONFIG.logDir;
    this.ensureLogDirectory();
  }

  /**
   * Créer le dossier de logs si nécessaire
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (error) {
        console.error('❌ Impossible de créer le dossier logs:', error);
      }
    }
  }

  /**
   * Nettoyer les données sensibles
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    const sanitizeRecursive = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;

      for (const key in obj) {
        if (LOGGING_CONFIG.sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[SANITIZED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeRecursive(obj[key]);
        }
      }
      return obj;
    };

    return sanitizeRecursive(sanitized);
  }

  /**
   * Formater une entrée de log
   */
  formatLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      level: level.level,
      message,
      metadata: this.sanitizeData(metadata),
      pid: process.pid
    };
  }

  /**
   * Logger vers console avec couleurs
   */
  logToConsole(logEntry, level) {
    if (!LOGGING_CONFIG.logToConsole) return;

    const color = level.color;
    const reset = '\x1b[0m';
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    
    const prefix = `${color}[${timestamp}] ${level.level}${reset}`;
    const message = `${prefix} ${logEntry.message}`;
    
    // Afficher les métadonnées si présentes
    if (Object.keys(logEntry.metadata).length > 0) {
      console.log(message);
      console.log(`${color}└─${reset}`, JSON.stringify(logEntry.metadata, null, 2));
    } else {
      console.log(message);
    }
  }

  /**
   * Logger vers fichier
   */
  async logToFile(logEntry) {
    if (!LOGGING_CONFIG.logToFile) return;

    try {
      const date = new Date(logEntry.timestamp).toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `lucide-${date}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';

      // Vérifier la taille du fichier
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > LOGGING_CONFIG.maxLogSize) {
          await this.rotateLogFile(logFile);
        }
      }

      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('❌ Erreur écriture log fichier:', error);
    }
  }

  /**
   * Rotation des fichiers de log
   */
  async rotateLogFile(logFile) {
    try {
      const baseName = path.basename(logFile, '.log');
      const dir = path.dirname(logFile);
      
      // Déplacer les anciens fichiers
      for (let i = LOGGING_CONFIG.maxLogFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}.log`);
        const newFile = path.join(dir, `${baseName}.${i + 1}.log`);
        
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }
      
      // Renommer le fichier actuel
      const firstRotated = path.join(dir, `${baseName}.1.log`);
      fs.renameSync(logFile, firstRotated);
      
    } catch (error) {
      console.error('❌ Erreur rotation logs:', error);
    }
  }

  /**
   * Méthode de log générique
   */
  async log(level, message, metadata = {}) {
    if (!LOGGING_CONFIG.enabled) return;

    const logEntry = this.formatLogEntry(level, message, metadata);
    
    // Log console
    this.logToConsole(logEntry, level);
    
    // Log fichier
    await this.logToFile(logEntry);
  }

  // Méthodes de log par niveau
  info(message, metadata = {}) {
    return this.log(LOG_LEVELS.INFO, message, metadata);
  }

  warn(message, metadata = {}) {
    return this.log(LOG_LEVELS.WARN, message, metadata);
  }

  error(message, metadata = {}) {
    return this.log(LOG_LEVELS.ERROR, message, metadata);
  }

  debug(message, metadata = {}) {
    return this.log(LOG_LEVELS.DEBUG, message, metadata);
  }

  success(message, metadata = {}) {
    return this.log(LOG_LEVELS.SUCCESS, message, metadata);
  }
}

// Instance globale du logger
const logger = new Logger();

/**
 * Middleware Express pour logger les requêtes HTTP
 */
function loggingMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Ajouter l'ID de requête à l'objet request
  req.requestId = requestId;

  // Capturer les données de la requête
  const requestData = {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('content-length'),
    query: req.query,
    // Body sera ajouté par un middleware séparé si nécessaire
  };

  // Logger le début de la requête
  logger.info(`➤ ${req.method} ${req.url}`, {
    type: 'REQUEST_START',
    ...requestData
  });

  // Capturer la fin de la réponse
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const responseSize = Buffer.isBuffer(data) ? data.length : 
                        typeof data === 'string' ? Buffer.byteLength(data) : 0;

    const responseData = {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      size: `${responseSize} bytes`
    };

    // Déterminer le niveau de log selon le statut
    const logLevel = res.statusCode >= 500 ? 'error' :
                    res.statusCode >= 400 ? 'warn' :
                    'success';

    const statusEmoji = res.statusCode >= 500 ? '💥' :
                       res.statusCode >= 400 ? '⚠️' :
                       '✅';

    logger[logLevel](`${statusEmoji} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, {
      type: 'REQUEST_END',
      ...requestData,
      ...responseData
    });

    // Appeler la méthode originale
    originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware pour logger le body des requêtes (à utiliser avec parcimonie)
 */
function logRequestBody(req, res, next) {
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body received', {
      requestId: req.requestId,
      body: req.body,
      contentType: req.get('content-type')
    });
  }
  next();
}

/**
 * Générer un ID unique pour la requête
 */
function generateRequestId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Logger spécialisé pour les opérations de base de données
 */
function logDatabaseOperation(operation, table, data = {}) {
  logger.debug(`📊 Database ${operation}`, {
    type: 'DATABASE_OPERATION',
    operation,
    table,
    data: logger.sanitizeData(data)
  });
}

/**
 * Logger spécialisé pour les uploads de fichiers
 */
function logFileOperation(operation, filename, metadata = {}) {
  logger.info(`📎 File ${operation}: ${filename}`, {
    type: 'FILE_OPERATION',
    operation,
    filename,
    ...metadata
  });
}

/**
 * Logger spécialisé pour la sécurité
 */
function logSecurityEvent(event, details = {}) {
  logger.warn(`🔒 Security event: ${event}`, {
    type: 'SECURITY_EVENT',
    event,
    ...details
  });
}

/**
 * Middleware de débogage pour les performances
 */
function performanceMiddleware(req, res, next) {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    if (duration > 1000) { // Log si > 1 seconde
      logger.warn(`🐌 Slow request detected`, {
        type: 'PERFORMANCE_WARNING',
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  });
  
  next();
}

module.exports = {
  // Logger principal
  logger,
  
  // Middleware
  loggingMiddleware,
  logRequestBody,
  performanceMiddleware,
  
  // Loggers spécialisés
  logDatabaseOperation,
  logFileOperation,
  logSecurityEvent,
  
  // Configuration
  LOGGING_CONFIG,
  LOG_LEVELS
};