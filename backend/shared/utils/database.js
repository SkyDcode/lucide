// backend/shared/utils/database.js - Utilitaires base de données SQLite
const { getDatabase } = require('../../config/database');
const { logger, logDatabaseOperation } = require('../middleware/logging');

/**
 * Classe utilitaire pour les opérations de base de données
 */
class DatabaseUtils {
  
  /**
   * Exécuter une requête avec retry automatique
   * @param {Function} operation - Fonction qui exécute l'opération DB
   * @param {number} maxRetries - Nombre maximum de tentatives
   * @param {number} delay - Délai entre les tentatives (ms)
   * @returns {Promise<any>} Résultat de l'opération
   */
  static async withRetry(operation, maxRetries = 3, delay = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        // Retry seulement pour certaines erreurs SQLite
        if (this.isRetryableError(error) && attempt < maxRetries) {
          logger.warn(`Database operation failed, retrying (${attempt}/${maxRetries})`, {
            error: error.message,
            attempt,
            delay
          });
          await this.sleep(delay * attempt); // Backoff exponentiel
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Vérifier si une erreur est "retry-able"
   */
  static isRetryableError(error) {
    const retryableCodes = ['SQLITE_BUSY', 'SQLITE_LOCKED', 'SQLITE_PROTOCOL'];
    return retryableCodes.includes(error.code);
  }

  /**
   * Sleep utilitaire
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Exécuter une transaction
   * @param {Function} callback - Fonction contenant les opérations
   * @returns {Promise<any>} Résultat de la transaction
   */
  static async transaction(callback) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            logger.error('Error starting transaction', { error: err.message });
            return reject(err);
          }

          Promise.resolve(callback(db))
            .then(result => {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  logger.error('Error committing transaction', { error: commitErr.message });
                  return reject(commitErr);
                }
                logDatabaseOperation('TRANSACTION_COMMIT', 'multiple');
                resolve(result);
              });
            })
            .catch(error => {
              db.run('ROLLBACK', (rollbackErr) => {
                if (rollbackErr) {
                  logger.error('Error rolling back transaction', { error: rollbackErr.message });
                }
                logDatabaseOperation('TRANSACTION_ROLLBACK', 'multiple', { error: error.message });
                reject(error);
              });
            });
        });
      });
    });
  }

  /**
   * Construire une clause WHERE dynamique
   * @param {Object} filters - Filtres à appliquer
   * @param {Object} options - Options de construction
   * @returns {Object} { whereClause, params }
   */
  static buildWhereClause(filters = {}, options = {}) {
    const {
      prefix = '',
      operators = {},
      searchFields = [],
      searchTerm = null
    } = options;

    const conditions = [];
    const params = [];

    // Filtres normaux
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        const field = prefix ? `${prefix}.${key}` : key;
        const operator = operators[key] || '=';
        
        if (Array.isArray(value)) {
          // Support pour IN clause
          const placeholders = value.map(() => '?').join(',');
          conditions.push(`${field} IN (${placeholders})`);
          params.push(...value);
        } else if (operator === 'LIKE') {
          conditions.push(`${field} LIKE ?`);
          params.push(`%${value}%`);
        } else {
          conditions.push(`${field} ${operator} ?`);
          params.push(value);
        }
      }
    });

    // Recherche textuelle
    if (searchTerm && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => {
        const fullField = prefix ? `${prefix}.${field}` : field;
        return `${fullField} LIKE ?`;
      });
      conditions.push(`(${searchConditions.join(' OR ')})`);
      searchFields.forEach(() => params.push(`%${searchTerm}%`));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, params };
  }

  /**
   * Construire une clause ORDER BY
   * @param {string|Array} orderBy - Champs de tri
   * @param {string} direction - Direction (ASC/DESC)
   * @param {Object} allowedFields - Champs autorisés pour le tri
   * @returns {string} Clause ORDER BY
   */
  static buildOrderClause(orderBy, direction = 'ASC', allowedFields = {}) {
    if (!orderBy) return '';

    const fields = Array.isArray(orderBy) ? orderBy : [orderBy];
    const validFields = fields.filter(field => {
      // Vérifier si le champ est autorisé
      return !Object.keys(allowedFields).length || allowedFields[field];
    });

    if (validFields.length === 0) return '';

    const orderFields = validFields.map(field => {
      const actualField = allowedFields[field] || field;
      return `${actualField} ${direction.toUpperCase()}`;
    });

    return `ORDER BY ${orderFields.join(', ')}`;
  }

  /**
   * Construire une clause LIMIT/OFFSET pour pagination
   * @param {number} page - Numéro de page (1-based)
   * @param {number} limit - Nombre d'éléments par page
   * @returns {Object} { limitClause, offset }
   */
  static buildPaginationClause(page = 1, limit = 50) {
    const maxLimit = 1000; // Limite de sécurité
    const safeLimit = Math.min(Math.max(1, parseInt(limit)), maxLimit);
    const safePage = Math.max(1, parseInt(page));
    const offset = (safePage - 1) * safeLimit;

    return {
      limitClause: `LIMIT ${safeLimit} OFFSET ${offset}`,
      offset,
      limit: safeLimit
    };
  }

  /**
   * Exécuter une requête avec gestion automatique des erreurs
   * @param {string} operation - Type d'opération (SELECT, INSERT, etc.)
   * @param {string} table - Table concernée
   * @param {string} query - Requête SQL
   * @param {Array} params - Paramètres de la requête
   * @returns {Promise<any>} Résultat de la requête
   */
  static async executeQuery(operation, table, query, params = []) {
    const db = getDatabase();
    
    logDatabaseOperation(operation, table, { query, paramsCount: params.length });

    return this.withRetry(async () => {
      return new Promise((resolve, reject) => {
        const method = this.getQueryMethod(operation);
        
        db[method](query, params, function(err, result) {
          if (err) {
            logger.error(`Database ${operation} failed`, {
              table,
              error: err.message,
              query,
              params
            });
            reject(err);
          } else {
            resolve(operation === 'SELECT_ONE' ? result : 
                   operation === 'SELECT_ALL' ? result : 
                   { lastID: this.lastID, changes: this.changes, result });
          }
        });
      });
    });
  }

  /**
   * Déterminer la méthode SQLite à utiliser
   */
  static getQueryMethod(operation) {
    switch (operation) {
      case 'SELECT_ONE': return 'get';
      case 'SELECT_ALL': return 'all';
      case 'INSERT':
      case 'UPDATE':
      case 'DELETE': return 'run';
      default: return 'run';
    }
  }

  /**
   * Vérifier l'existence d'une table
   * @param {string} tableName - Nom de la table
   * @returns {Promise<boolean>} True si la table existe
   */
  static async tableExists(tableName) {
    try {
      const result = await this.executeQuery(
        'SELECT_ONE',
        'sqlite_master',
        'SELECT name FROM sqlite_master WHERE type=? AND name=?',
        ['table', tableName]
      );
      return !!result;
    } catch (error) {
      logger.error('Error checking table existence', { tableName, error: error.message });
      return false;
    }
  }

  /**
   * Obtenir les informations d'une table
   * @param {string} tableName - Nom de la table
   * @returns {Promise<Array>} Informations des colonnes
   */
  static async getTableInfo(tableName) {
    try {
      return await this.executeQuery(
        'SELECT_ALL',
        tableName,
        `PRAGMA table_info(${tableName})`
      );
    } catch (error) {
      logger.error('Error getting table info', { tableName, error: error.message });
      throw error;
    }
  }

  /**
   * Compter le nombre de lignes avec filtres
   * @param {string} table - Table à compter
   * @param {Object} filters - Filtres WHERE
   * @returns {Promise<number>} Nombre de lignes
   */
  static async count(table, filters = {}) {
    const { whereClause, params } = this.buildWhereClause(filters);
    const query = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    
    const result = await this.executeQuery('SELECT_ONE', table, query, params);
    return result ? result.count : 0;
  }

  /**
   * Vérifier l'existence d'un enregistrement
   * @param {string} table - Table à vérifier
   * @param {Object} filters - Critères de recherche
   * @returns {Promise<boolean>} True si existe
   */
  static async exists(table, filters = {}) {
    const count = await this.count(table, filters);
    return count > 0;
  }

  /**
   * Générer un UUID simple pour les IDs
   * @returns {string} UUID généré
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Sanitizer pour les noms de tables/colonnes (protection injection)
   * @param {string} identifier - Identifiant à sanitizer
   * @returns {string} Identifiant sécurisé
   */
  static sanitizeIdentifier(identifier) {
    // Autoriser seulement lettres, chiffres et underscore
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Convertir un objet en attributs JSON pour SQLite
   * @param {Object} attributes - Attributs à convertir
   * @returns {string} JSON string sécurisé
   */
  static attributesToJSON(attributes = {}) {
    try {
      return JSON.stringify(attributes);
    } catch (error) {
      logger.warn('Error converting attributes to JSON', { attributes, error: error.message });
      return '{}';
    }
  }

  /**
   * Convertir des attributs JSON en objet
   * @param {string} jsonString - String JSON à parser
   * @returns {Object} Objet parsé
   */
  static attributesFromJSON(jsonString = '{}') {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn('Error parsing JSON attributes', { jsonString, error: error.message });
      return {};
    }
  }

  /**
   * Recherche full-text simple sur plusieurs colonnes
   * @param {string} table - Table à rechercher
   * @param {Array} columns - Colonnes à rechercher
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} additionalFilters - Filtres supplémentaires
   * @returns {Promise<Array>} Résultats de recherche
   */
  static async fullTextSearch(table, columns, searchTerm, additionalFilters = {}) {
    if (!searchTerm || !columns.length) {
      return [];
    }

    const searchConditions = columns.map(col => `${col} LIKE ?`);
    const searchParams = columns.map(() => `%${searchTerm}%`);
    
    const { whereClause: filterClause, params: filterParams } = 
      this.buildWhereClause(additionalFilters);
    
    const conditions = [
      `(${searchConditions.join(' OR ')})`,
      filterClause.replace('WHERE ', '')
    ].filter(c => c && c.trim());

    const query = `
      SELECT * FROM ${table} 
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY 
        CASE 
          WHEN ${columns[0]} LIKE ? THEN 1
          WHEN ${columns[0]} LIKE ? THEN 2
          ELSE 3
        END,
        ${columns[0]} ASC
    `;

    const params = [
      ...searchParams,
      ...filterParams,
      `${searchTerm}%`, // Commence par
      `%${searchTerm}%` // Contient
    ];

    return this.executeQuery('SELECT_ALL', table, query, params);
  }

  /**
   * Optimiser la base de données (VACUUM, ANALYZE)
   * @returns {Promise<void>}
   */
  static async optimize() {
    try {
      logger.info('Starting database optimization...');
      
      await this.executeQuery('MAINTENANCE', 'database', 'PRAGMA optimize');
      await this.executeQuery('MAINTENANCE', 'database', 'ANALYZE');
      
      // VACUUM seulement si nécessaire (prend du temps)
      const dbSize = await this.getDatabaseSize();
      if (dbSize > 50 * 1024 * 1024) { // > 50MB
        logger.info('Running VACUUM on large database...');
        await this.executeQuery('MAINTENANCE', 'database', 'VACUUM');
      }
      
      logger.success('Database optimization completed');
    } catch (error) {
      logger.error('Database optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir la taille de la base de données
   * @returns {Promise<number>} Taille en bytes
   */
  static async getDatabaseSize() {
    try {
      const result = await this.executeQuery(
        'SELECT_ONE',
        'pragma',
        'PRAGMA page_count'
      );
      const pageCount = result ? Object.values(result)[0] : 0;
      
      const pageSizeResult = await this.executeQuery(
        'SELECT_ONE',
        'pragma',
        'PRAGMA page_size'
      );
      const pageSize = pageSizeResult ? Object.values(pageSizeResult)[0] : 4096;
      
      return pageCount * pageSize;
    } catch (error) {
      logger.warn('Could not get database size', { error: error.message });
      return 0;
    }
  }

  /**
   * Obtenir les statistiques de la base de données
   * @returns {Promise<Object>} Statistiques
   */
  static async getDatabaseStats() {
    try {
      const stats = {};
      
      // Taille de la DB
      stats.size = await this.getDatabaseSize();
      stats.sizeFormatted = this.formatBytes(stats.size);
      
      // Nombre de tables
      const tables = await this.executeQuery(
        'SELECT_ALL',
        'sqlite_master',
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      stats.tableCount = tables.length;
      
      // Stats par table
      stats.tables = {};
      for (const table of tables) {
        const count = await this.count(table.name);
        stats.tables[table.name] = { count };
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting database stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Formater une taille en bytes en format lisible
   * @param {number} bytes - Taille en bytes
   * @returns {string} Taille formatée
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Backup simple de la base de données
   * @param {string} backupPath - Chemin du backup
   * @returns {Promise<void>}
   */
  static async backup(backupPath) {
    const fs = require('fs');
    const path = require('path');
    const { DATABASE_CONFIG } = require('../../config/database');
    
    try {
      // Créer le dossier de backup si nécessaire
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Copier le fichier de base de données
      fs.copyFileSync(DATABASE_CONFIG.filename, backupPath);
      
      logger.success('Database backup created', { backupPath });
    } catch (error) {
      logger.error('Database backup failed', { backupPath, error: error.message });
      throw error;
    }
  }
}

module.exports = DatabaseUtils;