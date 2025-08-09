// frontend/src/App.js - Composant principal LUCIDE
import React, { useState, useCallback } from 'react';
import FolderList from './modules/folders/components/FolderList';
import FolderForm from './modules/folders/components/FolderForm';
import { useFolders } from './modules/folders/hooks/useFolders';
import './App.css';

/**
 * Composant principal de l'application LUCIDE
 */
function App() {
  // État pour le formulaire de dossier
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [formMode, setFormMode] = useState('create');

  // Hook pour la gestion des dossiers
  const {
    folders = [],
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    duplicateFolder,
    archiveFolder,
    restoreFolder,
    refreshFolders
  } = useFolders();

  /**
   * Ouvrir le formulaire de création
   */
  const handleCreateFolder = useCallback(() => {
    setEditingFolder(null);
    setFormMode('create');
    setShowFolderForm(true);
  }, []);

  /**
   * Ouvrir le formulaire de modification
   */
  const handleEditFolder = useCallback((folder) => {
    setEditingFolder(folder);
    setFormMode('edit');
    setShowFolderForm(true);
  }, []);

  /**
   * Fermer le formulaire
   */
  const handleCloseForm = useCallback(() => {
    setShowFolderForm(false);
    setEditingFolder(null);
  }, []);

  /**
   * Soumettre le formulaire
   */
  const handleSubmitForm = useCallback(
    async (formData) => {
      try {
        if (formMode === 'create') {
          await createFolder(formData);
        } else if (formMode === 'edit' && editingFolder) {
          await updateFolder(editingFolder.id, formData);
        }
        // Fermer le formulaire et réinitialiser l'état
        setShowFolderForm(false);
        setEditingFolder(null);
        // Rafraîchir la liste si besoin
        await refreshFolders?.();
      } catch (err) {
        // L'erreur est gérée par les hooks mais on affiche un fallback
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Une erreur est survenue lors de l’enregistrement du dossier.';
        alert(message);
        throw err;
      }
    },
    [formMode, editingFolder, createFolder, updateFolder, refreshFolders]
  );

  /**
   * Sélectionner un dossier (pour navigation future)
   */
  const handleSelectFolder = useCallback((folder) => {
    console.log('Dossier sélectionné:', folder);
    // TODO: Navigation vers la vue détail du dossier
  }, []);

  /**
   * Supprimer un dossier avec confirmation
   */
  const handleDeleteFolder = useCallback(
    async (folder) => {
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir supprimer le dossier "${folder.name}" ?\n\n` +
          `Cette action est irréversible.`
      );

      if (!confirmed) return;

      try {
        await deleteFolder(folder.id);
        await refreshFolders?.();
      } catch (err) {
        const status = err?.status ?? err?.response?.status;
        // Si le dossier contient des entités, proposer la suppression forcée
        if (status === 409) {
          const forceConfirmed = window.confirm(
            `Le dossier "${folder.name}" contient des entités.\n\n` +
              `Voulez-vous forcer la suppression ? Toutes les données seront perdues.`
          );

          if (forceConfirmed) {
            try {
              await deleteFolder(folder.id, true);
              await refreshFolders?.();
            } catch (forceError) {
              alert(
                'Erreur lors de la suppression forcée: ' +
                  (forceError?.response?.data?.message || forceError?.message)
              );
            }
          }
        } else {
          alert('Erreur lors de la suppression: ' + (err?.message || 'Inconnue'));
        }
      }
    },
    [deleteFolder, refreshFolders]
  );

  /**
   * Dupliquer un dossier
   */
  const handleDuplicateFolder = useCallback(
    async (folder) => {
      try {
        await duplicateFolder(folder.id, {
          name: `${folder.name} (Copie)`
        });
        await refreshFolders?.();
      } catch (err) {
        alert('Erreur lors de la duplication: ' + (err?.message || 'Inconnue'));
      }
    },
    [duplicateFolder, refreshFolders]
  );

  /**
   * Archiver/Restaurer un dossier
   */
  const handleArchiveFolder = useCallback(
    async (folder) => {
      try {
        if (folder.isArchived) {
          await restoreFolder(folder.id);
        } else {
          const confirmed = window.confirm(
            `Voulez-vous archiver le dossier "${folder.name}" ?\n\n` +
              `Le dossier restera accessible mais sera marqué comme archivé.`
          );
          if (!confirmed) return;
          await archiveFolder(folder.id);
        }
        await refreshFolders?.();
      } catch (err) {
        alert("Erreur lors de l'archivage: " + (err?.message || 'Inconnue'));
      }
    },
    [archiveFolder, restoreFolder, refreshFolders]
  );

  return (
    <div className="app">
      {/* En-tête de l'application */}
      <header className="app__header">
        <div className="app__header-content">
          <div className="app__branding">
            <h1 className="app__title">🔍 LUCIDE</h1>
            <p className="app__subtitle">Application OSINT - Police Judiciaire</p>
          </div>

          <div className="app__header-actions">
            <button
              type="button"
              className="app__refresh-btn"
              onClick={refreshFolders}
              disabled={!!loading}
              title="Actualiser"
              aria-label="Actualiser la liste des dossiers"
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="app__main">
        <div className="app__container">
          {/* Message d'erreur global */}
          {error && (
            <div className="app__error" role="alert">
              <div className="app__error-content">
                <span className="app__error-icon" aria-hidden="true">
                  ⚠️
                </span>
                <span className="app__error-message">
                  {error?.message || 'Une erreur est survenue'}
                </span>
                <button type="button" className="app__error-retry" onClick={refreshFolders}>
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* Liste des dossiers */}
          <FolderList
            folders={folders}
            loading={loading}
            error={error}
            onSelectFolder={handleSelectFolder}
            onEditFolder={handleEditFolder}
            onDeleteFolder={handleDeleteFolder}
            onDuplicateFolder={handleDuplicateFolder}
            onArchiveFolder={handleArchiveFolder}
            onRestoreFolder={handleArchiveFolder}
            onCreateFolder={handleCreateFolder}
            showCreateButton={true}
            className="app__folder-list"
          />
        </div>
      </main>

      {/* Formulaire de dossier */}
      <FolderForm
        isOpen={showFolderForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        folder={editingFolder}
        mode={formMode}
        loading={loading}
      />

      {/* Pied de page */}
      <footer className="app__footer">
        <div className="app__footer-content">
          <p className="app__footer-text">LUCIDE v1.0 - Application OSINT pour enquêtes judiciaires</p>
          <p className="app__footer-stats">
            {folders.length} dossier{folders.length > 1 ? 's' : ''} chargé
            {folders.length > 1 ? 's' : ''}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
