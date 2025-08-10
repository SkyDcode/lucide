// frontend/src/components/layout/Header/Header.jsx
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../ui/Button/Button';
import { useAppStore } from '../../../shared/store/appStore';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import useFolders from '../../../modules/folders/hooks/useFolders';

export default function Header() {
  const { sidebarOpen, toggleSidebar, currentFolderId, setCurrentFolderId, setRouteTitle } = useAppStore();
  const { goToEntities } = useNavigation();
  const { folders, loading, error, refresh } = useFolders();
  const location = useLocation();

  useEffect(() => {
    // Titre automatique par route
    if (location.pathname.startsWith('/folders') && location.pathname.includes('/entities')) {
      setRouteTitle('Entités');
    } else if (location.pathname.startsWith('/folders') && location.pathname.includes('/graph')) {
      setRouteTitle('Graphique');
    } else if (location.pathname.startsWith('/folders')) {
      setRouteTitle('Dossiers');
    } else {
      setRouteTitle('Accueil');
    }
  }, [location, setRouteTitle]);

  const handleFolderChange = (e) => {
    const id = Number(e.target.value);
    setCurrentFolderId(id || null);
    if (id) goToEntities(id);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2 border-b bg-white shadow-sm">
      {/* Bouton toggle sidebar */}
      <Button 
        variant="ghost" 
        size="small"
        onClick={toggleSidebar} 
        aria-label="Basculer la barre latérale"
        className="flex-shrink-0"
      >
        {sidebarOpen ? '⟨' : '⟩'}
      </Button>

      {/* Logo et titre */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          L
        </div>
        <div className="font-bold text-lg text-gray-900">
          Lucide OSINT
        </div>
      </div>

      {/* Titre de la route actuelle */}
      <div className="hidden md:block text-sm text-gray-500 font-medium">
        {location.pathname !== '/folders' && '/ '}
        <span className="text-gray-700">{location.pathname === '/folders' ? 'Dossiers' : 'Entités'}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Sélecteur de dossier */}
      <div className="flex items-center gap-3">
        <select
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={currentFolderId || ''}
          onChange={handleFolderChange}
          disabled={loading}
          title="Dossier actif"
        >
          <option value="">— Sélectionner un dossier —</option>
          {folders?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} (#{f.id})
            </option>
          ))}
        </select>

        {/* Bouton refresh */}
        <Button 
          variant="ghost"
          size="small"
          onClick={refresh}
          disabled={loading}
          title="Actualiser la liste des dossiers"
          className="flex-shrink-0"
        >
          {loading ? '⟳' : '↻'}
        </Button>

        {/* Indicateur d'erreur */}
        {error && (
          <span className="text-red-500 text-sm" title={error.message}>
            ⚠️
          </span>
        )}
      </div>
    </header>
  );
}