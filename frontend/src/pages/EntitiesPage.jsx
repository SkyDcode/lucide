// frontend/src/pages/EntitiesPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button/Button';
import Modal from '../components/ui/Modal/Modal';
import EntityList from '../modules/entities/components/EntityList';
import EntityForm from '../modules/entities/components/EntityForm';
import EntityMergeModal from '../modules/entities/components/EntityMergeModal';
import useEntities from '../modules/entities/hooks/useEntities';
import useEntityTypes from '../modules/entities/hooks/useEntityTypes';
import SearchBar from '../modules/search/components/SearchBar';
import SearchResults from '../modules/search/components/SearchResults';
import { useNotifications } from '../shared/hooks/useNotifications';
import { useAppStore } from '../shared/store/appStore';
import { useNavigation } from '../shared/hooks/useNavigation';

export default function EntitiesPage() {
  const params = useParams();
  const navigate = useNavigate();
  const folderId = Number(params.folderId);
  const { setCurrentFolderId } = useAppStore();
  const { goToGraph, goToFolders } = useNavigation();

  const {
    items: entities,
    loading,
    error,
    pagination,
    search,
    setSearch,
    type,
    setType,
    page,
    setPage,
    createEntity,
    updateEntity,
    deleteEntity,
    refresh
  } = useEntities({ folderId });

  const { types } = useEntityTypes();
  const { notify } = useNotifications();

  // États locaux
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Vérifier que le folderId est valide
  useEffect(() => {
    if (!folderId || isNaN(folderId)) {
      notify({ type: 'error', message: 'ID de dossier invalide' });
      goToFolders();
      return;
    }
    setCurrentFolderId(folderId);
  }, [folderId, setCurrentFolderId, notify, goToFolders]);

  // Gestionnaires d'événements
  const handleCreateEntity = async (entityData) => {
    try {
      const newEntity = await createEntity({ ...entityData, folder_id: folderId });
      notify({ type: 'success', message: `Entité "${newEntity.name}" créée avec succès` });
      setCreateModalOpen(false);
      refresh();
    } catch (err) {
      console.error('Error creating entity:', err);
      notify({ type: 'error', message: `Erreur création: ${err.message || err}` });
    }
  };

  const handleEditEntity = (entity) => {
    setEditingEntity(entity);
    setEditModalOpen(true);
  };

  const handleUpdateEntity = async (entityData) => {
    if (!editingEntity) return;

    try {
      await updateEntity(editingEntity.id, entityData);
      notify({ type: 'success', message: `Entité "${entityData.name}" mise à jour` });
      setEditModalOpen(false);
      setEditingEntity(null);
      refresh();
    } catch (err) {
      console.error('Error updating entity:', err);
      notify({ type: 'error', message: `Erreur mise à jour: ${err.message || err}` });
    }
  };

  const handleDeleteEntity = async (entity) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'entité "${entity.name}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await deleteEntity(entity.id);
      notify({ type: 'success', message: `Entité "${entity.name}" supprimée` });
      refresh();
    } catch (err) {
      console.error('Error deleting entity:', err);
      notify({ type: 'error', message: `Erreur suppression: ${err.message || err}` });
    }
  };

  const handleSearch = async ({ q, type: searchType }) => {
    try {
      // Utilise l'endpoint /api/entities/search si disponible
      const queryParams = new URLSearchParams({
        q: q,
        folderId: folderId.toString(),
        ...(searchType && { type: searchType }),
        limit: '20'
      });

      const response = await fetch(`/api/entities/search?${queryParams}`);
      const data = await response.json();
      
      setSearchResults(data.results || data.entities || []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search error:', err);
      notify({ type: 'error', message: 'Erreur lors de la recherche' });
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleOpenEntity = (entity) => {
    // Pour l'instant, on ouvre l'entité en édition
    handleEditEntity(entity);
  };

  const handleMergeComplete = () => {
    notify({ type: 'success', message: 'Fusion effectuée avec succès' });
    setMergeModalOpen(false);
    refresh();
  };

  const handleMergeError = (error) => {
    notify({ type: 'error', message: `Erreur fusion: ${error.message || error}` });
  };

  const clearSearch = () => {
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Types d'entités pour le filtre
  const typeOptions = types.map(t => ({
    value: t.key,
    label: t.label || t.key
  }));

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <button
              onClick={goToFolders}
              className="hover:text-blue-600 transition-colors"
            >
              Dossiers
            </button>
            <span>›</span>
            <span>Dossier #{folderId}</span>
            <span>›</span>
            <span className="font-medium text-gray-900">Entités</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Entités</h1>
          <p className="text-gray-600 mt-1">
            Gérez les entités de votre enquête
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => goToGraph(folderId)}
            icon="🕸️"
          >
            Voir le graphique
          </Button>
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            icon="+"
          >
            Nouvelle entité
          </Button>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <SearchBar
              folderId={folderId}
              initialQuery={search}
              type={type}
              onSearch={handleSearch}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setMergeModalOpen(true)}
              disabled={!entities || entities.length < 2}
              size="small"
            >
              Fusionner doublons
            </Button>
            <Button
              variant="secondary"
              onClick={refresh}
              disabled={loading}
              icon={loading ? "⟳" : "↻"}
              size="small"
            >
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        {pagination && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <span>
                <strong>{pagination.total}</strong> entités au total
              </span>
              {search && (
                <span>
                  <strong>{entities.length}</strong> résultats pour "{search}"
                </span>
              )}
              {type && (
                <span>
                  Filtrées par type: <strong>{typeOptions.find(t => t.value === type)?.label || type}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Résultats de recherche */}
      {showSearchResults && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Résultats de recherche ({searchResults.length})
            </h3>
            <Button
              variant="ghost"
              size="small"
              onClick={clearSearch}
              icon="×"
            >
              Fermer
            </Button>
          </div>
          <SearchResults
            results={searchResults}
            onOpenEntity={handleOpenEntity}
          />
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-lg mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Erreur de chargement</h3>
              <p className="text-red-600 text-sm mt-1">
                {error.message || 'Impossible de charger les entités'}
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

      {/* Liste des entités */}
      <div className="bg-white rounded-lg border border-gray-200">
        <EntityList
          folderId={folderId}
          entities={entities}
          onEdit={handleEditEntity}
          onDelete={handleDeleteEntity}
          onOpen={handleOpenEntity}
        />

        {/* Pagination */}
        {pagination && pagination.total > 20 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page} sur {Math.ceil(pagination.total / 20)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={page * 20 >= pagination.total}
                  onClick={() => setPage(page + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Créer une entité"
        size="large"
      >
        <EntityForm
          folderId={folderId}
          onSubmit={handleCreateEntity}
          onCancel={() => setCreateModalOpen(false)}
          submitLabel="Créer"
        />
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEntity(null);
        }}
        title={`Modifier: ${editingEntity?.name || ''}`}
        size="large"
      >
        {editingEntity && (
          <EntityForm
            initial={editingEntity}
            folderId={folderId}
            onSubmit={handleUpdateEntity}
            onCancel={() => {
              setEditModalOpen(false);
              setEditingEntity(null);
            }}
            submitLabel="Mettre à jour"
          />
        )}
      </Modal>

      {/* Modal de fusion */}
      <EntityMergeModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        onMergeComplete={handleMergeComplete}
        onMergeError={handleMergeError}
        showCandidates={true}
      />
    </div>
  );
}