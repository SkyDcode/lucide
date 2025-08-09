// backend/core/entities/services/EntityValidationService.js - Service de validation avancée pour les entités LUCIDE
const EntityValidator = require('../validators/EntityValidator');
const EntityTypeModel = require('../models/EntityTypeModel');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError } = require('../../../shared/middleware/errorHandler');
const { 
  getAllEntityTypes, 
  validateEntityAttributes,
  getDefaultAttributes 
} = require('../../../shared/constants/entityTypes');

/**
 * Service de validation avancée pour les entités OSINT
 * Fournit des validations complexes et des suggestions d'amélioration
 */
class EntityValidationService {

  /**
   * Effectuer une validation complète d'une entité
   * @param {Object} entityData - Données de l'entité à valider
   * @param {string} operation - Opération (create, update)
   * @param {Object} context - Contexte de validation (entité existante, etc.)
   * @returns {Promise<Object>} Résultat de validation détaillé
   */
  static async validateEntity(entityData, operation = 'create', context = {}) {
    try {
      logger.info('Starting comprehensive entity validation', { 
        operation, 
        entityType: entityData.type,
        context 
      });

      const validationResult = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        sanitizedData: null,
        attributeValidation: null,
        businessRuleValidation: null,
        securityValidation: null
      };

      // 1. Validation de base avec Joi
      try {
        validationResult.sanitizedData = EntityValidator.validateAndSanitize(
          entityData, 
          operation, 
          context.existingEntity?.type
        );
      } catch (error) {
        validationResult.valid = false;
        validationResult.errors.push({
          type: 'schema',
          message: error.message,
          details: error.details || []
        });
        
        // Si la validation de base échoue, on s'arrête ici
        return validationResult;
      }

      // 2. Validation des attributs selon le type
      if (validationResult.sanitizedData.type || context.existingEntity?.type) {
        const entityType = validationResult.sanitizedData.type || context.existingEntity.type;
        const attributes = validationResult.sanitizedData.attributes || {};
        
        validationResult.attributeValidation = await this.validateEntityAttributes(
          entityType, 
          attributes, 
          operation
        );
        
        if (!validationResult.attributeValidation.valid) {
          validationResult.valid = false;
          validationResult.errors.push({
            type: 'attributes',
            message: 'Validation des attributs échouée',
            details: validationResult.attributeValidation.errors
          });
        }

        // Ajouter les suggestions d'attributs
        validationResult.suggestions.push(...validationResult.attributeValidation.suggestions);
      }

      // 3. Validation des règles métier avancées
      validationResult.businessRuleValidation = await this.validateBusinessRules(
        validationResult.sanitizedData, 
        operation, 
        context
      );
      
      if (!validationResult.businessRuleValidation.valid) {
        validationResult.valid = false;
        validationResult.errors.push({
          type: 'business',
          message: 'Règles métier non respectées',
          details: validationResult.businessRuleValidation.errors
        });
      }
      
      validationResult.warnings.push(...validationResult.businessRuleValidation.warnings);

      // 4. Validation de sécurité
      validationResult.securityValidation = await this.validateSecurity(
        validationResult.sanitizedData, 
        context
      );
      
      if (!validationResult.securityValidation.valid) {
        validationResult.valid = false;
        validationResult.errors.push({
          type: 'security',
          message: 'Problèmes de sécurité détectés',
          details: validationResult.securityValidation.errors
        });
      }

      // 5. Générer des suggestions d'amélioration
      const improvementSuggestions = await this.generateImprovementSuggestions(
        validationResult.sanitizedData, 
        operation, 
        context
      );
      validationResult.suggestions.push(...improvementSuggestions);

      logger.info('Entity validation completed', {
        operation,
        valid: validationResult.valid,
        errorsCount: validationResult.errors.length,
        warningsCount: validationResult.warnings.length,
        suggestionsCount: validationResult.suggestions.length
      });

      return validationResult;

    } catch (error) {
      logger.error('Error during entity validation', { 
        entityData, operation, context, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Valider les attributs d'une entité avec suggestions
   * @param {string} entityType - Type d'entité
   * @param {Object} attributes - Attributs à valider
   * @param {string} operation - Opération
   * @returns {Promise<Object>} Résultat de validation des attributs
   */
  static async validateEntityAttributes(entityType, attributes, operation) {
    try {
      logger.debug('Validating entity attributes', { entityType, attributes, operation });

      const result = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        completeness: 0,
        missingRequired: [],
        missingRecommended: []
      };

      // Obtenir la configuration du type d'entité
      const typeConfig = await EntityTypeModel.getType(entityType);
      if (!typeConfig) {
        result.valid = false;
        result.errors.push(`Type d'entité inconnu: ${entityType}`);
        return result;
      }

      // Validation de base avec la fonction des constantes
      const basicValidation = validateEntityAttributes(entityType, attributes);
      if (!basicValidation.valid) {
        result.valid = false;
        result.errors.push(...basicValidation.errors);
      }

      // Analyse de complétude
      const typeAttributes = typeConfig.attributes || {};
      const providedAttributes = Object.keys(attributes || {});
      const totalAttributes = Object.keys(typeAttributes).length;
      
      if (totalAttributes > 0) {
        result.completeness = Math.round((providedAttributes.length / totalAttributes) * 100);
      }

      // Identifier les champs manquants
      Object.entries(typeAttributes).forEach(([attrName, attrConfig]) => {
        const hasValue = attributes[attrName] !== undefined && 
                         attributes[attrName] !== null && 
                         attributes[attrName] !== '';

        if (attrConfig.required && !hasValue) {
          result.missingRequired.push({
            name: attrName,
            label: attrConfig.label || attrName,
            type: attrConfig.type
          });
        } else if (!attrConfig.required && !hasValue && this.isRecommendedAttribute(attrName, entityType)) {
          result.missingRecommended.push({
            name: attrName,
            label: attrConfig.label || attrName,
            type: attrConfig.type,
            importance: this.getAttributeImportance(attrName, entityType)
          });
        }
      });

      // Générer des suggestions basées sur l'analyse
      if (result.completeness < 50) {
        result.suggestions.push({
          type: 'completeness',
          priority: 'medium',
          message: `Profil incomplet (${result.completeness}%). Ajoutez plus d'informations pour améliorer la qualité.`,
          action: 'Remplir les champs recommandés'
        });
      }

      if (result.missingRequired.length > 0) {
        result.suggestions.push({
          type: 'required_fields',
          priority: 'high',
          message: `${result.missingRequired.length} champ(s) obligatoire(s) manquant(s)`,
          action: 'Remplir les champs obligatoires',
          fields: result.missingRequired
        });
      }

      if (result.missingRecommended.length > 0) {
        const importantMissing = result.missingRecommended.filter(attr => attr.importance === 'high');
        if (importantMissing.length > 0) {
          result.suggestions.push({
            type: 'recommended_fields',
            priority: 'medium',
            message: `${importantMissing.length} champ(s) important(s) recommandé(s) manquant(s)`,
            action: 'Ajouter des informations importantes',
            fields: importantMissing
          });
        }
      }

      // Validation de cohérence entre attributs
      const coherenceValidation = this.validateAttributeCoherence(attributes, typeConfig);
      if (!coherenceValidation.valid) {
        result.warnings.push(...coherenceValidation.warnings);
        result.suggestions.push(...coherenceValidation.suggestions);
      }

      logger.debug('Entity attributes validation completed', { 
        entityType,
        valid: result.valid,
        completeness: result.completeness,
        errorsCount: result.errors.length
      });

      return result;

    } catch (error) {
      logger.error('Error validating entity attributes', { 
        entityType, attributes, operation, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Valider les règles métier avancées
   * @param {Object} entityData - Données de l'entité
   * @param {string} operation - Opération
   * @param {Object} context - Contexte
   * @returns {Promise<Object>} Résultat de validation métier
   */
  static async validateBusinessRules(entityData, operation, context) {
    try {
      logger.debug('Validating business rules', { entityData, operation, context });

      const result = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };

      // 1. Validation de l'unicité contextuelle
      if (operation === 'create' || (operation === 'update' && entityData.name)) {
        const uniquenessValidation = await this.validateUniqueness(entityData, context);
        if (!uniquenessValidation.valid) {
          result.warnings.push(...uniquenessValidation.warnings);
          result.suggestions.push(...uniquenessValidation.suggestions);
        }
      }

      // 2. Validation de la cohérence des données
      const consistencyValidation = this.validateDataConsistency(entityData);
      if (!consistencyValidation.valid) {
        result.warnings.push(...consistencyValidation.warnings);
      }

      // 3. Validation des contraintes OSINT
      const osintValidation = this.validateOSINTConstraints(entityData);
      if (!osintValidation.valid) {
        result.valid = false;
        result.errors.push(...osintValidation.errors);
      }

      // 4. Validation de la qualité des données
      const qualityValidation = this.validateDataQuality(entityData);
      result.warnings.push(...qualityValidation.warnings);
      result.suggestions.push(...qualityValidation.suggestions);

      logger.debug('Business rules validation completed', { 
        valid: result.valid,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length
      });

      return result;

    } catch (error) {
      logger.error('Error validating business rules', { 
        entityData, operation, context, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Valider la sécurité des données
   * @param {Object} entityData - Données de l'entité
   * @param {Object} context - Contexte
   * @returns {Promise<Object>} Résultat de validation sécurité
   */
  static async validateSecurity(entityData, context) {
    try {
      logger.debug('Validating security aspects', { entityData, context });

      const result = {
        valid: true,
        errors: [],
        warnings: [],
        riskLevel: 'low'
      };

      // 1. Détecter les données sensibles
      const sensitiveDataCheck = this.detectSensitiveData(entityData);
      if (sensitiveDataCheck.found) {
        result.warnings.push({
          type: 'sensitive_data',
          message: 'Données sensibles détectées',
          details: sensitiveDataCheck.types,
          recommendation: 'Vérifiez les permissions d\'accès'
        });
        result.riskLevel = 'medium';
      }

      // 2. Validation des URLs et liens externes
      if (entityData.attributes) {
        const urlValidation = await this.validateExternalLinks(entityData.attributes);
        if (!urlValidation.safe) {
          result.warnings.push({
            type: 'external_links',
            message: 'Liens externes détectés',
            details: urlValidation.urls,
            recommendation: 'Vérifiez la sécurité des liens avant accès'
          });
        }
      }

      // 3. Détecter les tentatives d'injection
      const injectionCheck = this.detectInjectionAttempts(entityData);
      if (injectionCheck.detected) {
        result.valid = false;
        result.errors.push({
          type: 'security_injection',
          message: 'Tentative d\'injection détectée',
          details: injectionCheck.fields
        });
        result.riskLevel = 'high';
      }

      // 4. Validation de la taille des données (attaque DoS)
      const sizeValidation = this.validateDataSize(entityData);
      if (!sizeValidation.valid) {
        result.valid = false;
        result.errors.push({
          type: 'size_limit',
          message: 'Données trop volumineuses',
          details: sizeValidation.violations
        });
      }

      logger.debug('Security validation completed', { 
        valid: result.valid,
        riskLevel: result.riskLevel,
        errorsCount: result.errors.length
      });

      return result;

    } catch (error) {
      logger.error('Error validating security', { 
        entityData, context, error: error.message 
      });
      throw error;
    }
  }

  /**
   * Générer des suggestions d'amélioration
   * @param {Object} entityData - Données de l'entité
   * @param {string} operation - Opération
   * @param {Object} context - Contexte
   * @returns {Promise<Array>} Suggestions d'amélioration
   */
  static async generateImprovementSuggestions(entityData, operation, context) {
    try {
      const suggestions = [];

      // 1. Suggestions basées sur le type d'entité
      if (entityData.type) {
        const typeSuggestions = await this.getTypeSuggestions(entityData.type, entityData.attributes);
        suggestions.push(...typeSuggestions);
      }

      // 2. Suggestions basées sur les données manquantes
      const dataSuggestions = this.getDataCompletionSuggestions(entityData);
      suggestions.push(...dataSuggestions);

      // 3. Suggestions basées sur le contexte
      if (context.folder) {
        const contextSuggestions = this.getContextualSuggestions(entityData, context.folder);
        suggestions.push(...contextSuggestions);
      }

      // 4. Suggestions d'optimisation
      const optimizationSuggestions = this.getOptimizationSuggestions(entityData);
      suggestions.push(...optimizationSuggestions);

      return suggestions;

    } catch (error) {
      logger.error('Error generating improvement suggestions', { 
        entityData, operation, context, error: error.message 
      });
      return [];
    }
  }

  // =============================================
  // MÉTHODES PRIVÉES D'AIDE
  // =============================================

  /**
   * Vérifier si un attribut est recommandé
   * @param {string} attrName - Nom de l'attribut
   * @param {string} entityType - Type d'entité
   * @returns {boolean} True si recommandé
   * @private
   */
  static isRecommendedAttribute(attrName, entityType) {
    const recommendedAttributes = {
      person: ['email', 'phone', 'address', 'occupation'],
      place: ['address', 'city', 'country'],
      organization: ['address', 'phone', 'website'],
      website: ['description', 'owner'],
      vehicle: ['licensePlate', 'make', 'model'],
      account: ['platform', 'username'],
      event: ['location', 'startDate'],
      document: ['type', 'source']
    };

    return recommendedAttributes[entityType]?.includes(attrName) || false;
  }

  /**
   * Obtenir l'importance d'un attribut
   * @param {string} attrName - Nom de l'attribut
   * @param {string} entityType - Type d'entité
   * @returns {string} Niveau d'importance (low, medium, high)
   * @private
   */
  static getAttributeImportance(attrName, entityType) {
    const highImportance = {
      person: ['email', 'phone'],
      place: ['address'],
      organization: ['address', 'phone'],
      website: ['url'],
      vehicle: ['licensePlate'],
      account: ['platform', 'username'],
      event: ['startDate'],
      document: ['type']
    };

    if (highImportance[entityType]?.includes(attrName)) {
      return 'high';
    }

    if (this.isRecommendedAttribute(attrName, entityType)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Valider la cohérence entre attributs
   * @param {Object} attributes - Attributs
   * @param {Object} typeConfig - Configuration du type
   * @returns {Object} Résultat de validation
   * @private
   */
  static validateAttributeCoherence(attributes, typeConfig) {
    const result = {
      valid: true,
      warnings: [],
      suggestions: []
    };

    // Validation des emails
    if (attributes.email && attributes.website) {
      const emailDomain = attributes.email.split('@')[1];
      const websiteDomain = attributes.website.replace(/^https?:\/\//, '').split('/')[0];
      
      if (emailDomain && websiteDomain && !websiteDomain.includes(emailDomain)) {
        result.suggestions.push({
          type: 'coherence',
          priority: 'low',
          message: 'Le domaine de l\'email ne correspond pas au site web',
          action: 'Vérifier la cohérence des domaines'
        });
      }
    }

    // Validation des coordonnées géographiques
    if (attributes.latitude !== undefined && attributes.longitude !== undefined) {
      const lat = parseFloat(attributes.latitude);
      const lng = parseFloat(attributes.longitude);
      
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        result.warnings.push({
          type: 'coordinates',
          message: 'Coordonnées géographiques invalides',
          recommendation: 'Vérifiez les coordonnées GPS'
        });
      }
    }

    // Validation des dates
    if (attributes.birthDate && attributes.startDate) {
      const birthDate = new Date(attributes.birthDate);
      const startDate = new Date(attributes.startDate);
      
      if (startDate < birthDate) {
        result.warnings.push({
          type: 'dates',
          message: 'Date de début antérieure à la date de naissance',
          recommendation: 'Vérifiez la cohérence des dates'
        });
      }
    }

    return result;
  }

  /**
   * Valider l'unicité contextuelle
   * @param {Object} entityData - Données de l'entité
   * @param {Object} context - Contexte
   * @returns {Promise<Object>} Résultat de validation
   * @private
   */
  static async validateUniqueness(entityData, context) {
    const result = {
      valid: true,
      warnings: [],
      suggestions: []
    };

    // Simulation de vérification d'unicité
    // Dans une vraie implémentation, on interrogerait la base de données
    if (entityData.name && entityData.name.toLowerCase().includes('duplicate')) {
      result.warnings.push({
        type: 'potential_duplicate',
        message: 'Entité potentiellement en doublon détectée',
        recommendation: 'Vérifiez s\'il n\'existe pas déjà une entité similaire'
      });
      
      result.suggestions.push({
        type: 'duplicate_check',
        priority: 'medium',
        message: 'Rechercher des entités similaires avant création',
        action: 'Effectuer une recherche dans le dossier'
      });
    }

    return result;
  }

  /**
   * Valider la cohérence des données
   * @param {Object} entityData - Données de l'entité
   * @returns {Object} Résultat de validation
   * @private
   */
  static validateDataConsistency(entityData) {
    const result = {
      valid: true,
      warnings: []
    };

    // Validation de la position
    if (entityData.x !== undefined && entityData.y !== undefined) {
      if (entityData.x === 0 && entityData.y === 0) {
        result.warnings.push({
          type: 'position',
          message: 'Position par défaut (0,0) détectée',
          recommendation: 'Définissez une position spécifique sur le graphe'
        });
      }
    }

    return result;
  }

  /**
   * Valider les contraintes OSINT
   * @param {Object} entityData - Données de l'entité
   * @returns {Object} Résultat de validation
   * @private
   */
  static validateOSINTConstraints(entityData) {
    const result = {
      valid: true,
      errors: []
    };

    // Validation spécifique aux contraintes OSINT
    if (entityData.type === 'person' && entityData.attributes) {
      // Une personne doit avoir au moins un moyen de contact ou d'identification
      const hasIdentification = entityData.attributes.email || 
                               entityData.attributes.phone || 
                               entityData.attributes.socialSecurity ||
                               entityData.attributes.passport ||
                               entityData.attributes.idCard;

      if (!hasIdentification) {
        result.valid = false;
        result.errors.push({
          type: 'osint_constraint',
          message: 'Une personne doit avoir au moins un moyen d\'identification',
          field: 'attributes'
        });
      }
    }

    return result;
  }

  /**
   * Valider la qualité des données
   * @param {Object} entityData - Données de l'entité
   * @returns {Object} Résultat de validation
   * @private
   */
  static validateDataQuality(entityData) {
    const result = {
      warnings: [],
      suggestions: []
    };

    // Validation de la longueur du nom
    if (entityData.name && entityData.name.length < 3) {
      result.warnings.push({
        type: 'name_quality',
        message: 'Nom très court détecté',
        recommendation: 'Utilisez un nom plus descriptif si possible'
      });
    }

    // Validation de l'utilisation de majuscules
    if (entityData.name && entityData.name === entityData.name.toUpperCase()) {
      result.suggestions.push({
        type: 'formatting',
        priority: 'low',
        message: 'Nom en majuscules détecté',
        action: 'Utiliser une casse appropriée pour améliorer la lisibilité'
      });
    }

    return result;
  }

  /**
   * Détecter les données sensibles
   * @param {Object} entityData - Données de l'entité
   * @returns {Object} Résultat de détection
   * @private
   */
  static detectSensitiveData(entityData) {
    const result = {
      found: false,
      types: []
    };

    const sensitivePatterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/, // Numéro sécurité sociale
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Carte de crédit
      phone: /\b\+?[\d\s\-\(\)]{10,}\b/, // Téléphone
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
    };

    const dataString = JSON.stringify(entityData);

    Object.entries(sensitivePatterns).forEach(([type, pattern]) => {
      if (pattern.test(dataString)) {
        result.found = true;
        result.types.push(type);
      }
    });

    return result;
  }

  /**
   * Valider les liens externes
   * @param {Object} attributes - Attributs contenant potentiellement des URLs
   * @returns {Promise<Object>} Résultat de validation
   * @private
   */
  static async validateExternalLinks(attributes) {
    const result = {
      safe: true,
      urls: []
    };

    const urlPattern = /https?:\/\/[^\s]+/g;
    const dataString = JSON.stringify(attributes);
    const urls = dataString.match(urlPattern) || [];

    urls.forEach(url => {
      result.urls.push({
        url,
        risk: this.assessUrlRisk(url)
      });
    });

    result.safe = result.urls.every(urlInfo => urlInfo.risk === 'low');

    return result;
  }

  /**
   * Évaluer le risque d'une URL
   * @param {string} url - URL à évaluer
   * @returns {string} Niveau de risque (low, medium, high)
   * @private
   */
  static assessUrlRisk(url) {
    // Domaines suspects
    const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'goo.gl'];
    const domain = url.replace(/^https?:\/\//, '').split('/')[0];

    if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
      return 'medium';
    }

    // URLs avec paramètres suspects
    if (url.includes('script') || url.includes('eval') || url.includes('javascript:')) {
      return 'high';
    }

    return 'low';
  }

  /**
   * Détecter les tentatives d'injection
   * @param {Object} entityData - Données de l'entité
   * @returns {Object} Résultat de détection
   * @private
   */
  static detectInjectionAttempts(entityData) {
    const result = {
      detected: false,
      fields: []
    };

    const injectionPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /\b(union|select|insert|delete|drop|create|alter)\b/gi,
      /['"]\s*;\s*(drop|delete|insert|update)\b/gi
    ];

    const checkValue = (value, fieldPath) => {
      if (typeof value === 'string') {
        injectionPatterns.forEach(pattern => {
          if (pattern.test(value)) {
            result.detected = true;
            result.fields.push({
              field: fieldPath,
              pattern: pattern.toString(),
              value: value.substring(0, 100) // Première partie seulement
            });
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, subValue]) => {
          checkValue(subValue, `${fieldPath}.${key}`);
        });
      }
    };

    Object.entries(entityData).forEach(([key, value]) => {
      checkValue(value, key);
    });

    return result;
  }

  /**
   * Valider la taille des données
   * @param {Object} entityData - Données de l'entité
   * @returns {Object} Résultat de validation
   * @private
   */
  static validateDataSize(entityData) {
    const result = {
      valid: true,
      violations: []
    };

    const maxSizes = {
      name: 255,
      attributes: 50000, // 50KB
      total: 100000 // 100KB
    };

    // Vérifier la taille du nom
    if (entityData.name && entityData.name.length > maxSizes.name) {
      result.valid = false;
      result.violations.push({
        field: 'name',
        size: entityData.name.length,
        maxSize: maxSizes.name
      });
    }

    // Vérifier la taille des attributs
    if (entityData.attributes) {
      const attributesSize = JSON.stringify(entityData.attributes).length;
      if (attributesSize > maxSizes.attributes) {
        result.valid = false;
        result.violations.push({
          field: 'attributes',
          size: attributesSize,
          maxSize: maxSizes.attributes
        });
      }
    }

    // Vérifier la taille totale
    const totalSize = JSON.stringify(entityData).length;
    if (totalSize > maxSizes.total) {
      result.valid = false;
      result.violations.push({
        field: 'total',
        size: totalSize,
        maxSize: maxSizes.total
      });
    }

    return result;
  }

  /**
   * Obtenir des suggestions basées sur le type
   * @param {string} entityType - Type d'entité
   * @param {Object} attributes - Attributs actuels
   * @returns {Promise<Array>} Suggestions
   * @private
   */
  static async getTypeSuggestions(entityType, attributes = {}) {
    const suggestions = [];

    // Suggestions spécifiques par type
    switch (entityType) {
      case 'person':
        if (!attributes.email && !attributes.phone) {
          suggestions.push({
            type: 'contact_info',
            priority: 'high',
            message: 'Aucune information de contact disponible',
            action: 'Ajouter au moins un email ou téléphone'
          });
        }
        break;

      case 'website':
        if (!attributes.description) {
          suggestions.push({
            type: 'description',
            priority: 'medium',
            message: 'Description du site manquante',
            action: 'Ajouter une description pour clarifier le contenu'
          });
        }
        break;

      case 'place':
        if (!attributes.address) {
          suggestions.push({
            type: 'location',
            priority: 'high',
            message: 'Adresse manquante pour ce lieu',
            action: 'Préciser l\'adresse complète'
          });
        }
        break;
    }

    return suggestions;
  }

  /**
   * Obtenir des suggestions de complétion de données
   * @param {Object} entityData - Données de l'entité
   * @returns {Array} Suggestions
   * @private
   */
  static getDataCompletionSuggestions(entityData) {
    const suggestions = [];

    // Suggestion de position si non définie
    if ((entityData.x === 0 && entityData.y === 0) || 
        (entityData.x === undefined && entityData.y === undefined)) {
      suggestions.push({
        type: 'positioning',
        priority: 'low',
        message: 'Position sur le graphe non définie',
        action: 'Positionner l\'entité sur le graphe pour une meilleure visualisation'
      });
    }

    return suggestions;
  }

  /**
   * Obtenir des suggestions contextuelles
   * @param {Object} entityData - Données de l'entité
   * @param {Object} folder - Dossier contenant l'entité
   * @returns {Array} Suggestions
   * @private
   */
  static getContextualSuggestions(entityData, folder) {
    const suggestions = [];

    // Suggestions basées sur le contexte du dossier
    if (folder && folder.name) {
      suggestions.push({
        type: 'context',
        priority: 'low',
        message: `Entité dans le dossier "${folder.name}"`,
        action: 'Considérer des liens avec d\'autres entités du dossier'
      });
    }

    return suggestions;
  }

  /**
   * Obtenir des suggestions d'optimisation
   * @param {Object} entityData - Données de l'entité
   * @returns {Array} Suggestions
   * @private
   */
  static getOptimizationSuggestions(entityData) {
    const suggestions = [];

    // Suggestions d'optimisation
    if (entityData.attributes && Object.keys(entityData.attributes).length > 20) {
      suggestions.push({
        type: 'optimization',
        priority: 'low',
        message: 'Nombreux attributs définis',
        action: 'Considérer regrouper les informations similaires'
      });
    }

    return suggestions;
  }
}

module.exports = EntityValidationService;