// frontend/src/modules/search/services/searchService.js - Service de recherche frontend

import api from '../../../shared/services/api';

/**
 * Service pour les fonctionnalités de recherche d'entités
 */
class SearchService {
  
  /**
   * Recherche principale d'entités
   * @param {Object} params - Paramètres de recherche
   * @returns {Promise<Object>} Résultats de recherche
   */
  static async searchEntities(params = {}) {
    const {
      query = '',
      folderId = null,
      type = null,
      types = [],
      page = 1,
      limit = 20,
      exactMatch = false,
      fuzzy = false,
      orderBy = 'relevance',
      order = 'desc'
    } = params;

    try {
      const searchParams = new URLSearchParams();
      
      if (query) searchParams.append('q', query);
      if (folderId) searchParams.append('folderId', folderId);
      if (type) searchParams.append('type', type);
      if (types.length > 0) searchParams.append('types', types.join(','));
      if (page) searchParams.append('page', page);
      if (limit) searchParams.append('limit', limit);
      if (exactMatch) searchParams.append('exactMatch', 'true');
      if (fuzzy) searchParams.append('fuzzy', 'true');
      if (orderBy) searchParams.append('orderBy', orderBy);
      if (order) searchParams.append('order', order);

      const response = await api.get(`/entities/search?${searchParams.toString()}`);
      
      return {
        success: true,
        data: response.data || [],
        metadata: response.metadata || {},
        message: response.message
      };
    } catch (error) {
      console.error('Search entities failed:', error);
      throw new Error(error.data?.error?.message || 'Erreur lors de la recherche');
    }
  }

  /**
   * Recherche rapide simplifiée
   * @param {string} query - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Résultats simplifiés
   */
  static async quickSearch(query, options = {}) {
    if (!query || query.length < 2) {
      return {
        success: true,
        data: [],
        metadata: { total_results: 0, reason: 'Terme trop court' }
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (options.folderId) params.append('folderId', options.folderId);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/entities/search/quick?${params.toString()}`);
      
      return {
        success: true,
        data: response.data || [],
        metadata: response.metadata || {}
      };
    } catch (error) {
      console.error('Quick search failed:', error);
      return {
        success: false,
        data: [],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Suggestions d'autocomplétion
   * @param {string} query - Début du terme
   * @param {Object} filters - Filtres optionnels
   * @returns {Promise<Array>} Liste de suggestions
   */
  static async getSuggestions(query, filters = {}) {
    if (!query || query.length < 1) {
      return [];
    }

    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.folderId) params.append('folderId', filters.folderId);
      if (filters.type) params.append('type', filters.type);
      if (filters.limit) params.append('limit', filters.limit || 10);

      const response = await api.get(`/entities/search/suggestions?${params.toString()}`);
      
      return response.data || [];
    } catch (error) {
      console.error('Get suggestions failed:', error);
      return [];
    }
  }

  /**
   * Recherche avancée avec filtres complexes
   * @param {Object} filters - Filtres avancés
   * @returns {Promise<Object>} Résultats de recherche avancée
   */
  static async advancedSearch(filters = {}) {
    try {
      const response = await api.post('/entities/search/advanced', filters);
      
      return {
        success: true,
        data: response.data || [],
        metadata: response.metadata || {},
        message: response.message
      };
    } catch (error) {
      console.error('Advanced search failed:', error);
      throw new Error(error.data?.error?.message || 'Erreur lors de la recherche avancée');
    }
  }

  /**
   * Rechercher des entités similaires
   * @param {number} entityId - ID de l'entité de référence
   * @param {Object} options - Options de similarité
   * @returns {Promise<Object>} Entités similaires
   */
  static async findSimilarEntities(entityId, options = {}) {
    if (!entityId) {
      throw new Error('ID d\'entité requis');
    }

    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit);
      if (options.minSimilarity) params.append('minSimilarity', options.minSimilarity);
      if (options.includeAllFolders) params.append('includeAllFolders', 'true');

      const response = await api.get(`/entities/${entityId}/similar?${params.toString()}`);
      
      return {
        success: true,
        data: response.data || [],
        metadata: response.metadata || {},
        message: response.message
      };
    } catch (error) {
      console.error('Find similar entities failed:', error);
      throw new Error(error.data?.error?.message || 'Erreur lors de la recherche de similarité');
    }
  }

  /**
   * Valider un terme de recherche
   * @param {string} query - Terme à valider
   * @param {Object} options - Options de validation
   * @returns {Promise<Object>} Résultat de validation
   */
  static async validateQuery(query, options = {}) {
    try {
      const response = await api.post('/entities/search/validate', {
        query,
        options
      });
      
      return response.data || {
        valid: false,
        warnings: ['Validation échouée']
      };
    } catch (error) {
      console.error('Query validation failed:', error);
      return {
        valid: false,
        warnings: [error.message || 'Erreur de validation']
      };
    }
  }

  /**
   * Obtenir les statistiques de recherche
   * @param {string} period - Période des statistiques
   * @returns {Promise<Object>} Statistiques
   */
  static async getSearchStats(period = 'week') {
    try {
      const response = await api.get(`/entities/search/stats?period=${period}`);
      
      return response.data || {};
    } catch (error) {
      console.error('Get search stats failed:', error);
      return {};
    }
  }

  /**
   * Obtenir l'historique de recherche
   * @param {number} limit - Nombre d'éléments à récupérer
   * @returns {Promise<Array>} Historique de recherche
   */
  static async getSearchHistory(limit = 20) {
    try {
      const response = await api.get(`/entities/search/history?limit=${limit}`);
      
      return response.data || [];
    } catch (error) {
      console.error('Get search history failed:', error);
      return [];
    }
  }

  /**
   * Exporter les résultats de recherche
   * @param {Object} searchParams - Paramètres de recherche
   * @param {string} format - Format d'export
   * @returns {Promise<Blob>} Fichier d'export
   */
  static async exportSearchResults(searchParams, format = 'json') {
    try {
      const params = new URLSearchParams();
      
      if (searchParams.query) params.append('q', searchParams.query);
      if (searchParams.folderId) params.append('folderId', searchParams.folderId);
      if (searchParams.type) params.append('type', searchParams.type);
      if (searchParams.orderBy) params.append('orderBy', searchParams.orderBy);
      if (format) params.append('format', format);

      const response = await api.get(`/entities/search/export?${params.toString()}`, {
        headers: {
          'Accept': format === 'json' ? 'application/json' : 'text/csv'
        }
      });

      // Créer un blob pour le téléchargement
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });

      return blob;
    } catch (error) {
      console.error('Export search results failed:', error);
      throw new Error(error.data?.error?.message || 'Erreur lors de l\'export');
    }
  }

  /**
   * Utilitaires pour la recherche
   */
  static utils = {
    /**
     * Débouncer une fonction de recherche
     * @param {Function} func - Fonction à débouncer
     * @param {number} delay - Délai en millisecondes
     * @returns {Function} Fonction débouncée
     */
    debounce(func, delay = 300) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    },

    /**
     * Surligner les termes dans un texte
     * @param {string} text - Texte à surligner
     * @param {string} query - Terme à surligner
     * @returns {string} Texte avec surlignage HTML
     */
    highlightText(text, query) {
      if (!text || !query) return text;
      
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    },

    /**
     * Nettoyer un terme de recherche
     * @param {string} query - Terme à nettoyer
     * @returns {string} Terme nettoyé
     */
    cleanQuery(query) {
      if (!query || typeof query !== 'string') return '';
      
      return query
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 100);
    },

    /**
     * Formater les résultats de recherche pour l'affichage
     * @param {Array} results - Résultats bruts
     * @param {string} query - Terme de recherche
     * @returns {Array} Résultats formatés
     */
    formatResults(results, query) {
      return results.map(result => ({
        ...result,
        highlighted_name: this.highlightText(result.name, query),
        type_display: this.getEntityTypeDisplay(result.type),
        relevance_display: this.formatRelevanceScore(result.relevance_score),
        match_type_display: this.formatMatchType(result.match_type)
      }));
    },

    /**
     * Obtenir l'affichage d'un type d'entité
     * @param {string} type - Type d'entité
     * @returns {Object} Configuration d'affichage
     */
    getEntityTypeDisplay(type) {
      const typeConfig = {
        person: { label: 'Personne', icon: '👤', color: '#3b82f6' },
        organization: { label: 'Organisation', icon: '🏢', color: '#10b981' },
        place: { label: 'Lieu', icon: '📍', color: '#f59e0b' },
        event: { label: 'Événement', icon: '📅', color: '#8b5cf6' },
        document: { label: 'Document', icon: '📄', color: '#6b7280' },
        website: { label: 'Site Web', icon: '🌐', color: '#06b6d4' },
        phone: { label: 'Téléphone', icon: '📞', color: '#ef4444' },
        email: { label: 'Email', icon: '✉️', color: '#f97316' },
        vehicle: { label: 'Véhicule', icon: '🚗', color: '#84cc16' }
      };

      return typeConfig[type] || { 
        label: type || 'Inconnu', 
        icon: '❓', 
        color: '#9ca3af' 
      };
    },

    /**
     * Formater le score de pertinence
     * @param {number} score - Score de 0 à 1
     * @returns {Object} Score formaté
     */
    formatRelevanceScore(score) {
      const percentage = Math.round((score || 0) * 100);
      let level = 'low';
      let color = '#ef4444';

      if (percentage >= 80) {
        level = 'high';
        color = '#10b981';
      } else if (percentage >= 50) {
        level = 'medium';
        color = '#f59e0b';
      }

      return {
        percentage,
        level,
        color,
        display: `${percentage}%`
      };
    },

    /**
     * Formater le type de correspondance
     * @param {string} matchType - Type de correspondance
     * @returns {Object} Type formaté
     */
    formatMatchType(matchType) {
      const matchConfig = {
        exact: { label: 'Correspondance exacte', icon: '🎯', color: '#10b981' },
        prefix: { label: 'Commence par', icon: '▶️', color: '#3b82f6' },
        contains: { label: 'Contient', icon: '🔍', color: '#f59e0b' },
        attribute: { label: 'Dans attributs', icon: '📝', color: '#8b5cf6' },
        fuzzy: { label: 'Correspondance floue', icon: '🌀', color: '#6b7280' }
      };

      return matchConfig[matchType] || { 
        label: 'Autre', 
        icon: '❓', 
        color: '#9ca3af' 
      };
    },

    /**
     * Construire les paramètres d'URL pour une recherche
     * @param {Object} searchParams - Paramètres de recherche
     * @returns {string} Query string
     */
    buildSearchUrl(searchParams) {
      const params = new URLSearchParams();
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });

      return params.toString();
    },

    /**
     * Parser les paramètres d'URL de recherche
     * @param {string} queryString - Query string
     * @returns {Object} Paramètres parsés
     */
    parseSearchUrl(queryString) {
      const params = new URLSearchParams(queryString);
      const searchParams = {};

      // Paramètres simples
      ['q', 'query', 'folderId', 'type', 'page', 'limit', 'orderBy', 'order'].forEach(key => {
        const value = params.get(key);
        if (value) {
          searchParams[key] = key === 'page' || key === 'limit' || key === 'folderId' 
            ? parseInt(value) 
            : value;
        }
      });

      // Paramètres booléens
      ['exactMatch', 'fuzzy', 'caseSensitive'].forEach(key => {
        const value = params.get(key);
        if (value) {
          searchParams[key] = value === 'true';
        }
      });

      // Paramètres de tableau
      const types = params.getAll('types');
      if (types.length > 0) {
        searchParams.types = types;
      }

      return searchParams;
    },

    /**
     * Obtenir des suggestions de requête basées sur les erreurs communes
     * @param {string} query - Requête originale
     * @returns {Array} Suggestions
     */
    getQuerySuggestions(query) {
      if (!query) return [];

      const suggestions = [];

      // Suggestion pour les requêtes très courtes
      if (query.length === 1) {
        suggestions.push(`Essayez "${query}*" pour rechercher tout ce qui commence par "${query}"`);
      }

      // Suggestion pour les requêtes avec caractères spéciaux
      if (/[^a-zA-Z0-9\s]/.test(query)) {
        const cleanedQuery = query.replace(/[^a-zA-Z0-9\s]/g, '');
        if (cleanedQuery !== query) {
          suggestions.push(`Essayez "${cleanedQuery}" sans caractères spéciaux`);
        }
      }

      // Suggestion pour les requêtes très spécifiques
      if (query.length > 20) {
        const shorterQuery = query.substring(0, 15) + '...';
        suggestions.push(`Essayez une recherche plus courte comme "${shorterQuery}"`);
      }

      return suggestions;
    }
  };
}

export default SearchService;