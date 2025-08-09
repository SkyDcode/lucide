// backend/core/entities/controllers/EntityTypeController.js - Contrôleur pour les types d'entités LUCIDE
const EntityTypeModel = require('../models/EntityTypeModel');
const { asyncHandler } = require('../../../shared/middleware/errorHandler');
const { logger } = require('../../../shared/middleware/logging');

/**
 * Contrôleur REST pour la gestion des types d'entités OSINT
 * Fournit des endpoints pour explorer et configurer les types d'entités
 */
class EntityTypeController {

  /**
   * Obtenir tous les types d'entités
   * GET /api/entity-types
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getAllTypes = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types - Getting all entity types', { 
      query: req.query,
      requestId: req.requestId 
    });

    const entityTypes = await EntityTypeModel.getAllTypes();

    // Optionnel : filtrer par catégorie
    let filteredTypes = entityTypes;
    if (req.query.category) {
      filteredTypes = Object.fromEntries(
        Object.entries(entityTypes).filter(([, config]) => 
          config.category === req.query.category
        )
      );
    }

    res.status(200).json({
      success: true,
      message: `${Object.keys(filteredTypes).length} type(s) d'entité récupéré(s)`,
      data: filteredTypes,
      metadata: {
        total_types: Object.keys(entityTypes).length,
        filtered_types: Object.keys(filteredTypes).length,
        categories: [...new Set(Object.values(entityTypes).map(t => t.category))],
        filter_applied: !!req.query.category
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir un type d'entité spécifique
   * GET /api/entity-types/:typeKey
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getType = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/:typeKey - Getting specific entity type', { 
      params: req.params,
      requestId: req.requestId 
    });

    const typeConfig = await EntityTypeModel.getType(req.params.typeKey);

    if (!typeConfig) {
      return res.status(404).json({
        success: false,
        message: `Type d'entité "${req.params.typeKey}" non trouvé`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `Configuration du type "${typeConfig.name}" récupérée`,
      data: typeConfig,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Obtenir les types d'entités par catégorie
   * GET /api/entity-types/category/:category
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getTypesByCategory = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/category/:category - Getting types by category', { 
      params: req.params,
      requestId: req.requestId 
    });

    try {
      const typesByCategory = await EntityTypeModel.getTypesByCategory(req.params.category);

      if (Object.keys(typesByCategory).length === 0) {
        return res.status(404).json({
          success: false,
          message: `Aucun type d'entité trouvé pour la catégorie "${req.params.category}"`,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: `${Object.keys(typesByCategory).length} type(s) trouvé(s) pour la catégorie "${req.params.category}"`,
        data: typesByCategory,
        metadata: {
          category: req.params.category,
          types_count: Object.keys(typesByCategory).length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Valider les attributs d'une entité selon son type
   * POST /api/entity-types/:typeKey/validate
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static validateAttributes = asyncHandler(async (req, res) => {
    logger.info('POST /api/entity-types/:typeKey/validate - Validating entity attributes', { 
      params: req.params,
      body: req.body,
      requestId: req.requestId 
    });

    try {
      const validationResult = await EntityTypeModel.validateAttributes(
        req.params.typeKey, 
        req.body.attributes || req.body
      );

      const statusCode = validationResult.valid ? 200 : 400;

      res.status(statusCode).json({
        success: validationResult.valid,
        message: validationResult.valid ? 'Attributs valides' : 'Attributs invalides',
        data: validationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Obtenir les attributs par défaut pour un type
   * GET /api/entity-types/:typeKey/defaults
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getDefaultAttributes = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/:typeKey/defaults - Getting default attributes', { 
      params: req.params,
      requestId: req.requestId 
    });

    try {
      const defaultAttributes = await EntityTypeModel.getDefaultAttributes(req.params.typeKey);

      res.status(200).json({
        success: true,
        message: 'Attributs par défaut récupérés',
        data: {
          typeKey: req.params.typeKey,
          defaultAttributes,
          attributesCount: Object.keys(defaultAttributes).length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Formater des attributs pour l'affichage
   * POST /api/entity-types/:typeKey/format
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static formatAttributes = asyncHandler(async (req, res) => {
    logger.info('POST /api/entity-types/:typeKey/format - Formatting attributes for display', { 
      params: req.params,
      body: req.body,
      requestId: req.requestId 
    });

    try {
      const formattedAttributes = await EntityTypeModel.formatAttributesForDisplay(
        req.params.typeKey, 
        req.body.attributes || req.body
      );

      res.status(200).json({
        success: true,
        message: 'Attributs formatés pour l\'affichage',
        data: {
          typeKey: req.params.typeKey,
          rawAttributes: req.body.attributes || req.body,
          formattedAttributes,
          displayCount: Object.keys(formattedAttributes).length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Obtenir le schéma de formulaire pour un type
   * GET /api/entity-types/:typeKey/form-schema
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getFormSchema = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/:typeKey/form-schema - Getting form schema', { 
      params: req.params,
      requestId: req.requestId 
    });

    try {
      const formSchema = await EntityTypeModel.getFormSchema(req.params.typeKey);

      res.status(200).json({
        success: true,
        message: `Schéma de formulaire pour le type "${formSchema.name}" récupéré`,
        data: formSchema,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Rechercher des types d'entités
   * GET /api/entity-types/search
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static searchTypes = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/search - Searching entity types', { 
      query: req.query,
      requestId: req.requestId 
    });

    const searchTerm = req.query.q || req.query.search || '';
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Terme de recherche requis',
        timestamp: new Date().toISOString()
      });
    }

    const options = {
      category: req.query.category,
      limit: Math.min(parseInt(req.query.limit) || 10, 50)
    };

    try {
      const searchResults = await EntityTypeModel.searchTypes(searchTerm, options);

      res.status(200).json({
        success: true,
        message: `${searchResults.length} type(s) d'entité trouvé(s) pour "${searchTerm}"`,
        data: searchResults,
        metadata: {
          searchTerm,
          resultsCount: searchResults.length,
          options
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Obtenir les statistiques d'utilisation des types
   * GET /api/entity-types/usage-statistics
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getUsageStatistics = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/usage-statistics - Getting usage statistics', { 
      query: req.query,
      requestId: req.requestId 
    });

    const folderId = req.query.folderId ? parseInt(req.query.folderId) : null;

    try {
      const usageStats = await EntityTypeModel.getUsageStatistics(folderId);

      res.status(200).json({
        success: true,
        message: 'Statistiques d\'utilisation des types récupérées',
        data: usageStats,
        metadata: {
          folderId: folderId || 'all',
          analysis_scope: folderId ? 'folder' : 'global'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Obtenir les catégories d'entités disponibles
   * GET /api/entity-types/categories
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getCategories = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/categories - Getting entity categories', { 
      requestId: req.requestId 
    });

    const { ENTITY_CATEGORIES } = require('../../../shared/constants/entityTypes');
    const allTypes = await EntityTypeModel.getAllTypes();

    // Enrichir les catégories avec le nombre de types
    const enrichedCategories = {};
    
    Object.entries(ENTITY_CATEGORIES).forEach(([categoryKey, categoryConfig]) => {
      const typesInCategory = Object.values(allTypes).filter(
        type => type.category === categoryKey
      );

      enrichedCategories[categoryKey] = {
        ...categoryConfig,
        key: categoryKey,
        types_count: typesInCategory.length,
        types: typesInCategory.map(type => ({
          key: Object.keys(allTypes).find(key => allTypes[key] === type),
          name: type.name,
          icon: type.icon
        }))
      };
    });

    res.status(200).json({
      success: true,
      message: `${Object.keys(enrichedCategories).length} catégorie(s) d'entité récupérée(s)`,
      data: enrichedCategories,
      metadata: {
        total_categories: Object.keys(enrichedCategories).length,
        total_types: Object.keys(allTypes).length
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Comparer deux types d'entités
   * GET /api/entity-types/compare/:typeA/:typeB
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static compareTypes = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/compare - Comparing entity types', { 
      params: req.params,
      requestId: req.requestId 
    });

    const { typeA, typeB } = req.params;

    try {
      const [configA, configB] = await Promise.all([
        EntityTypeModel.getType(typeA),
        EntityTypeModel.getType(typeB)
      ]);

      if (!configA) {
        return res.status(404).json({
          success: false,
          message: `Type d'entité "${typeA}" non trouvé`,
          timestamp: new Date().toISOString()
        });
      }

      if (!configB) {
        return res.status(404).json({
          success: false,
          message: `Type d'entité "${typeB}" non trouvé`,
          timestamp: new Date().toISOString()
        });
      }

      // Analyser les différences et similarités
      const comparison = this.analyzeTypeComparison(configA, configB);

      res.status(200).json({
        success: true,
        message: `Comparaison entre "${configA.name}" et "${configB.name}" terminée`,
        data: {
          typeA: { key: typeA, ...configA },
          typeB: { key: typeB, ...configB },
          comparison
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Obtenir les types recommandés pour un contexte
   * GET /api/entity-types/recommendations
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getRecommendations = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/recommendations - Getting type recommendations', { 
      query: req.query,
      requestId: req.requestId 
    });

    const context = req.query.context || 'general'; // general, investigation, analysis
    const existingTypes = req.query.existingTypes ? req.query.existingTypes.split(',') : [];

    const recommendations = this.generateTypeRecommendations(context, existingTypes);

    res.status(200).json({
      success: true,
      message: `${recommendations.length} recommandation(s) générée(s) pour le contexte "${context}"`,
      data: {
        context,
        existingTypes,
        recommendations
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Valider la compatibilité entre types pour les relations
   * GET /api/entity-types/:typeA/compatibility/:typeB
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static checkCompatibility = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/compatibility - Checking type compatibility', { 
      params: req.params,
      requestId: req.requestId 
    });

    const { typeA, typeB } = req.params;
    const { getAvailableRelations } = require('../../../shared/constants/entityTypes');

    try {
      // Vérifier que les types existent
      const [configA, configB] = await Promise.all([
        EntityTypeModel.getType(typeA),
        EntityTypeModel.getType(typeB)
      ]);

      if (!configA || !configB) {
        return res.status(404).json({
          success: false,
          message: 'Un ou plusieurs types d\'entité non trouvés',
          timestamp: new Date().toISOString()
        });
      }

      // Obtenir les relations possibles
      const relations = getAvailableRelations(typeA, typeB);
      const reverseRelations = getAvailableRelations(typeB, typeA);

      const compatibility = {
        compatible: relations.length > 0 || reverseRelations.length > 0,
        relations_from_a_to_b: relations,
        relations_from_b_to_a: reverseRelations,
        total_possible_relations: relations.length + reverseRelations.length,
        recommendation: this.getRelationRecommendation(typeA, typeB, relations, reverseRelations)
      };

      res.status(200).json({
        success: true,
        message: compatibility.compatible ? 
          'Types compatibles pour les relations' : 
          'Types non compatibles',
        data: {
          typeA: { key: typeA, name: configA.name },
          typeB: { key: typeB, name: configB.name },
          compatibility
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Obtenir un aperçu rapide des types
   * GET /api/entity-types/overview
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static getTypesOverview = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/overview - Getting types overview', { 
      requestId: req.requestId 
    });

    const allTypes = await EntityTypeModel.getAllTypes();
    const { ENTITY_CATEGORIES } = require('../../../shared/constants/entityTypes');

    // Créer un aperçu condensé
    const overview = {
      total_types: Object.keys(allTypes).length,
      categories: Object.keys(ENTITY_CATEGORIES).map(categoryKey => {
        const categoryTypes = Object.entries(allTypes).filter(
          ([, config]) => config.category === categoryKey
        );

        return {
          key: categoryKey,
          name: ENTITY_CATEGORIES[categoryKey].name,
          icon: ENTITY_CATEGORIES[categoryKey].icon,
          color: ENTITY_CATEGORIES[categoryKey].color,
          types_count: categoryTypes.length,
          types: categoryTypes.map(([key, config]) => ({
            key,
            name: config.name,
            icon: config.icon,
            attribute_count: config.attributeCount || 0
          }))
        };
      }),
      most_complex_type: this.findMostComplexType(allTypes),
      simplest_type: this.findSimplestType(allTypes)
    };

    res.status(200).json({
      success: true,
      message: 'Aperçu des types d\'entités récupéré',
      data: overview,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Exporter la configuration des types
   * GET /api/entity-types/export
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static exportConfiguration = asyncHandler(async (req, res) => {
    logger.info('GET /api/entity-types/export - Exporting types configuration', { 
      query: req.query,
      requestId: req.requestId 
    });

    const allTypes = await EntityTypeModel.getAllTypes();
    const { ENTITY_CATEGORIES, ENTITY_RELATIONS } = require('../../../shared/constants/entityTypes');

    const exportData = {
      export_info: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        description: 'Configuration des types d\'entités LUCIDE',
        total_types: Object.keys(allTypes).length,
        total_categories: Object.keys(ENTITY_CATEGORIES).length
      },
      entity_types: allTypes,
      categories: ENTITY_CATEGORIES,
      relationships: ENTITY_RELATIONS
    };

    // Format de réponse selon le paramètre
    const format = req.query.format || 'json';
    
    if (format === 'download') {
      const filename = `lucide-entity-types-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.status(200).json(exportData);
  });

  // =============================================
  // MÉTHODES PRIVÉES D'AIDE
  // =============================================

  /**
   * Analyser la comparaison entre deux types
   * @param {Object} configA - Configuration du type A
   * @param {Object} configB - Configuration du type B
   * @returns {Object} Analyse de comparaison
   * @private
   */
  static analyzeTypeComparison(configA, configB) {
    const attributesA = Object.keys(configA.attributes || {});
    const attributesB = Object.keys(configB.attributes || {});

    const commonAttributes = attributesA.filter(attr => attributesB.includes(attr));
    const uniqueToA = attributesA.filter(attr => !attributesB.includes(attr));
    const uniqueToB = attributesB.filter(attr => !attributesA.includes(attr));

    return {
      same_category: configA.category === configB.category,
      attribute_overlap: {
        common_attributes: commonAttributes,
        common_count: commonAttributes.length,
        unique_to_a: uniqueToA,
        unique_to_b: uniqueToB,
        similarity_percentage: attributesA.length > 0 ? 
          Math.round((commonAttributes.length / Math.max(attributesA.length, attributesB.length)) * 100) : 0
      },
      complexity_comparison: {
        a_complexity: attributesA.length,
        b_complexity: attributesB.length,
        more_complex: attributesA.length > attributesB.length ? 'A' : 
                     attributesB.length > attributesA.length ? 'B' : 'equal'
      },
      usage_recommendations: this.generateUsageRecommendations(configA, configB, commonAttributes)
    };
  }

  /**
   * Générer des recommandations de types
   * @param {string} context - Contexte d'utilisation
   * @param {Array} existingTypes - Types déjà présents
   * @returns {Array} Recommandations
   * @private
   */
  static generateTypeRecommendations(context, existingTypes) {
    const recommendations = [];

    // Recommandations par contexte
    const contextRecommendations = {
      investigation: ['person', 'place', 'event', 'document'],
      analysis: ['organization', 'website', 'account', 'document'],
      surveillance: ['person', 'place', 'vehicle', 'event'],
      financial: ['person', 'organization', 'account', 'document'],
      general: ['person', 'place', 'organization', 'event']
    };

    const suggestedTypes = contextRecommendations[context] || contextRecommendations.general;

    suggestedTypes.forEach(typeKey => {
      if (!existingTypes.includes(typeKey)) {
        recommendations.push({
          type: typeKey,
          priority: this.getTypePriority(typeKey, context),
          reason: this.getRecommendationReason(typeKey, context),
          category: this.getTypeCategory(typeKey)
        });
      }
    });

    // Trier par priorité
    return recommendations.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
  }

  /**
   * Obtenir la recommandation pour une relation
   * @param {string} typeA - Type A
   * @param {string} typeB - Type B
   * @param {Array} relations - Relations A vers B
   * @param {Array} reverseRelations - Relations B vers A
   * @returns {string} Recommandation
   * @private
   */
  static getRelationRecommendation(typeA, typeB, relations, reverseRelations) {
    if (relations.length === 0 && reverseRelations.length === 0) {
      return 'Ces types ne sont généralement pas liés directement. Considérez un type intermédiaire.';
    }

    if (relations.length > reverseRelations.length) {
      return `Privilégiez les relations de ${typeA} vers ${typeB}`;
    } else if (reverseRelations.length > relations.length) {
      return `Privilégiez les relations de ${typeB} vers ${typeA}`;
    } else {
      return 'Les deux directions de relation sont équivalentes';
    }
  }

  /**
   * Trouver le type le plus complexe
   * @param {Object} allTypes - Tous les types
   * @returns {Object} Type le plus complexe
   * @private
   */
  static findMostComplexType(allTypes) {
    let mostComplex = null;
    let maxAttributes = 0;

    Object.entries(allTypes).forEach(([key, config]) => {
      const attributeCount = config.attributeCount || 0;
      if (attributeCount > maxAttributes) {
        maxAttributes = attributeCount;
        mostComplex = { key, ...config };
      }
    });

    return mostComplex;
  }

  /**
   * Trouver le type le plus simple
   * @param {Object} allTypes - Tous les types
   * @returns {Object} Type le plus simple
   * @private
   */
  static findSimplestType(allTypes) {
    let simplest = null;
    let minAttributes = Infinity;

    Object.entries(allTypes).forEach(([key, config]) => {
      const attributeCount = config.attributeCount || 0;
      if (attributeCount < minAttributes) {
        minAttributes = attributeCount;
        simplest = { key, ...config };
      }
    });

    return simplest;
  }

  /**
   * Générer des recommandations d'usage
   * @param {Object} configA - Configuration A
   * @param {Object} configB - Configuration B
   * @param {Array} commonAttributes - Attributs communs
   * @returns {Array} Recommandations
   * @private
   */
  static generateUsageRecommendations(configA, configB, commonAttributes) {
    const recommendations = [];

    if (configA.category === configB.category) {
      recommendations.push({
        type: 'category_similarity',
        message: 'Ces types sont de la même catégorie, ils peuvent être utilisés ensemble'
      });
    }

    if (commonAttributes.length > 3) {
      recommendations.push({
        type: 'attribute_overlap',
        message: 'Beaucoup d\'attributs communs, attention aux doublons'
      });
    }

    if (commonAttributes.length === 0) {
      recommendations.push({
        type: 'complementary',
        message: 'Types complémentaires, parfaits pour une vue d\'ensemble'
      });
    }

    return recommendations;
  }

  /**
   * Obtenir la priorité d'un type pour un contexte
   * @param {string} typeKey - Clé du type
   * @param {string} context - Contexte
   * @returns {string} Priorité
   * @private
   */
  static getTypePriority(typeKey, context) {
    const priorities = {
      investigation: {
        person: 'high',
        place: 'high',
        event: 'medium',
        document: 'medium'
      },
      analysis: {
        organization: 'high',
        website: 'medium',
        account: 'medium'
      }
    };

    return priorities[context]?.[typeKey] || 'low';
  }

  /**
   * Obtenir la raison d'une recommandation
   * @param {string} typeKey - Clé du type
   * @param {string} context - Contexte
   * @returns {string} Raison
   * @private
   */
  static getRecommendationReason(typeKey, context) {
    const reasons = {
      person: 'Les personnes sont centrales dans la plupart des enquêtes',
      place: 'Les lieux fournissent un contexte géographique important',
      organization: 'Les organisations révèlent des structures complexes',
      event: 'Les événements établissent une chronologie'
    };

    return reasons[typeKey] || `Type utile pour le contexte ${context}`;
  }

  /**
   * Obtenir la catégorie d'un type
   * @param {string} typeKey - Clé du type
   * @returns {string} Catégorie
   * @private
   */
  static getTypeCategory(typeKey) {
    const { getAllEntityTypes } = require('../../../shared/constants/entityTypes');
    const types = getAllEntityTypes();
    return types[typeKey]?.category || 'unknown';
  }
}

module.exports = EntityTypeController;