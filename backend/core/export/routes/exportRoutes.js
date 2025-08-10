// backend/core/export/routes/exportRoutes.js - Routes d'export LUCIDE
const express = require('express');
const router = express.Router();

// Import des contrôleurs
const ExportController = require('../controllers/ExportController');
const ReportController = require('../controllers/ReportController');

// Import des middlewares
const { validateRequest } = require('../../../shared/middleware/validation');
const { loggingMiddleware } = require('../../../shared/middleware/logging');

// =============================================
// ROUTES D'EXPORT GÉNÉRAL
// =============================================

/**
 * GET /api/export/formats
 * Obtenir la liste des formats d'export disponibles
 */
router.get('/formats', ExportController.getAvailableFormats);

/**
 * GET /api/export/stats
 * Obtenir les statistiques du service d'export
 */
router.get('/stats', ExportController.getExportStats);

/**
 * GET /api/export/test
 * Tester la fonctionnalité d'export
 */
router.get('/test', ExportController.testExport);

// =============================================
// ROUTES D'EXPORT D'ENTITÉS
// =============================================

/**
 * GET /api/export/entity/:entityId/pdf
 * Exporter une entité en PDF
 * 
 * Query parameters:
 * - format: Format du PDF (A4, A3, Letter, Legal) - défaut: A4
 * - watermark: Ajouter un filigrane (true/false) - défaut: false
 * - watermarkText: Texte du filigrane - défaut: CONFIDENTIEL
 * - includeRelationships: Inclure les relations (true/false) - défaut: true
 * - includeFiles: Inclure les fichiers (true/false) - défaut: true
 */
router.get('/entity/:entityId/pdf', 
  validateRequest({
    params: {
      entityId: { type: 'number', required: true }
    },
    query: {
      format: { type: 'string', enum: ['A4', 'A3', 'Letter', 'Legal'], default: 'A4' },
      watermark: { type: 'boolean', default: false },
      watermarkText: { type: 'string', maxLength: 50, default: 'CONFIDENTIEL' },
      includeRelationships: { type: 'boolean', default: true },
      includeFiles: { type: 'boolean', default: true }
    }
  }),
  ExportController.exportEntityToPDF
);

/**
 * GET /api/export/entity/:entityId/html
 * Exporter une entité en HTML
 * 
 * Query parameters:
 * - includeRelationships: Inclure les relations (true/false) - défaut: true
 * - includeFiles: Inclure les fichiers (true/false) - défaut: true
 */
router.get('/entity/:entityId/html',
  validateRequest({
    params: {
      entityId: { type: 'number', required: true }
    },
    query: {
      includeRelationships: { type: 'boolean', default: true },
      includeFiles: { type: 'boolean', default: true }
    }
  }),
  ExportController.exportEntityToHTML
);

// =============================================
// ROUTES D'EXPORT DE DOSSIERS
// =============================================

/**
 * GET /api/export/folder/:folderId/pdf
 * Exporter un dossier en PDF
 * 
 * Query parameters:
 * - format: Format du PDF (A4, A3, Letter, Legal) - défaut: A4
 * - watermark: Ajouter un filigrane (true/false) - défaut: false
 * - watermarkText: Texte du filigrane - défaut: CONFIDENTIEL
 * - includeEntityDetails: Inclure les détails des entités (true/false) - défaut: false
 */
router.get('/folder/:folderId/pdf',
  validateRequest({
    params: {
      folderId: { type: 'number', required: true }
    },
    query: {
      format: { type: 'string', enum: ['A4', 'A3', 'Letter', 'Legal'], default: 'A4' },
      watermark: { type: 'boolean', default: false },
      watermarkText: { type: 'string', maxLength: 50, default: 'CONFIDENTIEL' },
      includeEntityDetails: { type: 'boolean', default: false }
    }
  }),
  ExportController.exportFolderToPDF
);

// =============================================
// ROUTES D'EXPORT JSON
// =============================================

/**
 * GET /api/export/:type/:id/json
 * Exporter des données en JSON
 * 
 * Path parameters:
 * - type: Type d'export (entity, folder)
 * - id: ID de l'élément à exporter
 * 
 * Query parameters:
 * - format: Format JSON (pretty/compact) - défaut: pretty
 * - includeMetadata: Inclure les métadonnées (true/false) - défaut: true
 */
router.get('/:type/:id/json',
  validateRequest({
    params: {
      type: { type: 'string', enum: ['entity', 'folder'], required: true },
      id: { type: 'number', required: true }
    },
    query: {
      format: { type: 'string', enum: ['pretty', 'compact'], default: 'pretty' },
      includeMetadata: { type: 'boolean', default: true }
    }
  }),
  ExportController.exportToJSON
);

// =============================================
// ROUTES DE PRÉVISUALISATION
// =============================================

/**
 * GET /api/export/preview/:type/:id
 * Prévisualiser un export sans le télécharger
 * 
 * Path parameters:
 * - type: Type d'export (entity, folder)
 * - id: ID de l'élément à prévisualiser
 * 
 * Query parameters:
 * - template: Template à utiliser (entity-report, folder-summary, network-analysis)
 */
router.get('/preview/:type/:id',
  validateRequest({
    params: {
      type: { type: 'string', enum: ['entity', 'folder'], required: true },
      id: { type: 'number', required: true }
    },
    query: {
      template: { 
        type: 'string', 
        enum: ['entity-report', 'folder-summary', 'network-analysis'], 
        default: 'entity-report' 
      }
    }
  }),
  ExportController.previewExport
);

// =============================================
// ROUTES DE RAPPORTS AVANCÉS
// =============================================

/**
 * GET /api/export/reports/network-analysis/:folderId
 * Générer un rapport d'analyse réseau
 * 
 * Path parameters:
 * - folderId: ID du dossier à analyser
 * 
 * Query parameters:
 * - format: Format de sortie (PDF, HTML) - défaut: PDF
 * - watermark: Ajouter un filigrane (true/false) - défaut: true
 * - includeMetrics: Inclure les métriques (true/false) - défaut: true
 * - includeClusters: Inclure l'analyse des clusters (true/false) - défaut: true
 * - includeRecommendations: Inclure les recommandations (true/false) - défaut: true
 */
router.get('/reports/network-analysis/:folderId',
  validateRequest({
    params: {
      folderId: { type: 'number', required: true }
    },
    query: {
      format: { type: 'string', enum: ['PDF', 'HTML'], default: 'PDF' },
      watermark: { type: 'boolean', default: true },
      includeMetrics: { type: 'boolean', default: true },
      includeClusters: { type: 'boolean', default: true },
      includeRecommendations: { type: 'boolean', default: true }
    }
  }),
  ReportController.generateNetworkAnalysisReport
);

/**
 * GET /api/export/reports/investigation-summary/:folderId
 * Générer un rapport de synthèse d'investigation
 * 
 * Path parameters:
 * - folderId: ID du dossier à synthétiser
 * 
 * Query parameters:
 * - format: Format de sortie (PDF, HTML) - défaut: PDF
 * - timeframe: Période temporelle (all, last_week, last_month, last_quarter, last_year) - défaut: all
 * - includeTimeline: Inclure la timeline (true/false) - défaut: true
 * - includeStatistics: Inclure les statistiques (true/false) - défaut: true
 * - classification: Niveau de classification (PUBLIC, CONFIDENTIEL, SECRET) - défaut: CONFIDENTIEL
 */
router.get('/reports/investigation-summary/:folderId',
  validateRequest({
    params: {
      folderId: { type: 'number', required: true }
    },
    query: {
      format: { type: 'string', enum: ['PDF', 'HTML'], default: 'PDF' },
      timeframe: { 
        type: 'string', 
        enum: ['all', 'last_week', 'last_month', 'last_quarter', 'last_year'], 
        default: 'all' 
      },
      includeTimeline: { type: 'boolean', default: true },
      includeStatistics: { type: 'boolean', default: true },
      classification: { 
        type: 'string', 
        enum: ['PUBLIC', 'CONFIDENTIEL', 'SECRET'], 
        default: 'CONFIDENTIEL' 
      }
    }
  }),
  ReportController.generateInvestigationSummary
);

/**
 * POST /api/export/reports/custom
 * Générer un rapport personnalisé
 * 
 * Body:
 * - folderId: ID du dossier (obligatoire)
 * - template: Template à utiliser (obligatoire)
 * - title: Titre personnalisé
 * - sections: Sections à inclure (array)
 * - format: Format de sortie (PDF, HTML) - défaut: PDF
 * - customData: Données personnalisées (object)
 */
router.post('/reports/custom',
  validateRequest({
    body: {
      folderId: { type: 'number', required: true },
      template: { 
        type: 'string', 
        enum: ['entity-report', 'folder-summary', 'network-analysis'], 
        required: true 
      },
      title: { type: 'string', maxLength: 200 },
      sections: { 
        type: 'array', 
        items: { 
          type: 'string', 
          enum: ['entities', 'relationships', 'statistics', 'network-analysis', 'timeline', 'centrality'] 
        },
        default: []
      },
      format: { type: 'string', enum: ['PDF', 'HTML'], default: 'PDF' },
      customData: { type: 'object', default: {} }
    }
  }),
  ReportController.generateCustomReport
);

// =============================================
// ROUTES DE GESTION DES TEMPLATES
// =============================================

/**
 * GET /api/export/templates
 * Obtenir la liste des templates disponibles
 */
router.get('/templates', async (req, res) => {
  try {
    const TemplateService = require('../services/TemplateService');
    const templates = await TemplateService.getAvailableTemplates();
    
    const formattedTemplates = templates.map(template => ({
      name: template.name,
      filename: template.filename,
      cached: template.cached,
      description: getTemplateDescription(template.name),
      supportedTypes: getTemplateSupportedTypes(template.name)
    }));

    res.json({
      success: true,
      templates: formattedTemplates,
      count: formattedTemplates.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des templates'
    });
  }
});

/**
 * POST /api/export/templates/validate
 * Valider un template personnalisé
 * 
 * Body:
 * - templateContent: Contenu du template Handlebars (obligatoire)
 */
router.post('/templates/validate',
  validateRequest({
    body: {
      templateContent: { type: 'string', required: true, minLength: 10 }
    }
  }),
  async (req, res) => {
    try {
      const TemplateService = require('../services/TemplateService');
      const { templateContent } = req.body;
      
      const validation = TemplateService.validateTemplateSyntax(templateContent);
      
      res.json({
        success: true,
        valid: validation.valid,
        errors: validation.errors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la validation du template'
      });
    }
  }
);

/**
 * POST /api/export/templates/render
 * Rendre un template avec des données de test
 * 
 * Body:
 * - templateContent: Contenu du template (obligatoire)
 * - testData: Données de test (obligatoire)
 */
router.post('/templates/render',
  validateRequest({
    body: {
      templateContent: { type: 'string', required: true },
      testData: { type: 'object', required: true }
    }
  }),
  async (req, res) => {
    try {
      const TemplateService = require('../services/TemplateService');
      const { templateContent, testData } = req.body;
      
      const renderedHTML = await TemplateService.renderTemplateString(templateContent, testData);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(renderedHTML);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Erreur lors du rendu du template',
        details: error.message
      });
    }
  }
);

// =============================================
// ROUTES DE GESTION DES EXPORTS EN LOT
// =============================================

/**
 * POST /api/export/batch
 * Exporter plusieurs éléments en lot
 * 
 * Body:
 * - type: Type d'éléments (entity, folder)
 * - ids: Liste des IDs à exporter
 * - format: Format de sortie (PDF, HTML, JSON)
 * - options: Options d'export
 */
router.post('/batch',
  validateRequest({
    body: {
      type: { type: 'string', enum: ['entity', 'folder'], required: true },
      ids: { type: 'array', items: { type: 'number' }, required: true, minItems: 1, maxItems: 50 },
      format: { type: 'string', enum: ['PDF', 'HTML', 'JSON'], required: true },
      options: { type: 'object', default: {} }
    }
  }),
  async (req, res) => {
    // TODO: Implémenter l'export en lot
    res.status(501).json({
      success: false,
      error: 'Export en lot non encore implémenté',
      message: 'Cette fonctionnalité sera disponible dans une prochaine version'
    });
  }
);

// =============================================
// ROUTES DE MONITORING ET DIAGNOSTICS
// =============================================

/**
 * GET /api/export/health
 * Vérifier la santé du service d'export
 */
router.get('/health', async (req, res) => {
  try {
    const PDFService = require('../services/PDFService');
    const TemplateService = require('../services/TemplateService');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        templates: {
          status: 'healthy',
          cache: TemplateService.getCacheInfo()
        },
        pdf: {
          status: 'healthy',
          stats: PDFService.getStats()
        }
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    // Tester les services critiques
    try {
      await PDFService.testService();
      health.services.pdf.status = 'healthy';
    } catch (error) {
      health.services.pdf.status = 'unhealthy';
      health.services.pdf.error = error.message;
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * POST /api/export/cache/clear
 * Vider le cache des templates
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const TemplateService = require('../services/TemplateService');
    TemplateService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache des templates vidé avec succès',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors du vidage du cache'
    });
  }
});

/**
 * POST /api/export/cache/preload
 * Précharger tous les templates en cache
 */
router.post('/cache/preload', async (req, res) => {
  try {
    const TemplateService = require('../services/TemplateService');
    await TemplateService.preloadTemplates();
    
    res.json({
      success: true,
      message: 'Templates préchargés avec succès',
      cache: TemplateService.getCacheInfo()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lors du préchargement des templates'
    });
  }
});

// =============================================
// FONCTIONS UTILITAIRES
// =============================================

/**
 * Obtenir la description d'un template
 * @param {string} templateName - Nom du template
 * @returns {string} Description
 */
function getTemplateDescription(templateName) {
  const descriptions = {
    'entity-report': 'Fiche d\'identité complète d\'une entité avec ses relations et attributs',
    'folder-summary': 'Résumé d\'un dossier d\'enquête avec vue d\'ensemble et statistiques',
    'network-analysis': 'Analyse approfondie du réseau avec métriques de centralité et clusters'
  };

  return descriptions[templateName] || 'Template personnalisé';
}

/**
 * Obtenir les types supportés par un template
 * @param {string} templateName - Nom du template
 * @returns {Array} Types supportés
 */
function getTemplateSupportedTypes(templateName) {
  const supportedTypes = {
    'entity-report': ['entity'],
    'folder-summary': ['folder'],
    'network-analysis': ['folder']
  };

  return supportedTypes[templateName] || ['entity', 'folder'];
}

// =============================================
// MIDDLEWARE DE LOGGING POUR LES EXPORTS
// =============================================

// Appliquer le middleware de logging à toutes les routes
router.use(loggingMiddleware);

// Middleware pour logger les exports réussis
router.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Logger seulement les réponses de fichiers (PDF, HTML)
    if (res.getHeader('Content-Disposition') && res.getHeader('Content-Disposition').includes('attachment')) {
      const contentType = res.getHeader('Content-Type');
      const contentLength = res.getHeader('Content-Length');
      
      console.log('📄 Export completed:', {
        method: req.method,
        url: req.originalUrl,
        contentType,
        contentLength,
        timestamp: new Date().toISOString()
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// =============================================
// GESTION DES ERREURS GLOBALES
// =============================================

// Middleware de gestion d'erreurs pour les routes d'export
router.use((error, req, res, next) => {
  console.error('❌ Export error:', {
    method: req.method,
    url: req.originalUrl,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Erreurs de validation
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Données d\'entrée invalides',
      details: error.message
    });
  }

  // Erreurs de template
  if (error.message.includes('template') || error.message.includes('Template')) {
    return res.status(400).json({
      success: false,
      error: 'Erreur de template',
      details: error.message
    });
  }

  // Erreurs PDF
  if (error.message.includes('PDF') || error.message.includes('Puppeteer')) {
    return res.status(500).json({
      success: false,
      error: 'Erreur de génération PDF',
      details: 'Service PDF temporairement indisponible'
    });
  }

  // Erreur générique
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur d\'export',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

module.exports = router;