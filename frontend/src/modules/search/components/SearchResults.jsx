// frontend/src/modules/search/components/SearchResults.jsx - Affichage des résultats de recherche

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Download,
  Grid,
  List,
  Star,
  Target,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import EntityCard from '../../entities/components/EntityCard';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';

const SearchResults = ({
  results = [],
  loading = false,
  error = null,
  metadata = {},
  query = '',
  displayOptions = {},
  onEntityClick,
  onEntityEdit,
  onEntityDelete,
  onPageChange,
  onLimitChange,
  onExport,
  onRefresh,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'name' | 'type' | 'created_at'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Trier les résultats selon les critères sélectionnés
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) return [];

    const sorted = [...results].sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'relevance':
          compareValue = (b.relevance_score || 0) - (a.relevance_score || 0);
          break;
        case 'name':
          compareValue = (a.name || '').localeCompare(b.name || '');
          break;
        case 'type':
          compareValue = (a.type || '').localeCompare(b.type || '');
          break;
        case 'created_at':
          compareValue = new Date(b.created_at || 0) - new Date(a.created_at || 0);
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'desc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [results, sortBy, sortOrder]);

  // Grouper les résultats par type si nécessaire
  const groupedResults = useMemo(() => {
    if (!displayOptions.groupByType) {
      return { all: sortedResults };
    }

    return sortedResults.reduce((groups, result) => {
      const type = result.type || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(result);
      return groups;
    }, {});
  }, [sortedResults, displayOptions.groupByType]);

  // Statistiques des résultats
  const resultStats = useMemo(() => {
    const typeCount = {};
    let totalRelevance = 0;

    sortedResults.forEach(result => {
      const type = result.type || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
      totalRelevance += result.relevance_score || 0;
    });

    return {
      byType: typeCount,
      averageRelevance: sortedResults.length > 0 ? totalRelevance / sortedResults.length : 0,
      totalResults: sortedResults.length
    };
  }, [sortedResults]);

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getEntityTypeConfig = (type) => {
    const typeConfigs = {
      person: { label: 'Personne', color: '#3b82f6', icon: '👤' },
      organization: { label: 'Organisation', color: '#10b981', icon: '🏢' },
      place: { label: 'Lieu', color: '#f59e0b', icon: '📍' },
      event: { label: 'Événement', color: '#8b5cf6', icon: '📅' },
      document: { label: 'Document', color: '#6b7280', icon: '📄' },
      website: { label: 'Site Web', color: '#06b6d4', icon: '🌐' },
      phone: { label: 'Téléphone', color: '#ef4444', icon: '📞' },
      email: { label: 'Email', color: '#f97316', icon: '✉️' },
      vehicle: { label: 'Véhicule', color: '#84cc16', icon: '🚗' }
    };
    
    return typeConfigs[type] || { label: type || 'Inconnu', color: '#9ca3af', icon: '❓' };
  };

  const formatMatchType = (matchType) => {
    const matchConfig = {
      exact: { label: 'Exact', color: '#10b981', icon: <Target className="w-3 h-3" /> },
      prefix: { label: 'Préfixe', color: '#3b82f6', icon: <TrendingUp className="w-3 h-3" /> },
      contains: { label: 'Contient', color: '#f59e0b', icon: <Search className="w-3 h-3" /> },
      attribute: { label: 'Attribut', color: '#8b5cf6', icon: <Star className="w-3 h-3" /> },
      fuzzy: { label: 'Flou', color: '#6b7280', icon: <Search className="w-3 h-3" /> }
    };

    return matchConfig[matchType] || { 
      label: 'Autre', 
      color: '#9ca3af', 
      icon: <Search className="w-3 h-3" /> 
    };
  };

  const renderResultItem = (result, index) => {
    const typeConfig = getEntityTypeConfig(result.type);
    const matchTypeConfig = formatMatchType(result.match_type);
    
    if (viewMode === 'grid') {
      return (
        <div key={result.id || index} className="relative">
          <EntityCard
            entity={result}
            typeMap={new Map([[result.type, { label: typeConfig.label }]])}
            onEdit={onEntityEdit}
            onDelete={onEntityDelete}
          />
          
          {/* Overlay d'informations de recherche */}
          <div className="absolute top-2 right-2 flex gap-1">
            {displayOptions.showRelevanceScore && result.relevance_score && (
              <span 
                className="px-2 py-1 text-xs font-medium bg-gray-800 border border-gray-700 rounded-full"
                style={{ color: result.relevance_score > 0.7 ? '#10b981' : result.relevance_score > 0.4 ? '#f59e0b' : '#ef4444' }}
              >
                {Math.round(result.relevance_score * 100)}%
              </span>
            )}
            
            {displayOptions.showMatchType && (
              <span 
                className="px-2 py-1 text-xs font-medium bg-gray-800 border border-gray-700 rounded-full flex items-center gap-1"
                style={{ color: matchTypeConfig.color }}
              >
                {matchTypeConfig.icon}
                {matchTypeConfig.label}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Mode liste
    return (
      <div
        key={result.id || index}
        className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        onClick={() => onEntityClick && onEntityClick(result)}
      >
        {/* Indicateur de type */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: typeConfig.color }}
          title={typeConfig.label}
        />

        {/* Informations principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-gray-100 truncate">
              {displayOptions.showHighlights && result.highlighted_name ? (
                <span dangerouslySetInnerHTML={{ __html: result.highlighted_name }} />
              ) : (
                result.name
              )}
            </h3>
            
            {result.folder_name && (
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {result.folder_name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
            <span>{typeConfig.label}</span>
            
            {result.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(result.created_at).toLocaleDateString()}
              </span>
            )}
            
            {result.connection_count > 0 && (
              <span>{result.connection_count} connexion(s)</span>
            )}
          </div>
        </div>

        {/* Métriques de recherche */}
        <div className="flex items-center gap-3 text-xs">
          {displayOptions.showRelevanceScore && result.relevance_score && (
            <div className="text-center">
              <div 
                className="font-medium"
                style={{ color: result.relevance_score > 0.7 ? '#10b981' : result.relevance_score > 0.4 ? '#f59e0b' : '#ef4444' }}
              >
                {Math.round(result.relevance_score * 100)}%
              </div>
              <div className="text-gray-500">Pertinence</div>
            </div>
          )}
          
          {displayOptions.showMatchType && (
            <div className="text-center">
              <div 
                className="font-medium flex items-center justify-center gap-1"
                style={{ color: matchTypeConfig.color }}
              >
                {matchTypeConfig.icon}
                {matchTypeConfig.label}
              </div>
              <div className="text-gray-500">Correspondance</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEntityClick && onEntityClick(result);
            }}
            className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
            title="Voir"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {onEntityEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEntityEdit(result);
              }}
              className="p-2 text-gray-400 hover:text-green-400 transition-colors"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          
          {onEntityDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEntityDelete(result);
              }}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderGroupedResults = () => {
    if (!displayOptions.groupByType) {
      return sortedResults.map((result, index) => renderResultItem(result, index));
    }

    return Object.entries(groupedResults).map(([type, typeResults]) => {
      const typeConfig = getEntityTypeConfig(type);
      
      return (
        <div key={type} className="mb-8">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-800">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: typeConfig.color }}
            />
            <h3 className="text-lg font-medium text-gray-200">
              {typeConfig.label} ({typeResults.length})
            </h3>
          </div>
          
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {typeResults.map((result, index) => renderResultItem(result, index))}
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="large" color="blue" message="Recherche en cours..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-400 text-lg font-medium mb-2">
          Erreur lors de la recherche
        </div>
        <p className="text-gray-400 mb-4">{error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-300 mb-2">
          Aucun résultat trouvé
        </h3>
        <p className="text-gray-400 mb-4">
          Aucune entité ne correspond à votre recherche "{query}"
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Suggestions :</p>
          <ul className="space-y-1">
            <li>• Vérifiez l'orthographe</li>
            <li>• Utilisez des termes plus généraux</li>
            <li>• Essayez avec moins de filtres</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête des résultats */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-lg font-medium text-gray-200">
            {metadata.total_results || results.length} résultat(s)
            {query && (
              <span className="text-gray-400"> pour "{query}"</span>
            )}
          </div>
          
          {metadata.execution_time && (
            <span className="text-sm text-gray-500">
              ({metadata.execution_time}ms)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Options de tri */}
          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
          >
            <option value="relevance">Pertinence</option>
            <option value="name">Nom</option>
            <option value="type">Type</option>
            <option value="created_at">Date de création</option>
          </select>

          {/* Mode d'affichage */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
              title="Vue grille"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Export */}
          {onExport && results.length > 0 && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 hover:bg-gray-700 transition-colors"
              title="Exporter les résultats"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          )}
        </div>
      </div>

      {/* Statistiques des résultats */}
      {Object.keys(resultStats.byType).length > 1 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(resultStats.byType).map(([type, count]) => {
            const typeConfig = getEntityTypeConfig(type);
            return (
              <span
                key={type}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: typeConfig.color }}
                />
                {typeConfig.label}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Résultats */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {renderGroupedResults()}
      </div>

      {/* Pagination */}
      {metadata.total_pages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            Page {metadata.page || 1} sur {metadata.total_pages}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange((metadata.page || 1) - 1)}
              disabled={!metadata.has_previous_page}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
            
            <span className="px-4 py-2 text-sm text-gray-400">
              {metadata.page || 1} / {metadata.total_pages}
            </span>
            
            <button
              onClick={() => onPageChange && onPageChange((metadata.page || 1) + 1)}
              disabled={!metadata.has_next_page}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;