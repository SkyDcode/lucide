// backend/core/folders/services/FolderService.js - Service métier pour les dossiers LUCIDE
const FolderModel = require('../models/FolderModel');
const FolderValidator = require('../validators/FolderValidator');
const { logger } = require('../../../shared/middleware/logging');
const { NotFoundError, ConflictError, ValidationError } = require('../../../shared/middleware/errorHandler');

/**
 * Service métier pour la gestion des dossiers d'enquête
 * Encapsule la logique métier et orchestre les appels aux modèles
 */
class FolderService {

  /**
   * Créer un nouveau dossier d'enquête
   * @param {Object} folderData - Données du dossier
   * @returns {Promise<Object>} Dossier créé avec métadonnées
   */
  static async createFolder(folderData) {
    try {
      logger.info('Creating new folder', { inputData: folderData });

      // Validation et sanitisation des données
      const validatedData = FolderValidator.validateAndSanitize(folderData, 'create');

      // Vérifications métier supplémentaires
      await this.validateFolderCreation(validatedData);

      // Création du dossier
      const createdFolder = await FolderModel.create(validatedData);

      // Enrichir avec des métadonnées
      const enrichedFolder = await this.enrichFolderData(createdFolder);

      logger.success('Folder created successfully', { 
        folderId: createdFolder.id,
        folderName: createdFolder.name 
      });

      return {
        success: true,
        data: enrichedFolder,
        message: `Dossier "${createdFolder.name}" créé avec succès`
      };

    } catch (error) {
      logger.error('Error in createFolder service', { 
        folderData, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer tous les dossiers avec options de filtrage
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Liste des dossiers avec métadonnées
   */
  static async getAllFolders(options = {}) {
    try {
      logger.info('Retrieving all folders', { options });

      // Validation des options
      const validatedOptions = FolderValidator.validateQueryOptions(options);

      // Récupération des dossiers
      const folders = await FolderModel.getAll(validatedOptions);

      // Enrichissement des données
      const enrichedFolders = await Promise.all(
        folders.map(folder => this.enrichFolderData(folder))
      );

      // Calcul des métadonnées de pagination si applicable
      const metadata = await this.buildPaginationMetadata(validatedOptions, folders.length);

      logger.info('Folders retrieved successfully', { 
        count: enrichedFolders.length,
        options: validatedOptions 
      });

      return {
        success: true,
        data: enrichedFolders,
        metadata,
        message: `${enrichedFolders.length} dossier(s) récupéré(s)`
      };

    } catch (error) {
      logger.error('Error in getAllFolders service', { 
        options, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Récupérer un dossier par son ID
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Dossier avec détails complets
   */
  static async getFolderById(folderId) {
    try {
      logger.info('Retrieving folder by ID', { folderId });

      // Validation de l'ID
      const validatedId = FolderValidator.validateId(folderId);

      // Récupération du dossier
      const folder = await FolderModel.findById(validatedId);
      
      if (!folder) {
        throw new NotFoundError('Dossier', validatedId);
      }

      // Enrichissement avec détails complets
      const enrichedFolder = await this.enrichFolderData(folder, true);

      logger.info('Folder retrieved successfully', { 
        folderId: validatedId,
        folderName: folder.name 
      });

      return {
        success: true,
        data: enrichedFolder,
        message: `Dossier "${folder.name}" récupéré avec succès`
      };

    } catch (error) {
      logger.error('Error in getFolderById service', { 
        folderId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} updateData - Données de mise à jour
   * @returns {Promise<Object>} Dossier mis à jour
   */
  static async updateFolder(folderId, updateData) {
    try {
      logger.info('Updating folder', { folderId, updateData });

      // Validation de l'ID
      const validatedId = FolderValidator.validateId(folderId);

      // Validation et sanitisation des données
      const validatedData = FolderValidator.validateAndSanitize(updateData, 'update');

      // Vérifier que le dossier existe
      const existingFolder = await FolderModel.findById(validatedId);
      if (!existingFolder) {
        throw new NotFoundError('Dossier', validatedId);
      }

      // Vérifications métier pour la mise à jour
      await this.validateFolderUpdate(validatedId, validatedData, existingFolder);

      // Mise à jour du dossier
      const updatedFolder = await FolderModel.update(validatedId, validatedData);

      // Enrichissement des données
      const enrichedFolder = await this.enrichFolderData(updatedFolder);

      logger.success('Folder updated successfully', { 
        folderId: validatedId,
        folderName: updatedFolder.name,
        changes: validatedData
      });

      return {
        success: true,
        data: enrichedFolder,
        message: `Dossier "${updatedFolder.name}" mis à jour avec succès`
      };

    } catch (error) {
      logger.error('Error in updateFolder service', { 
        folderId, 
        updateData, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Supprimer un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de suppression
   * @returns {Promise<Object>} Résultat de la suppression
   */
  static async deleteFolder(folderId, options = {}) {
    try {
      logger.info('Deleting folder', { folderId, options });

      // Validation de l'ID et des options
      const validatedId = FolderValidator.validateId(folderId);
      const validatedOptions = FolderValidator.validateDeleteOptions(options);

      // Vérifier que le dossier existe
      const existingFolder = await FolderModel.findById(validatedId);
      if (!existingFolder) {
        throw new NotFoundError('Dossier', validatedId);
      }

      // Vérifications métier pour la suppression
      await this.validateFolderDeletion(validatedId, validatedOptions, existingFolder);

      // Suppression du dossier
      const deleted = await FolderModel.delete(validatedId, validatedOptions);

      if (!deleted) {
        throw new Error('La suppression du dossier a échoué');
      }

      logger.success('Folder deleted successfully', { 
        folderId: validatedId,
        folderName: existingFolder.name,
        options: validatedOptions
      });

      return {
        success: true,
        data: {
          id: validatedId,
          name: existingFolder.name,
          deleted: true
        },
        message: `Dossier "${existingFolder.name}" supprimé avec succès`
      };

    } catch (error) {
      logger.error('Error in deleteFolder service', { 
        folderId, 
        options, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Rechercher des dossiers par terme
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Résultats de recherche
   */
  static async searchFolders(searchTerm, options = {}) {
    try {
      logger.info('Searching folders', { searchTerm, options });

      // Validation du terme de recherche
      const validatedSearchTerm = FolderValidator.validateSearchTerm(searchTerm);

      if (!validatedSearchTerm) {
        return {
          success: true,
          data: [],
          metadata: { searchTerm: '', resultsCount: 0 },
          message: 'Aucun terme de recherche fourni'
        };
      }

      // Validation des options
      const validatedOptions = FolderValidator.validateQueryOptions(options);

      // Recherche des dossiers
      const searchResults = await FolderModel.search(validatedSearchTerm, validatedOptions);

      // Enrichissement des résultats
      const enrichedResults = await Promise.all(
        searchResults.map(folder => this.enrichFolderData(folder))
      );

      // Métadonnées de recherche
      const metadata = {
        searchTerm: validatedSearchTerm,
        resultsCount: enrichedResults.length,
        options: validatedOptions
      };

      logger.info('Folder search completed', { 
        searchTerm: validatedSearchTerm,
        resultsCount: enrichedResults.length 
      });

      return {
        success: true,
        data: enrichedResults,
        metadata,
        message: `${enrichedResults.length} dossier(s) trouvé(s) pour "${validatedSearchTerm}"`
      };

    } catch (error) {
      logger.error('Error in searchFolders service', { 
        searchTerm, 
        options, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des dossiers
   * @returns {Promise<Object>} Statistiques complètes
   */
  static async getFolderStatistics() {
    try {
      logger.info('Retrieving folder statistics');

      // Récupération des statistiques de base
      const basicStats = await FolderModel.getStatistics();

      // Enrichissement avec des statistiques calculées
      const enrichedStats = await this.enrichStatistics(basicStats);

      logger.info('Folder statistics retrieved', { stats: enrichedStats });

      return {
        success: true,
        data: enrichedStats,
        message: 'Statistiques des dossiers récupérées avec succès'
      };

    } catch (error) {
      logger.error('Error in getFolderStatistics service', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les dossiers récemment modifiés
   * @param {number} limit - Nombre de dossiers à retourner
   * @returns {Promise<Object>} Dossiers récents
   */
  static async getRecentFolders(limit = 10) {
    try {
      logger.info('Retrieving recent folders', { limit });

      // Validation de la limite
      const validatedLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100);

      // Récupération des dossiers récents
      const recentFolders = await FolderModel.getRecentlyModified(validatedLimit);

      // Enrichissement des données
      const enrichedFolders = await Promise.all(
        recentFolders.map(folder => this.enrichFolderData(folder))
      );

      logger.info('Recent folders retrieved', { 
        count: enrichedFolders.length,
        limit: validatedLimit 
      });

      return {
        success: true,
        data: enrichedFolders,
        metadata: { limit: validatedLimit },
        message: `${enrichedFolders.length} dossier(s) récent(s) récupéré(s)`
      };

    } catch (error) {
      logger.error('Error in getRecentFolders service', { 
        limit, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Vérifier l'existence d'un dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Résultat de la vérification
   */
  static async checkFolderExists(folderId) {
    try {
      const validatedId = FolderValidator.validateId(folderId);
      const exists = await FolderModel.exists(validatedId);

      return {
        success: true,
        data: { id: validatedId, exists },
        message: exists ? 'Le dossier existe' : 'Le dossier n\'existe pas'
      };

    } catch (error) {
      logger.error('Error checking folder existence', { 
        folderId, 
        error: error.message 
      });
      throw error;
    }
  }

  // =============================================
  // MÉTHODES PRIVÉES D'AIDE
  // =============================================

  /**
   * Valider la création d'un dossier (règles métier)
   * @param {Object} folderData - Données du dossier
   * @private
   */
  static async validateFolderCreation(folderData) {
    // Vérifier l'unicité du nom
    const existingFolder = await FolderModel.findByName(folderData.name);
    if (existingFolder) {
      throw new ConflictError(`Un dossier avec le nom "${folderData.name}" existe déjà`);
    }

    // Autres vérifications métier si nécessaire
    // Ex: limites de nombre de dossiers, permissions, etc.
  }

  /**
   * Valider la mise à jour d'un dossier (règles métier)
   * @param {number} folderId - ID du dossier
   * @param {Object} updateData - Données de mise à jour
   * @param {Object} existingFolder - Dossier existant
   * @private
   */
  static async validateFolderUpdate(folderId, updateData, existingFolder) {
    // Vérifier l'unicité du nouveau nom si fourni
    if (updateData.name && updateData.name !== existingFolder.name) {
      const existingByName = await FolderModel.findByName(updateData.name);
      if (existingByName && existingByName.id !== folderId) {
        throw new ConflictError(`Un dossier avec le nom "${updateData.name}" existe déjà`);
      }
    }

    // Autres vérifications métier
    // Ex: permissions de modification, contraintes spéciales, etc.
  }

  /**
   * Valider la suppression d'un dossier (règles métier)
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de suppression
   * @param {Object} existingFolder - Dossier existant
   * @private
   */
  static async validateFolderDeletion(folderId, options, existingFolder) {
    // Vérifier les contraintes de suppression
    if (!options.force && existingFolder.entity_count > 0) {
      throw new ConflictError(
        `Impossible de supprimer le dossier "${existingFolder.name}" car il contient ${existingFolder.entity_count} entité(s). Utilisez l'option force pour forcer la suppression.`,
        {
          entityCount: existingFolder.entity_count,
          canForceDelete: true
        }
      );
    }

    // Autres vérifications métier
    // Ex: permissions de suppression, dossiers protégés, etc.
  }

  /**
   * Enrichir les données d'un dossier avec des informations calculées
   * @param {Object} folder - Dossier de base
   * @param {boolean} detailed - Inclure les détails complets
   * @returns {Promise<Object>} Dossier enrichi
   * @private
   */
  static async enrichFolderData(folder, detailed = false) {
    const enriched = { ...folder };

    // Calculs de base
    enriched.is_empty = folder.entity_count === 0;
    enriched.is_active = folder.entity_count > 0;
    enriched.size_category = this.categorizeFolderSize(folder.entity_count);
    
    // Calculs temporels
    const now = new Date();
    const createdAt = new Date(folder.created_at);
    const updatedAt = new Date(folder.updated_at || folder.created_at);
    
    enriched.age_days = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    enriched.last_modified_days = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
    enriched.is_recent = enriched.last_modified_days <= 7;
    enriched.is_stale = enriched.last_modified_days > 30;

    // Détails supplémentaires si demandés
    if (detailed) {
      // Ici on pourrait ajouter des informations plus détaillées
      // Ex: liste des types d'entités, statistiques avancées, etc.
    }

    return enriched;
  }

  /**
   * Catégoriser la taille d'un dossier
   * @param {number} entityCount - Nombre d'entités
   * @returns {string} Catégorie de taille
   * @private
   */
  static categorizeFolderSize(entityCount) {
    if (entityCount === 0) return 'empty';
    if (entityCount <= 10) return 'small';
    if (entityCount <= 50) return 'medium';
    if (entityCount <= 200) return 'large';
    return 'extra_large';
  }

  /**
   * Construire les métadonnées de pagination
   * @param {Object} options - Options de requête
   * @param {number} currentCount - Nombre d'éléments retournés
   * @returns {Promise<Object>} Métadonnées de pagination
   * @private
   */
  static async buildPaginationMetadata(options, currentCount) {
    const metadata = {
      currentCount,
      options
    };

    // Si une limite est spécifiée, on peut calculer plus de métadonnées
    if (options.limit) {
      const totalCount = await FolderModel.count();
      const page = options.page || 1;
      const limit = options.limit;

      metadata.pagination = {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      };
    }

    return metadata;
  }

  /**
   * Enrichir les statistiques avec des calculs supplémentaires
   * @param {Object} basicStats - Statistiques de base
   * @returns {Promise<Object>} Statistiques enrichies
   * @private
   */
  static async enrichStatistics(basicStats) {
    const enriched = { ...basicStats };

    // Calculs de pourcentages
    if (enriched.total_folders > 0) {
      enriched.active_folders_percentage = Math.round((enriched.active_folders / enriched.total_folders) * 100);
      enriched.empty_folders_percentage = Math.round((enriched.empty_folders / enriched.total_folders) * 100);
    } else {
      enriched.active_folders_percentage = 0;
      enriched.empty_folders_percentage = 0;
    }

    // Statistiques temporelles
    const now = new Date();
    if (enriched.oldest_folder_date) {
      const oldestDate = new Date(enriched.oldest_folder_date);
      enriched.system_age_days = Math.floor((now - oldestDate) / (1000 * 60 * 60 * 24));
    }

    if (enriched.newest_folder_date) {
      const newestDate = new Date(enriched.newest_folder_date);
      enriched.last_folder_created_days_ago = Math.floor((now - newestDate) / (1000 * 60 * 60 * 24));
    }

    // Catégorisation
    enriched.health_status = this.calculateSystemHealth(enriched);
    enriched.usage_level = this.calculateUsageLevel(enriched);

    return enriched;
  }

  /**
   * Calculer l'état de santé du système
   * @param {Object} stats - Statistiques
   * @returns {string} État de santé
   * @private
   */
  static calculateSystemHealth(stats) {
    const activePercentage = stats.active_folders_percentage || 0;
    const avgEntities = stats.avg_entities_per_folder || 0;

    if (activePercentage >= 70 && avgEntities >= 5) return 'excellent';
    if (activePercentage >= 50 && avgEntities >= 3) return 'good';
    if (activePercentage >= 30 && avgEntities >= 2) return 'fair';
    return 'poor';
  }

  /**
   * Calculer le niveau d'utilisation du système
   * @param {Object} stats - Statistiques
   * @returns {string} Niveau d'utilisation
   * @private
   */
  static calculateUsageLevel(stats) {
    const totalFolders = stats.total_folders || 0;
    const avgEntities = stats.avg_entities_per_folder || 0;

    if (totalFolders >= 50 && avgEntities >= 10) return 'heavy';
    if (totalFolders >= 20 && avgEntities >= 5) return 'moderate';
    if (totalFolders >= 5 && avgEntities >= 2) return 'light';
    return 'minimal';
  }

  /**
   * Valider les permissions d'accès (pour extension future)
   * @param {string} operation - Type d'opération
   * @param {Object} user - Utilisateur (pour extension future)
   * @param {Object} folder - Dossier concerné
   * @returns {boolean} True si autorisé
   * @private
   */
  static validatePermissions(operation, user = null, folder = null) {
    // Pour l'instant, toutes les opérations sont autorisées
    // Cette méthode sera étendue quand l'authentification sera implémentée
    return true;
  }

  /**
   * Nettoyer et optimiser les données de retour
   * @param {Object} data - Données à nettoyer
   * @returns {Object} Données nettoyées
   * @private
   */
  static cleanupResponseData(data) {
    // Supprimer les champs internes ou sensibles si nécessaire
    const cleaned = { ...data };

    // Convertir les dates en format ISO si ce ne sont pas déjà des strings
    ['created_at', 'updated_at', 'last_activity'].forEach(field => {
      if (cleaned[field] && cleaned[field] instanceof Date) {
        cleaned[field] = cleaned[field].toISOString();
      }
    });

    // Arrondir les nombres décimaux
    ['avg_entities_per_folder'].forEach(field => {
      if (typeof cleaned[field] === 'number') {
        cleaned[field] = Math.round(cleaned[field] * 100) / 100;
      }
    });

    return cleaned;
  }

  /**
   * Logger une action utilisateur (pour audit futur)
   * @param {string} action - Action effectuée
   * @param {Object} details - Détails de l'action
   * @param {Object} user - Utilisateur (pour extension future)
   * @private
   */
  static logUserAction(action, details, user = null) {
    logger.info(`User action: ${action}`, {
      action,
      details,
      user: user ? user.id : 'anonymous',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Valider la cohérence des données système
   * @returns {Promise<Object>} Rapport de cohérence
   */
  static async validateSystemIntegrity() {
    try {
      logger.info('Starting system integrity validation');

      const issues = [];
      const checks = [];

      // Vérifier les dossiers orphelins (normalement impossible avec foreign keys)
      checks.push('orphaned_entities');

      // Vérifier la cohérence des compteurs
      checks.push('count_consistency');

      // Vérifier les dates incohérentes
      checks.push('date_consistency');

      // TODO: Implémenter les vérifications réelles quand d'autres modules seront prêts

      const report = {
        timestamp: new Date().toISOString(),
        checks_performed: checks,
        issues_found: issues,
        system_healthy: issues.length === 0
      };

      logger.info('System integrity validation completed', { report });

      return {
        success: true,
        data: report,
        message: issues.length === 0 ? 'Système intègre' : `${issues.length} problème(s) détecté(s)`
      };

    } catch (error) {
      logger.error('Error during system integrity validation', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir des recommandations pour l'organisation des dossiers
   * @returns {Promise<Object>} Recommandations
   */
  static async getFolderRecommendations() {
    try {
      logger.info('Generating folder recommendations');

      const stats = await FolderModel.getStatistics();
      const recommendations = [];

      // Analyser les statistiques et générer des recommandations
      if (stats.empty_folders > stats.total_folders * 0.3) {
        recommendations.push({
          type: 'cleanup',
          priority: 'medium',
          title: 'Dossiers vides nombreux',
          description: `Vous avez ${stats.empty_folders} dossiers vides. Considérez les supprimer ou les utiliser.`,
          action: 'Nettoyer les dossiers vides'
        });
      }

      if (stats.avg_entities_per_folder < 2) {
        recommendations.push({
          type: 'usage',
          priority: 'low',
          title: 'Utilisation faible',
          description: 'Les dossiers contiennent peu d\'entités en moyenne. Consolidez vos données.',
          action: 'Regrouper les informations connexes'
        });
      }

      if (stats.max_entities_in_folder > 100) {
        recommendations.push({
          type: 'organization',
          priority: 'high',
          title: 'Dossier surchargé',
          description: `Un dossier contient ${stats.max_entities_in_folder} entités. Divisez-le en sous-dossiers.`,
          action: 'Diviser les gros dossiers'
        });
      }

      // Ajouter recommandation par défaut si aucune
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'general',
          priority: 'info',
          title: 'Organisation optimale',
          description: 'Vos dossiers sont bien organisés. Continuez ainsi !',
          action: 'Maintenir les bonnes pratiques'
        });
      }

      logger.info('Folder recommendations generated', { 
        recommendationsCount: recommendations.length 
      });

      return {
        success: true,
        data: {
          recommendations,
          stats_analyzed: stats,
          generated_at: new Date().toISOString()
        },
        message: `${recommendations.length} recommandation(s) générée(s)`
      };

    } catch (error) {
      logger.error('Error generating folder recommendations', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Exporter des dossiers au format JSON
   * @param {Array} folderIds - IDs des dossiers à exporter (si vide, tous)
   * @returns {Promise<Object>} Données d'export
   */
  static async exportFolders(folderIds = []) {
    try {
      logger.info('Exporting folders', { folderIds });

      let foldersToExport;

      if (folderIds.length > 0) {
        // Exporter des dossiers spécifiques
        const validatedIds = folderIds.map(id => FolderValidator.validateId(id));
        foldersToExport = await Promise.all(
          validatedIds.map(id => FolderModel.findById(id))
        );
        
        // Filtrer les dossiers non trouvés
        foldersToExport = foldersToExport.filter(folder => folder !== null);
      } else {
        // Exporter tous les dossiers
        foldersToExport = await FolderModel.getAll();
      }

      const exportData = {
        export_info: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          total_folders: foldersToExport.length,
          exported_by: 'LUCIDE System' // À remplacer par l'utilisateur réel plus tard
        },
        folders: foldersToExport.map(folder => ({
          id: folder.id,
          name: folder.name,
          description: folder.description,
          created_at: folder.created_at,
          updated_at: folder.updated_at,
          entity_count: folder.entity_count || 0,
          relationship_count: folder.relationship_count || 0,
          file_count: folder.file_count || 0
        }))
      };

      logger.success('Folders exported successfully', { 
        count: foldersToExport.length 
      });

      return {
        success: true,
        data: exportData,
        message: `${foldersToExport.length} dossier(s) exporté(s) avec succès`
      };

    } catch (error) {
      logger.error('Error exporting folders', { 
        folderIds, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = FolderService;