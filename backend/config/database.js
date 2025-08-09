const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'lucide.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur connexion base de données:', err.message);
  } else {
    console.log('✅ Connexion SQLite établie');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Configuration SQLite
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
  
  // Créer les tables si elles n'existent pas
  const fs = require('fs');
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
      if (err) {
        console.error('❌ Erreur création schéma:', err.message);
      } else {
        console.log('✅ Schéma base de données initialisé');
      }
    });
  }
}

module.exports = db;
