// frontend/src/modules/entities/hooks/useEntityMedia.js - Hook pour la gestion des médias d'entités

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../../../shared/services/api';

/**
 * Hook pour la gestion des fichiers/médias d'une entité
 * @param {number} entityId - ID de l'entité
 * @param {Object} options - Options du hook
 * @returns {Object} État et méthodes pour gérer les médias
 */
const useEntityMedia = (entityId, options = {}) => {
  const {
    autoLoad = true,
    orderBy = 'created_at',
    direction = 'DESC',
    mimeType = null,
    onUploadSuccess = null,
    onUploadError = null,
    onDeleteSuccess = null,
    onDeleteError = null
  } = options;

  // États
  const [files, setFiles] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);

  // Refs pour les requêtes en cours
  const uploadAbortControllers = useRef(new Map());
  const currentRequestController = useRef(null);

  /**
   * Charger les fichiers de l'entité
   */
  const loadFiles = useCallback(async (searchTerm = null) => {
    if (!entityId) return;

    try {
      setLoading(true);
      setError(null);

      // Annuler la requête précédente si elle existe
      if (currentRequestController.current) {
        currentRequestController.current.abort();
      }

      currentRequestController.current = new AbortController();

      const params = {
        orderBy,
        direction,
        ...(mimeType && { mimeType }),
        ...(searchTerm && { search: searchTerm })
      };

      const response = await apiClient.get(
        `/api/media/entity/${entityId}`,
        { 
          params,
          signal: currentRequestController.current.signal
        }
      );

      setFiles(response.files || []);
      setStatistics(response.statistics || null);

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur lors du chargement des fichiers:', error);
        setError('Impossible de charger les fichiers');
      }
    } finally {
      setLoading(false);
      currentRequestController.current = null;
    }
  }, [entityId, orderBy, direction, mimeType]);

  /**
   * Uploader des fichiers
   */
  const uploadFiles = useCallback(async (fileList, progressCallback = null) => {
    if (!entityId || !fileList || fileList.length === 0) {
      return { success: false, error: 'Aucun fichier à uploader' };
    }

    try {
      setUploading(true);
      setError(null);

      // Créer FormData
      const formData = new FormData();
      Array.from(fileList).forEach((file, index) => {
        formData.append('files', file);
      });

      // Créer un contrôleur d'annulation pour cet upload
      const uploadId = Math.random().toString(36).substr(2, 9);
      const abortController = new AbortController();
      uploadAbortControllers.current.set(uploadId, abortController);

      // Configuration de la requête avec suivi de progression
      const config = {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      // Si un callback de progression est fourni, l'ajouter
      if (progressCallback) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          
          setUploadProgress(prev => ({
            ...prev,
            [uploadId]: percentCompleted
          }));
          
          progressCallback(percentCompleted);
        };
      }

      const response = await apiClient.post(
        `/api/media/upload/${entityId}`,
        formData,
        config
      );

      // Nettoyer le contrôleur d'annulation
      uploadAbortControllers.current.delete(uploadId);
      setUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[uploadId];
        return updated;
      });

      if (response.success) {
        // Recharger les fichiers pour mettre à jour la liste
        await loadFiles();
        
        onUploadSuccess?.(response);
        
        return { 
          success: true, 
          files: response.files,
          uploadedCount: response.uploaded_count,
          errorCount: response.error_count
        };
      } else {
        const errorMessage = response.errors?.length > 0 
          ? response.errors.map(e => e.error).join(', ')
          : 'Échec de l\'upload';
        
        onUploadError?.(errorMessage);
        return { success: false, error: errorMessage };
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur lors de l\'upload:', error);
        const errorMessage = error.response?.data?.message || 'Erreur lors de l\'upload';
        setError(errorMessage);
        onUploadError?.(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      return { success: false, error: 'Upload annulé' };
    } finally {
      setUploading(false);
    }
  }, [entityId, loadFiles, onUploadSuccess, onUploadError]);

  /**
   * Supprimer un fichier
   */
  const deleteFile = useCallback(async (fileId) => {
    if (!fileId) return { success: false, error: 'ID de fichier manquant' };

    try {
      setError(null);

      await apiClient.delete(`/api/media/${fileId}`);

      // Mettre à jour la liste locale
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
      // Recharger les statistiques
      await loadFiles();
      
      onDeleteSuccess?.(fileId);
      return { success: true };

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la suppression';
      setError(errorMessage);
      onDeleteError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadFiles, onDeleteSuccess, onDeleteError]);

  /**
   * Mettre à jour les métadonnées d'un fichier
   */
  const updateFile = useCallback(async (fileId, updateData) => {
    if (!fileId) return { success: false, error: 'ID de fichier manquant' };

    try {
      setError(null);

      const response = await apiClient.put(`/api/media/${fileId}`, updateData);

      // Mettre à jour la liste locale
      setFiles(prev => 
        prev.map(file => 
          file.id === fileId ? { ...file, ...response } : file
        )
      );

      return { success: true, file: response };

    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la mise à jour';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Dupliquer un fichier vers une autre entité
   */
  const duplicateFile = useCallback(async (fileId, targetEntityId) => {
    if (!fileId || !targetEntityId) {
      return { success: false, error: 'Paramètres manquants' };
    }

    try {
      setError(null);

      const response = await apiClient.post(`/api/media/${fileId}/duplicate`, {
        target_entity_id: targetEntityId
      });

      return { success: true, duplicatedFile: response.duplicated_file };

    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la duplication';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Déplacer un fichier vers une autre entité
   */
  const moveFile = useCallback(async (fileId, targetEntityId) => {
    if (!fileId || !targetEntityId) {
      return { success: false, error: 'Paramètres manquants' };
    }

    try {
      setError(null);

      const response = await apiClient.post(`/api/media/${fileId}/move`, {
        target_entity_id: targetEntityId
      });

      // Supprimer le fichier de la liste locale
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
      // Recharger les statistiques
      await loadFiles();

      return { success: true, movedFile: response.moved_file };

    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors du déplacement';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadFiles]);

  /**
   * Annuler tous les uploads en cours
   */
  const cancelAllUploads = useCallback(() => {
    uploadAbortControllers.current.forEach(controller => {
      controller.abort();
    });
    uploadAbortControllers.current.clear();
    setUploadProgress({});
    setUploading(false);
  }, []);

  /**
   * Obtenir l'URL de téléchargement d'un fichier
   */
  const getDownloadUrl = useCallback((fileId, inline = false) => {
    const baseUrl = `/api/media/download/${fileId}`;
    return inline ? `${baseUrl}?inline=true` : baseUrl;
  }, []);

  /**
   * Obtenir l'URL de miniature d'une image
   */
  const getThumbnailUrl = useCallback((fileId) => {
    return `/api/media/thumbnail/${fileId}`;
  }, []);

  /**
   * Rechercher des fichiers
   */
  const searchFiles = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return loadFiles();
    }
    
    return loadFiles(searchTerm.trim());
  }, [loadFiles]);

  /**
   * Filtrer les fichiers par type
   */
  const getFilesByType = useCallback((fileType) => {
    return files.filter(file => file.file_type === fileType);
  }, [files]);

  /**
   * Obtenir les statistiques par type de fichier
   */
  const getTypeStatistics = useCallback(() => {
    const typeStats = {};
    
    files.forEach(file => {
      const type = file.file_type || 'other';
      if (!typeStats[type]) {
        typeStats[type] = {
          count: 0,
          totalSize: 0,
          files: []
        };
      }
      
      typeStats[type].count++;
      typeStats[type].totalSize += file.size || 0;
      typeStats[type].files.push(file);
    });

    return typeStats;
  }, [files]);

  /**
   * Vérifier si l'entité a des fichiers
   */
  const hasFiles = files.length > 0;

  /**
   * Obtenir le nombre total de fichiers
   */
  const totalFiles = files.length;

  /**
   * Obtenir la taille totale des fichiers
   */
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

  // Charger automatiquement les fichiers si autoLoad est activé
  useEffect(() => {
    if (autoLoad && entityId) {
      loadFiles();
    }
  }, [autoLoad, entityId, loadFiles]);

  // Nettoyer les contrôleurs d'annulation au démontage
  useEffect(() => {
    return () => {
      // Annuler toutes les requêtes en cours
      if (currentRequestController.current) {
        currentRequestController.current.abort();
      }
      
      uploadAbortControllers.current.forEach(controller => {
        controller.abort();
      });
      uploadAbortControllers.current.clear();
    };
  }, []);

  return {
    // État
    files,
    statistics,
    loading,
    uploading,
    uploadProgress,
    error,
    hasFiles,
    totalFiles,
    totalSize,

    // Méthodes principales
    loadFiles,
    uploadFiles,
    deleteFile,
    updateFile,
    duplicateFile,
    moveFile,
    searchFiles,
    
    // Méthodes utilitaires
    cancelAllUploads,
    getDownloadUrl,
    getThumbnailUrl,
    getFilesByType,
    getTypeStatistics,

    // Méthodes de tri/filtrage
    refresh: loadFiles,
    clearError: () => setError(null)
  };
};

export default useEntityMedia;