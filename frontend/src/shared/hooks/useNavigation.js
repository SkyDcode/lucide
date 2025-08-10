// frontend/src/shared/hooks/useNavigation.js
import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentFolderId, setCurrentFolderId } = useAppStore();

  // Navigation vers les dossiers
  const goToFolders = useCallback(() => {
    navigate('/folders');
  }, [navigate]);

  // Navigation vers les entités d'un dossier
  const goToEntities = useCallback((folderId) => {
    const targetFolderId = folderId || currentFolderId;
    if (!targetFolderId) {
      console.warn('No folder ID provided for entities navigation');
      return;
    }
    navigate(`/folders/${targetFolderId}/entities`);
  }, [navigate, currentFolderId]);

  // Navigation vers le graphique d'un dossier
  const goToGraph = useCallback((folderId) => {
    const targetFolderId = folderId || currentFolderId;
    if (!targetFolderId) {
      console.warn('No folder ID provided for graph navigation');
      return;
    }
    navigate(`/folders/${targetFolderId}/graph`);
  }, [navigate, currentFolderId]);

  // Navigation vers une entité spécifique
  const goToEntity = useCallback((entityId, folderId) => {
    const targetFolderId = folderId || currentFolderId;
    if (!targetFolderId) {
      console.warn('No folder ID provided for entity navigation');
      return;
    }
    navigate(`/folders/${targetFolderId}/entities/${entityId}`);
  }, [navigate, currentFolderId]);

  // Navigation avec mise à jour du dossier actuel
  const goToFolderEntities = useCallback((folderId) => {
    setCurrentFolderId(folderId);
    navigate(`/folders/${folderId}/entities`);
  }, [navigate, setCurrentFolderId]);

  const goToFolderGraph = useCallback((folderId) => {
    setCurrentFolderId(folderId);
    navigate(`/folders/${folderId}/graph`);
  }, [navigate, setCurrentFolderId]);

  // Navigation relative (utile pour les boutons précédent/suivant)
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  // Utilitaires pour connaître la route actuelle
  const isOnFolders = location.pathname === '/folders';
  const isOnEntities = location.pathname.includes('/entities');
  const isOnGraph = location.pathname.includes('/graph');

  // Extraire l'ID du dossier depuis l'URL actuelle
  const getCurrentFolderIdFromUrl = useCallback(() => {
    const match = location.pathname.match(/\/folders\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [location.pathname]);

  // Navigation programmable avec options
  const navigateTo = useCallback((path, options = {}) => {
    if (options.replace) {
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  }, [navigate]);

  return {
    // Navigation de base
    goToFolders,
    goToEntities,
    goToGraph,
    goToEntity,

    // Navigation avec sélection de dossier
    goToFolderEntities,
    goToFolderGraph,

    // Navigation relative
    goBack,
    goForward,

    // Navigation programmable
    navigateTo,

    // Informations sur la route actuelle
    isOnFolders,
    isOnEntities,
    isOnGraph,
    getCurrentFolderIdFromUrl,
    currentPath: location.pathname,
    currentFolderId,

    // Utilitaires
    canNavigateToEntities: !!currentFolderId,
    canNavigateToGraph: !!currentFolderId
  };
}