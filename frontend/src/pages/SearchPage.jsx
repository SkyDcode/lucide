// frontend/src/pages/SearchPage.jsx - Exemple d'utilisation complète

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchBar from '../modules/search/components/SearchBar';
import SearchResults from '../modules/search/components/SearchResults';
import useSearch from '../modules/search/hooks/useSearch';

const SearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  // Extraire les paramètres de l'URL
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';
  const initialFolderId = searchParams.get('folderId') || null;
  const initialType = searchParams.get('type') || null;

  // Hook de recherche avec état initial
  const {
    query,
    results,
    suggestions,
    loading,
    loadingSuggestions,
    error,
    metadata,
    filters,
    pagination,
    searchHistory,
    changeQuery,
    changeFilters,
    changePage,
    performSearch,
    fetchSuggestions,
    resetSearch,
    exportResults
  } = useSearch({
    query: initialQuery,
    folderId: initialFolderId,
    type: initialType
  });

  // Mettre à jour l'URL quand les paramètres changent
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.folderId) params.set('folderId', filters.folderId);
    if (filters.type) params.set('type', filters.type);
    if (pagination.page > 1) params.set('page', pagination.page);

    const newSearch = params.toString();
    const currentSearch = location.search.slice(1);
    
    if (newSearch !== currentSearch) {
      navigate(`/search${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  }, [query, filters, pagination.page, location.search, navigate]);

  const handleSearch = (searchQuery) => {
    if (searchQuery && searchQuery.length >= 2) {
      performSearch(searchQuery);
    }
  };

  const handleEntityClick = (entity) => {
    // Naviguer vers la page de détail de l'entité
    navigate(`/entities/${entity.id}`);
  };

  const handleEntityEdit = (entity) => {
    // Naviguer vers la page d'édition
    navigate(`/entities/${entity.id}/edit`);
  };

  const handleEntityDelete = (entity) => {
    // Logique de suppression (à implémenter)
    console.log('Delete entity:', entity);
  };

  const handleExport = () => {
    exportResults('json');
  };

  const handleToggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const handleFilterChange = (newFilters) => {
    changeFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* En-tête de la page */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Recherche d'entités
          </h1>
          <p className="text-gray-400">
            Recherchez et explorez vos entités OSINT avec des filtres avancés
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="mb-8">
          <SearchBar
            value={query}
            onChange={changeQuery}
            onSearch={handleSearch}
            suggestions={suggestions}
            searchHistory={searchHistory}
            loading={loading}
            loadingSuggestions={loadingSuggestions}
            showFilters={true}
            onToggleFilters={handleToggleFilters}
            filters={filters}
            placeholder="Rechercher par nom, type ou attributs..."
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* Panel de filtres */}
        {showFilters && (
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-200 mb-4">
                Filtres de recherche
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtre par dossier */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dossier
                  </label>
                  <select
                    value={filters.folderId || ''}
                    onChange={(e) => handleFilterChange({ 
                      folderId: e.target.value || null 
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200"
                  >
                    <option value="">Tous les dossiers</option>
                    <option value="1">Enquête Alpha</option>
                    <option value="2">Enquête Beta</option>
                    <option value="3">Enquête Gamma</option>
                  </select>
                </div>

                {/* Filtre par type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type d'entité
                  </label>
                  <select
                    value={filters.type || ''}
                    onChange={(e) => handleFilterChange({ 
                      type: e.target.value || null 
                    })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200"
                  >
                    <option value="">Tous les types</option>
                    <option value="person">Personne</option>
                    <option value="organization">Organisation</option>
                    <option value="place">Lieu</option>
                    <option value="event">Événement</option>
                    <option value="document">Document</option>
                    <option value="website">Site Web</option>
                  </select>
                </div>

                {/* Options de recherche */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.exactMatch || false}
                        onChange={(e) => handleFilterChange({ 
                          exactMatch: e.target.checked 
                        })}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-300">
                        Correspondance exacte
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.fuzzy || false}
                        onChange={(e) => handleFilterChange({ 
                          fuzzy: e.target.checked 
                        })}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-300">
                        Recherche floue
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions des filtres */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                <button
                  onClick={resetSearch}
                  className="text-gray-400 hover:text-gray-200 text-sm"
                >
                  Réinitialiser tous les filtres
                </button>
                
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Appliquer les filtres
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Résultats de recherche */}
        <SearchResults
          results={results}
          loading={loading}
          error={error}
          metadata={metadata}
          query={query}
          displayOptions={{
            showHighlights: true,
            showRelevanceScore: true,
            showMatchType: false,
            groupByType: false
          }}
          onEntityClick={handleEntityClick}
          onEntityEdit={handleEntityEdit}
          onEntityDelete={handleEntityDelete}
          onPageChange={changePage}
          onExport={handleExport}
          className="max-w-7xl mx-auto"
        />

        {/* États vides et d'aide */}
        {!query && !loading && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-medium text-gray-300 mb-4">
                Commencez votre recherche
              </h3>
              <p className="text-gray-400 mb-6">
                Utilisez la barre de recherche ci-dessus pour trouver des entités par nom, type ou attributs.
              </p>
              
              <div className="text-left space-y-3 text-sm text-gray-500">
                <h4 className="font-medium text-gray-400">Conseils de recherche :</h4>
                <ul className="space-y-1">
                  <li>• Utilisez au moins 2 caractères</li>
                  <li>• Essayez des termes plus généraux si aucun résultat</li>
                  <li>• Utilisez les filtres pour affiner votre recherche</li>
                  <li>• La recherche fonctionne sur les noms et attributs</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;