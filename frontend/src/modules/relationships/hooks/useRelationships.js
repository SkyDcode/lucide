// frontend/src/modules/relationships/hooks/useRelationships.js - Hook pour gérer les relations
import { useCallback, useEffect, useMemo, useState } from 'react';
import RelationshipService from '../services/relationshipService';

/**
 * Hook personnalisé pour la gestion des relations entre entités
 * Fournit toutes les fonctionnalités CRUD et de filtrage des relations
 */
export default function useRelationships(initialOptions = {}) {
  // État principal
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Options de filtrage et pagination
  const [folderId, setFolderId] = useState(initialOptions.folderId || null);
  const [entityId, setEntityId] = useState(initialOptions.entityId || null);
  const [type, setType] = useState(initialOptions.type || '');
  const [strength, setStrength] = useState(initialOptions.strength || '');
  const [search, setSearch] = useState(initialOptions.search || '');
  const [direction, setDirection] = useState(initialOptions.direction || 'both');
  
  // Pagination
  const [page, setPage] = useState(initialOptions.page || 1);
  const [limit, setLimit] = useState(initialOptions.limit || 50);
  const [total, setTotal] = useState(0);
  
  // Tri
  const [orderBy, setOrderBy] = useState(initialOptions.orderBy || 'created_at');
  const [sortDirection, setSortDirection] = useState(initialOptions.sortDirection || 'DESC');
  
  // Métadonnées supplémentaires
  const [statistics, setStatistics] = useState(null);
  const [networkAnalysis, setNetworkAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  /**
   * Récupérer les relations selon le contexte (dossier ou entité)
   */
  const fetchRelationships = useCallback(async () => {
    if (!folderId && !entityId) return;

    setLoading(true);
    setError(null);

    try {
      const options = {
        orderBy,
        direction: sortDirection,
        limit,
        page,
        type: type || undefined,
        strength: strength || undefined,
        search: search || undefined,
        includeStats: true,
        includeAnalysis: true
      };

      let result;
      
      if (entityId) {
        // Mode entité : récupérer les relations d'une entité spécifique
        result = await RelationshipService.getEntityRelationships(entityId, {
          ...options,
          direction,
          includePatterns: true,
          includeSuggestions: true
        });
        
        setRelationships(result.relationships || []);
        setSuggestions(result.suggestions || []);
        setTotal(result.metadata?.total || result.relationships?.length || 0);
        
      } else if (folderId) {
        // Mode dossier : récupérer toutes les relations du dossier
        result = await RelationshipService.getFolderRelationships(folderId, options);
        
        setRelationships(result.relationships || []);
        setStatistics(result.statistics);
        setNetworkAnalysis(result.networkAnalysis);
        setTotal(result.metadata?.total || result.relationships?.length || 0);
      }

    } catch (err) {
      setError(err);
      setRelationships([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [folderId, entityId, orderBy, sortDirection, limit, page, type, strength, search, direction]);

  /**
   * Créer une nouvelle relation
   */
  const createRelationship = useCallback(async (relationshipData) => {
    try {
      setError(null);
      const newRelationship = await RelationshipService.createRelationship(relationshipData);
      
      // Rafraîchir la liste après création
      await fetchRelationships();
      
      return newRelationship;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [fetchRelationships]);

  /**
   * Mettre à jour une relation
   */
  const updateRelationship = useCallback(async (relationshipId, updateData) => {
    try {
      setError(null);
      const updatedRelationship = await RelationshipService.updateRelationship(relationshipId, updateData);
      
      // Mettre à jour la relation dans la liste locale
      setRelationships(prev => 
        prev.map(rel => 
          rel.id === relationshipId ? updatedRelationship : rel
        )
      );
      
      return updatedRelationship;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  /**
   * Supprimer une relation
   */
  const deleteRelationship = useCallback(async (relationshipId, options = {}) => {
    try {
      setError(null);
      const result = await RelationshipService.deleteRelationship(relationshipId, options);
      
      // Supprimer la relation de la liste locale
      setRelationships(prev => prev.filter(rel => rel.id !== relationshipId));
      setTotal(prev => Math.max(0, prev - 1));
      
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  /**
   * Créer plusieurs relations en batch
   */
  const createRelationshipsBatch = useCallback(async (relationshipsList) => {
    try {
      setError(null);
      const result = await RelationshipService.createRelationshipsBatch(relationshipsList);
      
      // Rafraîchir la liste après création batch
      await fetchRelationships();
      
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [fetchRelationships]);

  /**
   * Supprimer toutes les relations d'une entité
   */
  const deleteEntityRelationships = useCallback(async (targetEntityId) => {
    try {
      setError(null);
      const result = await RelationshipService.deleteEntityRelationships(targetEntityId);
      
      // Rafraîchir la liste après suppression
      await fetchRelationships();
      
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [fetchRelationships]);

  /**
   * Obtenir les suggestions de relations pour l'entité courante
   */
  const refreshSuggestions = useCallback(async () => {
    if (!entityId) return [];

    try {
      const newSuggestions = await RelationshipService.getRelationshipSuggestions(entityId, { limit: 10 });
      setSuggestions(newSuggestions);
      return newSuggestions;
    } catch (err) {
      console.warn('Erreur lors de la récupération des suggestions:', err);
      return [];
    }
  }, [entityId]);

  /**
   * Rechercher des relations
   */
  const searchRelationships = useCallback(async (searchParams) => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await RelationshipService.searchRelationships({
        ...searchParams,
        folderId,
        entityId
      });
      
      setRelationships(result.relationships || []);
      setTotal(result.metadata?.total || 0);
      
      return result;
    } catch (err) {
      setError(err);
      return { relationships: [], metadata: {} };
    } finally {
      setLoading(false);
    }
  }, [folderId, entityId]);

  /**
   * Rafraîchir les données
   */
  const refresh = useCallback(() => {
    return fetchRelationships();
  }, [fetchRelationships]);

  /**
   * Réinitialiser les filtres
   */
  const resetFilters = useCallback(() => {
    setType('');
    setStrength('');
    setSearch('');
    setDirection('both');
    setPage(1);
    setOrderBy('created_at');
    setSortDirection('DESC');
  }, []);

  /**
   * Changer de contexte (dossier ou entité)
   */
  const changeContext = useCallback((newFolderId = null, newEntityId = null) => {
    setFolderId(newFolderId);
    setEntityId(newEntityId);
    setPage(1); // Reset pagination
    resetFilters();
  }, [resetFilters]);

  /**
   * Appliquer des filtres
   */
  const applyFilters = useCallback((filters) => {
    if (filters.type !== undefined) setType(filters.type);
    if (filters.strength !== undefined) setStrength(filters.strength);
    if (filters.search !== undefined) setSearch(filters.search);
    if (filters.direction !== undefined) setDirection(filters.direction);
    setPage(1); // Reset to first page when filtering
  }, []);

  /**
   * Changer le tri
   */
  const changeSort = useCallback((newOrderBy, newDirection = 'DESC') => {
    setOrderBy(newOrderBy);
    setSortDirection(newDirection);
    setPage(1); // Reset to first page when sorting
  }, []);

  /**
   * Aller à une page spécifique
   */
  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  }, [total, limit]);

  /**
   * Changer la limite par page
   */
  const changeLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  // Charger les données au montage et quand les paramètres changent
  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Calculer les métriques locales
  const metrics = useMemo(() => {
    return RelationshipService.calculateMetrics(relationships);
  }, [relationships]);

  // Calculer les informations de pagination
  const pagination = useMemo(() => {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    const startIndex = (page - 1) * limit + 1;
    const endIndex = Math.min(page * limit, total);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      startIndex,
      endIndex
    };
  }, [page, limit, total]);

  // Filtrer les relations localement si nécessaire
  const filteredRelationships = useMemo(() => {
    return RelationshipService.filterRelationships(relationships, {
      type: type || undefined,
      strength: strength || undefined,
      search: search || undefined,
      entityId: entityId || undefined
    });
  }, [relationships, type, strength, search, entityId]);

  // États dérivés
  const hasRelationships = relationships.length > 0;
  const hasFilters = !!(type || strength || search);
  const hasError = !!error;
  const isEmpty = !loading && !hasRelationships;

  return {
    // Données principales
    relationships: filteredRelationships,
    originalRelationships: relationships,
    loading,
    error,
    hasError,
    
    // Contexte
    folderId,
    entityId,
    
    // Filtres et tri
    type,
    strength,
    search,
    direction,
    orderBy,
    sortDirection,
    hasFilters,
    
    // Pagination
    pagination,
    page,
    limit,
    total,
    
    // Métadonnées enrichies
    statistics,
    networkAnalysis,
    suggestions,
    metrics,
    
    // États dérivés
    hasRelationships,
    isEmpty,
    
    // Actions principales
    createRelationship,
    updateRelationship,
    deleteRelationship,
    createRelationshipsBatch,
    deleteEntityRelationships,
    
    // Recherche et suggestions
    searchRelationships,
    refreshSuggestions,
    
    // Navigation et filtrage
    changeContext,
    applyFilters,
    resetFilters,
    changeSort,
    goToPage,
    changeLimit,
    refresh,
    
    // Setters individuels pour un contrôle fin
    setType,
    setStrength,
    setSearch,
    setDirection,
    setOrderBy,
    setSortDirection,
    setPage,
    setLimit,
    setFolderId,
    setEntityId
  };
}

/**
 * Hook spécialisé pour les relations d'un dossier
 */
export function useFolderRelationships(folderId, options = {}) {
  const hookResult = useRelationships({
    ...options,
    folderId,
    entityId: null
  });

  // Fonctions spécifiques au contexte dossier
  const detectCircularRelationships = useCallback(async () => {
    if (!folderId) return [];
    
    try {
      return await RelationshipService.detectCircularRelationships(folderId);
    } catch (error) {
      console.warn('Erreur lors de la détection de relations circulaires:', error);
      return [];
    }
  }, [folderId]);

  const getRelationshipGraph = useCallback(async (graphOptions = {}) => {
    if (!folderId) return { nodes: [], edges: [], metadata: {} };
    
    try {
      return await RelationshipService.getRelationshipGraph(folderId, graphOptions);
    } catch (error) {
      console.warn('Erreur lors de la récupération du graphe:', error);
      return { nodes: [], edges: [], metadata: {} };
    }
  }, [folderId]);

  const getFolderStatistics = useCallback(async () => {
    if (!folderId) return {};
    
    try {
      return await RelationshipService.getFolderStatistics(folderId);
    } catch (error) {
      console.warn('Erreur lors de la récupération des statistiques:', error);
      return {};
    }
  }, [folderId]);

  return {
    ...hookResult,
    // Fonctions spécifiques au dossier
    detectCircularRelationships,
    getRelationshipGraph,
    getFolderStatistics
  };
}

/**
 * Hook spécialisé pour les relations d'une entité
 */
export function useEntityRelationships(entityId, options = {}) {
  const hookResult = useRelationships({
    ...options,
    entityId,
    folderId: null
  });

  // Fonctions spécifiques au contexte entité
  const mergeWithEntity = useCallback(async (targetEntityId) => {
    if (!entityId || !targetEntityId) {
      throw new Error('IDs des entités requis pour la fusion');
    }
    
    try {
      const result = await RelationshipService.mergeEntityRelationships(entityId, targetEntityId);
      await hookResult.refresh(); // Rafraîchir après fusion
      return result;
    } catch (error) {
      hookResult.setError?.(error);
      throw error;
    }
  }, [entityId, hookResult]);

  const deleteAllRelationships = useCallback(async () => {
    if (!entityId) return;
    
    return hookResult.deleteEntityRelationships(entityId);
  }, [entityId, hookResult]);

  // Calculer des métriques spécifiques à l'entité
  const entityMetrics = useMemo(() => {
    const { relationships } = hookResult;
    
    return {
      total: relationships.length,
      incoming: relationships.filter(r => r.direction === 'incoming').length,
      outgoing: relationships.filter(r => r.direction === 'outgoing').length,
      strongConnections: relationships.filter(r => r.strength === 'strong').length,
      uniqueTypes: new Set(relationships.map(r => r.type)).size,
      connectsTo: new Set(relationships.map(r => r.connected_entity)).size
    };
  }, [hookResult.relationships]);

  return {
    ...hookResult,
    // Métriques spécifiques à l'entité
    entityMetrics,
    // Fonctions spécifiques à l'entité
    mergeWithEntity,
    deleteAllRelationships
  };
}