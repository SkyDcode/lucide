// backend/app.js - Serveur Express principal LUCIDE
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import middleware personnalisés
const { errorHandler } = require('./shared/middleware/errorHandler');
const { loggingMiddleware } = require('./shared/middleware/logging');

// Import configuration
const { initializeDatabase } = require('./config/database');

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration middleware sécurité
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Pour compatibilité frontend
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Configuration CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3000'] // Frontend en production
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // Dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware généraux
app.use(compression()); // Compression gzip
app.use(express.json({ limit: '50mb' })); // Parser JSON avec limite
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging personnalisé
app.use(loggingMiddleware);

// Logging HTTP avec Morgan
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    service: 'LUCIDE Backend API'
  });
});

// Routes API principales (à implémenter dans les prochaines étapes)
app.get('/api', (req, res) => {
  res.json({
    message: 'LUCIDE API v1.0',
    description: 'Application OSINT pour Police Judiciaire',
    endpoints: {
      folders: '/api/folders',
      entities: '/api/entities',
      relationships: '/api/relationships',
      media: '/api/media',
      export: '/api/export'
    }
  });
});

// Routes à ajouter (placeholders pour la suite)
// app.use('/api/folders', require('./core/folders/routes/folderRoutes'));
// app.use('/api/entities', require('./core/entities/routes/entityRoutes'));
// app.use('/api/relationships', require('./core/relationships/routes/relationshipRoutes'));
// app.use('/api/media', require('./core/media/routes/mediaRoutes'));
// app.use('/api/export', require('./core/export/routes/exportRoutes'));

// Route 404 pour API
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorHandler);

// Fonction de démarrage du serveur
async function startServer() {
  try {
    // Initialiser la base de données
    console.log('🔄 Initialisation de la base de données...');
    await initializeDatabase();
    console.log('✅ Base de données initialisée');

    // Créer le dossier uploads s'il n'existe pas
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Dossier uploads créé');
    }

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur LUCIDE démarré sur le port ${PORT}`);
      console.log(`📍 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔧 Mode développement activé');
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt propre du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Signal SIGINT reçu, arrêt propre du serveur...');
  process.exit(0);
});

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = app;