// backend/core/entities/services/EntitySearchService.js - Service de recherche d'entités LUCIDE

const EntityModel = require('../models/EntityModel');
const EntityValidator = require('../validators/EntityValidator');
const DatabaseUtils = require('../../../shared/utils/database');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError } = require('../../../shared/middleware/errorHandler');

/**
 * Service spécialisé pour la recherche d'entités OSINT
 * Fournit des fonctionnalités de recherche avancées et optimisées
 */
class EntitySearchService {

  /**
   * Recherche globale d'entités avec filtres avancés
   * @param {Object} searchParams - Paramètres de recherche
   * @param {string} searchParams.query - Terme de recherche
   * @param {number} [searchParams.folderId] - ID du dossier (optionnel)
   * @param {string} [searchParams.type] - Type d'entité (optionnel)
   * @param {Array<string>} [searchParams.types] - Types d'entités multiples
   * @param {Object} [searchParams.options] - Options de recherche
   * @returns {Promise<Object>} Résultats de recherche
   */
  static async searchEntities(searchParams) {
    try {
      const {
        query = '',
        folderId = null,
        type = null,
        types = [],
        options = {}
      } = searchParams;

      logger.info('Starting entity search', { 
        query, 
        folderId, 
        type, 
        types, 
        options 
      });

      // Validation des paramètres
      const validatedQuery = this.validateSearchQuery(query);
      if (!validatedQuery) {
        return this.createEmptySearchResult(query, 'Terme de recherche vide');
      }

      const validatedOptions = this.validateSearchOptions(options);
      const searchFilters = this.buildSearchFilters({
        folderId,
        type,
        types,
        options: validatedOptions
      });

      // Exécuter la recherche selon le type
      let searchResults;
      if (validatedOptions.fuzzy || validatedQuery.length <= 2) {
        searchResults = await this.performFuzzySearch(validatedQuery, searchFilters, validatedOptions);
      } else {
        searchResults = await this.performExactSearch(validatedQuery, searchFilters, validatedOptions);
      }

      // Post-traitement des résultats
      const enrichedResults = await this.enrichSearchResults(searchResults, validatedQuery);
      const rankedResults = this.rankSearchResults(enrichedResults, validatedQuery, validatedOptions);
      const paginatedResults = this.paginateResults(rankedResults, validatedOptions);

      // Construire les métadonnées
      const metadata = await this.buildSearchMetadata(
        paginatedResults,
        rankedResults.length,
        validatedQuery,
        searchFilters,
        validatedOptions
      );

      logger.success('Entity search completed', {
        query: validatedQuery,
        totalResults: rankedResults.length,
        returnedResults: paginatedResults.length
      });

      return {
        success: true,
        data: paginatedResults,
        metadata,
        message: `${rankedResults.length} entité(s) trouvée(s) pour "${validatedQuery}"`
      };

    } catch (error) {
      logger.error('Entity search failed', { 
        searchParams, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Recherche par suggestions/autocomplétion
   * @param {string} query - Début du terme à compléter
   * @param {Object} filters - Filtres de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Suggestions
   */
  static async searchSuggestions(query, filters = {}, options = {}) {
    try {
      logger.info('Generating search suggestions', { query, filters });

      if (!query || query.length < 1) {
        return this.createEmptySearchResult(query, 'Terme trop court');
      }

      const validatedOptions = {
        ...this.validateSearchOptions(options),
        limit: Math.min(options.limit || 10, 20), // Limiter les suggestions
        exactMatch: false,
        fuzzy: false,
        orderBy: 'relevance'
      };

      // Recherche avec préfixe pour l'autocomplétion
      const suggestions = await this.performPrefixSearch(query, filters, validatedOptions);

      // Enrichir avec des métadonnées de suggestion
      const enrichedSuggestions = suggestions.map(entity => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        folder_name: entity.folder_name,
        suggestion_type: this.determineSuggestionType(entity, query),
        relevance_score: this.calculateRelevanceScore(entity, query),
        preview: this.generateEntityPreview(entity)
      }));

      // Trier par pertinence
      enrichedSuggestions.sort((a, b) => b.relevance_score - a.relevance_score);

      return {
        success: true,
        data: enrichedSuggestions,
        metadata: {
          query,
          suggestion_count: enrichedSuggestions.length,
          filters
        },
        message: `${enrichedSuggestions.length} suggestion(s) trouvée(s)`
      };

    } catch (error) {
      logger.error('Search suggestions failed', { query, filters, error: error.message });
      throw error;
    }
  }

  /**
   * Recherche avancée avec filtres multiples
   * @param {Object} advancedFilters - Filtres avancés
   * @returns {Promise<Object>} Résultats de recherche avancée
   */
  static async advancedSearch(advancedFilters) {
    try {
      logger.info('Starting advanced search', { advancedFilters });

      const {
        textQuery = '',
        entityTypes = [],
        folderIds = [],
        dateRange = {},
        attributeFilters = {},
        connectionFilters = {},
        options = {}
      } = advancedFilters;

      // Construire la requête SQL complexe
      const { query, params } = this.buildAdvancedSearchQuery({
        textQuery,
        entityTypes,
        folderIds,
        dateRange,
        attributeFilters,
        connectionFilters,
        options
      });

      // Exécuter la recherche
      const results = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'entities',
        query,
        params
      );

      // Traiter les résultats
      const processedResults = this.processAdvancedSearchResults(results, advancedFilters);

      return {
        success: true,
        data: processedResults,
        metadata: {
          total_found: processedResults.length,
          filters_applied: this.summarizeFilters(advancedFilters),
          execution_time: Date.now() - (options.startTime || Date.now())
        },
        message: `Recherche avancée: ${processedResults.length} résultat(s)`
      };

    } catch (error) {
      logger.error('Advanced search failed', { advancedFilters, error: error.message });
      throw error;
    }
  }

  /**
   * Recherche par similarité d'entités
   * @param {number} entityId - ID de l'entité de référence
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Entités similaires
   */
  static async findSimilarEntities(entityId, options = {}) {
    try {
      logger.info('Finding similar entities', { entityId, options });

      // Récupérer l'entité de référence
      const referenceEntity = await EntityModel.findById(entityId);
      if (!referenceEntity) {
        throw new NotFoundError('Entité de référence', entityId);
      }

      const validatedOptions = {
        ...this.validateSearchOptions(options),
        minSimilarity: options.minSimilarity || 0.3,
        maxResults: Math.min(options.maxResults || 20, 50)
      };

      // Analyser les caractéristiques de l'entité de référence
      const referenceFeatures = this.extractEntityFeatures(referenceEntity);

      // Rechercher des entités du même dossier (ou tous si spécifié)
      const candidateEntities = await this.getCandidateEntities(
        referenceEntity,
        validatedOptions
      );

      // Calculer la similarité pour chaque candidat
      const similarityResults = candidateEntities
        .map(candidate => ({
          ...candidate,
          similarity_score: this.calculateSimilarity(referenceFeatures, candidate),
          similarity_factors: this.analyzeSimilarityFactors(referenceEntity, candidate)
        }))
        .filter(result => result.similarity_score >= validatedOptions.minSimilarity)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, validatedOptions.maxResults);

      return {
        success: true,
        data: similarityResults,
        metadata: {
          reference_entity: {
            id: referenceEntity.id,
            name: referenceEntity.name,
            type: referenceEntity.type
          },
          similarity_threshold: validatedOptions.minSimilarity,
          candidates_analyzed: candidateEntities.length,
          similar_found: similarityResults.length
        },
        message: `${similarityResults.length} entité(s) similaire(s) trouvée(s)`
      };

    } catch (error) {
      logger.error('Similar entities search failed', { entityId, options, error: error.message });
      throw error;
    }
  }

  // =============================================
  // MÉTHODES PRIVÉES
  // =============================================

  /**
   * Valider et nettoyer la requête de recherche
   * @param {string} query - Requête à valider
   * @returns {string} Requête validée
   * @private
   */
  static validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Nettoyer la requête
    let cleanQuery = query.trim();

    // Limiter la longueur
    if (cleanQuery.length > 100) {
      cleanQuery = cleanQuery.substring(0, 100);
      logger.warn('Search query truncated', { original: query, truncated: cleanQuery });
    }

    // Échapper les caractères spéciaux pour SQLite
    cleanQuery = cleanQuery.replace(/[%_]/g, '\\$&');

    return cleanQuery;
  }

  /**
   * Valider les options de recherche
   * @param {Object} options - Options à valider
   * @returns {Object} Options validées
   * @private
   */
  static validateSearchOptions(options = {}) {
    return {
      limit: Math.min(Math.max(1, parseInt(options.limit) || 50), 200),
      offset: Math.max(0, parseInt(options.offset) || 0),
      page: Math.max(1, parseInt(options.page) || 1),
      exactMatch: Boolean(options.exactMatch),
      fuzzy: Boolean(options.fuzzy),
      caseSensitive: Boolean(options.caseSensitive),
      includeAttributes: options.includeAttributes !== false,
      orderBy: options.orderBy || 'relevance',
      order: ['asc', 'desc'].includes(options.order) ? options.order : 'desc'
    };
  }

  /**
   * Construire les filtres de recherche
   * @param {Object} params - Paramètres de filtres
   * @returns {Object} Filtres construits
   * @private
   */
  static buildSearchFilters(params) {
    const { folderId, type, types, options } = params;
    const filters = {};

    // Filtrer par dossier
    if (folderId && folderId > 0) {
      filters.folder_id = parseInt(folderId);
    }

    // Filtrer par type(s)
    if (type) {
      filters.type = type;
    } else if (types && types.length > 0) {
      filters.type = types; // Will use IN clause
    }

    return filters;
  }

  /**
   * Recherche exacte avec correspondances précises
   * @param {string} query - Terme de recherche
   * @param {Object} filters - Filtres
   * @param {Object} options - Options
   * @returns {Promise<Array>} Résultats
   * @private
   */
  static async performExactSearch(query, filters, options) {
    const searchFields = ['name', 'attributes'];
    
    if (options.exactMatch) {
      // Recherche exacte stricte
      const { whereClause, params } = DatabaseUtils.buildWhereClause(
        { ...filters, name: query },
        { operators: { name: '=' } }
      );

      const exactQuery = `
        SELECT e.*, fo.name as folder_name,
               COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) as connection_count
        FROM entities e
        LEFT JOIN folders fo ON e.folder_id = fo.id
        LEFT JOIN relationships r1 ON e.id = r1.from_entity
        LEFT JOIN relationships r2 ON e.id = r2.to_entity
        ${whereClause}
        GROUP BY e.id
        ORDER BY e.name ASC
        LIMIT ?
      `;

      params.push(options.limit);

      return await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'entities',
        exactQuery,
        params
      );
    } else {
      // Recherche avec LIKE
      return await DatabaseUtils.fullTextSearch(
        'entities',
        searchFields,
        query,
        filters
      );
    }
  }

  /**
   * Recherche floue avec tolérance aux erreurs
   * @param {string} query - Terme de recherche
   * @param {Object} filters - Filtres
   * @param {Object} options - Options
   * @returns {Promise<Array>} Résultats
   * @private
   */
  static async performFuzzySearch(query, filters, options) {
    // Pour l'instant, utiliser une recherche LIKE étendue
    // Dans le futur, on pourrait implémenter Levenshtein distance
    
    const fuzzyTerms = this.generateFuzzyTerms(query);
    const results = [];

    for (const term of fuzzyTerms) {
      const termResults = await DatabaseUtils.fullTextSearch(
        'entities',
        ['name', 'attributes'],
        term,
        filters
      );
      results.push(...termResults);
    }

    // Dédupliquer par ID
    const uniqueResults = [];
    const seenIds = new Set();

    for (const result of results) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  /**
   * Recherche par préfixe pour autocomplétion
   * @param {string} query - Préfixe de recherche
   * @param {Object} filters - Filtres
   * @param {Object} options - Options
   * @returns {Promise<Array>} Suggestions
   * @private
   */
  static async performPrefixSearch(query, filters, options) {
    const { whereClause, params } = DatabaseUtils.buildWhereClause(filters);
    
    const prefixQuery = `
      SELECT e.*, fo.name as folder_name
      FROM entities e
      LEFT JOIN folders fo ON e.folder_id = fo.id
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} (
        e.name LIKE ? OR 
        e.name LIKE ? OR
        e.attributes LIKE ?
      )
      ORDER BY 
        CASE 
          WHEN e.name = ? THEN 1
          WHEN e.name LIKE ? THEN 2
          ELSE 3
        END,
        LENGTH(e.name) ASC,
        e.name ASC
      LIMIT ?
    `;

    const searchParams = [
      ...params,
      `${query}%`,     // Commence par
      `% ${query}%`,   // Mot qui commence par
      `%"${query}%`,   // Dans les attributs JSON
      query,           // Exacte (priorité 1)
      `${query}%`,     // Commence par (priorité 2)
      options.limit
    ];

    return await DatabaseUtils.executeQuery(
      'SELECT_ALL',
      'entities',
      prefixQuery,
      searchParams
    );
  }

  /**
   * Enrichir les résultats de recherche avec des métadonnées
   * @param {Array} results - Résultats bruts
   * @param {string} query - Terme de recherche
   * @returns {Promise<Array>} Résultats enrichis
   * @private
   */
  static async enrichSearchResults(results, query) {
    return results.map(entity => ({
      ...entity,
      attributes: DatabaseUtils.attributesFromJSON(entity.attributes || '{}'),
      relevance_score: this.calculateRelevanceScore(entity, query),
      match_type: this.determineMatchType(entity, query),
      highlights: this.generateHighlights(entity, query)
    }));
  }

  /**
   * Classer les résultats par pertinence
   * @param {Array} results - Résultats à classer
   * @param {string} query - Terme de recherche
   * @param {Object} options - Options de tri
   * @returns {Array} Résultats classés
   * @private
   */
  static rankSearchResults(results, query, options) {
    if (options.orderBy === 'relevance') {
      return results.sort((a, b) => {
        // Trier par score de pertinence d'abord
        if (b.relevance_score !== a.relevance_score) {
          return b.relevance_score - a.relevance_score;
        }
        
        // Puis par type de correspondance
        const matchTypeOrder = { exact: 1, prefix: 2, contains: 3, fuzzy: 4 };
        const aOrder = matchTypeOrder[a.match_type] || 5;
        const bOrder = matchTypeOrder[b.match_type] || 5;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        // Finalement par longueur du nom (plus court = plus pertinent)
        return a.name.length - b.name.length;
      });
    }

    // Tri standard par nom, date, etc.
    const sortField = options.orderBy === 'name' ? 'name' : 'created_at';
    const isAsc = options.order === 'asc';
    
    return results.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal < bVal) return isAsc ? -1 : 1;
      if (aVal > bVal) return isAsc ? 1 : -1;
      return 0;
    });
  }

  /**
   * Calculer le score de pertinence d'une entité
   * @param {Object} entity - Entité à scorer
   * @param {string} query - Terme de recherche
   * @returns {number} Score de pertinence (0-1)
   * @private
   */
  static calculateRelevanceScore(entity, query) {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    const lowerName = entity.name.toLowerCase();

    // Correspondance exacte du nom = score maximum
    if (lowerName === lowerQuery) {
      score += 1.0;
    }
    // Nom commence par la requête = score élevé
    else if (lowerName.startsWith(lowerQuery)) {
      score += 0.8;
    }
    // Nom contient la requête = score moyen
    else if (lowerName.includes(lowerQuery)) {
      score += 0.6;
    }

    // Bonus pour les correspondances dans les attributs
    const attributes = entity.attributes || {};
    const attributesText = JSON.stringify(attributes).toLowerCase();
    if (attributesText.includes(lowerQuery)) {
      score += 0.3;
    }

    // Bonus pour les entités très connectées (plus importantes)
    const connectionBonus = Math.min((entity.connection_count || 0) * 0.05, 0.2);
    score += connectionBonus;

    // Malus pour les entités très anciennes (moins pertinentes)
    if (entity.created_at) {
      const daysSinceCreation = (Date.now() - new Date(entity.created_at)) / (1000 * 60 * 60 * 24);
      const ageBonus = Math.max(0, 0.1 - (daysSinceCreation / 1000));
      score += ageBonus;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Déterminer le type de correspondance
   * @param {Object} entity - Entité
   * @param {string} query - Terme de recherche
   * @returns {string} Type de correspondance
   * @private
   */
  static determineMatchType(entity, query) {
    const lowerQuery = query.toLowerCase();
    const lowerName = entity.name.toLowerCase();

    if (lowerName === lowerQuery) return 'exact';
    if (lowerName.startsWith(lowerQuery)) return 'prefix';
    if (lowerName.includes(lowerQuery)) return 'contains';
    
    // Vérifier dans les attributs
    const attributesText = JSON.stringify(entity.attributes || {}).toLowerCase();
    if (attributesText.includes(lowerQuery)) return 'attribute';
    
    return 'fuzzy';
  }

  /**
   * Générer les termes de recherche floue
   * @param {string} query - Terme original
   * @returns {Array<string>} Termes flous
   * @private
   */
  static generateFuzzyTerms(query) {
    const terms = [query];
    
    // Ajouter des variantes communes
    if (query.length > 3) {
      // Supprimer le dernier caractère
      terms.push(query.slice(0, -1));
      
      // Ajouter un caractère joker
      terms.push(query + '_');
    }

    return terms;
  }

  /**
   * Générer les surlignages de correspondance
   * @param {Object} entity - Entité
   * @param {string} query - Terme de recherche
   * @returns {Object} Surlignages
   * @private
   */
  static generateHighlights(entity, query) {
    const highlights = {};
    const lowerQuery = query.toLowerCase();

    // Surligner dans le nom
    if (entity.name.toLowerCase().includes(lowerQuery)) {
      highlights.name = this.highlightText(entity.name, query);
    }

    // Surligner dans les attributs (limité)
    const attributes = entity.attributes || {};
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
        highlights[`attribute_${key}`] = this.highlightText(value, query);
      }
    });

    return highlights;
  }

  /**
   * Surligner du texte
   * @param {string} text - Texte à surligner
   * @param {string} query - Terme à surligner
   * @returns {string} Texte avec surlignage
   * @private
   */
  static highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Paginer les résultats
   * @param {Array} results - Résultats à paginer
   * @param {Object} options - Options de pagination
   * @returns {Array} Résultats paginés
   * @private
   */
  static paginateResults(results, options) {
    const { page, limit } = options;
    const offset = (page - 1) * limit;
    
    return results.slice(offset, offset + limit);
  }

  /**
   * Construire les métadonnées de recherche
   * @param {Array} paginatedResults - Résultats paginés
   * @param {number} totalResults - Total des résultats
   * @param {string} query - Terme de recherche
   * @param {Object} filters - Filtres appliqués
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Métadonnées
   * @private
   */
  static async buildSearchMetadata(paginatedResults, totalResults, query, filters, options) {
    return {
      query,
      total_results: totalResults,
      returned_results: paginatedResults.length,
      page: options.page,
      limit: options.limit,
      total_pages: Math.ceil(totalResults / options.limit),
      has_next_page: options.page * options.limit < totalResults,
      has_previous_page: options.page > 1,
      filters_applied: Object.keys(filters).length,
      search_options: {
        exact_match: options.exactMatch,
        fuzzy: options.fuzzy,
        order_by: options.orderBy
      },
      execution_time: Date.now(),
      result_types: this.analyzeResultTypes(paginatedResults)
    };
  }

  /**
   * Analyser les types de résultats
   * @param {Array} results - Résultats à analyser
   * @returns {Object} Analyse des types
   * @private
   */
  static analyzeResultTypes(results) {
    const typeCount = {};
    const matchTypeCount = {};

    results.forEach(result => {
      typeCount[result.type] = (typeCount[result.type] || 0) + 1;
      matchTypeCount[result.match_type] = (matchTypeCount[result.match_type] || 0) + 1;
    });

    return {
      by_entity_type: typeCount,
      by_match_type: matchTypeCount
    };
  }

  /**
   * Créer un résultat de recherche vide
   * @param {string} query - Terme de recherche
   * @param {string} reason - Raison de l'absence de résultats
   * @returns {Object} Résultat vide
   * @private
   */
  static createEmptySearchResult(query, reason) {
    return {
      success: true,
      data: [],
      metadata: {
        query,
        total_results: 0,
        returned_results: 0,
        reason
      },
      message: reason || 'Aucun résultat trouvé'
    };
  }

  // Méthodes pour les fonctionnalités avancées (à implémenter si nécessaire)

  static buildAdvancedSearchQuery(filters) {
    // Implémentation future pour recherche avancée
    throw new Error('Advanced search not implemented yet');
  }

  static processAdvancedSearchResults(results, filters) {
    // Implémentation future
    return results;
  }

  static summarizeFilters(filters) {
    // Implémentation future
    return Object.keys(filters);
  }

  static extractEntityFeatures(entity) {
    // Implémentation future pour similarité
    return {};
  }

  static getCandidateEntities(referenceEntity, options) {
    // Implémentation future
    return [];
  }

  static calculateSimilarity(features1, features2) {
    // Implémentation future
    return 0;
  }

  static analyzeSimilarityFactors(entity1, entity2) {
    // Implémentation future
    return [];
  }

  static determineSuggestionType(entity, query) {
    return this.determineMatchType(entity, query);
  }

  static generateEntityPreview(entity) {
    const preview = {
      type: entity.type,
      folder: entity.folder_name || 'N/A'
    };

    // Ajouter quelques attributs clés s'ils existent
    const attributes = entity.attributes || {};
    const keyAttributes = ['email', 'phone', 'url', 'address', 'description'];
    
    keyAttributes.forEach(key => {
      if (attributes[key]) {
        preview[key] = String(attributes[key]).substring(0, 50);
      }
    });

    return preview;
  }
}

module.exports = EntitySearchService;