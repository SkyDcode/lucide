// frontend/src/modules/relationships/components/RelationshipList.jsx - Liste des relations
import React, { useState, useMemo } from 'react';
import Button from '../../../components/ui/Button/Button';
import Modal from '../../../components/ui/Modal/Modal';
import RelationshipForm from './RelationshipForm';
import RelationshipCard from './RelationshipCard';

/**
 * Composant pour afficher une liste de relations avec filtrage et actions
 */
export default function RelationshipList({
  relationships = [],
  loading = false,
  error = null,
  onCreateRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
  onSelectRelationship,
  showCreateButton = true,
  showFilters = true,
  showBulkActions = false,
  viewMode = 'list',
  className = ''
}) {
  // État local pour les modales et filtres
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState(null);
  const [selectedRelationships, setSelectedRelationships] = useState([]);
  
  // Filtres locaux
  const [typeFilter, setTypeFilter] = useState('');
  const [strengthFilter, setStrengthFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Calculer les options de filtre basées sur les données
  const filterOptions = useMemo(() => {
    const types = new Set();
    const categories = new Set();
    
    relationships.forEach(rel => {
      types.add(rel.type);
      if (rel.category) categories.add(rel.category);
    });
    
    return {
      types: Array.from(types).sort(),
      categories: Array.from(categories).sort()
    };
  }, [relationships]);

  // Filtrer les relations
  const filteredRelationships = useMemo(() => {
    return relationships.filter(rel => {
      // Filtre par type
      if (typeFilter && rel.type !== typeFilter) return false;
      
      // Filtre par force
      if (strengthFilter && rel.strength !== strengthFilter) return false;
      
      // Filtre par catégorie
      if (categoryFilter && rel.category !== categoryFilter) return false;
      
      // Filtre par recherche textuelle
      if (searchFilter) {
        const searchTerm = searchFilter.toLowerCase();
        const matchesType = rel.type.toLowerCase().includes(searchTerm);
        const matchesDescription = rel.description && 
          rel.description.toLowerCase().includes(searchTerm);
        const matchesEntityNames = 
          (rel.from_entity_info?.name && 
           rel.from_entity_info.name.toLowerCase().includes(searchTerm)) ||
          (rel.to_entity_info?.name && 
           rel.to_entity_info.name.toLowerCase().includes(searchTerm));
        
        if (!matchesType && !matchesDescription && !matchesEntityNames) {
          return false;
        }
      }
      
      return true;
    });
  }, [relationships, typeFilter, strengthFilter, categoryFilter, searchFilter]);

  // Gestion de la sélection
  const handleSelectRelationship = (relationshipId, selected) => {
    setSelectedRelationships(prev => 
      selected 
        ? [...prev, relationshipId]
        : prev.filter(id => id !== relationshipId)
    );
  };

  const handleSelectAll = () => {
    const allSelected = filteredRelationships.length > 0 && 
      filteredRelationships.every(rel => selectedRelationships.includes(rel.id));
    
    if (allSelected) {
      setSelectedRelationships([]);
    } else {
      setSelectedRelationships(filteredRelationships.map(rel => rel.id));
    }
  };

  // Actions sur les relations
  const handleCreateRelationship = async (relationshipData) => {
    try {
      await onCreateRelationship?.(relationshipData);
      setShowCreateModal(false);
    } catch (error) {
      // L'erreur sera gérée par le composant parent
      throw error;
    }
  };

  const handleUpdateRelationship = async (relationshipData) => {
    try {
      await onUpdateRelationship?.(editingRelationship.id, relationshipData);
      setEditingRelationship(null);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteRelationship = async (relationshipId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette relation ?')) {
      try {
        await onDeleteRelationship?.(relationshipId);
        setSelectedRelationships(prev => prev.filter(id => id !== relationshipId));
      } catch (error) {
        // L'erreur sera gérée par le composant parent
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRelationships.length === 0) return;
    
    const count = selectedRelationships.length;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${count} relation(s) ?`)) {
      return;
    }
    
    try {
      // Supprimer toutes les relations sélectionnées
      await Promise.all(
        selectedRelationships.map(id => onDeleteRelationship?.(id))
      );
      setSelectedRelationships([]);
    } catch (error) {
      // Gérer les erreurs de suppression en batch
      console.error('Erreur lors de la suppression en batch:', error);
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setTypeFilter('');
    setStrengthFilter('');
    setSearchFilter('');
    setCategoryFilter('');
  };

  // Statistiques des relations filtrées
  const stats = useMemo(() => {
    const total = filteredRelationships.length;
    const byStrength = filteredRelationships.reduce((acc, rel) => {
      acc[rel.strength] = (acc[rel.strength] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      strong: byStrength.strong || 0,
      medium: byStrength.medium || 0,
      weak: byStrength.weak || 0,
      selected: selectedRelationships.length
    };
  }, [filteredRelationships, selectedRelationships]);

  // Interface de rendu
  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Relations ({stats.total})
        </h3>
        
        {stats.selected > 0 && (
          <span className="text-sm text-blue-400">
            {stats.selected} sélectionnée(s)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showBulkActions && stats.selected > 0 && (
          <Button
            variant="danger"
            size="small"
            onClick={handleBulkDelete}
          >
            Supprimer ({stats.selected})
          </Button>
        )}
        
        {showCreateButton && onCreateRelationship && (
          <Button
            variant="primary"
            size="medium"
            onClick={() => setShowCreateModal(true)}
          >
            + Nouvelle relation
          </Button>
        )}
      </div>
    </div>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche textuelle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Recherche
            </label>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-md bg-gray-700 border border-gray-600 px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtre par type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-md bg-gray-700 border border-gray-600 px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les types</option>
              {filterOptions.types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Filtre par force */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Force
            </label>
            <select
              value={strengthFilter}
              onChange={(e) => setStrengthFilter(e.target.value)}
              className="w-full rounded-md bg-gray-700 border border-gray-600 px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les forces</option>
              <option value="weak">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="strong">Forte</option>
            </select>
          </div>

          {/* Filtre par catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Catégorie
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-md bg-gray-700 border border-gray-600 px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les catégories</option>
              {filterOptions.categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions de filtre */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-400">
            {stats.total} relation(s) • 
            <span className="text-green-400"> {stats.strong} forte(s)</span> • 
            <span className="text-yellow-400"> {stats.medium} moyenne(s)</span> • 
            <span className="text-gray-400"> {stats.weak} faible(s)</span>
          </div>
          
          <Button
            variant="ghost"
            size="small"
            onClick={resetFilters}
            disabled={!typeFilter && !strengthFilter && !searchFilter && !categoryFilter}
          >
            Réinitialiser
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Chargement des relations...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            ⚠️ Erreur lors du chargement des relations
          </div>
          <div className="text-gray-400 text-sm mb-4">
            {error.message || 'Une erreur inattendue s\'est produite'}
          </div>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      );
    }

    if (filteredRelationships.length === 0) {
      const hasFilters = typeFilter || strengthFilter || searchFilter || categoryFilter;
      
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔗</div>
          {hasFilters ? (
            <>
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Aucune relation trouvée
              </h3>
              <p className="text-gray-400 mb-4">
                Aucune relation ne correspond à vos critères de recherche
              </p>
              <Button variant="secondary" onClick={resetFilters}>
                Effacer les filtres
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Aucune relation
              </h3>
              <p className="text-gray-400 mb-4">
                Commencez par créer des relations entre vos entités
              </p>
              {showCreateButton && onCreateRelationship && (
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  Créer une relation
                </Button>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {showBulkActions && (
          <div className="mb-4">
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={filteredRelationships.length > 0 && 
                  filteredRelationships.every(rel => selectedRelationships.includes(rel.id))}
                onChange={handleSelectAll}
                className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Tout sélectionner
            </label>
          </div>
        )}

        {filteredRelationships.map(relationship => (
          <RelationshipCard
            key={relationship.id}
            relationship={relationship}
            selected={selectedRelationships.includes(relationship.id)}
            onSelect={showBulkActions ? handleSelectRelationship : undefined}
            onClick={() => onSelectRelationship?.(relationship)}
            onEdit={() => setEditingRelationship(relationship)}
            onDelete={() => handleDeleteRelationship(relationship.id)}
            showActions={!!onUpdateRelationship || !!onDeleteRelationship}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`relationship-list ${className}`}>
      {renderToolbar()}
      {renderFilters()}
      {renderContent()}

      {/* Modal de création */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer une nouvelle relation"
        size="large"
      >
        <RelationshipForm
          onSubmit={handleCreateRelationship}
          onCancel={() => setShowCreateModal(false)}
          submitLabel="Créer la relation"
        />
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={!!editingRelationship}
        onClose={() => setEditingRelationship(null)}
        title="Modifier la relation"
        size="large"
      >
        {editingRelationship && (
          <RelationshipForm
            initial={editingRelationship}
            mode="edit"
            onSubmit={handleUpdateRelationship}
            onCancel={() => setEditingRelationship(null)}
            submitLabel="Mettre à jour"
          />
        )}
      </Modal>
    </div>
  );
}