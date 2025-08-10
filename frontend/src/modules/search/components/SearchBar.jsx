// frontend/src/modules/search/components/SearchBar.jsx - Barre de recherche avec autocomplétion

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, History, TrendingUp } from 'lucide-react';

const SearchBar = ({
  value = '',
  onChange,
  onSearch,
  suggestions = [],
  searchHistory = [],
  loading = false,
  loadingSuggestions = false,
  placeholder = 'Rechercher des entités...',
  showFilters = false,
  onToggleFilters,
  filters = {},
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Gérer les touches du clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        
        case 'Enter':
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
          } else {
            handleSearch();
          }
          break;
        
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
        
        default:
          break;
      }
    };

    if (isFocused) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFocused, showSuggestions, suggestions, selectedSuggestionIndex]);

  // Fermer les suggestions en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedSuggestionIndex(-1);
    
    // Afficher les suggestions si on a du texte
    if (newValue.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    
    // Afficher l'historique si pas de texte, sinon les suggestions
    if (value.length === 0 && searchHistory.length > 0) {
      setShowSuggestions(true);
    } else if (value.length > 0 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Ne pas fermer immédiatement pour permettre les clics sur suggestions
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
  };

  const handleSearch = () => {
    if (value.trim().length > 0) {
      onSearch && onSearch(value.trim());
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    if (typeof suggestion === 'string') {
      // Suggestion simple (historique)
      onChange(suggestion);
      onSearch && onSearch(suggestion);
    } else {
      // Suggestion d'entité
      onChange(suggestion.name);
      onSearch && onSearch(suggestion.name);
    }
    
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const renderSuggestionItem = (item, index) => {
    const isSelected = index === selectedSuggestionIndex;
    
    if (typeof item === 'string') {
      // Suggestion d'historique
      return (
        <div
          key={`history-${index}`}
          className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
            isSelected ? 'bg-gray-700' : 'hover:bg-gray-800'
          }`}
          onClick={() => handleSuggestionSelect(item)}
        >
          <History className="w-4 h-4 text-gray-400" />
          <span className="text-gray-200">{item}</span>
          <span className="text-xs text-gray-500 ml-auto">Historique</span>
        </div>
      );
    }

    // Suggestion d'entité
    const typeConfig = getEntityTypeConfig(item.type);
    
    return (
      <div
        key={`suggestion-${item.id || index}`}
        className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
          isSelected ? 'bg-gray-700' : 'hover:bg-gray-800'
        }`}
        onClick={() => handleSuggestionSelect(item)}
      >
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: typeConfig.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-gray-200 font-medium truncate">{item.name}</div>
          <div className="text-xs text-gray-400">
            {typeConfig.label}
            {item.folder_name && ` • ${item.folder_name}`}
          </div>
        </div>
        {item.relevance_score && (
          <div className="text-xs text-gray-500">
            {Math.round(item.relevance_score * 100)}%
          </div>
        )}
      </div>
    );
  };

  const getEntityTypeConfig = (type) => {
    const typeConfigs = {
      person: { label: 'Personne', color: '#3b82f6' },
      organization: { label: 'Organisation', color: '#10b981' },
      place: { label: 'Lieu', color: '#f59e0b' },
      event: { label: 'Événement', color: '#8b5cf6' },
      document: { label: 'Document', color: '#6b7280' },
      website: { label: 'Site Web', color: '#06b6d4' },
      phone: { label: 'Téléphone', color: '#ef4444' },
      email: { label: 'Email', color: '#f97316' },
      vehicle: { label: 'Véhicule', color: '#84cc16' }
    };
    
    return typeConfigs[type] || { label: type || 'Inconnu', color: '#9ca3af' };
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.folderId) count++;
    if (filters.type) count++;
    if (filters.types && filters.types.length > 0) count++;
    if (filters.exactMatch) count++;
    if (filters.fuzzy) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={`relative w-full ${className}`}>
      {/* Barre de recherche principale */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={`h-5 w-5 transition-colors ${
            isFocused ? 'text-blue-400' : 'text-gray-400'
          }`} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !showSuggestions) {
              handleSearch();
            }
          }}
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-20 py-3 
            bg-gray-900 border border-gray-700 rounded-lg
            text-gray-100 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200
            ${isFocused ? 'shadow-lg' : ''}
          `}
        />

        {/* Actions à droite */}
        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
          {/* Bouton clear */}
          {value.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
              title="Effacer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Bouton filtres */}
          {showFilters && (
            <button
              onClick={onToggleFilters}
              className={`
                p-1 transition-colors relative
                ${activeFiltersCount > 0 
                  ? 'text-blue-400 hover:text-blue-300' 
                  : 'text-gray-400 hover:text-gray-200'
                }
              `}
              title="Filtres"
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {/* Indicateur de chargement */}
          {loading && (
            <div className="animate-spin">
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
          )}
        </div>
      </div>

      {/* Panel de suggestions */}
      {showSuggestions && (isFocused || suggestions.length > 0 || searchHistory.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {/* Chargement des suggestions */}
          {loadingSuggestions && value.length > 0 && (
            <div className="px-4 py-3 text-center text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span>Recherche...</span>
              </div>
            </div>
          )}

          {/* Suggestions d'entités */}
          {!loadingSuggestions && suggestions.length > 0 && value.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-800">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => renderSuggestionItem(suggestion, index))}
            </>
          )}

          {/* Historique de recherche */}
          {value.length === 0 && searchHistory.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-800">
                Recherches récentes
              </div>
              {searchHistory.slice(0, 5).map((historyItem, index) => 
                renderSuggestionItem(historyItem.query, suggestions.length + index)
              )}
            </>
          )}

          {/* État vide */}
          {!loadingSuggestions && value.length > 0 && suggestions.length === 0 && (
            <div className="px-4 py-3 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p>Aucune suggestion trouvée</p>
              <p className="text-xs mt-1">Appuyez sur Entrée pour rechercher</p>
            </div>
          )}

          {/* Conseils de recherche */}
          {value.length === 0 && searchHistory.length === 0 && (
            <div className="px-4 py-3 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="font-medium">Commencez à taper pour rechercher</p>
              <div className="text-xs mt-2 space-y-1">
                <p>• Utilisez au moins 2 caractères</p>
                <p>• Recherchez par nom, type ou attributs</p>
                <p>• Utilisez les filtres pour affiner</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;