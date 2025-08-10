// frontend/src/modules/entities/hooks/useEntityMerge.js
import { useState, useCallback } from 'react';
import api from '../../../shared/services/api';

/**
 * Hook pour la gestion de la fusion d'entités
 * Encapsule la logique de fusion, d'analyse et de suggestions
 */
export default function useEntityMerge() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [mergeResult, setMergeResult] = useState(null);

  /**
   * Nettoyer les états
   */
  const clearState = useCallback(() => {
    setError(null);
    setAnalysis(null);
    setCandidates([]);
    setMergeResult(null);
  }, []);

  /**
   * Analyser la compatibilité de fusion entre deux entités
   */
  const analyzeMergeCompatibility = useCallback(async (sourceEntityId, targetEntityId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/entities/merge/analyze', {
        sourceEntityId,
        targetEntityId
      });

      const analysisData = response.data?.data || response.data;
      setAnalysis(analysisData);

      return analysisData;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de l\'analyse de fusion';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exécuter la fusion de deux entités
   */
  const executeMerge = useCallback(async (sourceEntityId, targetEntityId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/entities/merge/execute', {
        sourceEntityId,
        targetEntityId,
        options
      });

      const result = response.data?.data || response.data;
      setMergeResult(result);

      return result;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de la fusion';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtenir des candidats de fusion pour une entité
   */
  const getMergeCandidates = useCallback(async (entityId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        sameTypeOnly: options.sameTypeOnly !== false,
        sameFolderOnly: options.sameFolderOnly !== false,
        minSimilarity: options.minSimilarity || 0.5,
        maxCandidates: options.maxCandidates || 10
      };

      const response = await api.get(`/entities/${entityId}/merge/candidates`, { params });

      const candidatesData = response.data?.data || response.data;
      setCandidates(candidatesData.candidates || []);

      return candidatesData;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de la recherche de candidats';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Prévisualiser le résultat d'une fusion
   */
  const previewMerge = useCallback(async (sourceEntityId, targetEntityId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/entities/merge/preview', {
        sourceEntityId,
        targetEntityId,
        options
      });

      return response.data?.data || response.data;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de l\'aperçu de fusion';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Détecter automatiquement les doublons dans un dossier
   */
  const detectDuplicates = useCallback(async (folderId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        minSimilarity: options.minSimilarity || 0.7,
        sameTypeOnly: options.sameTypeOnly !== false,
        maxResults: options.maxResults || 20
      };

      const response = await api.get(`/entities/merge/detect-duplicates/${folderId}`, { params });

      return response.data?.data || response.data;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de la détection de doublons';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Annuler une fusion
   */
  const undoMerge = useCallback(async (mergeLogId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/entities/merge/${mergeLogId}/undo`);

      return response.data?.data || response.data;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de l\'annulation de fusion';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Valider les paramètres de fusion
   */
  const validateMergeParams = useCallback(async (sourceEntityId, targetEntityId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/entities/merge/validate', {
        sourceEntityId,
        targetEntityId,
        options
      });

      return response.data?.data || response.data;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de la validation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtenir l'historique des fusions
   */
  const getMergeHistory = useCallback(async (folderId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: options.page || 1,
        limit: options.limit || 50
      };

      const response = await api.get(`/entities/merge/history/${folderId}`, { params });

      return response.data?.data || response.data;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de la récupération de l\'historique';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtenir les statistiques de fusion d'un dossier
   */
  const getMergeStatistics = useCallback(async (folderId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/entities/merge/stats/${folderId}`);

      return response.data?.data || response.data;
    } catch (err) {
      const errorMessage = err.data?.error?.message || err.message || 'Erreur lors de la récupération des statistiques';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // États
    loading,
    error,
    analysis,
    candidates,
    mergeResult,

    // Actions principales
    analyzeMergeCompatibility,
    executeMerge,
    getMergeCandidates,
    previewMerge,
    detectDuplicates,

    // Actions secondaires
    undoMerge,
    validateMergeParams,
    getMergeHistory,
    getMergeStatistics,

    // Utilitaires
    clearState
  };
}