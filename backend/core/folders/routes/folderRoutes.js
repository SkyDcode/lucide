// backend/core/folders/routes/folderRoutes.js - Routes REST pour les dossiers LUCIDE
const express = require('express');
const FolderController = require('../controllers/FolderController');
const { performanceMiddleware } = require('../../../shared/middleware/logging');

// Créer le routeur Express
const router = express.Router();

/**
 * Configuration des routes pour les dossiers d'enquête
 * Base URL: /api/folders
 */

// =============================================
// MIDDLEWARES GLOBAUX POUR TOUTES LES ROUTES
// =============================================

// Middleware de performance pour toutes les routes
router.use(performanceMiddleware);

// Middleware de validation des paramètres communs
router.use(FolderController.validateCommonParams);

// Middleware pour capturer le timestamp de début de requête
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// =============================================
// ROUTES SPÉCIALES (AVANT LES ROUTES AVEC PARAMÈTRES)
// =============================================

/**
 * Health check du service dossiers
 * GET /api/folders/health
 */
router.get('/health', 
  FolderController.logAction('health_check'),
  FolderController.healthCheck
);

/**
 * Recherche de dossiers
 * GET /api/folders/search?q=terme&limit=50&orderBy=name&direction=ASC
 */
router.get('/search', 
  FolderController.logAction('search_folders'),
  FolderController.searchFolders
);

/**
 * Statistiques des dossiers
 * GET /api/folders/statistics
 */
router.get('/statistics', 
  FolderController.logAction('get_statistics'),
  FolderController.getFolderStatistics
);

/**
 * Dossiers récents
 * GET /api/folders/recent?limit=10
 */
router.get('/recent', 
  FolderController.logAction('get_recent_folders'),
  FolderController.getRecentFolders
);

/**
 * Métriques de performance
 * GET /api/folders/metrics
 */
router.get('/metrics', 
  FolderController.logAction('get_metrics'),
  FolderController.getFolderMetrics
);

/**
 * Schéma de validation
 * GET /api/folders/schema
 */
router.get('/schema', 
  FolderController.logAction('get_schema'),
  FolderController.getFolderSchema
);

/**
 * Nombre total de dossiers
 * GET /api/folders/count?search=terme
 */
router.get('/count', 
  FolderController.logAction('get_count'),
  FolderController.getFolderCount
);

/**
 * Recommandations d'organisation
 * GET /api/folders/recommendations
 */
router.get('/recommendations', 
  FolderController.logAction('get_recommendations'),
  FolderController.getFolderRecommendations
);

/**
 * Validation d'intégrité système
 * GET /api/folders/system/integrity
 */
router.get('/system/integrity', 
  FolderController.logAction('validate_integrity'),
  FolderController.validateSystemIntegrity
);

/**
 * Export de dossiers
 * POST /api/folders/export
 * Body: { folderIds: [1, 2, 3] } (optionnel, tous si vide)
 */
router.post('/export', 
  FolderController.logAction('export_folders'),
  FolderController.exportFolders
);

/**
 * Validation de données (dry-run)
 * POST /api/folders/validate
 * Body: { name: "Test", description: "...", operation: "create|update" }
 */
router.post('/validate', 
  FolderController.logAction('validate_data'),
  FolderController.validateFolder
);

/**
 * Récupération en batch
 * POST /api/folders/batch
 * Body: { folderIds: [1, 2, 3] }
 */
router.post('/batch', 
  FolderController.logAction('get_batch'),
  FolderController.getFoldersBatch
);

// =============================================
// ROUTES CRUD PRINCIPALES
// =============================================

/**
 * Créer un nouveau dossier
 * POST /api/folders
 * Body: { name: "Nom du dossier", description: "Description optionnelle" }
 */
router.post('/', 
  FolderController.logAction('create_folder'),
  FolderController.createFolder
);

/**
 * Récupérer tous les dossiers
 * GET /api/folders?orderBy=created_at&direction=DESC&limit=50&search=terme&page=1
 */
router.get('/', 
  FolderController.logAction('get_all_folders'),
  FolderController.getAllFolders
);

// =============================================
// ROUTES AVEC PARAMÈTRE ID
// =============================================

/**
 * Récupérer un dossier par son ID
 * GET /api/folders/:id
 */
router.get('/:id', 
  FolderController.logAction('get_folder_by_id'),
  FolderController.getFolderById
);

/**
 * Mettre à jour un dossier (remplacement complet)
 * PUT /api/folders/:id
 * Body: { name: "Nouveau nom", description: "Nouvelle description" }
 */
router.put('/:id', 
  FolderController.logAction('update_folder'),
  FolderController.updateFolder
);

/**
 * Mettre à jour un dossier (mise à jour partielle)
 * PATCH /api/folders/:id
 * Body: { name: "Nouveau nom" } ou { description: "Nouvelle description" }
 */
router.patch('/:id', 
  FolderController.logAction('patch_folder'),
  FolderController.patchFolder
);

/**
 * Supprimer un dossier
 * DELETE /api/folders/:id?force=true
 */
router.delete('/:id', 
  FolderController.logAction('delete_folder'),
  FolderController.deleteFolder
);

/**
 * Vérifier l'existence d'un dossier (HEAD request)
 * HEAD /api/folders/:id
 * Retourne 200 si existe, 404 sinon
 */
router.head('/:id', 
  FolderController.logAction('check_folder_exists'),
  FolderController.checkFolderExists
);

// =============================================
// ROUTES D'ACTIONS SUR UN DOSSIER SPÉCIFIQUE
// =============================================

/**
 * Obtenir l'existence d'un dossier avec détails
 * GET /api/folders/:id/exists
 */
router.get('/:id/exists', 
  FolderController.logAction('get_folder_existence'),
  FolderController.getFolderExistence
);

/**
 * Dupliquer un dossier
 * POST /api/folders/:id/duplicate
 * Body: { name: "Nom de la copie", description: "Description de la copie" } (optionnel)
 */
router.post('/:id/duplicate', 
  FolderController.logAction('duplicate_folder'),
  FolderController.duplicateFolder
);

/**
 * Archiver un dossier
 * POST /api/folders/:id/archive
 */
router.post('/:id/archive', 
  FolderController.logAction('archive_folder'),
  FolderController.archiveFolder
);

/**
 * Restaurer un dossier archivé
 * POST /api/folders/:id/restore
 */
router.post('/:id/restore', 
  FolderController.logAction('restore_folder'),
  FolderController.restoreFolder
);

// =============================================
// GESTION D'ERREURS SPÉCIFIQUE AUX DOSSIERS
// =============================================

// Middleware de gestion d'erreur pour toutes les routes de dossiers
router.use(FolderController.handleFolderError);

// =============================================
// DOCUMENTATION DES ROUTES (AIDE)
// =============================================

/**
 * Documentation des endpoints disponibles
 * GET /api/folders/help
 */
router.get('/help', (req, res) => {
  const routes = {
    description: "API REST pour la gestion des dossiers d'enquête LUCIDE",
    base_url: "/api/folders",
    version: "1.0.0",
    endpoints: {
      // Routes principales
      crud: {
        create: {
          method: "POST",
          path: "/",
          description: "Créer un nouveau dossier",
          body: {
            name: "string (requis, 1-255 caractères)",
            description: "string (optionnel, max 2000 caractères)"
          }
        },
        getAll: {
          method: "GET",
          path: "/",
          description: "Récupérer tous les dossiers",
          query: {
            orderBy: "string (name|created_at|updated_at|entity_count|last_activity)",
            direction: "string (ASC|DESC)",
            limit: "number (1-1000)",
            search: "string (terme de recherche)",
            page: "number (numéro de page)"
          }
        },
        getById: {
          method: "GET",
          path: "/:id",
          description: "Récupérer un dossier par ID"
        },
        update: {
          method: "PUT",
          path: "/:id",
          description: "Mettre à jour un dossier (complet)",
          body: {
            name: "string (optionnel, 1-255 caractères)",
            description: "string (optionnel, max 2000 caractères)"
          }
        },
        patch: {
          method: "PATCH",
          path: "/:id",
          description: "Mettre à jour un dossier (partiel)",
          body: {
            name: "string (optionnel, 1-255 caractères)",
            description: "string (optionnel, max 2000 caractères)"
          }
        },
        delete: {
          method: "DELETE",
          path: "/:id",
          description: "Supprimer un dossier",
          query: {
            force: "boolean (forcer la suppression même si contient des entités)"
          }
        }
      },
      
      // Routes utilitaires
      utilities: {
        search: {
          method: "GET",
          path: "/search",
          description: "Rechercher des dossiers",
          query: {
            q: "string (terme de recherche)",
            limit: "number (max résultats)",
            orderBy: "string (champ de tri)",
            direction: "string (ASC|DESC)"
          }
        },
        statistics: {
          method: "GET",
          path: "/statistics",
          description: "Obtenir les statistiques des dossiers"
        },
        recent: {
          method: "GET",
          path: "/recent",
          description: "Obtenir les dossiers récents",
          query: {
            limit: "number (nombre de dossiers, max 100)"
          }
        },
        count: {
          method: "GET",
          path: "/count",
          description: "Obtenir le nombre total de dossiers",
          query: {
            search: "string (filtre de recherche)"
          }
        },
        exists: {
          method: "HEAD",
          path: "/:id",
          description: "Vérifier l'existence d'un dossier (retourne 200 ou 404)"
        }
      },
      
      // Routes d'export et validation
      tools: {
        export: {
          method: "POST",
          path: "/export",
          description: "Exporter des dossiers au format JSON",
          body: {
            folderIds: "array[number] (optionnel, tous si vide)"
          }
        },
        validate: {
          method: "POST",
          path: "/validate",
          description: "Valider des données sans créer/modifier",
          body: {
            name: "string",
            description: "string",
            operation: "string (create|update)"
          }
        },
        batch: {
          method: "POST",
          path: "/batch",
          description: "Récupérer plusieurs dossiers en une requête",
          body: {
            folderIds: "array[number] (max 100 IDs)"
          }
        }
      },
      
      // Routes d'administration
      admin: {
        health: {
          method: "GET",
          path: "/health",
          description: "Vérifier l'état du service dossiers"
        },
        metrics: {
          method: "GET",
          path: "/metrics",
          description: "Obtenir les métriques de performance"
        },
        schema: {
          method: "GET",
          path: "/schema",
          description: "Obtenir le schéma de validation"
        },
        integrity: {
          method: "GET",
          path: "/system/integrity",
          description: "Valider l'intégrité du système"
        },
        recommendations: {
          method: "GET",
          path: "/recommendations",
          description: "Obtenir des recommandations d'organisation"
        }
      },
      
      // Actions sur dossiers
      actions: {
        duplicate: {
          method: "POST",
          path: "/:id/duplicate",
          description: "Dupliquer un dossier",
          body: {
            name: "string (optionnel, nom de la copie)",
            description: "string (optionnel, description de la copie)"
          }
        },
        archive: {
          method: "POST",
          path: "/:id/archive",
          description: "Archiver un dossier"
        },
        restore: {
          method: "POST",
          path: "/:id/restore",
          description: "Restaurer un dossier archivé"
        }
      }
    },
    
    // Codes de réponse
    response_codes: {
      200: "Succès",
      201: "Créé avec succès",
      400: "Données invalides",
      404: "Dossier non trouvé",
      409: "Conflit (nom déjà utilisé, dossier non vide pour suppression)",
      500: "Erreur serveur"
    },
    
    // Format de réponse standard
    response_format: {
      success: "boolean",
      message: "string",
      data: "object|array",
      metadata: "object (optionnel)",
      timestamp: "string (ISO 8601)"
    }
  };

  res.status(200).json(routes);
});

module.exports = router;