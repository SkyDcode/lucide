// frontend/src/shared/store/appStore.js
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // État de la sidebar
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Récupérer l'état depuis localStorage si disponible
    const saved = localStorage.getItem('lucide-sidebar-open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Titre de la route actuelle
  const [routeTitle, setRouteTitle] = useState('Accueil');

  // Dossier actuellement sélectionné
  const [currentFolderId, setCurrentFolderId] = useState(() => {
    // Récupérer le dossier depuis localStorage si disponible
    const saved = localStorage.getItem('lucide-current-folder');
    return saved ? Number(saved) : null;
  });

  // Sauvegarder l'état de la sidebar dans localStorage
  useEffect(() => {
    localStorage.setItem('lucide-sidebar-open', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Sauvegarder le dossier actuel dans localStorage
  useEffect(() => {
    if (currentFolderId) {
      localStorage.setItem('lucide-current-folder', String(currentFolderId));
    } else {
      localStorage.removeItem('lucide-current-folder');
    }
  }, [currentFolderId]);

  // Actions pour la sidebar
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  // Action pour changer de dossier
  const selectFolder = (folderId) => {
    setCurrentFolderId(folderId);
  };

  // Action pour nettoyer l'état (logout, reset, etc.)
  const resetAppState = () => {
    setCurrentFolderId(null);
    setRouteTitle('Accueil');
    localStorage.removeItem('lucide-current-folder');
  };

  // Valeur du contexte
  const value = useMemo(() => ({
    // État de la sidebar
    sidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setSidebarOpen,

    // Titre de la route
    routeTitle,
    setRouteTitle,

    // Dossier actuel
    currentFolderId,
    setCurrentFolderId,
    selectFolder,

    // Actions globales
    resetAppState,

    // Informations utiles
    isDesktop: typeof window !== 'undefined' && window.innerWidth >= 768,
    isMobile: typeof window !== 'undefined' && window.innerWidth < 768
  }), [
    sidebarOpen,
    routeTitle, 
    currentFolderId
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}