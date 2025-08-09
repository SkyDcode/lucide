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
