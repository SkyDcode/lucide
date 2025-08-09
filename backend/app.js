// backend/app.js - Serveur Express principal LUCIDE

// Charger les variables d'environnement en premier
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const mediaRoutes = require('./core/media/routes/mediaRoutes');

// Import middleware personnalisés
const { errorHandler } = require('./shared/middleware/errorHandler');
const { loggingMiddleware } = require('./shared/middleware/logging');

// Import configuration
const { initializeDatabase, closeDatabase } = require('./config/database');
const {
  createHTTPSServer,
  httpsRedirect,
  securityHeaders,
  getHTTPSConfig,
  validateSSLConfig
} = require('./config/https');

// Variables globales pour les serveurs
let httpsServer = null;
let httpServer = null;

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 3001;
const httpsConfig = getHTTPSConfig();

// Middleware de redirection HTTPS (en production)
if (httpsConfig.enabled && httpsConfig.redirectHTTP) {
  app.use(httpsRedirect());
}

// Headers de sécurité HTTPS
app.use(securityHeaders());

// Configuration middleware sécurité (mise à jour pour HTTPS)
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Pour compatibilité frontend
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Pour React dev
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"], // Les appels API externes ne sont pas bloqués si ce backend ne sert pas le HTML
        fontSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseSrc: ["'self'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

/**
 * ============================
 *  CORS (amélioré + debug)
 * ============================
 */

// Origines autorisées (ajuste si tu testes depuis une autre IP/port)
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [
        'https://localhost:3000',
        'https://127.0.0.1:3000'
      ]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://localhost:3000',
        'https://127.0.0.1:3000'
        // ➕ Ajoute ici l'origine exacte du frontend si différente
        // ex: 'http://192.168.1.50:3000'
      ];

// Configuration CORS avec fonction d'origine + prise en charge des requêtes sans "Origin"
app.use(
  cors({
    origin: function (origin, callback) {
      // Permettre les requêtes sans origine (ex: Postman, cURL, apps mobiles)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      console.log('⚠️ Origine CORS non autorisée :', origin);
      return callback(new Error('Non autorisé par CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Request-ID'
    ],
    optionsSuccessStatus: 200 // Support des anciens navigateurs
  })
);

// Middleware de debugging CORS - À ajouter après la configuration CORS
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌍 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  }
  next();
});

// Middleware pour gérer les requêtes OPTIONS préalables
app.options('*', (req, res) => {
  console.log('✅ OPTIONS request handled for:', req.path);
  res.status(200).end();
});

/**
 * ============================
 *  Middlewares généraux
 * ============================
 */
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

/**
 * ============================
 *  Routes
 * ============================
 */

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    service: 'LUCIDE Backend API',
    protocol: req.secure ? 'HTTPS' : 'HTTP',
    https_enabled: httpsConfig.enabled,
    port: req.secure ? httpsConfig.port : PORT,
    uptime: process.uptime()
  });
});

// Routes API principales
app.get('/api', (req, res) => {
  res.json({
    message: 'LUCIDE API v1.0',
    description: 'Application OSINT pour Police Judiciaire',
    protocol: req.secure ? 'HTTPS' : 'HTTP',
    endpoints: {
      folders: '/api/folders',
      entities: '/api/entities',
      relationships: '/api/relationships',
      media: '/api/media',
      export: '/api/export'
    }
  });
});

// Routes API principales
app.use('/api/folders', require('./core/folders/routes/folderRoutes'));
app.use('/api/entities', require('./core/entities/routes/entityRoutes'));
// app.use('/api/relationships', require('./core/relationships/routes/relationshipRoutes'));
app.use('/api/media', require('./core/media/routes/mediaRoutes'));
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

/**
 * ============================
 *  Arrêt propre
 * ============================
 */
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Signal ${signal} reçu - Arrêt propre du serveur...`);

  try {
    // Arrêter d'accepter de nouvelles connexions
    if (httpsServer) {
      console.log('🔒 Fermeture du serveur HTTPS...');
      await new Promise((resolve) => {
        httpsServer.close(resolve);
      });
      console.log('✅ Serveur HTTPS fermé');
    }

    if (httpServer) {
      console.log('🌐 Fermeture du serveur HTTP...');
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
      console.log('✅ Serveur HTTP fermé');
    }

    // Fermer la base de données
    console.log('🗄️ Fermeture de la base de données...');
    await closeDatabase();
    console.log('✅ Base de données fermée');

    console.log('🎉 Arrêt propre terminé');
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de l'arrêt propre:", error);
    process.exit(1);
  }
}

/**
 * ============================
 *  Démarrage serveur
 * ============================
 */
async function startServer() {
  try {
    console.log('🚀 Démarrage de LUCIDE...');
    console.log(`📋 Environnement: ${process.env.NODE_ENV}`);
    console.log(`🔧 HTTPS activé: ${httpsConfig.enabled ? 'Oui' : 'Non'}`);

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

    // Valider la configuration SSL
    const sslValid = await validateSSLConfig();

    if (httpsConfig.enabled && sslValid) {
      // Démarrer le serveur HTTPS
      httpsServer = await createHTTPSServer(app);
      const httpsPort = httpsConfig.port;

      await new Promise((resolve) => {
        httpsServer.listen(httpsPort, () => {
          console.log('✅ Serveur HTTPS démarré avec succès');
          console.log(`🔒 HTTPS: https://localhost:${httpsPort}`);
          console.log(`📍 API: https://localhost:${httpsPort}/api`);
          console.log(`🏥 Health: https://localhost:${httpsPort}/health`);

          if (process.env.NODE_ENV !== 'production') {
            console.log('🔧 Mode développement avec HTTPS activé');
            console.log("⚠️  Certificat auto-signé - accepter l'exception dans le navigateur");
          }
          resolve();
        });
      });

      // Optionnel : démarrer aussi HTTP pour redirection
      if (httpsConfig.redirectHTTP && process.env.NODE_ENV === 'production') {
        httpServer = require('http').createServer(app);
        await new Promise((resolve) => {
          httpServer.listen(PORT, () => {
            console.log(`↗️  HTTP (redirection): http://localhost:${PORT}`);
            resolve();
          });
        });
      }
    } else if (httpsConfig.enabled && !sslValid) {
      console.warn('⚠️  HTTPS configuré mais certificats invalides, démarrage en HTTP');
      await startHTTPServer();
    } else {
      // Démarrer en HTTP uniquement
      await startHTTPServer();
    }

    // Afficher les instructions finales
    console.log('\n🎉 LUCIDE est prêt !');
    console.log('====================');
    if (httpsConfig.enabled && sslValid) {
      console.log(`🌐 Application: https://localhost:${httpsConfig.port}`);
      console.log(`📡 API: https://localhost:${httpsConfig.port}/api`);
    } else {
      console.log(`🌐 Application: http://localhost:${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
    }
    console.log('🛑 Pour arrêter: Ctrl+C');
    console.log('🔄 Pour redémarrer: rs (avec nodemon)');
    console.log('====================\n');
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Fonction pour démarrer le serveur HTTP
async function startHTTPServer() {
  return new Promise((resolve) => {
    httpServer = app.listen(PORT, () => {
      console.log('✅ Serveur HTTP démarré avec succès');
      console.log(`🌐 HTTP: http://localhost:${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);

      if (process.env.NODE_ENV !== 'production') {
        console.log('🔧 Mode développement HTTP activé');
      } else {
        console.warn('⚠️  Production en HTTP - HTTPS recommandé pour la sécurité');
      }
      resolve();
    });
  });
}

// Gestion des signaux d'arrêt
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = app;
