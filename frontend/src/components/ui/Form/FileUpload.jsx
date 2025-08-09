// frontend/src/components/ui/Form/FileUpload.jsx - Composant FileUpload réutilisable

import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import './FileUpload.css';

/**
 * Composant FileUpload réutilisable avec drag & drop
 */
const FileUpload = ({
  accept = '*/*',
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB par défaut
  maxFiles = 10,
  onFilesSelected,
  onError,
  disabled = false,
  className = '',
  children,
  showPreview = true,
  allowedTypes = null, // ['image', 'document', 'video', 'audio', 'archive']
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  /**
   * Valider un fichier
   */
  const validateFile = useCallback((file) => {
    const errors = [];

    // Vérifier la taille
    if (file.size > maxSize) {
      errors.push(`Fichier trop volumineux: ${formatFileSize(file.size)} > ${formatFileSize(maxSize)}`);
    }

    // Vérifier le type si des types sont spécifiés
    if (allowedTypes && allowedTypes.length > 0) {
      const fileType = getFileTypeFromMime(file.type);
      if (!allowedTypes.includes(fileType)) {
        errors.push(`Type de fichier non autorisé: ${fileType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, [maxSize, allowedTypes]);

  /**
   * Traiter les fichiers sélectionnés
   */
  const processFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    const validFiles = [];
    const invalidFiles = [];

    // Vérifier le nombre maximum de fichiers
    if (files.length > maxFiles) {
      onError?.(`Trop de fichiers sélectionnés. Maximum: ${maxFiles}`);
      return;
    }

    // Valider chaque fichier
    files.forEach(file => {
      const validation = validateFile(file);
      
      if (validation.valid) {
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          fileType: getFileTypeFromMime(file.type),
          preview: null
        });
      } else {
        invalidFiles.push({
          file,
          name: file.name,
          errors: validation.errors
        });
      }
    });

    // Signaler les fichiers invalides
    if (invalidFiles.length > 0) {
      const errorMessage = invalidFiles
        .map(f => `${f.name}: ${f.errors.join(', ')}`)
        .join('\n');
      onError?.(errorMessage);
    }

    // Traiter les fichiers valides
    if (validFiles.length > 0) {
      // Générer les previews pour les images
      const filesWithPreviews = validFiles.map(fileData => {
        if (fileData.fileType === 'image' && showPreview) {
          return {
            ...fileData,
            preview: URL.createObjectURL(fileData.file)
          };
        }
        return fileData;
      });

      setSelectedFiles(prev => [...prev, ...filesWithPreviews]);
      onFilesSelected?.(validFiles.map(f => f.file));
    }
  }, [maxFiles, validateFile, onError, onFilesSelected, showPreview]);

  /**
   * Gestionnaire de sélection de fichiers
   */
  const handleFileSelect = useCallback((event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input pour permettre de re-sélectionner le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  /**
   * Gestionnaires drag & drop
   */
  const handleDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    // Vérifier si on quitte vraiment la zone de drop
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  /**
   * Ouvrir le sélecteur de fichiers
   */
  const openFileSelector = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  /**
   * Supprimer un fichier sélectionné
   */
  const removeFile = useCallback((fileId) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      
      // Nettoyer les URLs d'aperçu
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      
      return updated;
    });
  }, []);

  /**
   * Vider tous les fichiers
   */
  const clearFiles = useCallback(() => {
    // Nettoyer toutes les URLs d'aperçu
    selectedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setSelectedFiles([]);
  }, [selectedFiles]);

  /**
   * Construire les classes CSS
   */
  const getDropZoneClasses = () => {
    const classes = [
      'file-upload',
      isDragOver && 'file-upload--drag-over',
      disabled && 'file-upload--disabled',
      selectedFiles.length > 0 && 'file-upload--has-files',
      className
    ].filter(Boolean);

    return classes.join(' ');
  };

  /**
   * Rendu des fichiers sélectionnés
   */
  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <div className="file-upload__files">
        <div className="file-upload__files-header">
          <span className="file-upload__files-count">
            {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            className="file-upload__clear-btn"
            onClick={clearFiles}
            disabled={disabled}
          >
            Tout supprimer
          </button>
        </div>
        
        <div className="file-upload__files-list">
          {selectedFiles.map(fileData => (
            <div key={fileData.id} className="file-upload__file-item">
              {fileData.preview && (
                <div className="file-upload__file-preview">
                  <img
                    src={fileData.preview}
                    alt={fileData.name}
                    className="file-upload__preview-image"
                  />
                </div>
              )}
              
              <div className="file-upload__file-info">
                <div className="file-upload__file-name" title={fileData.name}>
                  {fileData.name}
                </div>
                <div className="file-upload__file-details">
                  <span className="file-upload__file-size">
                    {formatFileSize(fileData.size)}
                  </span>
                  <span className="file-upload__file-type">
                    {fileData.fileType}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                className="file-upload__remove-btn"
                onClick={() => removeFile(fileData.id)}
                disabled={disabled}
                aria-label={`Supprimer ${fileData.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="file-upload-container">
      {/* Zone de drop */}
      <div
        className={getDropZoneClasses()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="file-upload__input"
          aria-label="Sélectionner des fichiers"
        />
        
        <div className="file-upload__content">
          {children || (
            <>
              <div className="file-upload__icon">
                📎
              </div>
              <div className="file-upload__text">
                <div className="file-upload__primary-text">
                  {isDragOver 
                    ? 'Déposez les fichiers ici'
                    : 'Glissez-déposez vos fichiers ici'
                  }
                </div>
                <div className="file-upload__secondary-text">
                  ou cliquez pour sélectionner
                </div>
              </div>
              <div className="file-upload__limits">
                <div>Maximum {maxFiles} fichier{maxFiles > 1 ? 's' : ''}</div>
                <div>Taille max: {formatFileSize(maxSize)}</div>
                {allowedTypes && (
                  <div>Types: {allowedTypes.join(', ')}</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Liste des fichiers sélectionnés */}
      {renderSelectedFiles()}
    </div>
  );
};

/**
 * Formater la taille d'un fichier
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Obtenir le type de fichier à partir du MIME type
 */
function getFileTypeFromMime(mimeType) {
  if (!mimeType) return 'other';
  
  const type = mimeType.toLowerCase();
  
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.includes('pdf')) return 'document';
  if (type.includes('document') || type.includes('word') || 
      type.includes('excel') || type.includes('powerpoint') || 
      type.includes('text')) return 'document';
  if (type.includes('zip') || type.includes('rar') || 
      type.includes('tar') || type.includes('gzip')) return 'archive';
  
  return 'other';
}

FileUpload.propTypes = {
  /** Types de fichiers acceptés (attribut HTML accept) */
  accept: PropTypes.string,
  
  /** Permettre la sélection multiple */
  multiple: PropTypes.bool,
  
  /** Taille maximale par fichier en bytes */
  maxSize: PropTypes.number,
  
  /** Nombre maximum de fichiers */
  maxFiles: PropTypes.number,
  
  /** Callback appelé quand des fichiers sont sélectionnés */
  onFilesSelected: PropTypes.func,
  
  /** Callback appelé en cas d'erreur */
  onError: PropTypes.func,
  
  /** État désactivé */
  disabled: PropTypes.bool,
  
  /** Classes CSS supplémentaires */
  className: PropTypes.string,
  
  /** Contenu personnalisé de la zone de drop */
  children: PropTypes.node,
  
  /** Afficher les aperçus d'images */
  showPreview: PropTypes.bool,
  
  /** Types de fichiers autorisés */
  allowedTypes: PropTypes.arrayOf(PropTypes.oneOf([
    'image', 'document', 'video', 'audio', 'archive', 'other'
  ]))
};

export default FileUpload;