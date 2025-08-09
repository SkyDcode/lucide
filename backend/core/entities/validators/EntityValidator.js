// backend/core/entities/validators/EntityValidator.js - Validation des entités LUCIDE
const Joi = require('joi');
const { ValidationError } = require('../../../shared/middleware/errorHandler');
const { logger } = require('../../../shared/middleware/logging');
const { getAllEntityTypes, validateEntityAttributes } = require('../../../shared/constants/entityTypes');

/**
 * Schémas de validation Joi pour les entités OSINT
 */
const EntitySchemas = {
  
  /**
   * Schéma pour la création d'une entité
   */
  create: Joi.object({
    folder_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'L\'ID du dossier doit être un nombre',
        'number.integer': 'L\'ID du dossier doit être un nombre entier',
        'number.positive': 'L\'ID du dossier doit être un nombre positif',
        'any.required': 'L\'ID du dossier est obligatoire'
      }),

    type: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .custom((value, helpers) => {
        const validTypes = Object.keys(getAllEntityTypes());
        if (!validTypes.includes(value)) {
          return helpers.error('any.invalid', { 
            message: `Type d'entité invalide. Types autorisés: ${validTypes.join(', ')}` 
          });
        }
        return value;
      })
      .messages({
        'string.empty': 'Le type d\'entité est obligatoire',
        'string.min': 'Le type d\'entité doit contenir au moins 1 caractère',
        'string.max': 'Le type d\'entité ne peut pas dépasser 50 caractères',
        'any.required': 'Le type d\'entité est obligatoire'
      }),

    name: Joi.string()
      .trim()
      .min(1)
      .max(255)
      .required()
      .pattern(/^[^<>:"/\\|?*\x00-\x1f]*$/) // Caractères interdits
      .messages({
        'string.empty': 'Le nom de l\'entité est obligatoire',
        'string.min': 'Le nom de l\'entité doit contenir au moins 1 caractère',
        'string.max': 'Le nom de l\'entité ne peut pas dépasser 255 caractères',
        'string.pattern.base': 'Le nom de l\'entité contient des caractères non autorisés',
        'any.required': 'Le nom de l\'entité est obligatoire'
      }),

    x: Joi.number()
      .min(-10000)
      .max(10000)
      .default(0)
      .optional()
      .messages({
        'number.base': 'La position X doit être un nombre',
        'number.min': 'La position X doit être supérieure à -10000',
        'number.max': 'La position X doit être inférieure à 10000'
      }),

    y: Joi.number()
      .min(-10000)
      .max(10000)
      .default(0)
      .optional()
      .messages({
        'number.base': 'La position Y doit être un nombre',
        'number.min': 'La position Y doit être supérieure à -10000',
        'number.max': 'La position Y doit être inférieure à 10000'
      }),

    attributes: Joi.object()
      .default({})
      .optional()
      .messages({
        'object.base': 'Les attributs doivent être un objet'
      })
  }),

  /**
   * Schéma pour la mise à jour d'une entité
   */
  update: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(255)
      .pattern(/^[^<>:"/\\|?*\x00-\x1f]*$/)
      .optional()
      .messages({
        'string.empty': 'Le nom de l\'entité ne peut pas être vide',
        'string.min': 'Le nom de l\'entité doit contenir au moins 1 caractère',
        'string.max': 'Le nom de l\'entité ne peut pas dépasser 255 caractères',
        'string.pattern.base': 'Le nom de l\'entité contient des caractères non autorisés'
      }),

    x: Joi.number()
      .min(-10000)
      .max(10000)
      .optional()
      .messages({
        'number.base': 'La position X doit être un nombre',
        'number.min': 'La position X doit être supérieure à -10000',
        'number.max': 'La position X doit être inférieure à 10000'
      }),

    y: Joi.number()
      .min(-10000)
      .max(10000)
      .optional()
      .messages({
        'number.base': 'La position Y doit être un nombre',
        'number.min': 'La position Y doit être supérieure à -10000',
        'number.max': 'La position Y doit être inférieure à 10000'
      }),

    attributes: Joi.object()
      .optional()
      .messages({
        'object.base': 'Les attributs doivent être un objet'
      })
  }).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
  }),

  /**
   * Schéma pour la mise à jour de position uniquement
   */
  position: Joi.object({
    x: Joi.number()
      .min(-10000)
      .max(10000)
      .required()
      .messages({
        'number.base': 'La position X doit être un nombre',
        'number.min': 'La position X doit être supérieure à -10000',
        'number.max': 'La position X doit être inférieure à 10000',
        'any.required': 'La position X est obligatoire'
      }),

    y: Joi.number()
      .min(-10000)
      .max(10000)
      .required()
      .messages({
        'number.base': 'La position Y doit être un nombre',
        'number.min': 'La position Y doit être supérieure à -10000',
        'number.max': 'La position Y doit être inférieure à 10000',
        'any.required': 'La position Y est obligatoire'
      })
  }),

  /**
   * Schéma pour les paramètres d'ID
   */
  id: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'L\'ID doit être un nombre',
        'number.integer': 'L\'ID doit être un nombre entier',
        'number.positive': 'L\'ID doit être un nombre positif',
        'any.required': 'L\'ID est obligatoire'
      })
  }),

  /**
   * Schéma pour les options de requête (tri, pagination, recherche)
   */
  queryOptions: Joi.object({
    orderBy: Joi.string()
      .valid('name', 'type', 'created_at', 'updated_at', 'connection_count')
      .default('created_at')
      .messages({
        'any.only': 'Le champ de tri doit être l\'un des suivants: name, type, created_at, updated_at, connection_count'
      }),

    direction: Joi.string()
      .valid('ASC', 'DESC', 'asc', 'desc')
      .default('DESC')
      .messages({
        'any.only': 'La direction de tri doit être ASC ou DESC'
      }),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .optional()
      .messages({
        'number.base': 'La limite doit être un nombre',
        'number.integer': 'La limite doit être un nombre entier',
        'number.min': 'La limite doit être au moins 1',
        'number.max': 'La limite ne peut pas dépasser 1000'
      }),

    search: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.empty': 'Le terme de recherche ne peut pas être vide',
        'string.min': 'Le terme de recherche doit contenir au moins 1 caractère',
        'string.max': 'Le terme de recherche ne peut pas dépasser 100 caractères'
      }),

    type: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .optional()
      .custom((value, helpers) => {
        const validTypes = Object.keys(getAllEntityTypes());
        if (!validTypes.includes(value)) {
          return helpers.error('any.invalid', { 
            message: `Type d'entité invalide pour le filtrage` 
          });
        }
        return value;
      })
      .messages({
        'string.empty': 'Le type de filtrage ne peut pas être vide',
        'string.min': 'Le type de filtrage doit contenir au moins 1 caractère',
        'string.max': 'Le type de filtrage ne peut pas dépasser 50 caractères'
      }),

    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional()
      .messages({
        'number.base': 'Le numéro de page doit être un nombre',
        'number.integer': 'Le numéro de page doit être un nombre entier',
        'number.min': 'Le numéro de page doit être au moins 1'
      })
  }),

  /**
   * Schéma pour les options de recherche
   */
  searchOptions: Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .optional()
      .messages({
        'number.base': 'La limite de recherche doit être un nombre',
        'number.integer': 'La limite de recherche doit être un nombre entier',
        'number.min': 'La limite de recherche doit être au moins 1',
        'number.max': 'La limite de recherche ne peut pas dépasser 100'
      }),

    type: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .optional()
      .custom((value, helpers) => {
        const validTypes = Object.keys(getAllEntityTypes());
        if (!validTypes.includes(value)) {
          return helpers.error('any.invalid', { 
            message: `Type d'entité invalide pour la recherche` 
          });
        }
        return value;
      }),

    exactMatch: Joi.boolean()
      .default(false)
      .optional()
      .messages({
        'boolean.base': 'L\'option de correspondance exacte doit être un booléen'
      })
  })
};

/**
 * Classe de validation pour les entités
 */
class EntityValidator {

  /**
   * Valider les données de création d'une entité
   * @param {Object} data - Données à valider
   * @returns {Object} Données validées et nettoyées
   * @throws {ValidationError} Si les données sont invalides
   */
  static validateCreate(data) {
    try {
      const { error, value } = EntitySchemas.create.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Entity creation validation failed', {
          data,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Données de création invalides', error.details);
      }

      // Validations métier supplémentaires
      this.validateBusinessRules(value, 'create');

      // Validation des attributs selon le type d'entité
      if (value.attributes && Object.keys(value.attributes).length > 0) {
        this.validateEntityAttributes(value.type, value.attributes);
      }

      logger.debug('Entity creation data validated', { validatedData: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during entity creation validation', {
        data,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des données');
    }
  }

  /**
   * Valider les données de mise à jour d'une entité
   * @param {Object} data - Données à valider
   * @param {string} entityType - Type de l'entité (pour validation des attributs)
   * @returns {Object} Données validées et nettoyées
   * @throws {ValidationError} Si les données sont invalides
   */
  static validateUpdate(data, entityType = null) {
    try {
      const { error, value } = EntitySchemas.update.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Entity update validation failed', {
          data,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Données de mise à jour invalides', error.details);
      }

      // Validations métier supplémentaires
      this.validateBusinessRules(value, 'update');

      // Validation des attributs selon le type d'entité si fournis
      if (value.attributes && entityType) {
        this.validateEntityAttributes(entityType, value.attributes);
      }

      logger.debug('Entity update data validated', { validatedData: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during entity update validation', {
        data,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des données');
    }
  }

  /**
   * Valider les données de position
   * @param {Object} data - Données de position à valider
   * @returns {Object} Données validées et nettoyées
   * @throws {ValidationError} Si les données sont invalides
   */
  static validatePosition(data) {
    try {
      const { error, value } = EntitySchemas.position.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Entity position validation failed', {
          data,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Données de position invalides', error.details);
      }

      logger.debug('Entity position data validated', { validatedData: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during entity position validation', {
        data,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation de la position');
    }
  }

  /**
   * Valider un ID d'entité
   * @param {any} id - ID à valider
   * @returns {number} ID validé et converti
   * @throws {ValidationError} Si l'ID est invalide
   */
  static validateId(id) {
    try {
      const { error, value } = EntitySchemas.id.validate({ id }, {
        abortEarly: false,
        convert: true
      });

      if (error) {
        logger.warn('Entity ID validation failed', {
          id,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('ID d\'entité invalide', error.details);
      }

      return value.id;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during entity ID validation', {
        id,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation de l\'ID');
    }
  }

  /**
   * Valider les options de requête pour les entités
   * @param {Object} options - Options à valider
   * @returns {Object} Options validées et nettoyées
   * @throws {ValidationError} Si les options sont invalides
   */
  static validateQueryOptions(options = {}) {
    try {
      const { error, value } = EntitySchemas.queryOptions.validate(options, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false
      });

      if (error) {
        logger.warn('Entity query options validation failed', {
          options,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Options de requête invalides', error.details);
      }

      // Normaliser la direction
      if (value.direction) {
        value.direction = value.direction.toUpperCase();
      }

      logger.debug('Entity query options validated', { validatedOptions: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during entity query options validation', {
        options,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des options');
    }
  }

  /**
   * Valider les options de recherche
   * @param {Object} options - Options à valider
   * @returns {Object} Options validées
   * @throws {ValidationError} Si les options sont invalides
   */
  static validateSearchOptions(options = {}) {
    try {
      const { error, value } = EntitySchemas.searchOptions.validate(options, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Entity search options validation failed', {
          options,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Options de recherche invalides', error.details);
      }

      logger.debug('Entity search options validated', { validatedOptions: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during entity search options validation', {
        options,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des options de recherche');
    }
  }

  /**
   * Valider les attributs d'une entité selon son type
   * @param {string} entityType - Type d'entité
   * @param {Object} attributes - Attributs à valider
   * @throws {ValidationError} Si les attributs sont invalides
   */
  static validateEntityAttributes(entityType, attributes) {
    try {
      const validation = validateEntityAttributes(entityType, attributes);
      
      if (!validation.valid) {
        logger.warn('Entity attributes validation failed', {
          entityType,
          attributes,
          errors: validation.errors
        });
        throw new ValidationError(
          `Attributs invalides pour le type "${entityType}": ${validation.errors.join(', ')}`,
          validation.errors.map(error => ({ message: error }))
        );
      }

      logger.debug('Entity attributes validated successfully', { 
        entityType, 
        attributesCount: Object.keys(attributes).length 
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during entity attributes validation', {
        entityType,
        attributes,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des attributs');
    }
  }

  /**
   * Valider les règles métier spécifiques aux entités
   * @param {Object} data - Données à valider
   * @param {string} operation - Type d'opération (create, update)
   * @throws {ValidationError} Si les règles métier ne sont pas respectées
   */
  static validateBusinessRules(data, operation) {
    const errors = [];

    // Validation du nom : mots interdits
    if (data.name) {
      const forbiddenWords = ['test', 'demo', 'example', 'sample', 'temp', 'temporary', 'unknown'];
      const nameLower = data.name.toLowerCase();
      
      const hasForbiddenWord = forbiddenWords.some(word => 
        nameLower === word || (nameLower.includes(word) && nameLower.length < 15)
      );

      if (hasForbiddenWord) {
        errors.push({
          field: 'name',
          message: 'Le nom de l\'entité ne peut pas être un mot générique comme "test", "demo", etc.'
        });
      }

      // Validation des caractères répétés
      if (/(.)\1{5,}/.test(data.name)) {
        errors.push({
          field: 'name',
          message: 'Le nom de l\'entité ne peut pas contenir plus de 5 caractères identiques consécutifs'
        });
      }

      // Validation de la longueur des mots
      const words = data.name.trim().split(/\s+/);
      if (words.some(word => word.length > 100)) {
        errors.push({
          field: 'name',
          message: 'Chaque mot du nom ne peut pas dépasser 100 caractères'
        });
      }

      // Validation des espaces multiples
      if (/\s{2,}/.test(data.name)) {
        errors.push({
          field: 'name',
          message: 'Le nom ne peut pas contenir plusieurs espaces consécutifs'
        });
      }
    }

    // Validation des positions
    if (data.x !== undefined && data.y !== undefined) {
      // Vérifier que les positions sont dans une plage raisonnable
      if (Math.abs(data.x) > 5000 || Math.abs(data.y) > 5000) {
        errors.push({
          field: 'position',
          message: 'Les positions doivent être dans une plage raisonnable (-5000 à 5000)'
        });
      }
    }

    // Validation des attributs
    if (data.attributes && typeof data.attributes === 'object') {
      // Vérifier la taille des attributs JSON
      const attributesString = JSON.stringify(data.attributes);
      if (attributesString.length > 50000) { // 50KB limite
        errors.push({
          field: 'attributes',
          message: 'Les attributs sont trop volumineux (maximum 50KB)'
        });
      }

      // Vérifier qu'il n'y a pas trop d'attributs
      const attributeCount = Object.keys(data.attributes).length;
      if (attributeCount > 100) {
        errors.push({
          field: 'attributes',
          message: 'Trop d\'attributs définis (maximum 100)'
        });
      }

      // Validation des clés d'attributs
      Object.keys(data.attributes).forEach(key => {
        if (key.length > 100) {
          errors.push({
            field: 'attributes',
            message: `Nom d'attribut trop long: "${key}" (maximum 100 caractères)`
          });
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          errors.push({
            field: 'attributes',
            message: `Nom d'attribut invalide: "${key}" (doit commencer par une lettre et contenir uniquement lettres, chiffres et underscores)`
          });
        }
      });

      // Validation des valeurs d'attributs
      Object.entries(data.attributes).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 10000) {
          errors.push({
            field: 'attributes',
            message: `Valeur d'attribut trop longue pour "${key}" (maximum 10000 caractères)`
          });
        }
      });
    }

    // Validation spécifique à la création
    if (operation === 'create') {
      // Vérifier que tous les champs obligatoires sont présents
      if (!data.folder_id) {
        errors.push({
          field: 'folder_id',
          message: 'L\'ID du dossier est obligatoire lors de la création'
        });
      }

      if (!data.type) {
        errors.push({
          field: 'type',
          message: 'Le type d\'entité est obligatoire lors de la création'
        });
      }

      if (!data.name) {
        errors.push({
          field: 'name',
          message: 'Le nom est obligatoire lors de la création'
        });
      }
    }

    // Validation spécifique à la mise à jour
    if (operation === 'update') {
      // Vérifier qu'au moins un champ est fourni
      const fields = Object.keys(data).filter(key => data[key] !== undefined);
      if (fields.length === 0) {
        errors.push({
          field: 'general',
          message: 'Au moins un champ doit être fourni pour la mise à jour'
        });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Entity business rules validation failed for ${operation}`, {
        data,
        errors
      });
      throw new ValidationError(`Règles métier non respectées pour l'opération ${operation}`, errors);
    }
  }

  /**
   * Sanitizer pour nettoyer et sécuriser les données
   * @param {Object} data - Données à nettoyer
   * @returns {Object} Données nettoyées
   */
  static sanitize(data) {
    const sanitized = { ...data };

    // Nettoyer le nom
    if (sanitized.name) {
      // Supprimer les caractères de contrôle
      sanitized.name = sanitized.name.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
      
      // Normaliser les espaces
      sanitized.name = sanitized.name.replace(/\s+/g, ' ').trim();
      
      // Supprimer les caractères potentiellement dangereux
      sanitized.name = sanitized.name.replace(/[<>:"\/\\|?*]/g, '');
    }

    // Nettoyer le type
    if (sanitized.type) {
      sanitized.type = sanitized.type.trim().toLowerCase();
    }

    // Nettoyer les positions
    if (sanitized.x !== undefined) {
      sanitized.x = parseFloat(sanitized.x) || 0;
      sanitized.x = Math.max(-10000, Math.min(10000, sanitized.x));
    }

    if (sanitized.y !== undefined) {
      sanitized.y = parseFloat(sanitized.y) || 0;
      sanitized.y = Math.max(-10000, Math.min(10000, sanitized.y));
    }

    // Nettoyer les attributs
    if (sanitized.attributes && typeof sanitized.attributes === 'object') {
      sanitized.attributes = this.sanitizeAttributes(sanitized.attributes);
    }

    return sanitized;
  }

  /**
   * Nettoyer les attributs d'une entité
   * @param {Object} attributes - Attributs à nettoyer
   * @returns {Object} Attributs nettoyés
   */
  static sanitizeAttributes(attributes) {
    const sanitized = {};

    Object.entries(attributes).forEach(([key, value]) => {
      // Nettoyer la clé
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 100);
      
      if (!cleanKey || cleanKey.length === 0) {
        return; // Ignorer les clés invalides
      }

      // Nettoyer la valeur selon son type
      if (value === null || value === undefined) {
        sanitized[cleanKey] = null;
      } else if (typeof value === 'string') {
        // Nettoyer les chaînes
        let cleanValue = value
          .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '') // Supprimer caractères de contrôle
          .substring(0, 10000) // Limiter la longueur
          .trim();
        
        sanitized[cleanKey] = cleanValue;
      } else if (typeof value === 'number') {
        // Valider les nombres
        if (isFinite(value)) {
          sanitized[cleanKey] = value;
        }
      } else if (typeof value === 'boolean') {
        sanitized[cleanKey] = Boolean(value);
      } else if (Array.isArray(value)) {
        // Nettoyer les tableaux
        sanitized[cleanKey] = value
          .slice(0, 100) // Limiter le nombre d'éléments
          .map(item => {
            if (typeof item === 'string') {
              return item.substring(0, 1000).trim();
            }
            return item;
          });
      } else if (typeof value === 'object') {
        // Limiter la profondeur des objets
        try {
          const jsonString = JSON.stringify(value);
          if (jsonString.length <= 5000) {
            sanitized[cleanKey] = value;
          }
        } catch (error) {
          // Ignorer les objets non sérialisables
        }
      }
    });

    return sanitized;
  }

  /**
   * Valider et nettoyer des données complètes
   * @param {Object} data - Données à valider
   * @param {string} operation - Type d'opération
   * @param {string} entityType - Type d'entité (pour update)
   * @returns {Object} Données validées et nettoyées
   */
  static validateAndSanitize(data, operation, entityType = null) {
    // D'abord nettoyer les données
    const sanitizedData = this.sanitize(data);

    // Puis valider selon l'opération
    switch (operation) {
      case 'create':
        return this.validateCreate(sanitizedData);
      
      case 'update':
        return this.validateUpdate(sanitizedData, entityType);
      
      case 'position':
        return this.validatePosition(sanitizedData);
      
      default:
        throw new ValidationError(`Opération de validation inconnue: ${operation}`);
    }
  }

  /**
   * Valider les paramètres de pagination
   * @param {Object} params - Paramètres de pagination
   * @returns {Object} Paramètres validés
   */
  static validatePagination(params = {}) {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(1000).default(50)
    });

    const { error, value } = schema.validate(params, {
      convert: true,
      stripUnknown: true
    });

    if (error) {
      throw new ValidationError('Paramètres de pagination invalides', error.details);
    }

    return value;
  }

  /**
   * Valider un terme de recherche
   * @param {string} searchTerm - Terme de recherche
   * @returns {string} Terme validé et nettoyé
   */
  static validateSearchTerm(searchTerm) {
    if (!searchTerm) {
      return '';
    }

    const schema = Joi.string().trim().min(1).max(100);
    const { error, value } = schema.validate(searchTerm);

    if (error) {
      throw new ValidationError('Terme de recherche invalide', error.details);
    }

    // Nettoyer le terme de recherche
    const cleaned = value
      .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '') // Supprimer caractères dangereux
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim();

    if (cleaned.length === 0) {
      throw new ValidationError('Le terme de recherche ne peut pas être vide après nettoyage');
    }

    return cleaned;
  }

  /**
   * Obtenir les règles de validation pour le frontend
   * @returns {Object} Règles de validation
   */
  static getValidationRules() {
    return {
      folder_id: {
        required: true,
        type: 'number',
        min: 1
      },
      type: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50,
        allowedValues: Object.keys(getAllEntityTypes())
      },
      name: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[^<>:"/\\\\|?*\\x00-\\x1f]*$',
        forbiddenWords: ['test', 'demo', 'example', 'sample', 'temp', 'temporary', 'unknown']
      },
      x: {
        required: false,
        type: 'number',
        min: -10000,
        max: 10000,
        default: 0
      },
      y: {
        required: false,
        type: 'number',
        min: -10000,
        max: 10000,
        default: 0
      },
      attributes: {
        required: false,
        type: 'object',
        maxSize: 50000, // bytes
        maxKeys: 100,
        maxKeyLength: 100,
        maxValueLength: 10000
      },
      search: {
        maxLength: 100,
        minLength: 1
      },
      pagination: {
        page: { min: 1 },
        limit: { min: 1, max: 1000 }
      }
    };
  }

  /**
   * Valider un type d'entité
   * @param {string} entityType - Type à valider
   * @returns {string} Type validé
   * @throws {ValidationError} Si le type est invalide
   */
  static validateEntityType(entityType) {
    if (!entityType || typeof entityType !== 'string') {
      throw new ValidationError('Type d\'entité manquant ou invalide');
    }

    const validTypes = Object.keys(getAllEntityTypes());
    const cleanType = entityType.trim().toLowerCase();

    if (!validTypes.includes(cleanType)) {
      throw new ValidationError(
        `Type d'entité invalide: "${entityType}". Types autorisés: ${validTypes.join(', ')}`
      );
    }

    return cleanType;
  }

  /**
   * Valider les IDs en lot
   * @param {Array} ids - IDs à valider
   * @param {number} maxCount - Nombre maximum d'IDs
   * @returns {Array} IDs validés
   * @throws {ValidationError} Si les IDs sont invalides
   */
  static validateBatchIds(ids, maxCount = 100) {
    if (!Array.isArray(ids)) {
      throw new ValidationError('La liste des IDs doit être un tableau');
    }

    if (ids.length === 0) {
      throw new ValidationError('La liste des IDs ne peut pas être vide');
    }

    if (ids.length > maxCount) {
      throw new ValidationError(`Trop d'IDs fournis (maximum ${maxCount})`);
    }

    const validatedIds = [];
    const errors = [];

    ids.forEach((id, index) => {
      try {
        const validId = this.validateId(id);
        if (!validatedIds.includes(validId)) {
          validatedIds.push(validId);
        }
      } catch (error) {
        errors.push(`ID à l'index ${index}: ${error.message}`);
      }
    });

    if (errors.length > 0) {
      throw new ValidationError('IDs invalides détectés', 
        errors.map(error => ({ message: error }))
      );
    }

    return validatedIds;
  }
}

module.exports = EntityValidator;