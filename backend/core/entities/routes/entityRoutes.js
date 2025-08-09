// backend/core/entities/routes/entityRoutes.js - Routes API pour les entités LUCIDE
const express = require('express');
const EntityController = require('../controllers/EntityController');
const EntityTypeController = require('../controllers/EntityTypeController');
const EntityMergeController = require('../controllers/EntityMergeController');

const router = express.Router();

// =============================================
// MIDDLEWARES GLOBAUX
// =============================================

// Middleware de validation des paramètres communs
router.use(EntityController.validateCommonParams);

// Middleware de timing des requêtes
router.use(EntityController.addRequestTiming);

// Middleware de cache pour certaines routes
router.use(EntityController.setCacheHeaders(300)); // 5 minutes de cache

// Middleware de vérification des quotas (pour extension future)
router.use(EntityController.checkQuotas);

// =============================================
// ROUTES UTILITAIRES ET INFORMATIONS
// =============================================

/**
 * Health check du service des entités
 * GET /api/entities/health
 */
router.get('/health', EntityController.healthCheck);

/**
 * Obtenir le schéma de validation des entités
 * GET /api/entities/schema
 */
router.get('/schema', EntityController.getEntitySchema);

/**
 * Obtenir les métriques de performance
 * GET /api/entities/metrics
 */
router.get('/metrics', EntityController.getEntityMetrics);

// =============================================
// ROUTES DES TYPES D'ENTITÉS
// =============================================

/**
 * Obtenir tous les types d'entités
 * GET /api/entities/types
 */
router.get('/types', 
  EntityController.logAction('get_entity_types'),
  EntityTypeController.getAllTypes
);

/**
 * Rechercher des types d'entités
 * GET /api/entities/types/search
 */
router.get('/types/search', 
  EntityController.logAction('search_entity_types'),
  EntityTypeController.searchTypes
);

/**
 * Obtenir les catégories d'entités
 * GET /api/entities/types/categories
 */
router.get('/types/categories', 
  EntityController.logAction('get_entity_categories'),
  EntityTypeController.getCategories
);

/**
 * Obtenir l'aperçu des types d'entités
 * GET /api/entities/types/overview
 */
router.get('/types/overview', 
  EntityController.logAction('get_types_overview'),
  EntityTypeController.getTypesOverview
);

/**
 * Obtenir les statistiques d'utilisation des types
 * GET /api/entities/types/usage-statistics
 */
router.get('/types/usage-statistics', 
  EntityController.logAction('get_types_usage_stats'),
  EntityTypeController.getUsageStatistics
);

/**
 * Obtenir les recommandations de types
 * GET /api/entities/types/recommendations
 */
router.get('/types/recommendations', 
  EntityController.logAction('get_type_recommendations'),
  EntityTypeController.getRecommendations
);

/**
 * Exporter la configuration des types
 * GET /api/entities/types/export
 */
router.get('/types/export', 
  EntityController.logAction('export_types_config'),
  EntityTypeController.exportConfiguration
);

/**
 * Obtenir les types d'une catégorie
 * GET /api/entities/types/category/:category
 */
router.get('/types/category/:category', 
  EntityController.logAction('get_types_by_category'),
  EntityTypeController.getTypesByCategory
);

/**
 * Comparer deux types d'entités
 * GET /api/entities/types/compare/:typeA/:typeB
 */
router.get('/types/compare/:typeA/:typeB', 
  EntityController.logAction('compare_entity_types'),
  EntityTypeController.compareTypes
);

/**
 * Vérifier la compatibilité entre types
 * GET /api/entities/types/:typeA/compatibility/:typeB
 */
router.get('/types/:typeA/compatibility/:typeB', 
  EntityController.logAction('check_type_compatibility'),
  EntityTypeController.checkCompatibility
);

/**
 * Obtenir un type d'entité spécifique
 * GET /api/entities/types/:typeKey
 */
router.get('/types/:typeKey', 
  EntityController.logAction('get_entity_type'),
  EntityTypeController.getType
);

/**
 * Obtenir le schéma de formulaire d'un type
 * GET /api/entities/types/:typeKey/form-schema
 */
router.get('/types/:typeKey/form-schema', 
  EntityController.logAction('get_type_form_schema'),
  EntityTypeController.getFormSchema
);

/**
 * Obtenir les attributs par défaut d'un type
 * GET /api/entities/types/:typeKey/defaults
 */
router.get('/types/:typeKey/defaults', 
  EntityController.logAction('get_type_defaults'),
  EntityTypeController.getDefaultAttributes
);

/**
 * Valider les attributs d'un type
 * POST /api/entities/types/:typeKey/validate
 */
router.post('/types/:typeKey/validate', 
  EntityController.logAction('validate_type_attributes'),
  EntityTypeController.validateAttributes
);

/**
 * Formater des attributs pour l'affichage
 * POST /api/entities/types/:typeKey/format
 */
router.post('/types/:typeKey/format', 
  EntityController.logAction('format_type_attributes'),
  EntityTypeController.formatAttributes
);

// =============================================
// ROUTES GÉNÉRALES DES ENTITÉS
// =============================================

/**
 * Rechercher des entités globalement
 * GET /api/entities/search
 */
router.get('/search', 
  EntityController.logAction('search_entities'),
  EntityController.searchEntities
);

/**
 * Obtenir le nombre d'entités avec filtres
 * GET /api/entities/count
 */
router.get('/count', 
  EntityController.logAction('count_entities'),
  EntityController.getEntitiesCount
);

/**
 * Obtenir des entités récentes
 * GET /api/entities/recent
 */
router.get('/recent', 
  EntityController.logAction('get_recent_entities'),
  EntityController.getRecentEntities
);

/**
 * Valider des données d'entité (dry-run)
 * POST /api/entities/validate
 */
router.post('/validate', 
  EntityController.logAction('validate_entity_data'),
  EntityController.validateEntity
);

/**
 * Obtenir des entités par lot
 * POST /api/entities/batch
 */
router.post('/batch', 
  EntityController.logAction('get_entities_batch'),
  EntityController.getEntitiesBatch
);

// =============================================
// ROUTES PAR DOSSIER
// =============================================

/**
 * Obtenir toutes les entités d'un dossier
 * GET /api/entities/folder/:folderId
 */
router.get('/folder/:folderId', 
  EntityController.logAction('get_entities_by_folder'),
  EntityController.getEntitiesByFolder
);

/**
 * Obtenir les statistiques des entités d'un dossier
 * GET /api/entities/folder/:folderId/statistics
 */
router.get('/folder/:folderId/statistics', 
  EntityController.logAction('get_entities_statistics'),
  EntityController.getEntitiesStatistics
);

/**
 * Obtenir des suggestions d'entités pour un dossier
 * GET /api/entities/folder/:folderId/suggestions
 */
router.get('/folder/:folderId/suggestions', 
  EntityController.logAction('get_entity_suggestions'),
  EntityController.getEntitySuggestions
);

/**
 * Analyser les entités d'un dossier
 * GET /api/entities/folder/:folderId/analysis
 */
router.get('/folder/:folderId/analysis', 
  EntityController.logAction('analyze_entities'),
  EntityController.analyzeEntities
);

/**
 * Obtenir les entités orphelines d'un dossier
 * GET /api/entities/folder/:folderId/orphaned
 */
router.get('/folder/:folderId/orphaned', 
  EntityController.logAction('get_orphaned_entities'),
  EntityController.getOrphanedEntities
);

/**
 * Exporter les entités d'un dossier
 * GET /api/entities/folder/:folderId/export
 */
router.get('/folder/:folderId/export', 
  EntityController.logAction('export_entities'),
  EntityController.exportEntities
);

// =============================================
// ROUTES CRUD DES ENTITÉS
// =============================================

/**
 * Créer une nouvelle entité
 * POST /api/entities
 */
router.post('/', 
  EntityController.logAction('create_entity'),
  EntityController.createEntity
);

/**
 * Obtenir une entité par son ID
 * GET /api/entities/:id
 */
router.get('/:id', 
  EntityController.logAction('get_entity_by_id'),
  EntityController.getEntityById
);

/**
 * Mettre à jour une entité complètement
 * PUT /api/entities/:id
 */
router.put('/:id', 
  EntityController.logAction('update_entity'),
  EntityController.updateEntity
);

/**
 * Mettre à jour partiellement une entité
 * PATCH /api/entities/:id
 */
router.patch('/:id', 
  EntityController.logAction('patch_entity'),
  EntityController.patchEntity
);

/**
 * Supprimer une entité
 * DELETE /api/entities/:id
 */
router.delete('/:id', 
  EntityController.logAction('delete_entity'),
  EntityController.deleteEntity
);

/**
 * Vérifier l'existence d'une entité (HEAD)
 * HEAD /api/entities/:id
 */
router.head('/:id', 
  EntityController.logAction('check_entity_exists'),
  EntityController.checkEntityExists
);

// =============================================
// ROUTES SPÉCIALISÉES PAR ENTITÉ
// =============================================

/**
 * Obtenir l'existence d'une entité avec détails
 * GET /api/entities/:id/exists
 */
router.get('/:id/exists', 
  EntityController.logAction('get_entity_existence'),
  EntityController.getEntityExistence
);

/**
 * Mettre à jour la position d'une entité sur le graphe
 * PATCH /api/entities/:id/position
 */
router.patch('/:id/position', 
  EntityController.logAction('update_entity_position'),
  EntityController.updateEntityPosition
);

/**
 * Obtenir les entités connectées à une entité
 * GET /api/entities/:id/connected
 */
router.get('/:id/connected', 
  EntityController.logAction('get_connected_entities'),
  EntityController.getConnectedEntities
);

/**
 * Dupliquer une entité
 * POST /api/entities/:id/duplicate
 */
router.post('/:id/duplicate', 
  EntityController.logAction('duplicate_entity'),
  EntityController.duplicateEntity
);

// backend/core/entities/routes/entityRoutes.js
// ... imports existants
const EntitySearchController = require('../controllers/EntitySearchController');

// ... routes existantes
// Recherche d'entités
// GET /api/entities/search?q=...&folderId=...&type=...
router.get('/search', EntitySearchController.search);


// Fusion d'entités
// POST /api/entities/merge  { targetId, sourceIds: number[], prefer?: 'target'|'source' }
router.post('/merge', EntityMergeController.postMerge);

// Détection de doublons
// GET /api/entities/duplicates?folderId=123&minScore=60
router.get('/duplicates', EntityMergeController.getDuplicates);



// =============================================
// MIDDLEWARE DE GESTION D'ERREURS
// =============================================

/**
 * Gestionnaire d'erreur spécifique aux entités
 * Doit être en dernier pour capturer toutes les erreurs des routes ci-dessus
 */
router.use(EntityController.handleEntityError);

// =============================================
// ROUTE 404 POUR LES ENDPOINTS NON TROUVÉS
// =============================================

/**
 * Capturer toutes les routes non définies sous /api/entities
 */
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint d\'entité non trouvé',
    path: req.path,
    method: req.method,
    available_endpoints: {
      // Endpoints principaux
      create: 'POST /api/entities',
      getByFolder: 'GET /api/entities/folder/:folderId',
      getById: 'GET /api/entities/:id',
      update: 'PUT /api/entities/:id',
      patch: 'PATCH /api/entities/:id',
      delete: 'DELETE /api/entities/:id',
      
      // Recherche et navigation
      search: 'GET /api/entities/search',
      connected: 'GET /api/entities/:id/connected',
      recent: 'GET /api/entities/recent',
      orphaned: 'GET /api/entities/folder/:folderId/orphaned',
      
      // Analyse et statistiques
      statistics: 'GET /api/entities/folder/:folderId/statistics',
      analysis: 'GET /api/entities/folder/:folderId/analysis',
      metrics: 'GET /api/entities/metrics',
      count: 'GET /api/entities/count',
      
      // Types d'entités
      types: 'GET /api/entities/types',
      typeDetails: 'GET /api/entities/types/:typeKey',
      typeSchema: 'GET /api/entities/types/:typeKey/form-schema',
      typeDefaults: 'GET /api/entities/types/:typeKey/defaults',
      categories: 'GET /api/entities/types/categories',
      
      // Utilitaires
      validate: 'POST /api/entities/validate',
      duplicate: 'POST /api/entities/:id/duplicate',
      batch: 'POST /api/entities/batch',
      export: 'GET /api/entities/folder/:folderId/export',
      suggestions: 'GET /api/entities/folder/:folderId/suggestions',
      
      // Position et visualisation
      updatePosition: 'PATCH /api/entities/:id/position',
      
      // Vérifications
      exists: 'GET /api/entities/:id/exists',
      checkExists: 'HEAD /api/entities/:id',
      health: 'GET /api/entities/health',
      schema: 'GET /api/entities/schema'
    },
    timestamp: new Date().toISOString()
  });
});

// =============================================
// DOCUMENTATION DES ROUTES (pour développement)
// =============================================

/**
 * Documentation complète des routes disponibles
 * Cette section sert de référence pour les développeurs
 * 
 * ROUTES CRUD DE BASE:
 * - POST   /api/entities                           → Créer une entité
 * - GET    /api/entities/:id                       → Récupérer une entité
 * - PUT    /api/entities/:id                       → Mettre à jour une entité
 * - PATCH  /api/entities/:id                       → Mise à jour partielle
 * - DELETE /api/entities/:id                       → Supprimer une entité
 * - HEAD   /api/entities/:id                       → Vérifier existence
 * 
 * ROUTES PAR DOSSIER:
 * - GET    /api/entities/folder/:folderId          → Entités d'un dossier
 * - GET    /api/entities/folder/:folderId/statistics → Statistiques du dossier
 * - GET    /api/entities/folder/:folderId/analysis → Analyse complète
 * - GET    /api/entities/folder/:folderId/suggestions → Suggestions d'entités
 * - GET    /api/entities/folder/:folderId/orphaned → Entités orphelines
 * - GET    /api/entities/folder/:folderId/export   → Export des entités
 * 
 * ROUTES DE RECHERCHE:
 * - GET    /api/entities/search                    → Recherche globale
 * - GET    /api/entities/recent                    → Entités récentes
 * - GET    /api/entities/count                     → Comptage avec filtres
 * - POST   /api/entities/batch                     → Récupération par lot
 * 
 * ROUTES DES TYPES:
 * - GET    /api/entities/types                     → Tous les types
 * - GET    /api/entities/types/:typeKey            → Type spécifique
 * - GET    /api/entities/types/categories          → Catégories
 * - GET    /api/entities/types/overview            → Aperçu des types
 * - GET    /api/entities/types/search              → Recherche de types
 * - GET    /api/entities/types/usage-statistics    → Statistiques d'usage
 * - GET    /api/entities/types/recommendations     → Recommandations
 * - GET    /api/entities/types/export              → Export configuration
 * 
 * ROUTES DE CONFIGURATION DE TYPES:
 * - GET    /api/entities/types/:typeKey/form-schema → Schéma formulaire
 * - GET    /api/entities/types/:typeKey/defaults   → Attributs par défaut
 * - POST   /api/entities/types/:typeKey/validate   → Validation attributs
 * - POST   /api/entities/types/:typeKey/format     → Formatage affichage
 * 
 * ROUTES DE COMPARAISON:
 * - GET    /api/entities/types/compare/:typeA/:typeB → Comparaison types
 * - GET    /api/entities/types/:typeA/compatibility/:typeB → Compatibilité
 * 
 * ROUTES SPÉCIALISÉES:
 * - GET    /api/entities/:id/exists                → Existence avec détails
 * - GET    /api/entities/:id/connected             → Entités connectées
 * - PATCH  /api/entities/:id/position              → Position sur graphe
 * - POST   /api/entities/:id/duplicate             → Duplication
 * 
 * ROUTES UTILITAIRES:
 * - POST   /api/entities/validate                  → Validation dry-run
 * - GET    /api/entities/health                    → Health check
 * - GET    /api/entities/schema                    → Schéma validation
 * - GET    /api/entities/metrics                   → Métriques performance
 * 
 * PARAMÈTRES QUERY COMMUNS:
 * - page, limit                                    → Pagination
 * - orderBy, direction                             → Tri
 * - search, q                                      → Recherche textuelle
 * - type                                           → Filtrage par type
 * - folderId, folder                               → Filtrage par dossier
 * - exactMatch                                     → Correspondance exacte
 * - includeAttributes, includeRelationships        → Inclusions export
 * - maxDepth                                       → Profondeur connexions
 * - category                                       → Filtrage par catégorie
 * - format                                         → Format de réponse
 * 
 * CODES DE STATUT HTTP:
 * - 200: Succès (GET, PUT, PATCH)
 * - 201: Créé (POST)
 * - 400: Requête invalide (validation échouée)
 * - 404: Ressource non trouvée
 * - 409: Conflit (duplicate, contraintes)
 * - 422: Entité non traitable (erreurs métier)
 * - 500: Erreur serveur interne
 * - 503: Service indisponible
 * 
 * STRUCTURE DE RÉPONSE STANDARD:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "data": object|array,
 *   "metadata": object (optionnel),
 *   "validation": object (optionnel),
 *   "timestamp": string (ISO 8601)
 * }
 * 
 * EXEMPLES DE REQUÊTES:
 * 
 * Créer une entité:
 * POST /api/entities
 * {
 *   "folder_id": 1,
 *   "type": "person",
 *   "name": "John Doe",
 *   "x": 100,
 *   "y": 200,
 *   "attributes": {
 *     "email": "john@example.com",
 *     "phone": "+1234567890"
 *   }
 * }
 * 
 * Rechercher des entités:
 * GET /api/entities/search?q=john&folderId=1&type=person&limit=10
 * 
 * Obtenir entités d'un dossier avec tri:
 * GET /api/entities/folder/1?orderBy=name&direction=ASC&limit=50&page=1
 * 
 * Mettre à jour position:
 * PATCH /api/entities/123/position
 * {
 *   "x": 150,
 *   "y": 250
 * }
 * 
 * Valider avant création:
 * POST /api/entities/validate
 * {
 *   "operation": "create",
 *   "folder_id": 1,
 *   "type": "person",
 *   "name": "Jane Doe"
 * }
 */

module.exports = router;