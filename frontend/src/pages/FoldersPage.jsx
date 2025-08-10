// frontend/src/pages/FoldersPage.jsx
import React, { useMemo, useState } from 'react';
import Button from '../components/ui/Button/Button';
import Modal from '../components/ui/Modal/Modal';
import FolderList from '../modules/folders/components/FolderList';
import FolderForm from '../modules/folders/components/FolderForm';
import useFolders from '../modules/folders/hooks/useFolders';
import { useNavigation } from '../shared/hooks/useNavigation';
import { useNotifications } from '../shared/hooks/useNotifications';
import { useAppStore } from '../shared/store/appStore';

export default function FoldersPage() {
  const { folders, loading, error, createFolder, updateFolder, removeFolder, refresh } = useFolders();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('DESC');
  const [filterBy, setFilterBy] = useState('all');
  
  const { goToFolderEntities } = useNavigation();
  const { notify } = useNotifications();
  const { setCurrentFolderId } = useAppStore();

  // Filtrage et tri des dossiers
  const filteredAndSortedFolders = useMemo(() => {
    let filtered = folders || [];

    // Filtrage par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((folder) => 
        folder.name.toLowerCase().includes(query) ||
        (folder.description && folder.description.toLowerCase().includes(query))
      );
    }

    // Filtrage par type
    switch (filterBy) {
      case 'empty':
        filtered = filtered.filter(folder => (folder.entityCount || 0) === 0);
        break;
      case 'active':
        filtered = filtered.filter(folder => (folder.entityCount || 0) > 0);
        break;
      case 'recent':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = filtered.filter(folder => new Date(folder.created_at || folder.createdAt) > oneWeekAgo);
        break;
      default:
        // 'all' - pas de filtrage
        break;
    }

    // Tri
    filtered.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'entityCount':
          valueA = a.entityCount || 0;
          valueB = b.entityCount || 0;
          break;
        case 'created_at':
          valueA = new Date(a.created_at || a.createdAt);
          valueB = new Date(b.created_at || b.createdAt);
          break;
        case 'updated_at':
        default:
          valueA = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt);
          valueB = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt);
          break;
      }

      if (valueA < valueB) return sortDirection === 'ASC' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'ASC' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [folders, searchQuery, filterBy, sortBy, sortDirection]);

  // Gestionnaires d'événements
  const handleCreateFolder = async (folderData) => {
    try {
      const newFolder = await createFolder(folderData);
      notify({ type: 'success', message: `Dossier "${newFolder.name}" créé avec succès` });
      setCreateModalOpen(false);
      
      // Naviguer automatiquement vers le nouveau dossier
      setCurrentFolderId(newFolder.id);
      goToFolderEntities(newFolder.id);
    } catch (err) {
      console.error('Error creating folder:', err);
      notify({ type: 'error', message: `Erreur lors de la création : ${err.message || 'Erreur inconnue'}` });
    }
  };

  const handleEditFolder = (folder) => {
    setEditingFolder(folder);
    setEditModalOpen(true);
  };

  const handleUpdateFolder = async (folderData) => {
    if (!editingFolder) return;
    
    try {
      await updateFolder(editingFolder.id, folderData);
      notify({ type: 'success', message: `Dossier "${folderData.name}" mis à jour` });
      setEditModalOpen(false);
      setEditingFolder(null);
    } catch (err) {
      console.error('Error updating folder:', err);
      notify({ type: 'error', message: `Erreur lors de la mise à jour : ${err.message || 'Erreur inconnue'}` });
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le dossier "${folder.name}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await removeFolder(folder.id);
      notify({ type: 'success', message: `Dossier "${folder.name}" supprimé` });
    } catch (err) {
      console.error('Error deleting folder:', err);
      notify({ type: 'error', message: `Erreur lors de la suppression : ${err.message || 'Erreur inconnue'}` });
    }
  };

  const handleSelectFolder = (folder) => {
    setCurrentFolderId(folder.id);
    goToFolderEntities(folder.id);
  };

  const handleSortChange = (field, direction) => {
    setSortBy(field);
    setSortDirection(direction);
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers d'enquête</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos dossiers OSINT et organisez vos enquêtes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            icon="+"
          >
            Nouveau dossier
          </Button>
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={loading}
            icon={loading ? "⟳" : "↻"}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher un dossier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtres */}
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les dossiers</option>
              <option value="active">Actifs</option>
              <option value="empty">Vides</option>
              <option value="recent">Récents</option>
            </select>

            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                handleSortChange(field, direction);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="updated_at-DESC">Plus récent</option>
              <option value="created_at-DESC">Date de création</option>
              <option value="name-ASC">Nom (A-Z)</option>
              <option value="name-DESC">Nom (Z-A)</option>
              <option value="entityCount-DESC">Plus d'entités</option>
            </select>
          </div>
        </div>

        {/* Statistiques */}
        {folders && folders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <span>
                <strong>{filteredAndSortedFolders.length}</strong> sur <strong>{folders.length}</strong> dossiers
              </span>
              <span>
                <strong>{folders.reduce((sum, f) => sum + (f.entityCount || 0), 0)}</strong> entités au total
              </span>
              <span>
                <strong>{folders.filter(f => (f.entityCount || 0) > 0).length}</strong> dossiers actifs
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-lg mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Erreur de chargement</h3>
              <p className="text-red-600 text-sm mt-1">
                {error.message || 'Impossible de charger les dossiers'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={refresh}
              className="ml-auto"
            >
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Liste des dossiers */}
      <FolderList
        folders={filteredAndSortedFolders}
        loading={loading}
        error={error}
        onSelectFolder={handleSelectFolder}
        onEditFolder={handleEditFolder}
        onDeleteFolder={handleDeleteFolder}
        onCreateFolder={() => setCreateModalOpen(true)}
        showCreateButton={false} // Déjà dans l'en-tête
        viewMode="grid"
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Modal de création */}
      <FolderForm
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFolder}
        mode="create"
        loading={loading}
      />

      {/* Modal d'édition */}
      <FolderForm
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingFolder(null);
        }}
        onSubmit={handleUpdateFolder}
        folder={editingFolder}
        mode="edit"
        loading={loading}
      />
    </div>
  );
}