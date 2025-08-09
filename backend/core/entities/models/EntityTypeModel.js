// backend/core/entities/models/EntityTypeModel.js - Modèle EntityType pour LUCIDE
const { 
  getAllEntityTypes, 
  getEntityType, 
  getEntityTypesByCategory,
  validateEntityAttributes,
  getDefaultAttributes,
  formatAttributesForDisplay
} = require('../../../shared/constants/entityTypes');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError } = require('../../../shared/middleware/errorHandler');

/**
 * Modèle pour la gestion des types d'entités OSINT
 * Fournit des méthodes pour travailler avec la configuration des types d'entités
 */
class EntityTypeModel {

  /**
   * Obtenir tous les types d'entités disponibles
   * @returns {Promise<Object>} Configuration de tous les types
   */
  static async getAllTypes() {
    try {
      logger.debug('Retrieving all entity types');
      
      const allTypes = getAllEntityTypes();
      
      // Enrichir avec des statistiques calculées
      const enrichedTypes = {};
      
      for (const [typeKey, typeConfig] of Object.entries(allTypes)) {
        enrichedTypes[typeKey] = {
          ...typeConfig,
          key: typeKey,
          attributeCount: Object.keys(typeConfig.attributes || {}).length,
          requiredAttributeCount: Object.values(typeConfig.attributes || {})
            .filter(attr => attr.required).length
        };
      }

      logger.info('Entity types retrieved successfully', { 
        typesCount: Object.keys(enrichedTypes).length 
      });

      return enrichedTypes;

    } catch (error) {
      logger.error('Error getting all entity types', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir un type d'entité spécifique
   * @param {string} typeKey - Clé du type d'entité
   * @returns {Promise<Object|null>} Configuration du type ou null
   */
  static async getType(typeKey) {
    try {
      if (!typeKey || typeof typeKey !== 'string') {
        throw new ValidationError('Clé de type d\'entité invalide');
      }

      logger.debug('Retrieving entity type', { typeKey });

      const typeConfig = getEntityType(typeKey);
      
      if (!typeConfig) {
        return null;
      }

      // Enrichir avec des informations calculées
      const enrichedType = {
        ...typeConfig,
        key: typeKey,
        attributeCount: Object.keys(typeConfig.attributes || {}).length,
        requiredAttributeCount: Object.values(typeConfig.attributes || {})
          .filter(attr => attr.required).length,
        optionalAttributeCount: Object.values(typeConfig.attributes || {})
          .filter(attr => !attr.required).length,
        attributeTypes: this.getAttributeTypesSummary(typeConfig.attributes || {}),
        defaultAttributes: getDefaultAttributes(typeKey)
      };

      logger.debug('Entity type retrieved successfully', { 
        typeKey, 
        attributeCount: enrichedType.attributeCount 
      });

      return enrichedType;

    } catch (error) {
      logger.error('Error getting entity type', { typeKey, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les types d'entités par catégorie
   * @param {string} category - Catégorie à filtrer
   * @returns {Promise<Object>} Types de la catégorie
   */
  static async getTypesByCategory(category) {
    try {
      if (!category || typeof category !== 'string') {
        throw new ValidationError('Catégorie invalide');
      }

      logger.debug('Retrieving entity types by category', { category });

      const typesByCategory = getEntityTypesByCategory(category);
      
      // Enrichir chaque type
      const enrichedTypes = {};
      
      for (const [typeKey, typeConfig] of Object.entries(typesByCategory)) {
        enrichedTypes[typeKey] = {
          ...typeConfig,
          key: typeKey,
          attributeCount: Object.keys(typeConfig.attributes || {}).length,
          requiredAttributeCount: Object.values(typeConfig.attributes || {})
            .filter(attr => attr.required).length
        };
      }

      logger.info('Entity types by category retrieved successfully', { 
        category,
        typesCount: Object.keys(enrichedTypes).length 
      });

      return enrichedTypes;

    } catch (error) {
      logger.error('Error getting entity types by category', { 
        category, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Valider les attributs d'une entité selon son type
   * @param {string} typeKey - Type d'entité
   * @param {Object} attributes - Attributs à valider
   * @returns {Promise<Object>} { valid: boolean, errors: Array, sanitizedAttributes: Object }
   */
  static async validateAttributes(typeKey, attributes = {}) {
    try {
      logger.debug('Validating entity attributes', { typeKey, attributes });

      // Vérifier que le type existe
      const typeConfig = await this.getType(typeKey);
      if (!typeConfig) {
        throw new ValidationError(`Type d'entité inconnu: ${typeKey}`);
      }

      // Utiliser la fonction de validation des constantes
      const validation = validateEntityAttributes(typeKey, attributes);
      
      // Nettoyer et formater les attributs valides
      const sanitizedAttributes = this.sanitizeAttributes(typeConfig, attributes);

      const result = {
        valid: validation.valid,
        errors: validation.errors || [],
        sanitizedAttributes,
        typeConfig: {
          name: typeConfig.name,
          category: typeConfig.category,
          requiredFields: Object.entries(typeConfig.attributes || {})
            .filter(([, config]) => config.required)
            .map(([name, config]) => ({ name, label: config.label }))
        }
      };

      logger.debug('Attribute validation completed', { 
        typeKey, 
        valid: result.valid, 
        errorsCount: result.errors.length 
      });

      return result;

    } catch (error) {
      logger.error('Error validating entity attributes', { 
        typeKey, attributes, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les attributs par défaut pour un type d'entité
   * @param {string} typeKey - Type d'entité
   * @returns {Promise<Object>} Attributs par défaut
   */
  static async getDefaultAttributes(typeKey) {
    try {
      logger.debug('Getting default attributes', { typeKey });

      const defaultAttrs = getDefaultAttributes(typeKey);
      
      logger.debug('Default attributes retrieved', { 
        typeKey, 
        attributesCount: Object.keys(defaultAttrs).length 
      });

      return defaultAttrs;

    } catch (error) {
      logger.error('Error getting default attributes', { 
        typeKey, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Formater les attributs pour l'affichage
   * @param {string} typeKey - Type d'entité
   * @param {Object} attributes - Attributs bruts
   * @returns {Promise<Object>} Attributs formatés avec labels
   */
  static async formatAttributesForDisplay(typeKey, attributes = {}) {
    try {
      logger.debug('Formatting attributes for display', { typeKey, attributes });

      const formatted = formatAttributesForDisplay(typeKey, attributes);
      
      logger.debug('Attributes formatted successfully', { 
        typeKey, 
        formattedCount: Object.keys(formatted).length 
      });

      return formatted;

    } catch (error) {
      logger.error('Error formatting attributes for display', { 
        typeKey, attributes, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir le schéma de formulaire pour un type d'entité
   * @param {string} typeKey - Type d'entité
   * @returns {Promise<Object>} Schéma de formulaire
   */
  static async getFormSchema(typeKey) {
    try {
      logger.debug('Getting form schema', { typeKey });

      const typeConfig = await this.getType(typeKey);
      if (!typeConfig) {
        throw new ValidationError(`Type d'entité inconnu: ${typeKey}`);
      }

      const schema = {
        type: typeKey,
        name: typeConfig.name,
        description: typeConfig.description,
        category: typeConfig.category,
        icon: typeConfig.icon,
        color: typeConfig.color,
        fields: []
      };

      // Convertir les attributs en champs de formulaire
      Object.entries(typeConfig.attributes || {}).forEach(([attrName, attrConfig]) => {
        const field = {
          name: attrName,
          label: attrConfig.label || attrName,
          type: attrConfig.type,
          required: attrConfig.required || false,
          options: attrConfig.options || null,
          placeholder: this.generatePlaceholder(attrConfig),
          validation: this.getValidationRules(attrConfig),
          group: this.getFieldGroup(attrName, attrConfig)
        };

        schema.fields.push(field);
      });

      // Organiser les champs par groupes
      schema.fieldGroups = this.organizeFieldsByGroups(schema.fields);

      logger.debug('Form schema generated successfully', { 
        typeKey, 
        fieldsCount: schema.fields.length 
      });

      return schema;

    } catch (error) {
      logger.error('Error getting form schema', { 
        typeKey, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Rechercher des types d'entités par terme
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de recherche
   * @returns {Promise<Array>} Types correspondants
   */
  static async searchTypes(searchTerm, options = {}) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return [];
      }

      const { category = null, limit = 10 } = options;

      logger.debug('Searching entity types', { searchTerm, options });

      const allTypes = await this.getAllTypes();
      const searchResults = [];

      const lowerSearchTerm = searchTerm.toLowerCase();

      Object.entries(allTypes).forEach(([typeKey, typeConfig]) => {
        // Filtrer par catégorie si spécifiée
        if (category && typeConfig.category !== category) {
          return;
        }

        // Recherche dans le nom, la description et les mots-clés
        const matchScore = this.calculateMatchScore(typeConfig, lowerSearchTerm);
        
        if (matchScore > 0) {
          searchResults.push({
            ...typeConfig,
            key: typeKey,
            matchScore
          });
        }
      });

      // Trier par score de pertinence et limiter
      const sortedResults = searchResults
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, parseInt(limit));

      logger.info('Entity types search completed', { 
        searchTerm, 
        resultsCount: sortedResults.length 
      });

      return sortedResults;

    } catch (error) {
      logger.error('Error searching entity types', { 
        searchTerm, options, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des types d'entités
   * @param {number} folderId - ID du dossier (optionnel)
   * @returns {Promise<Object>} Statistiques d'utilisation
   */
  static async getUsageStatistics(folderId = null) {
    try {
      logger.debug('Getting entity types usage statistics', { folderId });

      const DatabaseUtils = require('../../../shared/utils/database');
      
      let query = `
        SELECT 
          type,
          COUNT(*) as usage_count,
          COUNT(*) * 100.0 / (SELECT COUNT(*) FROM entities${folderId ? ' WHERE folder_id = ?' : ''}) as usage_percentage
        FROM entities
      `;
      
      const params = [];
      
      if (folderId) {
        query += ' WHERE folder_id = ?';
        params.push(parseInt(folderId));
      }
      
      query += ' GROUP BY type ORDER BY usage_count DESC';

      const usageStats = await DatabaseUtils.executeQuery(
        'SELECT_ALL',
        'entities',
        query,
        params
      );

      // Enrichir avec les informations des types
      const allTypes = await this.getAllTypes();
      
      const enrichedStats = usageStats.map(stat => ({
        type: stat.type,
        usage_count: stat.usage_count,
        usage_percentage: parseFloat(stat.usage_percentage.toFixed(2)),
        type_info: allTypes[stat.type] || {
          name: stat.type,
          category: 'unknown',
          icon: 'help-circle',
          color: '#6b7280'
        }
      }));

      // Calculer les types non utilisés
      const usedTypes = new Set(usageStats.map(s => s.type));
      const unusedTypes = Object.keys(allTypes).filter(type => !usedTypes.has(type));

      const statistics = {
        total_types_available: Object.keys(allTypes).length,
        types_in_use: usageStats.length,
        unused_types: unusedTypes.length,
        most_used: enrichedStats[0] || null,
        least_used: enrichedStats[enrichedStats.length - 1] || null,
        usage_distribution: enrichedStats,
        unused_types_list: unusedTypes.map(type => ({
          type,
          type_info: allTypes[type]
        }))
      };

      logger.info('Entity types usage statistics calculated', { 
        folderId,
        typesInUse: statistics.types_in_use,
        totalAvailable: statistics.total_types_available
      });

      return statistics;

    } catch (error) {
      logger.error('Error getting entity types usage statistics', { 
        folderId, error: error.message 
      });
      throw error;
    }
  }

  // =============================================
  // MÉTHODES PRIVÉES D'AIDE
  // =============================================

  /**
   * Nettoyer et formater les attributs selon le type
   * @param {Object} typeConfig - Configuration du type
   * @param {Object} attributes - Attributs à nettoyer
   * @returns {Object} Attributs nettoyés
   * @private
   */
  static sanitizeAttributes(typeConfig, attributes) {
    const sanitized = {};
    const typeAttributes = typeConfig.attributes || {};

    Object.entries(attributes).forEach(([key, value]) => {
      const attrConfig = typeAttributes[key];
      
      if (!attrConfig) {
        // Attribut non défini dans le type, on l'ignore
        return;
      }

      if (value === null || value === undefined || value === '') {
        // Valeur vide
        if (attrConfig.required) {
          // Garder la valeur vide pour la validation
          sanitized[key] = value;
        }
        return;
      }

      // Nettoyer selon le type d'attribut
      switch (attrConfig.type) {
        case 'string':
        case 'textarea':
          sanitized[key] = String(value).trim();
          break;
        
        case 'number':
          const numValue = parseFloat(value);
          sanitized[key] = isNaN(numValue) ? null : numValue;
          break;
        
        case 'boolean':
          sanitized[key] = Boolean(value);
          break;
        
        case 'email':
          sanitized[key] = String(value).trim().toLowerCase();
          break;
        
        case 'url':
          let urlValue = String(value).trim();
          if (urlValue && !urlValue.startsWith('http')) {
            urlValue = 'https://' + urlValue;
          }
          sanitized[key] = urlValue;
          break;
        
        case 'tel':
          // Nettoyer le numéro de téléphone
          sanitized[key] = String(value).replace(/[^\d\s\-\+\(\)\.]/g, '');
          break;
        
        case 'select':
          // Vérifier que la valeur est dans les options
          if (attrConfig.options && attrConfig.options.includes(value)) {
            sanitized[key] = value;
          }
          break;
        
        default:
          sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Obtenir un résumé des types d'attributs
   * @param {Object} attributes - Attributs du type
   * @returns {Object} Résumé des types
   * @private
   */
  static getAttributeTypesSummary(attributes) {
    const summary = {};
    
    Object.values(attributes).forEach(attr => {
      summary[attr.type] = (summary[attr.type] || 0) + 1;
    });

    return summary;
  }

  /**
   * Générer un placeholder pour un champ
   * @param {Object} attrConfig - Configuration de l'attribut
   * @returns {string} Placeholder généré
   * @private
   */
  static generatePlaceholder(attrConfig) {
    const placeholders = {
      email: 'exemple@domaine.com',
      tel: '+33 1 23 45 67 89',
      url: 'https://exemple.com',
      date: 'AAAA-MM-JJ',
      'datetime-local': 'AAAA-MM-JJ HH:MM',
      number: '0'
    };

    return placeholders[attrConfig.type] || `Saisir ${attrConfig.label || 'la valeur'}`;
  }

  /**
   * Obtenir les règles de validation pour un attribut
   * @param {Object} attrConfig - Configuration de l'attribut
   * @returns {Object} Règles de validation
   * @private
   */
  static getValidationRules(attrConfig) {
    const rules = {
      required: attrConfig.required || false
    };

    switch (attrConfig.type) {
      case 'string':
      case 'textarea':
        rules.maxLength = 255;
        if (attrConfig.type === 'textarea') {
          rules.maxLength = 2000;
        }
        break;
      
      case 'number':
        rules.min = 0;
        break;
      
      case 'email':
        rules.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
        break;
      
      case 'url':
        rules.pattern = '^https?:\\/\\/.+';
        break;
      
      case 'select':
        rules.options = attrConfig.options || [];
        break;
    }

    return rules;
  }

  /**
   * Déterminer le groupe d'un champ
   * @param {string} attrName - Nom de l'attribut
   * @param {Object} attrConfig - Configuration de l'attribut
   * @returns {string} Nom du groupe
   * @private
   */
  static getFieldGroup(attrName, attrConfig) {
    // Groupes basés sur les noms des attributs
    const groups = {
      identity: ['firstName', 'lastName', 'birthDate', 'birthPlace', 'nationality', 'gender'],
      contact: ['email', 'phone', 'address', 'workAddress'],
      social: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'snapchat'],
      professional: ['occupation', 'employer', 'workAddress'],
      physical: ['height', 'weight', 'eyeColor', 'hairColor'],
      identification: ['idCard', 'passport', 'socialSecurity', 'siret', 'siren', 'vat'],
      location: ['address', 'latitude', 'longitude', 'postalCode', 'city', 'country'],
      technical: ['ipAddress', 'hosting', 'registrar', 'url', 'vin'],
      temporal: ['startDate', 'endDate', 'duration', 'creationDate', 'expirationDate'],
      investigation: ['role', 'significance', 'notes', 'evidence', 'reliability']
    };

    for (const [groupName, attributes] of Object.entries(groups)) {
      if (attributes.includes(attrName)) {
        return groupName;
      }
    }

    return 'general';
  }

  /**
   * Organiser les champs par groupes
   * @param {Array} fields - Liste des champs
   * @returns {Object} Champs organisés par groupes
   * @private
   */
  static organizeFieldsByGroups(fields) {
    const groups = {};

    fields.forEach(field => {
      const groupName = field.group;
      if (!groups[groupName]) {
        groups[groupName] = {
          name: this.getGroupDisplayName(groupName),
          fields: []
        };
      }
      groups[groupName].fields.push(field);
    });

    return groups;
  }

  /**
   * Obtenir le nom d'affichage d'un groupe
   * @param {string} groupName - Nom du groupe
   * @returns {string} Nom d'affichage
   * @private
   */
  static getGroupDisplayName(groupName) {
    const displayNames = {
      identity: 'Identité',
      contact: 'Contact',
      social: 'Réseaux sociaux',
      professional: 'Professionnel',
      physical: 'Description physique',
      identification: 'Identification',
      location: 'Localisation',
      technical: 'Technique',
      temporal: 'Temporel',
      investigation: 'Enquête',
      general: 'Général'
    };

    return displayNames[groupName] || groupName;
  }

  /**
   * Calculer le score de correspondance pour la recherche
   * @param {Object} typeConfig - Configuration du type
   * @param {string} searchTerm - Terme de recherche
   * @returns {number} Score de correspondance (0-100)
   * @private
   */
  static calculateMatchScore(typeConfig, searchTerm) {
    let score = 0;

    // Correspondance exacte dans le nom
    if (typeConfig.name.toLowerCase() === searchTerm) {
      score += 100;
    } else if (typeConfig.name.toLowerCase().includes(searchTerm)) {
      score += 50;
    }

    // Correspondance dans la description
    if (typeConfig.description && typeConfig.description.toLowerCase().includes(searchTerm)) {
      score += 20;
    }

    // Correspondance dans la catégorie
    if (typeConfig.category && typeConfig.category.toLowerCase().includes(searchTerm)) {
      score += 15;
    }

    // Correspondance dans les noms d'attributs
    Object.entries(typeConfig.attributes || {}).forEach(([attrName, attrConfig]) => {
      if (attrName.toLowerCase().includes(searchTerm)) {
        score += 10;
      }
      if (attrConfig.label && attrConfig.label.toLowerCase().includes(searchTerm)) {
        score += 5;
      }
    });

    return score;
  }
}

module.exports = EntityTypeModel;