// frontend/src/shared/store/appStore.js
import React, { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [routeTitle, setRouteTitle] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const value = useMemo(() => ({
    sidebarOpen,
    toggleSidebar: () => setSidebarOpen((v) => !v),
    setSidebarOpen,
    routeTitle,
    setRouteTitle,
    currentFolderId,
    setCurrentFolderId,
  }), [sidebarOpen, routeTitle, currentFolderId]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within <AppProvider>');
  return ctx;
}