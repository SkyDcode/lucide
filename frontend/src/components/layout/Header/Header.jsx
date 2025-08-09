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
    <header className="flex items-center gap-3 px-4 py-2 border-b bg-white">
      <Button variant="secondary" onClick={toggleSidebar} aria-label="Basculer la barre latérale">
        {sidebarOpen ? '⟨' : '⟩'}
      </Button>
      <div className="font-bold text-lg">Lucide OSINT</div>
      <div className="ml-auto flex items-center gap-3">
        <select
          className="border rounded px-2 py-1 min-w-[220px]"
          value={currentFolderId || ''}
          onChange={handleFolderChange}
          disabled={loading}
          title="Dossier actif"
        >
          <option value="">— Sélectionner un dossier —</option>
          {folders?.map((f) => (
            <option key={f.id} value={f.id}>{f.name} (#{f.id})</option>
          ))}
        </select>
        <Button variant="secondary" onClick={refresh}>↻</Button>
      </div>
    </header>
  );
}