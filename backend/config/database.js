// backend/config/database.js - Configuration et connexion SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuration de la base de données
const DATABASE_CONFIG = {
  filename: path.join(__dirname, '../database/lucide.db'),
  mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  options: {
    // Configuration SQLite optimisée pour performance
    busyTimeout: 30000,
    journal_mode: 'WAL', // Write-Ahead Logging pour performance
    synchronous: 'NORMAL',
    temp_store: 'memory',
    cache_size: -64000 // 64MB cache
  }
};

let db = null;

/**
 * Obtenir l'instance de la base de données
 * @returns {sqlite3.Database} Instance de la base de données
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Initialiser la base de données et créer les tables
 * @returns {Promise<sqlite3.Database>} Promise de l'instance DB
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // Créer le dossier database s'il n'existe pas
      const dbDir = path.dirname(DATABASE_CONFIG.filename);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('📁 Dossier database créé');
      }

      // Créer la connexion à la base de données
      db = new sqlite3.Database(DATABASE_CONFIG.filename, DATABASE_CONFIG.mode, (err) => {
        if (err) {
          console.error('❌ Erreur connexion SQLite:', err.message);
          return reject(err);
        }
        
        console.log('✅ Connexion SQLite établie');
        
        // Configurer les options de performance
        configureDatabase()
          .then(() => {
            console.log('⚡ Configuration SQLite optimisée');
            
            // Créer les tables
            return createTables();
          })
          .then(() => {
            console.log('🗄️ Tables créées/vérifiées');
            resolve(db);
          })
          .catch(reject);
      });

      // Gestion des erreurs de connexion
      db.on('error', (err) => {
        console.error('❌ Erreur base de données:', err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Configurer les paramètres de performance SQLite
 * @returns {Promise<void>}
 */
function configureDatabase() {
  return new Promise((resolve, reject) => {
    const queries = [
      'PRAGMA journal_mode = WAL',
      'PRAGMA synchronous = NORMAL',
      'PRAGMA cache_size = -64000',
      'PRAGMA temp_store = memory',
      'PRAGMA busy_timeout = 30000',
      'PRAGMA foreign_keys = ON'
    ];

    let completed = 0;
    
    queries.forEach(query => {
      db.run(query, (err) => {
        if (err) {
          console.error(`❌ Erreur configuration: ${query}`, err);
          return reject(err);
        }
        
        completed++;
        if (completed === queries.length) {
          resolve();
        }
      });
    });
  });
}

/**
 * Créer toutes les tables de l'application
 * @returns {Promise<void>}
 */
function createTables() {
  return new Promise((resolve, reject) => {
    // Lire le fichier schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    
    fs.readFile(schemaPath, 'utf8', (err, schema) => {
      if (err) {
        console.error('❌ Erreur lecture schema.sql:', err);
        return reject(err);
      }

      // Exécuter le script SQL complet
      db.exec(schema, (err) => {
        if (err) {
          console.error('❌ Erreur création tables:', err);
          return reject(err);
        }
        
        resolve();
      });
    });
  });
}

/**
 * Fermer la connexion à la base de données
 * @returns {Promise<void>}
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      return resolve();
    }

    db.close((err) => {
      if (err) {
        console.error('❌ Erreur fermeture DB:', err);
        return reject(err);
      }
      
      console.log('✅ Connexion SQLite fermée');
      db = null;
      resolve();
    });
  });
}

/**
 * Exécuter une requête avec gestion d'erreur
 * @param {string} query - Requête SQL
 * @param {Array} params - Paramètres de la requête
 * @returns {Promise<Object>} Résultat de la requête
 */
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject(new Error('Database not initialized'));
    }

    db.run(query, params, function(err) {
      if (err) {
        console.error('❌ Erreur requête SQL:', err);
        console.error('Query:', query);
        console.error('Params:', params);
        return reject(err);
      }
      
      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

/**
 * Exécuter une requête SELECT (un seul résultat)
 * @param {string} query - Requête SQL
 * @param {Array} params - Paramètres de la requête
 * @returns {Promise<Object|null>} Résultat ou null
 */
function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject(new Error('Database not initialized'));
    }

    db.get(query, params, (err, row) => {
      if (err) {
        console.error('❌ Erreur requête GET:', err);
        return reject(err);
      }
      
      resolve(row || null);
    });
  });
}

/**
 * Exécuter une requête SELECT (plusieurs résultats)
 * @param {string} query - Requête SQL
 * @param {Array} params - Paramètres de la requête
 * @returns {Promise<Array>} Tableau de résultats
 */
function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      return reject(new Error('Database not initialized'));
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Erreur requête ALL:', err);
        return reject(err);
      }
      
      resolve(rows || []);
    });
  });
}

/**
 * Vérifier si la base de données est initialisée
 * @returns {boolean} True si initialisée
 */
function isDatabaseInitialized() {
  return db !== null;
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getQuery,
  allQuery,
  isDatabaseInitialized,
  DATABASE_CONFIG
};