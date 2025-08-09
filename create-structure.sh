#!/bin/bash

# =============================================================================
# CRÉATION STRUCTURE COMPLÈTE LUCIDE - MVC MODULAIRE
# À EXÉCUTER DANS LE DOSSIER LUCIDE EXISTANT
# =============================================================================

echo "🚀 Création de la structure LUCIDE dans le dossier existant..."

# Vérifier qu'on est dans le bon dossier
if [[ ! $(basename "$PWD") == "lucide" && ! $(basename "$PWD") == "Lucide" ]]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier lucide/"
    echo "💡 Utilisez: cd lucide && ./create-structure.sh"
    exit 1
fi

echo "✅ Dossier Lucide détecté, création de la structure..."

# =============================================================================
# FICHIERS RACINE
# =============================================================================

# README.md
cat > README.md << 'EOF'
# LUCIDE - Application OSINT

Application de gestion d'enquêtes OSINT pour la police judiciaire.

## Installation

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Structure

- `backend/` - API Node.js + Express + SQLite
- `frontend/` - Interface React + D3.js
- `docs/` - Documentation

## Technologies

- Backend: Node.js, Express, SQLite
- Frontend: React, D3.js
- Base de données: SQLite
EOF

# .gitignore principal
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
/build
/dist

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
*.sqlite3

# Uploads
uploads/
temp/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary files
*.tmp
*.temp
EOF

# package.json racine
cat > package.json << 'EOF'
{
  "name": "lucide",
  "version": "1.0.0",
  "description": "Application OSINT pour enquêtes de police judiciaire",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm start",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
EOF

# =============================================================================
# STRUCTURE BACKEND
# =============================================================================

echo "📁 Création structure backend..."

# Dossiers principaux backend
mkdir -p backend/{config,core,shared,database,uploads,tests,docs}

# Core modules
mkdir -p backend/core/{folders,entities,relationships,media,export}

# Structure module folders
mkdir -p backend/core/folders/{models,controllers,services,validators,routes}

# Structure module entities  
mkdir -p backend/core/entities/{models,controllers,services,validators,routes}

# Structure module relationships
mkdir -p backend/core/relationships/{models,controllers,services,routes}

# Structure module media
mkdir -p backend/core/media/{models,controllers,services,routes}

# Structure module export
mkdir -p backend/core/export/{controllers,services,templates,routes}

# Shared utilities
mkdir -p backend/shared/{middleware,utils,constants}

# Tests
mkdir -p backend/tests/{unit,integration,fixtures}

# =============================================================================
# FICHIERS BACKEND DE BASE
# =============================================================================

cd backend

# package.json backend
cat > package.json << 'EOF'
{
  "name": "lucide-backend",
  "version": "1.0.0",
  "description": "Backend API pour LUCIDE",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "sqlite3": "^5.1.6",
    "multer": "^1.4.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0",
    "supertest": "^6.3.3"
  }
}
EOF

# app.js principal
cat > app.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité et performance
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/folders', require('./core/folders/routes/folderRoutes'));
app.use('/api/entities', require('./core/entities/routes/entityRoutes'));
app.use('/api/relationships', require('./core/relationships/routes/relationshipRoutes'));
app.use('/api/media', require('./core/media/routes/mediaRoutes'));
app.use('/api/export', require('./core/export/routes/exportRoutes'));

// Middleware de gestion des erreurs
app.use(require('./shared/middleware/errorHandler'));

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur LUCIDE démarré sur le port ${PORT}`);
});

module.exports = app;
EOF

# Configuration database
cat > config/database.js << 'EOF'
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
EOF

# Schéma base de données
cat > database/schema.sql << 'EOF'
-- =============================================================================
-- SCHÉMA BASE DE DONNÉES LUCIDE
-- =============================================================================

-- Dossiers d'enquête
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entités flexibles
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    attributes TEXT DEFAULT '{}', -- JSON pour flexibilité
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
);

-- Relations entre entités
CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity INTEGER NOT NULL,
    to_entity INTEGER NOT NULL,
    type TEXT DEFAULT 'connected',
    strength TEXT DEFAULT 'medium', -- weak, medium, strong
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_entity) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY (to_entity) REFERENCES entities (id) ON DELETE CASCADE,
    UNIQUE(from_entity, to_entity, type)
);

-- Fichiers attachés aux entités
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER,
    mime_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities (id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_entities_folder ON entities(folder_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_entity);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_entity);
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_id);

-- Données par défaut
INSERT OR IGNORE INTO folders (id, name, description) VALUES 
(1, 'Dossier de démonstration', 'Dossier d''exemple pour tester l''application');
EOF

# Middleware errorHandler
cat > shared/middleware/errorHandler.js << 'EOF'
const errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur:', err);

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erreur de validation',
      details: err.message
    });
  }

  // Erreur SQLite
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: 'Erreur base de données',
      code: err.code
    });
  }

  // Erreur générique
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
EOF

# Constants - Types d'entités
cat > shared/constants/entityTypes.js << 'EOF'
module.exports = {
  PERSON: 'person',
  PLACE: 'place',
  PHONE: 'phone',
  EMAIL: 'email',
  WEBSITE: 'website',
  SOCIAL_MEDIA: 'social_media',
  VEHICLE: 'vehicle',
  ORGANIZATION: 'organization',
  EVENT: 'event',
  DOCUMENT: 'document'
};
EOF

# Constants - Types de relations
cat > shared/constants/relationshipTypes.js << 'EOF'
module.exports = {
  KNOWS: 'knows',
  FAMILY: 'family',
  WORKS_WITH: 'works_with',
  OWNS: 'owns',
  FREQUENTS: 'frequents',
  LIVES_AT: 'lives_at',
  ASSOCIATED_WITH: 'associated_with',
  COMMUNICATES_WITH: 'communicates_with'
};
EOF

# Créer fichiers vides pour structure complète
touch core/folders/models/FolderModel.js
touch core/folders/controllers/FolderController.js
touch core/folders/services/FolderService.js
touch core/folders/validators/FolderValidator.js
touch core/folders/routes/folderRoutes.js

touch core/entities/models/EntityModel.js
touch core/entities/controllers/EntityController.js
touch core/entities/services/EntityService.js
touch core/entities/validators/EntityValidator.js
touch core/entities/routes/entityRoutes.js

touch core/relationships/models/RelationshipModel.js
touch core/relationships/controllers/RelationshipController.js
touch core/relationships/services/RelationshipService.js
touch core/relationships/routes/relationshipRoutes.js

touch core/media/models/MediaModel.js
touch core/media/controllers/MediaController.js
touch core/media/services/MediaStorageService.js
touch core/media/routes/mediaRoutes.js

touch core/export/controllers/ExportController.js
touch core/export/services/PDFService.js
touch core/export/routes/exportRoutes.js

# =============================================================================
# STRUCTURE FRONTEND
# =============================================================================

cd ..
echo "⚛️ Création structure frontend..."

mkdir -p frontend/{public,src}
cd frontend

# package.json frontend
cat > package.json << 'EOF'
{
  "name": "lucide-frontend",
  "version": "1.0.0",
  "description": "Interface React pour LUCIDE",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "d3": "^7.8.5",
    "axios": "^1.4.0",
    "zustand": "^4.3.8"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:3001"
}
EOF

# Structure src
mkdir -p src/{components,modules,shared,assets,pages}

# Composants UI
mkdir -p src/components/{ui,layout,icons}
mkdir -p src/components/ui/{Button,Modal,Table,Form,LoadingSpinner}
mkdir -p src/components/layout/{Header,Sidebar,Navigation,Footer}

# Modules métier
mkdir -p src/modules/{folders,entities,relationships,graph,media,export,search}

# Structure module folders
mkdir -p src/modules/folders/{components,hooks,services,store,types}

# Structure module entities
mkdir -p src/modules/entities/{components,hooks,services,store,types}

# Structure module graph
mkdir -p src/modules/graph/{components,hooks,services,algorithms,utils}

# Structure module relationships
mkdir -p src/modules/relationships/{components,hooks,services,store}

# Structure module media
mkdir -p src/modules/media/{components,hooks,services}

# Structure module export
mkdir -p src/modules/export/{components,hooks,services,templates}

# Structure module search
mkdir -p src/modules/search/{components,hooks,services,store}

# Services partagés
mkdir -p src/shared/{services,hooks,store,constants,utils}

# Assets
mkdir -p src/assets/{images,styles,fonts}

# index.html
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="LUCIDE - Application OSINT pour enquêtes" />
    <title>LUCIDE - OSINT Investigation Tool</title>
  </head>
  <body>
    <noscript>Vous devez activer JavaScript pour utiliser cette application.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF

# App.js principal
cat > src/App.js << 'EOF'
import React, { useState } from 'react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('folders');

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔍 LUCIDE</h1>
        <nav>
          <button 
            className={currentView === 'folders' ? 'active' : ''}
            onClick={() => setCurrentView('folders')}
          >
            Dossiers
          </button>
          <button 
            className={currentView === 'entities' ? 'active' : ''}
            onClick={() => setCurrentView('entities')}
          >
            Entités
          </button>
          <button 
            className={currentView === 'graph' ? 'active' : ''}
            onClick={() => setCurrentView('graph')}
          >
            Graphique
          </button>
        </nav>
      </header>
      
      <main className="app-main">
        {currentView === 'folders' && <div>📁 Vue Dossiers</div>}
        {currentView === 'entities' && <div>👤 Vue Entités</div>}
        {currentView === 'graph' && <div>🌐 Vue Graphique</div>}
      </main>
    </div>
  );
}

export default App;
EOF

# App.css
cat > src/App.css << 'EOF'
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: #282c34;
  padding: 1rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app-header nav {
  display: flex;
  gap: 1rem;
}

.app-header nav button {
  background: transparent;
  border: 1px solid #61dafb;
  color: #61dafb;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.app-header nav button:hover,
.app-header nav button.active {
  background: #61dafb;
  color: #282c34;
}

.app-main {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  color: #666;
}
EOF

# index.js
cat > src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# index.css
cat > src/index.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
EOF

# Créer fichiers vides pour structure complète
touch src/shared/services/api.js
touch src/shared/constants/entityTypes.js
touch src/shared/utils/helpers.js

touch src/modules/folders/services/folderService.js
touch src/modules/folders/hooks/useFolders.js
touch src/modules/folders/components/FolderList.jsx

touch src/modules/entities/services/entityService.js
touch src/modules/entities/hooks/useEntities.js
touch src/modules/entities/components/EntityList.jsx

touch src/modules/graph/components/NetworkGraph.jsx
touch src/modules/graph/hooks/useGraph.js
touch src/modules/graph/services/d3Service.js

# =============================================================================
# DOCUMENTATION
# =============================================================================

cd ..
mkdir -p docs/{api,frontend,deployment}

cat > docs/README.md << 'EOF'
# Documentation LUCIDE

## Structure

- `api/` - Documentation API Backend
- `frontend/` - Documentation Frontend React
- `deployment/` - Guide de déploiement

## Développement

Voir le plan de développement dans le README principal.
EOF

# =============================================================================
# FINALISATION
# =============================================================================

echo ""
echo "✅ Structure LUCIDE créée avec succès !"
echo ""
echo "📁 Arborescence créée :"
echo "   lucide/"
echo "   ├── backend/           (API Node.js + SQLite)"
echo "   ├── frontend/          (Interface React)"
echo "   ├── docs/              (Documentation)"
echo "   ├── README.md"
echo "   ├── .gitignore"
echo "   └── package.json"
echo ""
echo "🚀 Prochaines étapes :"
echo "   1. cd lucide"
echo "   2. npm run install:all"
echo "   3. Suivre le plan de développement"
echo ""
echo "💡 Commandes utiles :"
echo "   npm run dev            # Démarrer backend + frontend"
echo "   npm run dev:backend    # Démarrer uniquement backend"
echo "   npm run dev:frontend   # Démarrer uniquement frontend"
echo ""
