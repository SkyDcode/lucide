// frontend/src/modules/folders/services/folderService.js - Service API pour les dossiers
import apiClient, { ApiError, apiUtils } from '../../../shared/services/api';

/**
 * Service pour la gestion des dossiers d'enquête
 * Encapsule toutes les interactions avec l'API backend
 */
class FolderService {
  
  /**
   * Endpoint de base pour les dossiers
   */
  static endpoint = '/folders';

  /**
   * Créer un nouveau dossier
   * @param {Object} folderData - Données du dossier
   * @param {string} folderData.name - Nom du dossier
   * @param {string} [folderData.description] - Description du dossier
   * @returns {Promise<Object>} Dossier créé
   */
  static async createFolder(folderData) {
    try {
      const response = await apiClient.post(this.endpoint, folderData);
      return this.formatFolderResponse(response.data);
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la création du dossier');
    }
  }

  /**
   * Récupérer tous les dossiers
   * @param {Object} options - Options de récupération
   * @param {string} [options.orderBy] - Champ de tri
   * @param {string} [options.direction] - Direction du tri (ASC/DESC)
   * @param {number} [options.limit] - Limite de résultats
   * @param {string} [options.search] - Terme de recherche
   * @param {number} [options.page] - Numéro de page
   * @returns {Promise<Object>} Liste des dossiers avec métadonnées
   */
  static async getAllFolders(options = {}) {
    try {
      const params = this.buildQueryParams(options);
      const response = await apiClient.get(this.endpoint, { params });
      
      return {
        folders: response.data.map(folder => this.formatFolderResponse(folder)),
        metadata: response.metadata || {},
        total: response.data.length
      };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la récupération des dossiers');
    }
  }

  /**
   * Récupérer un dossier par son ID
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Dossier trouvé
   */
  static async getFolderById(folderId) {
    try {
      this.validateId(folderId);
      const response = await apiClient.get(`${this.endpoint}/${folderId}`);
      return this.formatFolderResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la récupération du dossier ${folderId}`);
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
      this.validateId(folderId);
      const response = await apiClient.put(`${this.endpoint}/${folderId}`, updateData);
      return this.formatFolderResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la mise à jour du dossier ${folderId}`);
    }
  }

  /**
   * Mise à jour partielle d'un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} updateData - Données de mise à jour partielle
   * @returns {Promise<Object>} Dossier mis à jour
   */
  static async patchFolder(folderId, updateData) {
    try {
      this.validateId(folderId);
      const response = await apiClient.patch(`${this.endpoint}/${folderId}`, updateData);
      return this.formatFolderResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la mise à jour du dossier ${folderId}`);
    }
  }

  /**
   * Supprimer un dossier
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de suppression
   * @param {boolean} [options.force] - Forcer la suppression
   * @returns {Promise<Object>} Résultat de la suppression
   */
  static async deleteFolder(folderId, options = {}) {
    try {
      this.validateId(folderId);
      const params = options.force ? { force: true } : {};
      const response = await apiClient.delete(`${this.endpoint}/${folderId}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la suppression du dossier ${folderId}`);
    }
  }

  /**
   * Vérifier l'existence d'un dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<boolean>} True si le dossier existe
   */
  static async folderExists(folderId) {
    try {
      this.validateId(folderId);
      const response = await apiClient.head(`${this.endpoint}/${folderId}`);
      return response.ok;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw this.handleError(error, `Erreur lors de la vérification du dossier ${folderId}`);
    }
  }

  /**
   * Rechercher des dossiers
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Résultats de recherche
   */
  static async searchFolders(searchTerm, options = {}) {
    try {
      const params = {
        q: searchTerm,
        ...this.buildQueryParams(options)
      };
      
      const response = await apiClient.get(`${this.endpoint}/search`, { params });
      
      return {
        folders: response.data.map(folder => this.formatFolderResponse(folder)),
        metadata: response.metadata || {},
        searchTerm,
        total: response.data.length
      };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la recherche de dossiers');
    }
  }

  /**
   * Obtenir les statistiques des dossiers
   * @returns {Promise<Object>} Statistiques
   */
  static async getFolderStatistics() {
    try {
      const response = await apiClient.get(`${this.endpoint}/statistics`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la récupération des statistiques');
    }
  }

  /**
   * Obtenir les dossiers récents
   * @param {number} limit - Nombre de dossiers à récupérer
   * @returns {Promise<Object>} Dossiers récents
   */
  static async getRecentFolders(limit = 10) {
    try {
      const response = await apiClient.get(`${this.endpoint}/recent`, {
        params: { limit }
      });
      
      return {
        folders: response.data.map(folder => this.formatFolderResponse(folder)),
        metadata: response.metadata || {}
      };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la récupération des dossiers récents');
    }
  }

  /**
   * Dupliquer un dossier
   * @param {number} folderId - ID du dossier à dupliquer
   * @param {Object} options - Options de duplication
   * @param {string} [options.name] - Nom du dossier dupliqué
   * @param {string} [options.description] - Description du dossier dupliqué
   * @returns {Promise<Object>} Dossier dupliqué
   */
  static async duplicateFolder(folderId, options = {}) {
    try {
      this.validateId(folderId);
      const response = await apiClient.post(`${this.endpoint}/${folderId}/duplicate`, options);
      return {
        original: response.data.original,
        duplicate: this.formatFolderResponse(response.data.duplicate)
      };
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la duplication du dossier ${folderId}`);
    }
  }

  /**
   * Archiver un dossier
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Dossier archivé
   */
  static async archiveFolder(folderId) {
    try {
      this.validateId(folderId);
      const response = await apiClient.post(`${this.endpoint}/${folderId}/archive`);
      return this.formatFolderResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Erreur lors de l'archivage du dossier ${folderId}`);
    }
  }

  /**
   * Restaurer un dossier archivé
   * @param {number} folderId - ID du dossier
   * @returns {Promise<Object>} Dossier restauré
   */
  static async restoreFolder(folderId) {
    try {
      this.validateId(folderId);
      const response = await apiClient.post(`${this.endpoint}/${folderId}/restore`);
      return this.formatFolderResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Erreur lors de la restauration du dossier ${folderId}`);
    }
  }

  /**
   * Exporter des dossiers
   * @param {Array} folderIds - IDs des dossiers à exporter (optionnel)
   * @returns {Promise<Blob>} Fichier d'export
   */
  static async exportFolders(folderIds = []) {
    try {
      const response = await apiClient.post(`${this.endpoint}/export`, 
        { folderIds },
        { 
          headers: { 'Accept': 'application/json' }
        }
      );
      
      // Créer un blob pour le téléchargement
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: 'application/json'
      });
      
      return blob;
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de l\'export des dossiers');
    }
  }

  /**
   * Obtenir plusieurs dossiers par IDs (batch)
   * @param {Array} folderIds - IDs des dossiers
   * @returns {Promise<Object>} Dossiers récupérés
   */
  static async getFoldersBatch(folderIds) {
    try {
      if (!Array.isArray(folderIds) || folderIds.length === 0) {
        throw new Error('Liste d\'IDs requise');
      }

      const response = await apiClient.post(`${this.endpoint}/batch`, { folderIds });
      
      return {
        folders: response.data.folders.map(folder => this.formatFolderResponse(folder)),
        errors: response.data.errors || [],
        stats: response.data.stats || {}
      };
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la récupération en batch');
    }
  }

  /**
   * Valider des données de dossier
   * @param {Object} folderData - Données à valider
   * @param {string} operation - Opération (create/update)
   * @returns {Promise<Object>} Résultat de la validation
   */
  static async validateFolderData(folderData, operation = 'create') {
    try {
      const response = await apiClient.post(`${this.endpoint}/validate`, {
        ...folderData,
        operation
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Erreur lors de la validation des données');
    }
  }

  /**
   * Obtenir le nombre total de dossiers
   * @param {Object} filters - Filtres de comptage
   * @returns {Promise<number>} Nombre de dossiers
   */
  static async getFolderCount(filters = {}) {
    try {
      const params = this.buildQueryParams(filters);
      const response = await apiClient.get(`${this.endpoint}/count`, { params });
      return response.data.count;
    } catch (error) {
      throw this.handleError(error, 'Erreur lors du comptage des dossiers');
    }
  }

  /**
   * Health check du service dossiers
   * @returns {Promise<Object>} État du service
   */
  static async healthCheck() {
    try {
      const response = await apiClient.get(`${this.endpoint}/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Erreur lors du health check');
    }
  }

  // ===========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ===========================================

  /**
   * Construire les paramètres de requête
   * @param {Object} options - Options
   * @returns {Object} Paramètres formatés
   */
  static buildQueryParams(options = {}) {
    const params = {};
    
    // Paramètres de tri
    if (options.orderBy) params.orderBy = options.orderBy;
    if (options.direction) params.direction = options.direction.toUpperCase();
    
    // Pagination
    if (options.limit) params.limit = Math.min(Math.max(1, parseInt(options.limit)), 1000);
    if (options.page) params.page = Math.max(1, parseInt(options.page));
    
    // Recherche
    if (options.search) params.search = options.search.trim();
    
    return params;
  }

  /**
   * Valider un ID de dossier
   * @param {any} id - ID à valider
   * @throws {Error} Si l'ID est invalide
   */
  static validateId(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error('ID de dossier invalide');
    }
  }

  /**
   * Formater la réponse d'un dossier
   * @param {Object} folder - Dossier brut de l'API
   * @returns {Object} Dossier formaté
   */
  static formatFolderResponse(folder) {
    if (!folder) return null;

    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      createdAt: new Date(folder.created_at),
      updatedAt: new Date(folder.updated_at),
      entityCount: folder.entity_count || 0,
      relationshipCount: folder.relationship_count || 0,
      fileCount: folder.file_count || 0,
      lastActivity: folder.last_activity ? new Date(folder.last_activity) : null,
      
      // Propriétés calculées
      isEmpty: folder.entity_count === 0,
      isActive: folder.entity_count > 0,
      sizeCategory: this.getSizeCategory(folder.entity_count || 0),
      
      // Propriétés temporelles
      ageDays: this.calculateDaysSince(folder.created_at),
      lastModifiedDays: this.calculateDaysSince(folder.updated_at),
      isRecent: this.calculateDaysSince(folder.updated_at) <= 7,
      isStale: this.calculateDaysSince(folder.updated_at) > 30,
      
      // Métadonnées enrichies
      isArchived: folder.name && folder.name.startsWith('[ARCHIVÉ]'),
      
      // Données brutes pour compatibilité
      raw: folder
    };
  }

  /**
   * Catégoriser la taille d'un dossier
   * @param {number} entityCount - Nombre d'entités
   * @returns {string} Catégorie de taille
   */
  static getSizeCategory(entityCount) {
    if (entityCount === 0) return 'empty';
    if (entityCount <= 10) return 'small';
    if (entityCount <= 50) return 'medium';
    if (entityCount <= 200) return 'large';
    return 'extra_large';
  }

  /**
   * Calculer le nombre de jours depuis une date
   * @param {string} dateString - Date au format ISO
   * @returns {number} Nombre de jours
   */
  static calculateDaysSince(dateString) {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  /**
   * Gérer les erreurs de l'API
   * @param {Error} error - Erreur originale
   * @param {string} defaultMessage - Message par défaut
   * @returns {Error} Erreur formatée
   */
  static handleError(error, defaultMessage) {
    if (error instanceof ApiError) {
      // Enrichir l'erreur avec un contexte spécifique aux dossiers
      const enrichedError = new ApiError(
        error.getUserFriendlyMessage(),
        error.status,
        {
          ...error.data,
          context: 'folders',
          defaultMessage
        }
      );
      return enrichedError;
    }

    // Erreur générique
    return new Error(defaultMessage + ': ' + error.message);
  }

  /**
   * Créer un AbortController pour annuler les requêtes
   * @returns {AbortController} Contrôleur d'annulation
   */
  static createAbortController() {
    return apiUtils.createAbortController();
  }

  /**
   * Télécharger un fichier d'export
   * @param {Blob} blob - Données à télécharger
   * @param {string} filename - Nom du fichier
   */
  static downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Formater une erreur pour l'affichage utilisateur
   * @param {Error} error - Erreur à formater
   * @returns {Object} Erreur formatée
   */
  static formatErrorForUser(error) {
    if (error instanceof ApiError) {
      return apiUtils.formatError(error);
    }

    return {
      message: error.message || 'Une erreur inattendue s\'est produite',
      technical: error.toString(),
      status: 0,
      timestamp: new Date().toISOString()
    };
  }

  // ===========================================
  // MÉTHODES UTILITAIRES PUBLIQUES
  // ===========================================

  /**
   * Valider les données d'un dossier côté client
   * @param {Object} folderData - Données du dossier
   * @param {string} operation - Opération (create/update)
   * @returns {Object} Résultat de la validation
   */
  static validateFolderDataClient(folderData, operation = 'create') {
    const errors = [];

    // Validation du nom
    if (operation === 'create' && (!folderData.name || folderData.name.trim().length === 0)) {
      errors.push({
        field: 'name',
        message: 'Le nom du dossier est obligatoire'
      });
    }

    if (folderData.name && folderData.name.trim().length > 255) {
      errors.push({
        field: 'name',
        message: 'Le nom du dossier ne peut pas dépasser 255 caractères'
      });
    }

    // Validation de la description
    if (folderData.description && folderData.description.length > 2000) {
      errors.push({
        field: 'description',
        message: 'La description ne peut pas dépasser 2000 caractères'
      });
    }

    // Validation des caractères interdits
    if (folderData.name && /[<>:"/\\|?*\x00-\x1F]/.test(folderData.name)) {
      errors.push({
        field: 'name',
        message: 'Le nom contient des caractères non autorisés'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtenir les options de tri disponibles
   * @returns {Array} Options de tri
   */
  static getSortOptions() {
    return [
      { value: 'name', label: 'Nom', direction: 'ASC' },
      { value: 'created_at', label: 'Date de création', direction: 'DESC' },
      { value: 'updated_at', label: 'Dernière modification', direction: 'DESC' },
      { value: 'entity_count', label: 'Nombre d\'entités', direction: 'DESC' },
      { value: 'last_activity', label: 'Dernière activité', direction: 'DESC' }
    ];
  }

  /**
   * Obtenir les catégories de taille avec leurs labels
   * @returns {Object} Catégories de taille
   */
  static getSizeCategories() {
    return {
      empty: { label: 'Vide', description: 'Aucune entité', color: '#9ca3af' },
      small: { label: 'Petit', description: '1-10 entités', color: '#10b981' },
      medium: { label: 'Moyen', description: '11-50 entités', color: '#f59e0b' },
      large: { label: 'Grand', description: '51-200 entités', color: '#ef4444' },
      extra_large: { label: 'Très grand', description: '200+ entités', color: '#7c3aed' }
    };
  }

  /**
   * Calculer des métriques sur une liste de dossiers
   * @param {Array} folders - Liste des dossiers
   * @returns {Object} Métriques calculées
   */
  static calculateMetrics(folders = []) {
    if (folders.length === 0) {
      return {
        total: 0,
        empty: 0,
        active: 0,
        archived: 0,
        recent: 0,
        stale: 0,
        averageEntities: 0,
        totalEntities: 0
      };
    }

    const metrics = folders.reduce((acc, folder) => {
      acc.total++;
      if (folder.isEmpty) acc.empty++;
      if (folder.isActive) acc.active++;
      if (folder.isArchived) acc.archived++;
      if (folder.isRecent) acc.recent++;
      if (folder.isStale) acc.stale++;
      acc.totalEntities += folder.entityCount;
      return acc;
    }, {
      total: 0,
      empty: 0,
      active: 0,
      archived: 0,
      recent: 0,
      stale: 0,
      totalEntities: 0
    });

    metrics.averageEntities = Math.round(metrics.totalEntities / metrics.total * 100) / 100;

    return metrics;
  }

  /**
   * Filtrer une liste de dossiers selon des critères
   * @param {Array} folders - Liste des dossiers
   * @param {Object} filters - Critères de filtrage
   * @returns {Array} Dossiers filtrés
   */
  static filterFolders(folders = [], filters = {}) {
    return folders.filter(folder => {
      // Filtre par nom/description
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const nameMatch = folder.name.toLowerCase().includes(searchTerm);
        const descMatch = folder.description && 
          folder.description.toLowerCase().includes(searchTerm);
        if (!nameMatch && !descMatch) return false;
      }

      // Filtre par catégorie de taille
      if (filters.sizeCategory && folder.sizeCategory !== filters.sizeCategory) {
        return false;
      }

      // Filtre par statut archivé
      if (filters.archived !== undefined && folder.isArchived !== filters.archived) {
        return false;
      }

      // Filtre par activité récente
      if (filters.recent !== undefined && folder.isRecent !== filters.recent) {
        return false;
      }

      // Filtre par dossiers vides
      if (filters.empty !== undefined && folder.isEmpty !== filters.empty) {
        return false;
      }

      return true;
    });
  }

  /**
   * Trier une liste de dossiers
   * @param {Array} folders - Liste des dossiers
   * @param {string} orderBy - Champ de tri
   * @param {string} direction - Direction (ASC/DESC)
   * @returns {Array} Dossiers triés
   */
  static sortFolders(folders = [], orderBy = 'created_at', direction = 'DESC') {
    const sortedFolders = [...folders];
    
    sortedFolders.sort((a, b) => {
      let valueA, valueB;

      switch (orderBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'entity_count':
          valueA = a.entityCount;
          valueB = b.entityCount;
          break;
        case 'created_at':
          valueA = a.createdAt;
          valueB = b.createdAt;
          break;
        case 'updated_at':
          valueA = a.updatedAt;
          valueB = b.updatedAt;
          break;
        case 'last_activity':
          valueA = a.lastActivity || a.updatedAt;
          valueB = b.lastActivity || b.updatedAt;
          break;
        default:
          valueA = a.createdAt;
          valueB = b.createdAt;
      }

      if (valueA < valueB) return direction === 'ASC' ? -1 : 1;
      if (valueA > valueB) return direction === 'ASC' ? 1 : -1;
      return 0;
    });

    return sortedFolders;
  }
}

export default FolderService;