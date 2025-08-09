// frontend/src/modules/entities/components/EntityList.jsx
import React, { useMemo, useState } from 'react';
import useEntities from '../hooks/useEntities';
import useEntityTypes from '../hooks/useEntityTypes';
import EntityCard from './EntityCard';
import EntityForm from './EntityForm';
import Modal from '../../../components/ui/Modal/Modal';
import Input from '../../../components/ui/Form/Input';
import Select from '../../../components/ui/Form/Select';

export default function EntityList({ folderId = null }) {
  const {
    items, loading, error, pagination,
    search, setSearch,
    type, setType,
    page, setPage,
    createEntity, updateEntity, deleteEntity,
  } = useEntities({ folderId });

  const { types, byKey } = useEntityTypes();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const typeOptions = useMemo(() => [{ value: '', label: 'Tous les types' }, ...types.map(t => ({ value: t.key, label: t.label || t.key }))], [types]);

  const onCreate = async (payload) => {
    await createEntity(payload);
    setOpen(false);
  };

  const onUpdate = async (payload) => {
    if (!editing) return;
    await updateEntity(editing.id, payload);
    setEditing(null);
  };

  const onDelete = async (ent) => {
    if (!window.confirm(`Supprimer l'entité "${ent.name}" ?`)) return;
    await deleteEntity(ent.id);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barre d'actions / filtres */}
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <Input label="Recherche" value={search} onChange={setSearch} placeholder="Nom, attributs…" />
        </div>
        <div className="w-full md:w-72">
          <Select label="Type" value={type} onChange={setType} options={typeOptions} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500">Nouvelle entité</button>
        </div>
      </div>

      {loading && <div className="text-gray-300">Chargement…</div>}
      {error && <div className="text-red-400">Erreur: {String(error.message || error)}</div>}

      {/* Liste */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((e) => (
          <EntityCard
            key={e.id}
            entity={e}
            typeMap={byKey}
            onEdit={(ent) => setEditing(ent)}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Pagination simple */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-gray-400">
          {pagination.total} résultat(s)
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <button
            className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200 disabled:opacity-50"
            disabled={(page * 20) >= pagination.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </div>
      </div>

      {/* Modal création */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Créer une entité">
        <EntityForm folderId={folderId} onSubmit={onCreate} onCancel={() => setOpen(false)} submitLabel="Créer" />
      </Modal>

      {/* Modal édition */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Modifier: ${editing?.name ?? ''}`}>
        {editing && (
          <EntityForm
            initial={editing}
            folderId={editing.folder_id || folderId}
            onSubmit={onUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Mettre à jour"
          />
        )}
      </Modal>
    </div>
  );
}