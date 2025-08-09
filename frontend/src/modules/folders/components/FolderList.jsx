// frontend/src/modules/folders/components/FolderList.jsx - Composant liste de dossiers
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../components/ui/Button/Button';
import FolderCard from './FolderCard';
import './FolderList.css';

/**
 * Composant pour afficher une liste de dossiers avec tri et filtrage
 */
const FolderList = ({
  folders = [],
  loading = false,
  error = null,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  onDuplicateFolder,
  onArchiveFolder,
  onRestoreFolder,
  onCreateFolder,
  selectable = false,
  selectedFolders = [],
  onSelectionChange,
  showCreateButton = true,
  showBulkActions = false,
  viewMode = 'grid',
  sortBy = 'updated_at',
  sortDirection = 'DESC',
  onSortChange,
  filterBy = 'all',
  onFilterChange,
  searchTerm = '',
  onSearchChange,
  className = ''
}) => {
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);

  /**
   * Filtrer et trier les dossiers
   */
  const filteredAndSortedFolders = useMemo(() => {
    let filtered = [...folders];

    // Filtrage par terme de recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(folder =>
        folder.name.toLowerCase().includes(search) ||
        (folder.description && folder.description.toLowerCase().includes(search))
      );
    }

    // Filtrage par type
    switch (filterBy) {
      case 'active':
        filtered = filtered.filter(folder => folder.isActive);
        break;
      case 'empty':
        filtered = filtered.filter(folder => folder.isEmpty);
        break;
      case 'archived':
        filtered = filtered.filter(folder => folder.isArchived);
        break;
      case 'recent':
        filtered = filtered.filter(folder => folder.isRecent);
        break;
      case 'stale':
        filtered = filtered.filter(folder => folder.isStale);
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
        case 'entity_count':
          valueA = a.entityCount;
          valueB = b.entityCount;
          break;
        case 'created_at':
          valueA = a.createdAt;
          valueB = b.createdAt;
          break;
        case 'updated_at':
        default:
          valueA = a.updatedAt;
          valueB = b.updatedAt;
          break;
      }

      if (valueA < valueB) return sortDirection === 'ASC' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'ASC' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [folders, searchTerm, filterBy, sortBy, sortDirection]);

  /**
   * Gérer la sélection d'un dossier
   */
  const handleSelectFolder = (folderId, selected) => {
    if (!onSelectionChange) return;

    const newSelection = selected
      ? [...selectedFolders, folderId]
      : selectedFolders.filter(id => id !== folderId);

    onSelectionChange(newSelection);
  };

  /**
   * Sélectionner/désélectionner tous les dossiers
   */
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    const allSelected = filteredAndSortedFolders.length > 0 && 
      filteredAndSortedFolders.every(folder => selectedFolders.includes(folder.id));

    if (allSelected) {
      // Désélectionner tous
      onSelectionChange([]);
    } else {
      // Sélectionner tous les dossiers visibles
      const allIds = filteredAndSortedFolders.map(folder => folder.id);
      onSelectionChange(allIds);
    }
  };

  /**
   * Obtenir les statistiques de la liste
   */
  const getListStats = () => {
    const total = folders.length;
    const filtered = filteredAndSortedFolders.length;
    const selected = selectedFolders.length;

    return { total, filtered, selected };
  };

  /**
   * Rendre la barre d'actions en haut
   */
  const renderToolbar = () => {
    const stats = getListStats();
    
    return (
      <div className="folder-list__toolbar">
        <div className="folder-list__toolbar-left">
          {/* Compteurs */}
          <div className="folder-list__stats">
            {stats.filtered !== stats.total ? (
              <span>{stats.filtered} sur {stats.total} dossiers</span>
            ) : (
              <span>{stats.total} dossier{stats.total > 1 ? 's' : ''}</span>
            )}
            
            {selectable && stats.selected > 0 && (
              <span className="folder-list__selected-count">
                ({stats.selected} sélectionné{stats.selected > 1 ? 's' : ''})
              </span>
            )}
          </div>

          {/* Sélection globale */}
          {selectable && (
            <div className="folder-list__select-all">
              <label className="folder-list__checkbox">
                <input
                  type="checkbox"
                  checked={stats.filtered > 0 && filteredAndSortedFolders.every(folder => 
                    selectedFolders.includes(folder.id)
                  )}
                  onChange={handleSelectAll}
                />
                <span>Tout sélectionner</span>
              </label>
            </div>
          )}
        </div>

        <div className="folder-list__toolbar-right">
          {/* Actions en masse */}
          {showBulkActions && stats.selected > 0 && (
            <div className="folder-list__bulk-actions">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)}
              >
                Actions ({stats.selected})
              </Button>
              
              {bulkActionMenuOpen && (
                <div className="folder-list__bulk-menu">
                  <button onClick={() => console.log('Archive selected')}>
                    Archiver
                  </button>
                  <button onClick={() => console.log('Export selected')}>
                    Exporter
                  </button>
                  <button onClick={() => console.log('Delete selected')}>
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bouton créer */}
          {showCreateButton && onCreateFolder && (
            <Button
              variant="primary"
              size="medium"
              icon="➕"
              onClick={onCreateFolder}
            >
              Nouveau dossier
            </Button>
          )}
        </div>
      </div>
    );
  };

  /**
   * Rendre les contrôles de tri et filtrage
   */
  const renderControls = () => {
    return (
      <div className="folder-list__controls">
        <div className="folder-list__controls-left">
          {/* Filtres */}
          <div className="folder-list__filters">
            <select
              value={filterBy}
              onChange={(e) => onFilterChange?.(e.target.value)}
              className="folder-list__filter-select"
            >
              <option value="all">Tous les dossiers</option>
              <option value="active">Actifs</option>
              <option value="empty">Vides</option>
              <option value="archived">Archivés</option>
              <option value="recent">Récents</option>
              <option value="stale">Inactifs</option>
            </select>
          </div>

          {/* Recherche */}
          <div className="folder-list__search">
            <input
              type="text"
              placeholder="Rechercher un dossier..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="folder-list__search-input"
            />
          </div>
        </div>

        <div className="folder-list__controls-right">
          {/* Tri */}
          <div className="folder-list__sort">
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                onSortChange?.(field, direction);
              }}
              className="folder-list__sort-select"
            >
              <option value="updated_at-DESC">Dernière modification</option>
              <option value="created_at-DESC">Plus récent</option>
              <option value="name-ASC">Nom (A-Z)</option>
              <option value="name-DESC">Nom (Z-A)</option>
              <option value="entity_count-DESC">Plus d'entités</option>
              <option value="entity_count-ASC">Moins d'entités</option>
            </select>
          </div>

          {/* Mode d'affichage */}
          <div className="folder-list__view-mode">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="small"
              icon="▦"
              onClick={() => console.log('Switch to grid')}
              aria-label="Vue grille"
            />
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="small"
              icon="☰"
              onClick={() => console.log('Switch to list')}
              aria-label="Vue liste"
            />
          </div>
        </div>
      </div>
    );
  };

  /**
   * Rendre le contenu principal
   */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="folder-list__loading">
          <div className="folder-list__loading-spinner">
            <svg viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                className="folder-list__spinner-circle"
              />
            </svg>
          </div>
          <p>Chargement des dossiers...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="folder-list__error">
          <div className="folder-list__error-icon">⚠️</div>
          <h3>Erreur lors du chargement</h3>
          <p>{error.message || 'Une erreur inattendue s\'est produite'}</p>
          <Button
            variant="primary"
            size="medium"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    if (filteredAndSortedFolders.length === 0) {
      return (
        <div className="folder-list__empty">
          <div className="folder-list__empty-icon">📁</div>
          {searchTerm || filterBy !== 'all' ? (
            <>
              <h3>Aucun dossier trouvé</h3>
              <p>Aucun dossier ne correspond à vos critères de recherche</p>
              <Button
                variant="secondary"
                size="medium"
                onClick={() => {
                  onSearchChange?.('');
                  onFilterChange?.('all');
                }}
              >
                Effacer les filtres
              </Button>
            </>
          ) : (
            <>
              <h3>Aucun dossier</h3>
              <p>Commencez par créer votre premier dossier d'enquête</p>
              {onCreateFolder && (
                <Button
                  variant="primary"
                  size="medium"
                  icon="➕"
                  onClick={onCreateFolder}
                >
                  Créer un dossier
                </Button>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <div className={`folder-list__grid folder-list__grid--${viewMode}`}>
        {filteredAndSortedFolders.map(folder => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onClick={onSelectFolder}
            onEdit={onEditFolder}
            onDelete={onDeleteFolder}
            onDuplicate={onDuplicateFolder}
            onArchive={onArchiveFolder}
            onRestore={onRestoreFolder}
            selectable={selectable}
            selected={selectedFolders.includes(folder.id)}
            onSelect={handleSelectFolder}
          />
        ))}
      </div>
    );
  };

  /**
   * Construire les classes CSS
   */
  const getListClasses = () => {
    return [
      'folder-list',
      loading && 'folder-list--loading',
      error && 'folder-list--error',
      className
    ].filter(Boolean).join(' ');
  };

  return (
    <div className={getListClasses()}>
      {renderToolbar()}
      {renderControls()}
      {renderContent()}
    </div>
  );
};

FolderList.propTypes = {
  /** Liste des dossiers à afficher */
  folders: PropTypes.array,

  /** État de chargement */
  loading: PropTypes.bool,

  /** Erreur éventuelle */
  error: PropTypes.object,

  /** Fonction appelée lors de la sélection d'un dossier */
  onSelectFolder: PropTypes.func,

  /** Fonction appelée pour modifier un dossier */
  onEditFolder: PropTypes.func,

  /** Fonction appelée pour supprimer un dossier */
  onDeleteFolder: PropTypes.func,

  /** Fonction appelée pour dupliquer un dossier */
  onDuplicateFolder: PropTypes.func,

  /** Fonction appelée pour archiver un dossier */
  onArchiveFolder: PropTypes.func,

  /** Fonction appelée pour restaurer un dossier */
  onRestoreFolder: PropTypes.func,

  /** Fonction appelée pour créer un nouveau dossier */
  onCreateFolder: PropTypes.func,

  /** Mode sélectionnable */
  selectable: PropTypes.bool,

  /** Liste des dossiers sélectionnés */
  selectedFolders: PropTypes.array,

  /** Fonction appelée lors du changement de sélection */
  onSelectionChange: PropTypes.func,

  /** Afficher le bouton de création */
  showCreateButton: PropTypes.bool,

  /** Afficher les actions en masse */
  showBulkActions: PropTypes.bool,

  /** Mode d'affichage */
  viewMode: PropTypes.oneOf(['grid', 'list']),

  /** Champ de tri */
  sortBy: PropTypes.string,

  /** Direction du tri */
  sortDirection: PropTypes.oneOf(['ASC', 'DESC']),

  /** Fonction appelée lors du changement de tri */
  onSortChange: PropTypes.func,

  /** Filtre actuel */
  filterBy: PropTypes.string,

  /** Fonction appelée lors du changement de filtre */
  onFilterChange: PropTypes.func,

  /** Terme de recherche */
  searchTerm: PropTypes.string,

  /** Fonction appelée lors du changement de recherche */
  onSearchChange: PropTypes.func,

  /** Classes CSS supplémentaires */
  className: PropTypes.string
};

export default FolderList;