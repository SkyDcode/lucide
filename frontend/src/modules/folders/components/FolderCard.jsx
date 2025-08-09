// frontend/src/modules/folders/components/FolderCard.jsx - Composant carte de dossier
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../components/ui/Button/Button';
import './FolderCard.css';

/**
 * Composant carte pour afficher un dossier d'enquête
 */
const FolderCard = ({
  folder,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onRestore,
  className = '',
  showActions = true,
  selectable = false,
  selected = false,
  onSelect,
  loading = false
}) => {
  const [actionsVisible, setActionsVisible] = useState(false);

  /**
   * Formater la date pour l'affichage
   */
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  /**
   * Obtenir l'icône selon la catégorie de taille
   */
  const getSizeIcon = (sizeCategory) => {
    const icons = {
      empty: '📁',
      small: '📂',
      medium: '🗂️',
      large: '🗃️',
      extra_large: '🗄️'
    };
    return icons[sizeCategory] || '📁';
  };

  /**
   * Obtenir la couleur selon la catégorie de taille
   */
  const getSizeColor = (sizeCategory) => {
    const colors = {
      empty: '#9ca3af',
      small: '#10b981',
      medium: '#f59e0b',
      large: '#ef4444',
      extra_large: '#7c3aed'
    };
    return colors[sizeCategory] || '#9ca3af';
  };

  /**
   * Gérer le clic sur la carte
   */
  const handleCardClick = (event) => {
    // Ne pas déclencher onClick si on clique sur un bouton
    if (event.target.closest('button') || event.target.closest('.folder-card__actions')) {
      return;
    }

    if (selectable && onSelect) {
      onSelect(folder.id, !selected);
    } else if (onClick) {
      onClick(folder);
    }
  };

  /**
   * Gérer les actions
   */
  const handleEdit = (event) => {
    event.stopPropagation();
    onEdit?.(folder);
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete?.(folder);
  };

  const handleDuplicate = (event) => {
    event.stopPropagation();
    onDuplicate?.(folder);
  };

  const handleArchive = (event) => {
    event.stopPropagation();
    if (folder.isArchived) {
      onRestore?.(folder);
    } else {
      onArchive?.(folder);
    }
  };

  /**
   * Construire les classes CSS
   */
  const getCardClasses = () => {
    return [
      'folder-card',
      folder.isEmpty && 'folder-card--empty',
      folder.isArchived && 'folder-card--archived',
      folder.isRecent && 'folder-card--recent',
      folder.isStale && 'folder-card--stale',
      selectable && 'folder-card--selectable',
      selected && 'folder-card--selected',
      loading && 'folder-card--loading',
      className
    ].filter(Boolean).join(' ');
  };

  return (
    <div
      className={getCardClasses()}
      onClick={handleCardClick}
      onMouseEnter={() => setActionsVisible(true)}
      onMouseLeave={() => setActionsVisible(false)}
      role={selectable ? "checkbox" : "button"}
      aria-checked={selectable ? selected : undefined}
      tabIndex={0}
    >
      {/* Checkbox de sélection */}
      {selectable && (
        <div className="folder-card__selector">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect?.(folder.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* En-tête de la carte */}
      <div className="folder-card__header">
        <div className="folder-card__icon">
          <span 
            className="folder-card__size-icon"
            style={{ color: getSizeColor(folder.sizeCategory) }}
          >
            {getSizeIcon(folder.sizeCategory)}
          </span>
        </div>

        {/* Actions */}
        {showActions && (
          <div 
            className={`folder-card__actions ${actionsVisible ? 'folder-card__actions--visible' : ''}`}
          >
            {onEdit && (
              <Button
                variant="ghost"
                size="small"
                icon="✏️"
                onClick={handleEdit}
                aria-label="Modifier le dossier"
              />
            )}
            
            {onDuplicate && (
              <Button
                variant="ghost"
                size="small"
                icon="📋"
                onClick={handleDuplicate}
                aria-label="Dupliquer le dossier"
              />
            )}
            
            {(onArchive || onRestore) && (
              <Button
                variant="ghost"
                size="small"
                icon={folder.isArchived ? "📤" : "📥"}
                onClick={handleArchive}
                aria-label={folder.isArchived ? "Restaurer le dossier" : "Archiver le dossier"}
              />
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="small"
                icon="🗑️"
                onClick={handleDelete}
                aria-label="Supprimer le dossier"
              />
            )}
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className="folder-card__content">
        <h3 className="folder-card__title" title={folder.name}>
          {folder.name}
        </h3>

        {folder.description && (
          <p className="folder-card__description" title={folder.description}>
            {folder.description}
          </p>
        )}

        {/* Statistiques */}
        <div className="folder-card__stats">
          <div className="folder-card__stat">
            <span className="folder-card__stat-icon">👥</span>
            <span className="folder-card__stat-value">{folder.entityCount}</span>
            <span className="folder-card__stat-label">entités</span>
          </div>

          <div className="folder-card__stat">
            <span className="folder-card__stat-icon">🔗</span>
            <span className="folder-card__stat-value">{folder.relationshipCount}</span>
            <span className="folder-card__stat-label">relations</span>
          </div>

          <div className="folder-card__stat">
            <span className="folder-card__stat-icon">📎</span>
            <span className="folder-card__stat-value">{folder.fileCount}</span>
            <span className="folder-card__stat-label">fichiers</span>
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <div className="folder-card__footer">
        <div className="folder-card__dates">
          <div className="folder-card__date">
            <span className="folder-card__date-label">Créé:</span>
            <span className="folder-card__date-value">
              {formatDate(folder.createdAt)}
            </span>
          </div>

          {folder.lastActivity && folder.lastActivity !== folder.createdAt && (
            <div className="folder-card__date">
              <span className="folder-card__date-label">Activité:</span>
              <span className="folder-card__date-value">
                {formatDate(folder.lastActivity)}
              </span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="folder-card__badges">
          {folder.isArchived && (
            <span className="folder-card__badge folder-card__badge--archived">
              Archivé
            </span>
          )}

          {folder.isRecent && !folder.isArchived && (
            <span className="folder-card__badge folder-card__badge--recent">
              Récent
            </span>
          )}

          {folder.isStale && !folder.isArchived && (
            <span className="folder-card__badge folder-card__badge--stale">
              Inactif
            </span>
          )}

          {folder.isEmpty && (
            <span className="folder-card__badge folder-card__badge--empty">
              Vide
            </span>
          )}
        </div>
      </div>

      {/* Overlay de chargement */}
      {loading && (
        <div className="folder-card__loading">
          <div className="folder-card__spinner">
            <svg viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                className="folder-card__spinner-circle"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

FolderCard.propTypes = {
  /** Objet dossier à afficher */
  folder: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    createdAt: PropTypes.instanceOf(Date),
    updatedAt: PropTypes.instanceOf(Date),
    lastActivity: PropTypes.instanceOf(Date),
    entityCount: PropTypes.number,
    relationshipCount: PropTypes.number,
    fileCount: PropTypes.number,
    isEmpty: PropTypes.bool,
    isActive: PropTypes.bool,
    isArchived: PropTypes.bool,
    isRecent: PropTypes.bool,
    isStale: PropTypes.bool,
    sizeCategory: PropTypes.string
  }).isRequired,

  /** Fonction appelée lors du clic sur la carte */
  onClick: PropTypes.func,

  /** Fonction appelée pour modifier le dossier */
  onEdit: PropTypes.func,

  /** Fonction appelée pour supprimer le dossier */
  onDelete: PropTypes.func,

  /** Fonction appelée pour dupliquer le dossier */
  onDuplicate: PropTypes.func,

  /** Fonction appelée pour archiver le dossier */
  onArchive: PropTypes.func,

  /** Fonction appelée pour restaurer le dossier */
  onRestore: PropTypes.func,

  /** Classes CSS supplémentaires */
  className: PropTypes.string,

  /** Afficher les actions */
  showActions: PropTypes.bool,

  /** Mode sélectionnable */
  selectable: PropTypes.bool,

  /** État sélectionné */
  selected: PropTypes.bool,

  /** Fonction appelée lors de la sélection */
  onSelect: PropTypes.func,

  /** État de chargement */
  loading: PropTypes.bool
};

export default FolderCard;