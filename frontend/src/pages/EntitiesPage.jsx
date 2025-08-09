// frontend/src/pages/EntitiesPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/ui/Button/Button';
import Modal from '../components/ui/Modal/Modal';
import EntityList from '../modules/entities/components/EntityList';
import EntityForm from '../modules/entities/components/EntityForm';
import useEntities from '../modules/entities/hooks/useEntities';
import useEntityTypes from '../modules/entities/hooks/useEntityTypes';
import SearchBar from '../modules/search/components/SearchBar';
import SearchResults from '../modules/search/components/SearchResults';
import EntityMergeModal from '../modules/entities/components/EntityMergeModal';
import { useNotifications } from '../shared/hooks/useNotifications';
import { useAppStore } from '../shared/store/appStore';

export default function EntitiesPage() {
  const params = useParams();
  const folderId = Number(params.folderId);
  const { setCurrentFolderId } = useAppStore();

  const { entities, loading, error, createEntity, deleteEntity, refresh } = useEntities(folderId);
  const { types } = useEntityTypes();

  const { notify } = useNotifications();
  const [openCreate, setOpenCreate] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => { setCurrentFolderId(folderId); }, [folderId, setCurrentFolderId]);

  const handleCreate = async (payload) => {
    try {
      await createEntity({ ...payload, folder_id: folderId });
      setOpenCreate(false);
      notify({ type: 'success', message: 'Entité créée' });
      refresh();
    } catch (e) {
      notify({ type: 'error', message: `Erreur création: ${e.message || e}` });
    }
  };

  const handleDelete = async (entity) => {
    if (!window.confirm(`Supprimer l'entité "${entity.name}" ?`)) return;
    try { await deleteEntity(entity.id); notify({ type: 'success', message: 'Entité supprimée' }); refresh(); }
    catch (e) { notify({ type: 'error', message: `Erreur suppression: ${e.message || e}` }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={() => setOpenCreate(true)}>Nouvelle entité</Button>
        <Button variant="secondary" onClick={() => setMergeOpen(true)}>Fusionner doublons…</Button>
        <Button variant="secondary" onClick={refresh} disabled={loading}>Actualiser</Button>
      </div>

      <SearchBar folderId={folderId}
        initialQuery=""
        type={''}
        onSearch={async ({ q }) => {
          // Utilise l'endpoint /api/entities/search défini en Phase 7
          const res = await fetch(`/api/entities/search?q=${encodeURIComponent(q)}&folderId=${folderId}`);
          const json = await res.json();
          setSearchResults(json.results || []);
        }}
      />

      {searchResults?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">Résultats de recherche</div>
          <SearchResults results={searchResults} onOpenEntity={() => { /* TODO: open detail */ }} />
        </div>
      )}

      {error && <div className="text-red-600">Erreur: {String(error.message || error)}</div>}

      <EntityList entities={entities || []} onDelete={handleDelete} onOpen={() => {}} />

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Nouvelle entité">
        <EntityForm entityTypes={types || []} onSubmit={handleCreate} onCancel={() => setOpenCreate(false)} />
      </Modal>

      <EntityMergeModal
        open={mergeOpen}
        folderId={folderId}
        onClose={() => setMergeOpen(false)}
        onMerged={() => { refresh(); setMergeOpen(false); notify({ type: 'success', message: 'Fusion effectuée' }); }}
      />
    </div>
  );
}