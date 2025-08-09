// frontend/src/shared/hooks/useNavigation.js
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export function useNavigation() {
  const navigate = useNavigate();
  const { currentFolderId } = useAppStore();

  const goToFolders = useCallback(() => navigate('/folders'), [navigate]);
  const goToEntities = useCallback((folderId) => navigate(`/folders/${folderId || currentFolderId}/entities`), [navigate, currentFolderId]);
  const goToGraph = useCallback((folderId) => navigate(`/folders/${folderId || currentFolderId}/graph`), [navigate, currentFolderId]);

  return { goToFolders, goToEntities, goToGraph };
}