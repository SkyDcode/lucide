// frontend/src/modules/folders/components/FolderForm.jsx - Formulaire de dossier
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../components/ui/Button/Button';
import Modal from '../../../components/ui/Modal/Modal';
import { useFolderValidation } from '../hooks/useFolders';
import './FolderForm.css';

/**
 * Composant formulaire pour créer/modifier un dossier d'enquête
 */
const FolderForm = ({
  isOpen = false,
  onClose,
  onSubmit,
  folder = null,
  mode = 'create',
  loading = false,
  className = ''
}) => {
  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // État de validation
  const [touched, setTouched] = useState({
    name: false,
    description: false
  });

  // Hook de validation
  const {
    validationResult,
    validateFolderClient,
    clearValidation
  } = useFolderValidation();

  // Réinitialiser le formulaire quand le dossier change
  useEffect(() => {
    if (folder && mode === 'edit') {
      setFormData({
        name: folder.name || '',
        description: folder.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
    
    setTouched({
      name: false,
      description: false
    });
    
    clearValidation();
  }, [folder, mode, clearValidation]);

  /**
   * Gérer les changements de champ
   */
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Marquer comme touché
    if (!touched[field]) {
      setTouched(prev => ({
        ...prev,
        [field]: true
      }));
    }

    // Validation en temps réel
    const newData = { ...formData, [field]: value };
    validateFolderClient(newData, mode);
  };

  /**
   * Gérer la soumission du formulaire
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Marquer tous les champs comme touchés
    setTouched({
      name: true,
      description: true
    });

    // Validation finale
    const validation = validateFolderClient(formData, mode);
    
    if (!validation.valid) {
      return;
    }

    // Préparer les données à soumettre
    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null
    };

    try {
      await onSubmit(submitData);
      
      // Fermer la modal en cas de succès
      onClose();
      
      // Réinitialiser le formulaire
      setFormData({ name: '', description: '' });
      setTouched({ name: false, description: false });
      clearValidation();
      
    } catch (error) {
      // L'erreur est gérée par le composant parent
      console.error('Form submission error:', error);
    }
  };

  /**
   * Annuler et fermer
   */
  const handleCancel = () => {
    onClose();
    setFormData({ name: '', description: '' });
    setTouched({ name: false, description: false });
    clearValidation();
  };

  /**
   * Obtenir les erreurs pour un champ
   */
  const getFieldErrors = (field) => {
    if (!validationResult || !touched[field]) return [];
    
    return validationResult.errors?.filter(error => 
      error.field === field || error.field === 'general'
    ) || [];
  };

  /**
   * Vérifier si un champ a des erreurs
   */
  const hasFieldError = (field) => {
    return getFieldErrors(field).length > 0;
  };

  /**
   * Vérifier si le formulaire est valide
   */
  const isFormValid = () => {
    return validationResult?.valid !== false && 
           formData.name.trim().length > 0;
  };

  /**
   * Obtenir le titre de la modal
   */
  const getModalTitle = () => {
    switch (mode) {
      case 'edit':
        return 'Modifier le dossier';
      case 'duplicate':
        return 'Dupliquer le dossier';
      default:
        return 'Nouveau dossier';
    }
  };

  /**
   * Rendre un champ de formulaire
   */
  const renderField = (field, label, type = 'text', required = false, placeholder = '') => {
    const errors = getFieldErrors(field);
    const hasError = hasFieldError(field);

    return (
      <div className={`folder-form__field ${hasError ? 'folder-form__field--error' : ''}`}>
        <label htmlFor={`folder-${field}`} className="folder-form__label">
          {label}
          {required && <span className="folder-form__required">*</span>}
        </label>
        
        {type === 'textarea' ? (
          <textarea
            id={`folder-${field}`}
            value={formData[field]}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={placeholder}
            className="folder-form__textarea"
            rows={3}
            disabled={loading}
          />
        ) : (
          <input
            id={`folder-${field}`}
            type={type}
            value={formData[field]}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={placeholder}
            className="folder-form__input"
            disabled={loading}
          />
        )}
        
        {/* Indicateur de caractères pour le nom */}
        {field === 'name' && (
          <div className="folder-form__char-count">
            {formData.name.length} / 255
          </div>
        )}
        
        {field === 'description' && (
          <div className="folder-form__char-count">
            {formData.description.length} / 2000
          </div>
        )}

        {/* Affichage des erreurs */}
        {errors.length > 0 && (
          <div className="folder-form__errors">
            {errors.map((error, index) => (
              <span key={index} className="folder-form__error">
                {error.message}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  /**
   * Actions du pied de page
   */
  const footerActions = [
    {
      key: 'cancel',
      label: 'Annuler',
      variant: 'secondary',
      onClick: handleCancel,
      disabled: loading
    },
    {
      key: 'submit',
      label: mode === 'edit' ? 'Enregistrer' : 'Créer',
      variant: 'primary',
      onClick: handleSubmit,
      disabled: loading || !isFormValid(),
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="medium"
      footerActions={footerActions}
      className={`folder-form__modal ${className}`}
      closeOnEscape={!loading}
      overlayClosable={!loading}
    >
      <form className="folder-form" onSubmit={handleSubmit}>
        {/* Champ nom */}
        {renderField(
          'name',
          'Nom du dossier',
          'text',
          true,
          'Ex: Enquête cybercriminalité Q4 2024'
        )}

        {/* Champ description */}
        {renderField(
          'description',
          'Description',
          'textarea',
          false,
          'Description détaillée du dossier d\'enquête...'
        )}

        {/* Informations complémentaires en mode édition */}
        {mode === 'edit' && folder && (
          <div className="folder-form__info">
            <h4 className="folder-form__info-title">Informations</h4>
            <div className="folder-form__info-content">
              <div className="folder-form__info-item">
                <span className="folder-form__info-label">Créé le:</span>
                <span className="folder-form__info-value">
                  {new Intl.DateTimeFormat('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(new Date(folder.createdAt))}
                </span>
              </div>
              
              <div className="folder-form__info-item">
                <span className="folder-form__info-label">Dernière modification:</span>
                <span className="folder-form__info-value">
                  {new Intl.DateTimeFormat('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(new Date(folder.updatedAt))}
                </span>
              </div>
              
              <div className="folder-form__info-item">
                <span className="folder-form__info-label">Entités:</span>
                <span className="folder-form__info-value">{folder.entityCount}</span>
              </div>
              
              <div className="folder-form__info-item">
                <span className="folder-form__info-label">Relations:</span>
                <span className="folder-form__info-value">{folder.relationshipCount}</span>
              </div>
              
              <div className="folder-form__info-item">
                <span className="folder-form__info-label">Fichiers:</span>
                <span className="folder-form__info-value">{folder.fileCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Conseils et aide */}
        <div className="folder-form__help">
          <h4 className="folder-form__help-title">💡 Conseils</h4>
          <ul className="folder-form__help-list">
            <li>Utilisez un nom descriptif et unique pour faciliter la recherche</li>
            <li>La description peut contenir des mots-clés pour améliorer la recherche</li>
            <li>Évitez les caractères spéciaux dans le nom du dossier</li>
            {mode === 'create' && (
              <li>Vous pourrez ajouter des entités et fichiers après création</li>
            )}
          </ul>
        </div>
      </form>
    </Modal>
  );
};

FolderForm.propTypes = {
  /** État d'ouverture de la modal */
  isOpen: PropTypes.bool,

  /** Fonction appelée lors de la fermeture */
  onClose: PropTypes.func.isRequired,

  /** Fonction appelée lors de la soumission */
  onSubmit: PropTypes.func.isRequired,

  /** Dossier à modifier (mode edit) */
  folder: PropTypes.object,

  /** Mode du formulaire */
  mode: PropTypes.oneOf(['create', 'edit', 'duplicate']),

  /** État de chargement */
  loading: PropTypes.bool,

  /** Classes CSS supplémentaires */
  className: PropTypes.string
};

export default FolderForm;