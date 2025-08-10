// frontend/src/modules/export/services/exportService.js - Service d'export LUCIDE
import apiClient, { apiUtils, ApiError } from '../../../shared/services/api';

/**
 * Service pour la gestion des exports dans LUCIDE
 * Interface avec l'API backend pour les fonctionnalités d'export PDF, HTML et JSON
 */
class ExportService {

  /**
   * Configuration par défaut pour les exports
   */
  static get defaultConfig() {
    return {
      pdf: {
        format: 'A4',
        watermark: true,
        watermarkText: 'CONFIDENTIEL',
        includeRelationships: true,
        includeFiles: true
      },
      html: {
        includeRelationships: true,
        includeFiles: true
      },
      json: {
        format: 'pretty',
        includeMetadata: true
      }
    };
  }

  /**
   * Endpoints de l'API export
   */
  static get endpoints() {
    return {
      // Export d'entités
      entityPdf: (entityId) => `/api/export/entity/${entityId}/pdf`,
      entityHtml: (entityId) => `/api/export/entity/${entityId}/html`,
      entityJson: (entityId) => `/api/export/entity/${entityId}/json`,
      
      // Export de dossiers
      folderPdf: (folderId) => `/api/export/folder/${folderId}/pdf`,
      folderJson: (folderId) => `/api/export/folder/${folderId}/json`,
      
      // Export JSON générique
      json: (type, id) => `/api/export/${type}/${id}/json`,
      
      // Prévisualisation
      preview: (type, id) => `/api/export/preview/${type}/${id}`,
      
      // Rapports avancés
      networkAnalysis: (folderId) => `/api/export/reports/network-analysis/${folderId}`,
      investigationSummary: (folderId) => `/api/export/reports/investigation-summary/${folderId}`,
      customReport: '/api/export/reports/custom',
      
      // Métadonnées
      formats: '/api/export/formats',
      templates: '/api/export/templates',
      health: '/api/export/health'
    };
  }

  // =============================================
  // EXPORT D'ENTITÉS
  // =============================================

  /**
   * Exporter une entité en PDF
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options d'export
   * @returns {Promise<Blob>} Fichier PDF
   */
  static async exportEntityToPDF(entityId, options = {}) {
    try {
      const config = { ...this.defaultConfig.pdf, ...options };
      
      const response = await apiClient.get(this.endpoints.entityPdf(entityId), {
        params: config,
        headers: { Accept: 'application/pdf' }
      });

      if (!(response instanceof Blob)) {
        throw new ApiError('La réponse n\'est pas un fichier PDF valide');
      }

      // Déclencher le téléchargement automatique si demandé
      if (options.autoDownload !== false) {
        this.downloadBlob(response, this.generateFilename('entity', entityId, 'pdf'));
      }

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Export PDF entité');
    }
  }

  /**
   * Exporter une entité en HTML
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options d'export
   * @returns {Promise<Blob>} Fichier HTML
   */
  static async exportEntityToHTML(entityId, options = {}) {
    try {
      const config = { ...this.defaultConfig.html, ...options };
      
      const response = await apiClient.get(this.endpoints.entityHtml(entityId), {
        params: config,
        headers: { Accept: 'text/html' }
      });

      const blob = new Blob([response], { type: 'text/html' });

      if (options.autoDownload !== false) {
        this.downloadBlob(blob, this.generateFilename('entity', entityId, 'html'));
      }

      return blob;
    } catch (error) {
      throw this.handleExportError(error, 'Export HTML entité');
    }
  }

  /**
   * Exporter une entité en JSON
   * @param {number} entityId - ID de l'entité
   * @param {Object} options - Options d'export
   * @returns {Promise<Object>} Données JSON
   */
  static async exportEntityToJSON(entityId, options = {}) {
    try {
      const config = { ...this.defaultConfig.json, ...options };
      
      const response = await apiClient.get(this.endpoints.entityJson(entityId), {
        params: config
      });

      if (options.downloadAsFile) {
        const blob = new Blob([JSON.stringify(response, null, 2)], { 
          type: 'application/json' 
        });
        this.downloadBlob(blob, this.generateFilename('entity', entityId, 'json'));
      }

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Export JSON entité');
    }
  }

  // =============================================
  // EXPORT DE DOSSIERS
  // =============================================

  /**
   * Exporter un dossier en PDF
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options d'export
   * @returns {Promise<Blob>} Fichier PDF
   */
  static async exportFolderToPDF(folderId, options = {}) {
    try {
      const config = { 
        ...this.defaultConfig.pdf, 
        includeEntityDetails: false,
        ...options 
      };
      
      const response = await apiClient.get(this.endpoints.folderPdf(folderId), {
        params: config,
        headers: { Accept: 'application/pdf' }
      });

      if (!(response instanceof Blob)) {
        throw new ApiError('La réponse n\'est pas un fichier PDF valide');
      }

      if (options.autoDownload !== false) {
        this.downloadBlob(response, this.generateFilename('folder', folderId, 'pdf'));
      }

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Export PDF dossier');
    }
  }

  /**
   * Exporter un dossier en JSON
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options d'export
   * @returns {Promise<Object>} Données JSON
   */
  static async exportFolderToJSON(folderId, options = {}) {
    try {
      const config = { ...this.defaultConfig.json, ...options };
      
      const response = await apiClient.get(this.endpoints.folderJson(folderId), {
        params: config
      });

      if (options.downloadAsFile) {
        const blob = new Blob([JSON.stringify(response, null, 2)], { 
          type: 'application/json' 
        });
        this.downloadBlob(blob, this.generateFilename('folder', folderId, 'json'));
      }

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Export JSON dossier');
    }
  }

  // =============================================
  // RAPPORTS AVANCÉS
  // =============================================

  /**
   * Générer un rapport d'analyse réseau
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de rapport
   * @returns {Promise<Blob>} Fichier de rapport
   */
  static async generateNetworkAnalysisReport(folderId, options = {}) {
    try {
      const config = {
        format: 'PDF',
        watermark: true,
        includeMetrics: true,
        includeClusters: true,
        includeRecommendations: true,
        ...options
      };

      const response = await apiClient.get(this.endpoints.networkAnalysis(folderId), {
        params: config,
        headers: { Accept: config.format === 'PDF' ? 'application/pdf' : 'text/html' }
      });

      if (!(response instanceof Blob)) {
        throw new ApiError('La réponse n\'est pas un fichier valide');
      }

      if (options.autoDownload !== false) {
        const extension = config.format.toLowerCase();
        this.downloadBlob(response, this.generateFilename('network-analysis', folderId, extension));
      }

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Rapport d\'analyse réseau');
    }
  }

  /**
   * Générer un rapport de synthèse d'investigation
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options de rapport
   * @returns {Promise<Blob>} Fichier de rapport
   */
  static async generateInvestigationSummary(folderId, options = {}) {
    try {
      const config = {
        format: 'PDF',
        timeframe: 'all',
        includeTimeline: true,
        includeStatistics: true,
        classification: 'CONFIDENTIEL',
        ...options
      };

      const response = await apiClient.get(this.endpoints.investigationSummary(folderId), {
        params: config,
        headers: { Accept: config.format === 'PDF' ? 'application/pdf' : 'text/html' }
      });

      if (!(response instanceof Blob)) {
        throw new ApiError('La réponse n\'est pas un fichier valide');
      }

      if (options.autoDownload !== false) {
        const extension = config.format.toLowerCase();
        this.downloadBlob(response, this.generateFilename('investigation-summary', folderId, extension));
      }

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Rapport de synthèse d\'investigation');
    }
  }

  /**
   * Générer un rapport personnalisé
   * @param {Object} reportConfig - Configuration du rapport
   * @returns {Promise<Blob>} Fichier de rapport
   */
  static async generateCustomReport(reportConfig) {
    try {
      const {
        folderId,
        template,
        title,
        sections = [],
        format = 'PDF',
        customData = {},
        ...options
      } = reportConfig;

      if (!folderId) {
        throw new ApiError('ID du dossier requis pour le rapport personnalisé');
      }

      if (!template) {
        throw new ApiError('Template requis pour le rapport personnalisé');
      }

      const config = {
        folderId,
        template,
        title,
        sections,
        format,
        customData,
        ...options
      };

      const response = await apiClient.post(this.endpoints.customReport, config, {
        headers: { Accept: format === 'PDF' ? 'application/pdf' : 'text/html' }
      });

      if (!(response instanceof Blob)) {
        throw new ApiError('La réponse n\'est pas un fichier valide');
      }

      if (options.autoDownload !== false) {
        const extension = format.toLowerCase();
        this.downloadBlob(response, this.generateFilename('custom-report', folderId, extension));
      }

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Rapport personnalisé');
    }
  }

  // =============================================
  // PRÉVISUALISATION
  // =============================================

  /**
   * Prévisualiser un export
   * @param {string} type - Type d'élément (entity, folder)
   * @param {number} id - ID de l'élément
   * @param {Object} options - Options de prévisualisation
   * @returns {Promise<string>} HTML de prévisualisation
   */
  static async previewExport(type, id, options = {}) {
    try {
      const config = {
        template: type === 'entity' ? 'entity-report' : 'folder-summary',
        ...options
      };

      const response = await apiClient.get(this.endpoints.preview(type, id), {
        params: config,
        headers: { Accept: 'text/html' }
      });

      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Prévisualisation export');
    }
  }

  // =============================================
  // MÉTADONNÉES ET UTILITAIRES
  // =============================================

  /**
   * Obtenir les formats d'export disponibles
   * @returns {Promise<Object>} Formats disponibles
   */
  static async getAvailableFormats() {
    try {
      const response = await apiClient.get(this.endpoints.formats);
      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Récupération des formats');
    }
  }

  /**
   * Obtenir les templates disponibles
   * @returns {Promise<Array>} Liste des templates
   */
  static async getAvailableTemplates() {
    try {
      const response = await apiClient.get(this.endpoints.templates);
      return response.templates || [];
    } catch (error) {
      throw this.handleExportError(error, 'Récupération des templates');
    }
  }

  /**
   * Vérifier la santé du service d'export
   * @returns {Promise<Object>} État du service
   */
  static async checkHealth() {
    try {
      const response = await apiClient.get(this.endpoints.health);
      return response;
    } catch (error) {
      throw this.handleExportError(error, 'Vérification santé service');
    }
  }

  // =============================================
  // UTILITAIRES PRIVÉS
  // =============================================

  /**
   * Gérer les erreurs d'export
   * @param {Error} error - Erreur originale
   * @param {string} operation - Nom de l'opération
   * @returns {ApiError} Erreur formatée
   */
  static handleExportError(error, operation) {
    if (error instanceof ApiError) {
      return error;
    }

    const message = error.message || `Erreur lors de ${operation}`;
    return new ApiError(message, error.status || 0, { operation, originalError: error });
  }

  /**
   * Générer un nom de fichier pour l'export
   * @param {string} type - Type d'export
   * @param {number} id - ID de l'élément
   * @param {string} extension - Extension du fichier
   * @returns {string} Nom de fichier
   */
  static generateFilename(type, id, extension) {
    const timestamp = new Date().toISOString().split('T')[0];
    const typeMap = {
      entity: 'entite',
      folder: 'dossier',
      'network-analysis': 'analyse-reseau',
      'investigation-summary': 'synthese-investigation',
      'custom-report': 'rapport-personnalise'
    };

    const typeLabel = typeMap[type] || type;
    return `lucide-${typeLabel}-${id}-${timestamp}.${extension}`;
  }

  /**
   * Télécharger un blob comme fichier
   * @param {Blob} blob - Blob à télécharger
   * @param {string} filename - Nom du fichier
   */
  static downloadBlob(blob, filename) {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Nettoyer l'URL pour libérer la mémoire
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      throw new ApiError('Impossible de télécharger le fichier');
    }
  }

  /**
   * Valider les paramètres d'export
   * @param {string} type - Type d'export
   * @param {number} id - ID de l'élément
   * @param {Object} options - Options d'export
   * @returns {Object} Validation
   */
  static validateExportParams(type, id, options = {}) {
    const errors = [];

    // Valider le type
    const validTypes = ['entity', 'folder'];
    if (!validTypes.includes(type)) {
      errors.push(`Type invalide: ${type}. Types valides: ${validTypes.join(', ')}`);
    }

    // Valider l'ID
    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
      errors.push('ID invalide: doit être un entier positif');
    }

    // Valider le format si fourni
    if (options.format) {
      const validFormats = ['A4', 'A3', 'Letter', 'Legal'];
      if (!validFormats.includes(options.format)) {
        errors.push(`Format invalide: ${options.format}. Formats valides: ${validFormats.join(', ')}`);
      }
    }

    // Valider le texte de filigrane
    if (options.watermarkText && options.watermarkText.length > 50) {
      errors.push('Le texte du filigrane ne peut pas dépasser 50 caractères');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Créer un contrôleur d'annulation
   * @returns {AbortController} Contrôleur d'annulation
   */
  static createAbortController() {
    return apiUtils.createAbortController();
  }

  /**
   * Formater une taille de fichier
   * @param {number} bytes - Taille en bytes
   * @returns {string} Taille formatée
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtenir les statistiques du service
   * @returns {Object} Statistiques
   */
  static getServiceStats() {
    return {
      service: 'ExportService',
      version: '1.0.0',
      supportedFormats: ['PDF', 'HTML', 'JSON'],
      supportedTypes: ['entity', 'folder'],
      features: {
        watermark: true,
        preview: true,
        customReports: true,
        networkAnalysis: true,
        autoDownload: true
      }
    };
  }

  /**
   * Nettoyage des ressources
   */
  static cleanup() {
    // Nettoyer les URLs d'objets qui pourraient traîner
    if (window.URL && window.URL.revokeObjectURL) {
      // Note: Les URLs sont normalement nettoyées automatiquement
      // mais on peut forcer un nettoyage si nécessaire
    }
  }
}

export default ExportService;