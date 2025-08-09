// frontend/src/modules/entities/components/EntityMediaUpload.jsx - Composant d'upload de médias pour entités

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import FileUpload from '../../../components/ui/Form/FileUpload';
import useEntityMedia from '../hooks/useEntityMedia';
import './EntityMediaUpload.css';

/**
 * Composant pour l'upload et la gestion des médias d'une entité
 */
const EntityMediaUpload = ({ 
  entityId, 
  folderId,
  allowedTypes = ['image', 'document', 'video', 'audio', 'archive'],
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  showFileList = true,
  compact = false,
  onFileUploaded = null,
  onFileDeleted = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [showUploadZone, setShowUploadZone] = useState(true);

  // Hook pour gérer les médias
  const {
    files,
    statistics,
    loading,
    uploading,
    uploadProgress,
    error,
    hasFiles,
    totalFiles,
    totalSize,
    uploadFiles,
    deleteFile,
    updateFile,
    duplicateFile,
    moveFile,
    searchFiles,
    getDownloadUrl,
    getThumbnailUrl,
    getFilesByType,
    getTypeStatistics,
    refresh,
    clearError
  } = useEntityMedia(entityId, {
    onUploadSuccess: (response) => {
      setShowUploadZone(false);
      onFileUploaded?.(response);
    },
    onDeleteSuccess: (fileId) => {
      onFileDeleted?.(fileId);
    }
  });

  /**
   * Gérer l'upload de fichiers
   */
  const handleFilesSelected = useCallback(async (fileList) => {
    const result = await uploadFiles(fileList);
    
    if (result.success && result.uploadedCount > 0) {
      console.log(`${result.uploadedCount} fichier(s) uploadé(s) avec succès`);
    }
  }, [uploadFiles]);

  /**
   * Gérer les erreurs d'upload
   */
  const handleUploadError = useCallback((errorMessage) => {
    console.error('Erreur d\'upload:', errorMessage);
  }, []);

  /**
   * Supprimer un fichier
   */
  const handleDeleteFile = useCallback(async (fileId, fileName) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?`)) {
      const result = await deleteFile(fileId);
      
      if (result.success) {
        console.log('Fichier supprimé avec succès');
      }
    }
  }, [deleteFile]);

  /**
   * Renommer un fichier
   */
  const handleRenameFile = useCallback(async (fileId, currentName) => {
    const newName = window.prompt('Nouveau nom du fichier:', currentName);
    
    if (newName && newName.trim() !== currentName) {
      const result = await updateFile(fileId, { 
        original_name: newName.trim() 
      });
      
      if (result.success) {
        console.log('Fichier renommé avec succès');
      }
    }
  }, [updateFile]);

  /**
   * Télécharger un fichier
   */
  const handleDownloadFile = useCallback((fileId, fileName) => {
    const url = getDownloadUrl(fileId);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getDownloadUrl]);

  /**
   * Effectuer une recherche
   */
  const handleSearch = useCallback((event) => {
    const term = event.target.value;
    setSearchTerm(term);
    
    // Débounce la recherche
    const timeoutId = setTimeout(() => {
      searchFiles(term);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchFiles]);

  /**
   * Filtrer les fichiers affichés
   */
  const filteredFiles = useMemo(() => {
    if (selectedFileType === 'all') {
      return files;
    }
    return getFilesByType(selectedFileType);
  }, [files, selectedFileType, getFilesByType]);

  /**
   * Statistiques par type
   */
  const typeStats = useMemo(() => {
    return getTypeStatistics();
  }, [getTypeStatistics]);

  /**
   * Formater la taille d'un fichier
   */
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Obtenir l'icône pour un type de fichier
   */
  const getFileTypeIcon = useCallback((fileType) => {
    const icons = {
      image: '🖼️',
      document: '📄',
      video: '🎥',
      audio: '🎵',
      archive: '🗜️',
      other: '📎'
    };
    return icons[fileType] || icons.other;
  }, []);

  /**
   * Rendu du composant compact
   */
  if (compact) {
    return (
      <div className="entity-media-upload entity-media-upload--compact">
        {showUploadZone && (
          <FileUpload
            accept="*/*"
            multiple={true}
            maxSize={maxFileSize}
            maxFiles={maxFiles}
            allowedTypes={allowedTypes}
            onFilesSelected={handleFilesSelected}
            onError={handleUploadError}
            disabled={uploading}
            className="entity-media-upload__compact-drop-zone"
          >
            <div className="entity-media-upload__compact-content">
              <span className="entity-media-upload__compact-icon">📎</span>
              <span className="entity-media-upload__compact-text">
                {uploading ? 'Upload en cours...' : 'Ajouter des fichiers'}
              </span>
              {hasFiles && (
                <span className="entity-media-upload__compact-count">
                  ({totalFiles})
                </span>
              )}
            </div>
          </FileUpload>
        )}
        
        {error && (
          <div className="entity-media-upload__error">
            {error}
            <button onClick={clearError} className="entity-media-upload__error-close">
              ×
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="entity-media-upload">
      {/* Zone d'upload */}
      {showUploadZone && (
        <div className="entity-media-upload__upload-section">
          <FileUpload
            accept="*/*"
            multiple={true}
            maxSize={maxFileSize}
            maxFiles={maxFiles}
            allowedTypes={allowedTypes}
            onFilesSelected={handleFilesSelected}
            onError={handleUploadError}
            disabled={uploading}
            showPreview={true}
          />
          
          {uploading && (
            <div className="entity-media-upload__progress">
              <div className="entity-media-upload__progress-text">
                Upload en cours...
              </div>
              {Object.entries(uploadProgress).map(([uploadId, progress]) => (
                <div key={uploadId} className="entity-media-upload__progress-bar">
                  <div 
                    className="entity-media-upload__progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                  <span className="entity-media-upload__progress-percent">
                    {progress}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="entity-media-upload__error">
          <span className="entity-media-upload__error-icon">⚠️</span>
          <span className="entity-media-upload__error-text">{error}</span>
          <button 
            onClick={clearError} 
            className="entity-media-upload__error-close"
          >
            ×
          </button>
        </div>
      )}

      {/* Liste des fichiers */}
      {showFileList && (
        <div className="entity-media-upload__files-section">
          {/* Header avec statistiques et contrôles */}
          <div className="entity-media-upload__files-header">
            <div className="entity-media-upload__stats">
              <div className="entity-media-upload__stats-item">
                <span className="entity-media-upload__stats-value">{totalFiles}</span>
                <span className="entity-media-upload__stats-label">fichier{totalFiles > 1 ? 's' : ''}</span>
              </div>
              <div className="entity-media-upload__stats-item">
                <span className="entity-media-upload__stats-value">{formatFileSize(totalSize)}</span>
                <span className="entity-media-upload__stats-label">total</span>
              </div>
            </div>

            <div className="entity-media-upload__controls">
              {/* Recherche */}
              <input
                type="text"
                placeholder="Rechercher des fichiers..."
                value={searchTerm}
                onChange={handleSearch}
                className="entity-media-upload__search"
                disabled={loading}
              />

              {/* Filtre par type */}
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="entity-media-upload__type-filter"
                disabled={loading}
              >
                <option value="all">Tous les types</option>
                {Object.entries(typeStats).map(([type, stats]) => (
                  <option key={type} value={type}>
                    {getFileTypeIcon(type)} {type} ({stats.count})
                  </option>
                ))}
              </select>

              {/* Boutons d'action */}
              <button
                onClick={refresh}
                disabled={loading}
                className="entity-media-upload__refresh-btn"
                title="Actualiser"
              >
                🔄
              </button>

              <button
                onClick={() => setShowUploadZone(!showUploadZone)}
                className="entity-media-upload__toggle-upload-btn"
                title={showUploadZone ? 'Masquer la zone d\'upload' : 'Afficher la zone d\'upload'}
              >
                {showUploadZone ? '⬆️' : '⬇️'}
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="entity-media-upload__loading">
              <div className="entity-media-upload__loading-spinner"></div>
              <span>Chargement des fichiers...</span>
            </div>
          )}

          {/* Liste des fichiers */}
          {!loading && (
            <div className="entity-media-upload__files-list">
              {filteredFiles.length === 0 ? (
                <div className="entity-media-upload__no-files">
                  {searchTerm || selectedFileType !== 'all' 
                    ? 'Aucun fichier ne correspond aux critères'
                    : 'Aucun fichier attaché'
                  }
                </div>
              ) : (
                filteredFiles.map(file => (
                  <div key={file.id} className="entity-media-upload__file-item">
                    {/* Aperçu/Icône */}
                    <div className="entity-media-upload__file-preview">
                      {file.file_type === 'image' ? (
                        <img
                          src={getThumbnailUrl(file.id)}
                          alt={file.original_name}
                          className="entity-media-upload__file-thumbnail"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="entity-media-upload__file-icon"
                        style={{ display: file.file_type === 'image' ? 'none' : 'flex' }}
                      >
                        {getFileTypeIcon(file.file_type)}
                      </div>
                    </div>

                    {/* Informations du fichier */}
                    <div className="entity-media-upload__file-info">
                      <div className="entity-media-upload__file-name" title={file.original_name}>
                        {file.original_name}
                      </div>
                      <div className="entity-media-upload__file-details">
                        <span className="entity-media-upload__file-size">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="entity-media-upload__file-type">
                          {file.file_type}
                        </span>
                        <span className="entity-media-upload__file-date">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="entity-media-upload__file-actions">
                      <button
                        onClick={() => handleDownloadFile(file.id, file.original_name)}
                        className="entity-media-upload__file-action"
                        title="Télécharger"
                      >
                        ⬇️
                      </button>
                      
                      <button
                        onClick={() => handleRenameFile(file.id, file.original_name)}
                        className="entity-media-upload__file-action"
                        title="Renommer"
                      >
                        ✏️
                      </button>
                      
                      <button
                        onClick={() => handleDeleteFile(file.id, file.original_name)}
                        className="entity-media-upload__file-action entity-media-upload__file-action--danger"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

EntityMediaUpload.propTypes = {
  /** ID de l'entité */
  entityId: PropTypes.number.isRequired,
  
  /** ID du dossier (optionnel) */
  folderId: PropTypes.number,
  
  /** Types de fichiers autorisés */
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  
  /** Taille maximale par fichier en bytes */
  maxFileSize: PropTypes.number,
  
  /** Nombre maximum de fichiers */
  maxFiles: PropTypes.number,
  
  /** Afficher la liste des fichiers */
  showFileList: PropTypes.bool,
  
  /** Mode compact */
  compact: PropTypes.bool,
  
  /** Callback appelé après upload réussi */
  onFileUploaded: PropTypes.func,
  
  /** Callback appelé après suppression réussie */
  onFileDeleted: PropTypes.func
};

export default EntityMediaUpload;