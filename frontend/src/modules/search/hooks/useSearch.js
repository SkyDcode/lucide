// frontend/src/modules/search/hooks/useSearch.js - Hook pour la recherche d'entités

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import SearchService from '../services/searchService';

/**
 * Hook personnalisé pour la gestion de la recherche d'entités
 * @param {Object} initialState - État initial
 * @returns {Object} État et actions de recherche
 */
export default function useSearch(initialState = {}) {
  // État de la recherche
  const [query, setQuery] = useState(initialState.query || '');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState(null);
  
  // Métadonnées
  const [metadata, setMetadata] = useState({
    total_results: 0,
    returned_results: 0,
    page: 1,
    total_pages: 0,
    execution_time: 0
  });

  // Filtres de recherche
  const [filters, setFilters] = useState({
    folderId: initialState.folderId || null,
    type: initialState.type || null,
    types: initialState.types || [],
    exactMatch: initialState.exactMatch || false,
    fuzzy: initialState.fuzzy || false,
    orderBy: initialState.orderBy || 'relevance',
    order: initialState.order || 'desc'
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: initialState.page || 1,
    limit: initialState.limit || 20
  });

  // Options d'affichage
  const [displayOptions, setDisplayOptions] = useState({
    showHighlights: true,
    showRelevanceScore: false,
    showMatchType: false,
    groupByType: false
  });

  // Historique de recherche local
  const [searchHistory, setSearchHistory] = useState([]);
  
  // Référence pour l'annulation des requêtes
  const abortControllerRef = useRef(null);
  
  // Référence pour le debounce
  const debounceTimeoutRef = useRef(null);

  /**
   * Fonction de recherche principale avec debounce
   */
  const performSearch = useCallback(async (searchQuery = query, searchFilters = filters, searchPagination = pagination) => {
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Valider la requête
    if (!searchQuery || searchQuery.trim().length === 0) {
      setResults([]);
      setMetadata(prev => ({ ...prev, total_results: 0, returned_results: 0 }));
      setError(null);
      return;
    }

    if (searchQuery.length < 2) {
      setError('Le terme de recherche doit contenir au moins 2 caractères');
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Créer un nouveau contrôleur d'annulation
      abortControllerRef.current = new AbortController();

      const searchParams = {
        query: searchQuery.trim(),
        ...searchFilters,
        ...searchPagination
      };

      const response = await SearchService.searchEntities(searchParams);

      if (response.success) {
        // Formater les résultats avec les utilitaires
        const formattedResults = SearchService.utils.formatResults(response.data, searchQuery);
        
        setResults(formattedResults);
        setMetadata(response.metadata || {});
        
        // Ajouter à l'historique
        addToHistory(searchQuery, searchFilters);

        // Reset de l'erreur
        setError(null);
      } else {
        throw new Error(response.message || 'Erreur lors de la recherche');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        setError(err.message || 'Erreur lors de la recherche');
        setResults([]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [query, filters, pagination]);

  /**
   * Recherche avec debounce
   */
  const debouncedSearch = useCallback((searchQuery, delay = 300) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, delay);
  }, [performSearch]);

  /**
   * Recherche de suggestions avec debounce
   */
  const fetchSuggestions = useCallback(async (searchQuery = query) => {
    if (!searchQuery || searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);

    try {
      const suggestionList = await SearchService.getSuggestions(searchQuery, {
        folderId: filters.folderId,
        type: filters.type,
        limit: 8
      });

      setSuggestions(suggestionList);
    } catch (err) {
      console.warn('Suggestions error:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [query, filters.folderId, filters.type]);

  /**
   * Debounce pour les suggestions
   */
  const debouncedSuggestions = useCallback((searchQuery, delay = 150) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, delay);
  }, [fetchSuggestions]);

  /**
   * Recherche rapide
   */
  const quickSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    try {
      const response = await SearchService.quickSearch(searchQuery, {
        folderId: filters.folderId,
        limit: 10
      });

      return response.data || [];
    } catch (err) {
      console.error('Quick search error:', err);
      return [];
    }
  }, [filters.folderId]);

  /**
   * Recherche d'entités similaires
   */
  const findSimilar = useCallback(async (entityId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await SearchService.findSimilarEntities(entityId, options);
      
      if (response.success) {
        setResults(response.data);
        setMetadata(response.metadata || {});
        setQuery(`Similaire à l'entité #${entityId}`);
      } else {
        throw new Error(response.message || 'Erreur lors de la recherche de similarité');
      }
    } catch (err) {
      console.error('Similar search error:', err);
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Changer la requête de recherche
   */
  const changeQuery = useCallback((newQuery) => {
    setQuery(newQuery);
    if (newQuery !== query) {
      debouncedSearch(newQuery);
      
      // Récupérer les suggestions si la requête n'est pas vide
      if (newQuery && newQuery.length > 0) {
        debouncedSuggestions(newQuery);
      } else {
        setSuggestions([]);
      }
    }
  }, [query, debouncedSearch, debouncedSuggestions]);

  /**
   * Changer les filtres
   */
  const changeFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    // Relancer la recherche avec les nouveaux filtres si on a une requête
    if (query && query.length >= 2) {
      performSearch(query, { ...filters, ...newFilters }, pagination);
    }
  }, [query, filters, pagination, performSearch]);

  /**
   * Changer la pagination
   */
  const changePage = useCallback((newPage) => {
    const newPagination = { ...pagination, page: newPage };
    setPagination(newPagination);
    
    if (query && query.length >= 2) {
      performSearch(query, filters, newPagination);
    }
  }, [query, filters, pagination, performSearch]);

  /**
   * Changer la limite par page
   */
  const changeLimit = useCallback((newLimit) => {
    const newPagination = { ...pagination, limit: newLimit, page: 1 };
    setPagination(newPagination);
    
    if (query && query.length >= 2) {
      performSearch(query, filters, newPagination);
    }
  }, [query, filters, pagination, performSearch]);

  /**
   * Réinitialiser la recherche
   */
  const resetSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setError(null);
    setMetadata({
      total_results: 0,
      returned_results: 0,
      page: 1,
      total_pages: 0,
      execution_time: 0
    });
    setPagination({ page: 1, limit: 20 });
    
    // Annuler les requêtes en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  /**
   * Réexécuter la recherche
   */
  const refetch = useCallback(() => {
    if (query && query.length >= 2) {
      performSearch(query, filters, pagination);
    }
  }, [query, filters, pagination, performSearch]);

  /**
   * Ajouter à l'historique de recherche
   */
  const addToHistory = useCallback((searchQuery, searchFilters) => {
    const historyEntry = {
      query: searchQuery,
      filters: { ...searchFilters },
      timestamp: new Date().toISOString(),
      id: Date.now()
    };

    setSearchHistory(prev => {
      // Éviter les doublons
      const filtered = prev.filter(entry => 
        entry.query !== searchQuery || 
        JSON.stringify(entry.filters) !== JSON.stringify(searchFilters)
      );
      
      // Garder seulement les 10 dernières recherches
      return [historyEntry, ...filtered].slice(0, 10);
    });
  }, []);

  /**
   * Utiliser une recherche de l'historique
   */
  const useHistoryEntry = useCallback((historyEntry) => {
    setQuery(historyEntry.query);
    setFilters(historyEntry.filters);
    performSearch(historyEntry.query, historyEntry.filters, { page: 1, limit: pagination.limit });
  }, [pagination.limit, performSearch]);

  /**
   * Exporter les résultats
   */
  const exportResults = useCallback(async (format = 'json') => {
    try {
      const blob = await SearchService.exportSearchResults({
        query,
        ...filters
      }, format);

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `search-results-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Erreur lors de l\'export');
    }
  }, [query, filters]);

  // Résultats formatés et groupés
  const formattedResults = useMemo(() => {
    if (!displayOptions.groupByType) {
      return results;
    }

    // Grouper les résultats par type
    const grouped = results.reduce((acc, result) => {
      const type = result.type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(result);
      return acc;
    }, {});

    return grouped;
  }, [results, displayOptions.groupByType]);

  // Statistiques des résultats
  const resultStats = useMemo(() => {
    const typeCount = {};
    const matchTypeCount = {};
    let totalRelevance = 0;

    results.forEach(result => {
      // Compter par type
      const type = result.type || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;

      // Compter par type de correspondance
      const matchType = result.match_type || 'unknown';
      matchTypeCount[matchType] = (matchTypeCount[matchType] || 0) + 1;

      // Accumulation de la pertinence
      totalRelevance += result.relevance_score || 0;
    });

    return {
      byType: typeCount,
      byMatchType: matchTypeCount,
      averageRelevance: results.length > 0 ? totalRelevance / results.length : 0,
      totalResults: results.length
    };
  }, [results]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Recherche initiale si query fournie
  useEffect(() => {
    if (initialState.query && initialState.query.length >= 2) {
      performSearch(initialState.query, filters, pagination);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // État principal
    query,
    results: formattedResults,
    suggestions,
    loading,
    loadingSuggestions,
    error,
    metadata,
    
    // Filtres et pagination
    filters,
    pagination,
    displayOptions,
    
    // Historique et statistiques
    searchHistory,
    resultStats,
    
    // Actions principales
    changeQuery,
    changeFilters,
    changePage,
    changeLimit,
    setDisplayOptions,
    
    // Actions spécialisées
    performSearch,
    quickSearch,
    findSimilar,
    fetchSuggestions,
    
    // Utilitaires
    resetSearch,
    refetch,
    useHistoryEntry,
    exportResults,
    
    // États calculés
    hasResults: results.length > 0,
    hasMore: metadata.has_next_page || false,
    isFirstPage: pagination.page === 1,
    isLastPage: pagination.page === metadata.total_pages,
    isEmpty: !loading && results.length === 0 && !error && query.length >= 2
  };
}