// frontend/src/modules/folders/hooks/useFolders.js - Hook React pour la gestion des dossiers
import { useState, useEffect, useCallback, useRef } from 'react';
import FolderService from '../services/folderService';

/**
 * Hook personnalisé pour la gestion des dossiers d'enquête
 * Encapsule la logique de récupération, création, modification et suppression
 */
export function useFolders(options = {}) {
  const {
    autoFetch = true,
    orderBy = 'updated_at',
    direction = 'DESC',
    limit = 50,
    enableRealtime = false
  } = options;

  // État principal
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({});

  // État pour les opérations
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(new Set());
  const [deleting, setDeleting] = useState(new Set());

  // Références pour éviter les re-renders
  const abortControllerRef = useRef(null);
  const lastFetchParamsRef = useRef({});

  /**
   * Nettoyer les contrôleurs d'abort
   */
  const cleanupAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Récupérer tous les dossiers
   */
  const fetchFolders = useCallback(async (fetchOptions = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      cleanupAbortController();
      abortControllerRef.current = FolderService.createAbortController();

      const params = {
        orderBy,
        direction,
        limit,
        ...fetchOptions
      };

      lastFetchParamsRef.current = params;

      const result = await FolderService.getAllFolders(params);
      
      setFolders(result.folders || []);
      setMetadata(result.metadata || {});
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(FolderService.formatErrorForUser(err));
      }
    } finally {
      setLoading(false);
    }
  }, [orderBy, direction, limit, cleanupAbortController]);

  /**
   * Rafraîchir la liste des dossiers
   */
  const refreshFolders = useCallback(() => {
    return fetchFolders(lastFetchParamsRef.current);
  }, [fetchFolders]);

  /**
   * Créer un nouveau dossier
   */
  const createFolder = useCallback(async (folderData) => {
    try {
      setCreating(true);
      setError(null);

      // Validation côté client
      const validation = FolderService.validateFolderDataClient(folderData, 'create');
      if (!validation.valid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }

      const newFolder = await FolderService.createFolder(folderData);
      
      // Ajouter le nouveau dossier en tête de liste
      setFolders(prev => [newFolder, ...prev]);
      
      return newFolder;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setCreating(false);
    }
  }, []);

  /**
   * Mettre à jour un dossier
   */
  const updateFolder = useCallback(async (folderId, updateData) => {
    try {
      setUpdating(prev => new Set(prev).add(folderId));
      setError(null);

      // Validation côté client
      const validation = FolderService.validateFolderDataClient(updateData, 'update');
      if (!validation.valid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }

      const updatedFolder = await FolderService.updateFolder(folderId, updateData);
      
      // Mettre à jour le dossier dans la liste
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? updatedFolder : folder
      ));
      
      return updatedFolder;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, []);

  /**
   * Supprimer un dossier
   */
  const deleteFolder = useCallback(async (folderId, force = false) => {
    try {
      setDeleting(prev => new Set(prev).add(folderId));
      setError(null);

      await FolderService.deleteFolder(folderId, { force });
      
      // Supprimer le dossier de la liste
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      
      return true;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setDeleting(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, []);

  /**
   * Dupliquer un dossier
   */
  const duplicateFolder = useCallback(async (folderId, options = {}) => {
    try {
      setUpdating(prev => new Set(prev).add(folderId));
      setError(null);

      const result = await FolderService.duplicateFolder(folderId, options);
      
      // Ajouter le dossier dupliqué à la liste
      setFolders(prev => [result.duplicate, ...prev]);
      
      return result;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, []);

  /**
   * Archiver un dossier
   */
  const archiveFolder = useCallback(async (folderId) => {
    try {
      setUpdating(prev => new Set(prev).add(folderId));
      setError(null);

      const archivedFolder = await FolderService.archiveFolder(folderId);
      
      // Mettre à jour le dossier dans la liste
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? archivedFolder : folder
      ));
      
      return archivedFolder;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, []);

  /**
   * Restaurer un dossier archivé
   */
  const restoreFolder = useCallback(async (folderId) => {
    try {
      setUpdating(prev => new Set(prev).add(folderId));
      setError(null);

      const restoredFolder = await FolderService.restoreFolder(folderId);
      
      // Mettre à jour le dossier dans la liste
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? restoredFolder : folder
      ));
      
      return restoredFolder;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, []);

  /**
   * Obtenir un dossier par ID (depuis le cache ou l'API)
   */
  const getFolderById = useCallback((folderId) => {
    const folder = folders.find(f => f.id === parseInt(folderId));
    return folder || null;
  }, [folders]);

  /**
   * Vérifier si un dossier est en cours de modification
   */
  const isFolderUpdating = useCallback((folderId) => {
    return updating.has(folderId);
  }, [updating]);

  /**
   * Vérifier si un dossier est en cours de suppression
   */
  const isFolderDeleting = useCallback((folderId) => {
    return deleting.has(folderId);
  }, [deleting]);

  /**
   * Calculer les métriques des dossiers
   */
  const metrics = useCallback(() => {
    return FolderService.calculateMetrics(folders);
  }, [folders]);

  /**
   * Filtrer les dossiers
   */
  const filterFolders = useCallback((filters) => {
    return FolderService.filterFolders(folders, filters);
  }, [folders]);

  /**
   * Trier les dossiers
   */
  const sortFolders = useCallback((sortOrderBy, sortDirection) => {
    return FolderService.sortFolders(folders, sortOrderBy, sortDirection);
  }, [folders]);

  /**
   * Effacer l'erreur courante
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Effacer le cache et rafraîchir
   */
  const invalidateCache = useCallback(() => {
    setFolders([]);
    return refreshFolders();
  }, [refreshFolders]);

  // Fetch initial
  useEffect(() => {
    if (autoFetch) {
      fetchFolders();
    }

    // Cleanup lors du démontage
    return () => {
      cleanupAbortController();
    };
  }, [autoFetch, fetchFolders, cleanupAbortController]);

  // Nettoyage des contrôleurs d'abort lors du démontage
  useEffect(() => {
    return () => {
      cleanupAbortController();
    };
  }, [cleanupAbortController]);

  return {
    // État principal
    folders,
    loading,
    error,
    metadata,

    // États des opérations
    creating,
    updating: updating.size > 0,
    deleting: deleting.size > 0,

    // Actions CRUD
    createFolder,
    updateFolder,
    deleteFolder,
    duplicateFolder,
    archiveFolder,
    restoreFolder,

    // Actions de récupération
    fetchFolders,
    refreshFolders,
    invalidateCache,

    // Utilitaires
    getFolderById,
    isFolderUpdating,
    isFolderDeleting,
    metrics,
    filterFolders,
    sortFolders,
    clearError,

    // Méta-informations
    isEmpty: folders.length === 0,
    hasError: error !== null,
    isReady: !loading && !error
  };
}

/**
 * Hook pour la recherche de dossiers
 */
export function useFolderSearch(initialSearchTerm = '') {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Effectuer une recherche
   */
  const performSearch = useCallback(async (term, options = {}) => {
    if (!term || term.trim().length === 0) {
      setSearchResults([]);
      return [];
    }

    try {
      setSearching(true);
      setSearchError(null);

      // Annuler la recherche précédente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = FolderService.createAbortController();

      const result = await FolderService.searchFolders(term.trim(), options);
      
      setSearchResults(result.folders || []);
      return result.folders || [];
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        const formattedError = FolderService.formatErrorForUser(err);
        setSearchError(formattedError);
      }
      return [];
    } finally {
      setSearching(false);
    }
  }, []);

  /**
   * Recherche avec debounce
   */
  const debouncedSearch = useCallback((term, delay = 300) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(term);
    }, delay);
  }, [performSearch]);

  /**
   * Mettre à jour le terme de recherche
   */
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
    if (term.length === 0) {
      setSearchResults([]);
    } else {
      debouncedSearch(term);
    }
  }, [debouncedSearch]);

  /**
   * Effacer la recherche
   */
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchTerm,
    searchResults,
    searching,
    searchError,
    
    updateSearchTerm,
    performSearch,
    clearSearch,
    
    hasResults: searchResults.length > 0,
    isEmpty: searchResults.length === 0 && searchTerm.length > 0 && !searching
  };
}

/**
 * Hook pour les statistiques des dossiers
 */
export function useFolderStatistics() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Récupérer les statistiques
   */
  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await FolderService.getFolderStatistics();
      setStatistics(stats);
      
    } catch (err) {
      setError(FolderService.formatErrorForUser(err));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rafraîchir les statistiques
   */
  const refreshStatistics = useCallback(() => {
    return fetchStatistics();
  }, [fetchStatistics]);

  // Fetch initial
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    
    fetchStatistics,
    refreshStatistics,
    
    isReady: !loading && !error && statistics !== null
  };
}

/**
 * Hook pour les dossiers récents
 */
export function useRecentFolders(limit = 10) {
  const [recentFolders, setRecentFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Récupérer les dossiers récents
   */
  const fetchRecentFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await FolderService.getRecentFolders(limit);
      setRecentFolders(result.folders || []);
      
    } catch (err) {
      setError(FolderService.formatErrorForUser(err));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Fetch initial
  useEffect(() => {
    fetchRecentFolders();
  }, [fetchRecentFolders]);

  return {
    recentFolders,
    loading,
    error,
    
    fetchRecentFolders,
    refreshRecentFolders: fetchRecentFolders,
    
    isEmpty: recentFolders.length === 0,
    isReady: !loading && !error
  };
}

/**
 * Hook pour l'export de dossiers
 */
export function useFolderExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Exporter des dossiers
   */
  const exportFolders = useCallback(async (folderIds = []) => {
    try {
      setExporting(true);
      setError(null);
      
      const blob = await FolderService.exportFolders(folderIds);
      
      // Télécharger automatiquement
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `lucide-folders-export-${timestamp}.json`;
      FolderService.downloadFile(blob, filename);
      
      return blob;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setExporting(false);
    }
  }, []);

  /**
   * Effacer l'erreur
   */
  const clearExportError = useCallback(() => {
    setError(null);
  }, []);

  return {
    exporting,
    error,
    
    exportFolders,
    clearExportError,
    
    canExport: !exporting
  };
}

/**
 * Hook pour la validation de données de dossier
 */
export function useFolderValidation() {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Valider des données de dossier
   */
  const validateFolder = useCallback(async (folderData, operation = 'create') => {
    try {
      setValidating(true);
      setError(null);
      
      // Validation côté client d'abord
      const clientValidation = FolderService.validateFolderDataClient(folderData, operation);
      
      if (!clientValidation.valid) {
        setValidationResult(clientValidation);
        return clientValidation;
      }
      
      // Validation côté serveur
      const serverValidation = await FolderService.validateFolderData(folderData, operation);
      setValidationResult(serverValidation);
      
      return serverValidation;
      
    } catch (err) {
      const formattedError = FolderService.formatErrorForUser(err);
      setError(formattedError);
      return { valid: false, errors: [{ message: formattedError.message }] };
    } finally {
      setValidating(false);
    }
  }, []);

  /**
   * Validation synchrone côté client uniquement
   */
  const validateFolderClient = useCallback((folderData, operation = 'create') => {
    const result = FolderService.validateFolderDataClient(folderData, operation);
    setValidationResult(result);
    return result;
  }, []);

  /**
   * Effacer le résultat de validation
   */
  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    validating,
    validationResult,
    error,
    
    validateFolder,
    validateFolderClient,
    clearValidation,
    
    isValid: validationResult?.valid === true,
    hasErrors: validationResult?.valid === false,
    errors: validationResult?.errors || []
  };
}

export default useFolders;