// frontend/src/modules/export/hooks/useExport.js - Hook React pour la gestion des exports
import { useState, useCallback, useRef, useEffect } from 'react';
import ExportService from '../services/exportService';

/**
 * Hook personnalisé pour la gestion des exports LUCIDE
 * Encapsule la logique d'export PDF, HTML, JSON et rapports avancés
 */
export function useExport(options = {}) {
  const {
    autoDownload = true,
    showSuccessNotification = true,
    showErrorNotification = true
  } = options;

  // État principal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [lastExport, setLastExport] = useState(null);

  // États spéifiques par type d'export
  const [exportingEntity, setExportingEntity] = useState(false);
  const [exportingFolder, setExportingFolder] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Références pour annulation
  const abortControllerRef = useRef(null);
  const lastExportRef = useRef(null);

  /**
   * Nettoyer l'état d'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Annuler l'export en cours
   */
  const cancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setExportingEntity(false);
      setExportingFolder(false);
      setGeneratingReport(false);
      setProgress(0);
    }
  }, []);

  /**
   * Gérer les erreurs d'export
   */
  const handleExportError = useCallback((error, operation) => {
    const formattedError = {
      message: error.getUserFriendlyMessage?.() || error.message,
      operation,
      timestamp: new Date().toISOString(),
      technical: error.message,
      status: error.status
    };

    setError(formattedError);
    
    if (showErrorNotification) {
      // Notification d'erreur (à implémenter avec un système de notifications)
      console.error(`Erreur ${operation}:`, formattedError);
    }

    throw formattedError;
  }, [showErrorNotification]);

  /**
   * Gérer le succès d'export
   */
  const handleExportSuccess = useCallback((result, operation, metadata = {}) => {
    const exportInfo = {
      operation,
      timestamp: new Date().toISOString(),
      size: result instanceof Blob ? result.size : undefined,
      formattedSize: result instanceof Blob ? ExportService.formatFileSize(result.size) : undefined,
      metadata
    };

    setLastExport(exportInfo);
    lastExportRef.current = exportInfo;

    if (showSuccessNotification) {
      // Notification de succès (à implémenter avec un système de notifications)
      console.log(`${operation} réussi:`, exportInfo);
    }

    return result;
  }, [showSuccessNotification]);

  /**
   * Wrapper générique pour les exports
   */
  const executeExport = useCallback(async (exportFn, operation, setSpecificLoading) => {
    try {
      setLoading(true);
      setSpecificLoading?.(true);
      setError(null);
      setProgress(0);

      // Créer un contrôleur d'annulation
      abortControllerRef.current = ExportService.createAbortController();

      // Simuler le progrès (adaptatif selon l'opération)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 20, 90));
      }, 200);

      const result = await exportFn();
      
      clearInterval(progressInterval);
      setProgress(100);

      // Attendre un court délai pour voir le progrès complet
      await new Promise(resolve => setTimeout(resolve, 300));

      return handleExportSuccess(result, operation);

    } catch (error) {
      handleExportError(error, operation);
    } finally {
      setLoading(false);
      setSpecificLoading?.(false);
      setProgress(0);
      abortControllerRef.current = null;
    }
  }, [handleExportSuccess, handleExportError]);

  // =============================================
  // EXPORT D'ENTITÉS
  // =============================================

  /**
   * Exporter une entité en PDF
   */
  const exportEntityPDF = useCallback(async (entityId, options = {}) => {
    const mergedOptions = { autoDownload, ...options };
    
    return executeExport(
      () => ExportService.exportEntityToPDF(entityId, mergedOptions),
      'Export PDF entité',
      setExportingEntity
    );
  }, [autoDownload, executeExport]);

  /**
   * Exporter une entité en HTML
   */
  const exportEntityHTML = useCallback(async (entityId, options = {}) => {
    const mergedOptions = { autoDownload, ...options };
    
    return executeExport(
      () => ExportService.exportEntityToHTML(entityId, mergedOptions),
      'Export HTML entité',
      setExportingEntity
    );
  }, [autoDownload, executeExport]);

  /**
   * Exporter une entité en JSON
   */
  const exportEntityJSON = useCallback(async (entityId, options = {}) => {
    const mergedOptions = { downloadAsFile: autoDownload, ...options };
    
    return executeExport(
      () => ExportService.exportEntityToJSON(entityId, mergedOptions),
      'Export JSON entité',
      setExportingEntity
    );
  }, [autoDownload, executeExport]);

  // =============================================
  // EXPORT DE DOSSIERS
  // =============================================

  /**
   * Exporter un dossier en PDF
   */
  const exportFolderPDF = useCallback(async (folderId, options = {}) => {
    const mergedOptions = { autoDownload, ...options };
    
    return executeExport(
      () => ExportService.exportFolderToPDF(folderId, mergedOptions),
      'Export PDF dossier',
      setExportingFolder
    );
  }, [autoDownload, executeExport]);

  /**
   * Exporter un dossier en JSON
   */
  const exportFolderJSON = useCallback(async (folderId, options = {}) => {
    const mergedOptions = { downloadAsFile: autoDownload, ...options };
    
    return executeExport(
      () => ExportService.exportFolderToJSON(folderId, mergedOptions),
      'Export JSON dossier',
      setExportingFolder
    );
  }, [autoDownload, executeExport]);

  // =============================================
  // RAPPORTS AVANCÉS
  // =============================================

  /**
   * Générer un rapport d'analyse réseau
   */
  const generateNetworkAnalysis = useCallback(async (folderId, options = {}) => {
    const mergedOptions = { autoDownload, ...options };
    
    return executeExport(
      () => ExportService.generateNetworkAnalysisReport(folderId, mergedOptions),
      'Rapport d\'analyse réseau',
      setGeneratingReport
    );
  }, [autoDownload, executeExport]);

  /**
   * Générer un rapport de synthèse d'investigation
   */
  const generateInvestigationSummary = useCallback(async (folderId, options = {}) => {
    const mergedOptions = { autoDownload, ...options };
    
    return executeExport(
      () => ExportService.generateInvestigationSummary(folderId, mergedOptions),
      'Rapport de synthèse d\'investigation',
      setGeneratingReport
    );
  }, [autoDownload, executeExport]);

  /**
   * Générer un rapport personnalisé
   */
  const generateCustomReport = useCallback(async (reportConfig) => {
    const mergedConfig = { autoDownload, ...reportConfig };
    
    return executeExport(
      () => ExportService.generateCustomReport(mergedConfig),
      'Rapport personnalisé',
      setGeneratingReport
    );
  }, [autoDownload, executeExport]);

  // =============================================
  // PRÉVISUALISATION
  // =============================================

  /**
   * Prévisualiser un export
   */
  const previewExport = useCallback(async (type, id, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const html = await ExportService.previewExport(type, id, options);
      
      handleExportSuccess(html, 'Prévisualisation export', { type, id });
      return html;

    } catch (error) {
      handleExportError(error, 'Prévisualisation export');
    } finally {
      setLoading(false);
    }
  }, [handleExportSuccess, handleExportError]);

  // =============================================
  // MÉTADONNÉES ET UTILITAIRES
  // =============================================

  /**
   * Obtenir les formats disponibles
   */
  const getAvailableFormats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const formats = await ExportService.getAvailableFormats();
      return formats;

    } catch (error) {
      handleExportError(error, 'Récupération des formats');
    } finally {
      setLoading(false);
    }
  }, [handleExportError]);

  /**
   * Obtenir les templates disponibles
   */
  const getAvailableTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const templates = await ExportService.getAvailableTemplates();
      return templates;

    } catch (error) {
      handleExportError(error, 'Récupération des templates');
    } finally {
      setLoading(false);
    }
  }, [handleExportError]);

  /**
   * Vérifier la santé du service
   */
  const checkServiceHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const health = await ExportService.checkHealth();
      return health;

    } catch (error) {
      handleExportError(error, 'Vérification santé service');
    } finally {
      setLoading(false);
    }
  }, [handleExportError]);

  /**
   * Valider les paramètres d'export
   */
  const validateExportParams = useCallback((type, id, options = {}) => {
    return ExportService.validateExportParams(type, id, options);
  }, []);

  /**
   * Obtenir les informations du dernier export
   */
  const getLastExportInfo = useCallback(() => {
    return lastExportRef.current;
  }, []);

  /**
   * Réinitialiser l'état du hook
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setProgress(0);
    setLastExport(null);
    setExportingEntity(false);
    setExportingFolder(false);
    setGeneratingReport(false);
    lastExportRef.current = null;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // État principal
    loading,
    error,
    progress,
    lastExport,

    // États spécifiques
    exportingEntity,
    exportingFolder,
    generatingReport,

    // Export d'entités
    exportEntityPDF,
    exportEntityHTML,
    exportEntityJSON,

    // Export de dossiers
    exportFolderPDF,
    exportFolderJSON,

    // Rapports avancés
    generateNetworkAnalysis,
    generateInvestigationSummary,
    generateCustomReport,

    // Prévisualisation
    previewExport,

    // Métadonnées
    getAvailableFormats,
    getAvailableTemplates,
    checkServiceHealth,

    // Utilitaires
    validateExportParams,
    getLastExportInfo,
    clearError,
    cancelExport,
    reset,

    // État dérivé
    canExport: !loading,
    hasError: error !== null,
    isReady: !loading && !error
  };
}

/**
 * Hook spécialisé pour l'export par lot
 */
export function useBatchExport() {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState(null);

  const { exportEntityPDF, exportFolderPDF, exportEntityJSON, exportFolderJSON } = useExport({
    autoDownload: false,
    showSuccessNotification: false,
    showErrorNotification: false
  });

  /**
   * Ajouter des éléments au lot
   */
  const addToBatch = useCallback((newItems) => {
    setItems(prev => [...prev, ...newItems]);
  }, []);

  /**
   * Supprimer un élément du lot
   */
  const removeFromBatch = useCallback((itemToRemove) => {
    setItems(prev => prev.filter(item => 
      !(item.type === itemToRemove.type && item.id === itemToRemove.id)
    ));
  }, []);

  /**
   * Vider le lot
   */
  const clearBatch = useCallback(() => {
    setItems([]);
    setCurrentIndex(0);
    setResults([]);
    setBatchError(null);
  }, []);

  /**
   * Exporter tous les éléments du lot
   */
  const exportBatch = useCallback(async (format = 'PDF', options = {}) => {
    if (items.length === 0) return;

    try {
      setBatchLoading(true);
      setBatchError(null);
      setResults([]);
      setCurrentIndex(0);

      const batchResults = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setCurrentIndex(i);

        try {
          let result;
          
          if (item.type === 'entity') {
            result = format === 'PDF' 
              ? await exportEntityPDF(item.id, { ...options, autoDownload: false })
              : await exportEntityJSON(item.id, { ...options, downloadAsFile: false });
          } else if (item.type === 'folder') {
            result = format === 'PDF'
              ? await exportFolderPDF(item.id, { ...options, autoDownload: false })
              : await exportFolderJSON(item.id, { ...options, downloadAsFile: false });
          }

          batchResults.push({
            item,
            success: true,
            result,
            index: i
          });

        } catch (error) {
          batchResults.push({
            item,
            success: false,
            error: error.message,
            index: i
          });
        }
      }

      setResults(batchResults);
      return batchResults;

    } catch (error) {
      setBatchError(error.message);
      throw error;
    } finally {
      setBatchLoading(false);
      setCurrentIndex(0);
    }
  }, [items, exportEntityPDF, exportEntityJSON, exportFolderPDF, exportFolderJSON]);

  /**
   * Calculer le progrès du lot
   */
  const getBatchProgress = useCallback(() => {
    if (items.length === 0) return 0;
    return Math.round((currentIndex / items.length) * 100);
  }, [items.length, currentIndex]);

  return {
    // État du lot
    items,
    currentIndex,
    results,
    batchLoading,
    batchError,

    // Actions
    addToBatch,
    removeFromBatch,
    clearBatch,
    exportBatch,

    // Utilitaires
    getBatchProgress,
    
    // État dérivé
    batchSize: items.length,
    isEmpty: items.length === 0,
    isProcessing: batchLoading,
    hasResults: results.length > 0,
    successCount: results.filter(r => r.success).length,
    errorCount: results.filter(r => !r.success).length
  };
}

/**
 * Hook pour les templates d'export
 */
export function useExportTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getAvailableTemplates } = useExport({
    showSuccessNotification: false,
    showErrorNotification: false
  });

  /**
   * Charger les templates
   */
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const templatesData = await getAvailableTemplates();
      setTemplates(templatesData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAvailableTemplates]);

  /**
   * Filtrer les templates par type
   */
  const getTemplatesByType = useCallback((type) => {
    return templates.filter(template => 
      template.supportedTypes?.includes(type) || !template.supportedTypes
    );
  }, [templates]);

  /**
   * Obtenir un template par nom
   */
  const getTemplateByName = useCallback((name) => {
    return templates.find(template => template.name === name);
  }, [templates]);

  // Charger les templates au montage
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    
    loadTemplates,
    getTemplatesByType,
    getTemplateByName,
    
    isEmpty: templates.length === 0,
    isReady: !loading && !error
  };
}

/**
 * Hook pour la prévisualisation d'exports
 */
export function useExportPreview() {
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const { previewExport } = useExport({
    showSuccessNotification: false,
    showErrorNotification: false
  });

  /**
   * Générer une prévisualisation
   */
  const generatePreview = useCallback(async (type, id, options = {}) => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      
      const html = await previewExport(type, id, options);
      setPreviewContent(html);
      setPreviewVisible(true);
      
      return html;
      
    } catch (error) {
      setPreviewError(error.message);
      throw error;
    } finally {
      setPreviewLoading(false);
    }
  }, [previewExport]);

  /**
   * Fermer la prévisualisation
   */
  const closePreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  /**
   * Effacer la prévisualisation
   */
  const clearPreview = useCallback(() => {
    setPreviewContent('');
    setPreviewVisible(false);
    setPreviewError(null);
  }, []);

  return {
    previewContent,
    previewLoading,
    previewError,
    previewVisible,
    
    generatePreview,
    closePreview,
    clearPreview,
    
    hasContent: previewContent.length > 0,
    isReady: !previewLoading && !previewError
  };
}

/**
 * Hook pour les statistiques d'export
 */
export function useExportStatistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Calculer les statistiques d'export
   */
  const calculateStats = useCallback((exports = []) => {
    const statistics = {
      total: exports.length,
      byType: {},
      byFormat: {},
      byDate: {},
      totalSize: 0,
      averageSize: 0,
      lastWeek: 0,
      lastMonth: 0
    };

    exports.forEach(exp => {
      // Par type
      statistics.byType[exp.type] = (statistics.byType[exp.type] || 0) + 1;
      
      // Par format
      statistics.byFormat[exp.format] = (statistics.byFormat[exp.format] || 0) + 1;
      
      // Par date
      const date = new Date(exp.timestamp).toDateString();
      statistics.byDate[date] = (statistics.byDate[date] || 0) + 1;
      
      // Taille
      if (exp.size) {
        statistics.totalSize += exp.size;
      }
      
      // Récents
      const now = new Date();
      const exportDate = new Date(exp.timestamp);
      const daysDiff = (now - exportDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 7) statistics.lastWeek++;
      if (daysDiff <= 30) statistics.lastMonth++;
    });

    if (exports.length > 0) {
      statistics.averageSize = statistics.totalSize / exports.length;
    }

    return statistics;
  }, []);

  /**
   * Mettre à jour les statistiques
   */
  const updateStats = useCallback((exports) => {
    try {
      setLoading(true);
      setError(null);
      
      const newStats = calculateStats(exports);
      setStats(newStats);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  return {
    stats,
    loading,
    error,
    
    updateStats,
    calculateStats,
    
    isEmpty: !stats || stats.total === 0,
    isReady: !loading && !error && stats !== null
  };
}

export default useExport;