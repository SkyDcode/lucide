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
  const { folders, loading, error, createFolder, removeFolder, refresh } = useFolders();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { goToEntities } = useNavigation();
  const { notify } = useNotifications();
  const { setCurrentFolderId } = useAppStore();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders || [];
    return (folders || []).filter((f) => String(f.name).toLowerCase().includes(q));
  }, [folders, query]);

  const onCreate = async (payload) => {
    try {
      const f = await createFolder(payload);
      notify({ type: 'success', message: `Dossier créé: ${f.name} (#${f.id})` });
      setOpen(false);
      setCurrentFolderId(f.id);
      goToEntities(f.id);
    } catch (e) {
      notify({ type: 'error', message: `Échec création dossier: ${e.message || e}` });
    }
  };

  const onDelete = async (folder) => {
    if (!window.confirm(`Supprimer le dossier "${folder.name}" ?`)) return;
    try {
      await removeFolder(folder.id);
      notify({ type: 'success', message: 'Dossier supprimé' });
      refresh();
    } catch (e) {
      notify({ type: 'error', message: `Échec suppression: ${e.message || e}` });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className="border rounded px-3 py-2" placeholder="Rechercher un dossier…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button onClick={() => setOpen(true)}>Nouveau dossier</Button>
        <Button variant="secondary" onClick={refresh} disabled={loading}>Actualiser</Button>
      </div>

      {error && <div className="text-red-600">Erreur: {String(error.message || error)}</div>}

      <FolderList
        folders={filtered}
        onOpen={(folder) => { setCurrentFolderId(folder.id); goToEntities(folder.id); }}
        onDelete={onDelete}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau dossier">
        <FolderForm onSubmit={onCreate} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  );
}