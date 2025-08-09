// backend/core/folders/validators/FolderValidator.js - Validation des dossiers LUCIDE
const Joi = require('joi');
const { ValidationError } = require('../../../shared/middleware/errorHandler');
const { logger } = require('../../../shared/middleware/logging');

/**
 * Schémas de validation Joi pour les dossiers d'enquête
 */
const FolderSchemas = {
  
  /**
   * Schéma pour la création d'un dossier
   */
  create: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(255)
      .required()
      .pattern(/^[^<>:"/\\|?*\x00-\x1f]+$/) // Caractères interdits dans noms de fichiers
      .messages({
        'string.empty': 'Le nom du dossier est obligatoire',
        'string.min': 'Le nom du dossier doit contenir au moins 1 caractère',
        'string.max': 'Le nom du dossier ne peut pas dépasser 255 caractères',
        'string.pattern.base': 'Le nom du dossier contient des caractères non autorisés',
        'any.required': 'Le nom du dossier est obligatoire'
      }),

    description: Joi.string()
      .trim()
      .max(2000)
      .allow(null, '')
      .optional()
      .messages({
        'string.max': 'La description ne peut pas dépasser 2000 caractères'
      })
  }),

  /**
   * Schéma pour la mise à jour d'un dossier
   */
  update: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(255)
      .pattern(/^[^<>:"/\\|?*\x00-\x1f]+$/)
      .optional()
      .messages({
        'string.empty': 'Le nom du dossier ne peut pas être vide',
        'string.min': 'Le nom du dossier doit contenir au moins 1 caractère',
        'string.max': 'Le nom du dossier ne peut pas dépasser 255 caractères',
        'string.pattern.base': 'Le nom du dossier contient des caractères non autorisés'
      }),

    description: Joi.string()
      .trim()
      .max(2000)
      .allow(null, '')
      .optional()
      .messages({
        'string.max': 'La description ne peut pas dépasser 2000 caractères'
      })
  }).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
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
      .valid('name', 'created_at', 'updated_at', 'entity_count', 'last_activity')
      .default('created_at')
      .messages({
        'any.only': 'Le champ de tri doit être l\'un des suivants: name, created_at, updated_at, entity_count, last_activity'
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
   * Schéma pour les options de suppression
   */
  deleteOptions: Joi.object({
    force: Joi.boolean()
      .default(false)
      .optional()
      .messages({
        'boolean.base': 'L\'option force doit être un booléen'
      })
  })
};

/**
 * Classe de validation pour les dossiers
 */
class FolderValidator {

  /**
   * Valider les données de création d'un dossier
   * @param {Object} data - Données à valider
   * @returns {Object} Données validées et nettoyées
   * @throws {ValidationError} Si les données sont invalides
   */
  static validateCreate(data) {
    try {
      const { error, value } = FolderSchemas.create.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Folder creation validation failed', {
          data,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Données de création invalides', error.details);
      }

      // Validations métier supplémentaires
      this.validateBusinessRules(value, 'create');

      logger.debug('Folder creation data validated', { validatedData: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during folder creation validation', {
        data,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des données');
    }
  }

  /**
   * Valider les données de mise à jour d'un dossier
   * @param {Object} data - Données à valider
   * @returns {Object} Données validées et nettoyées
   * @throws {ValidationError} Si les données sont invalides
   */
  static validateUpdate(data) {
    try {
      const { error, value } = FolderSchemas.update.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Folder update validation failed', {
          data,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Données de mise à jour invalides', error.details);
      }

      // Validations métier supplémentaires
      this.validateBusinessRules(value, 'update');

      logger.debug('Folder update data validated', { validatedData: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during folder update validation', {
        data,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des données');
    }
  }

  /**
   * Valider un ID de dossier
   * @param {any} id - ID à valider
   * @returns {number} ID validé et converti
   * @throws {ValidationError} Si l'ID est invalide
   */
  static validateId(id) {
    try {
      const { error, value } = FolderSchemas.id.validate({ id }, {
        abortEarly: false,
        convert: true
      });

      if (error) {
        logger.warn('Folder ID validation failed', {
          id,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('ID de dossier invalide', error.details);
      }

      return value.id;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during folder ID validation', {
        id,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation de l\'ID');
    }
  }

  /**
   * Valider les options de requête
   * @param {Object} options - Options à valider
   * @returns {Object} Options validées et nettoyées
   * @throws {ValidationError} Si les options sont invalides
   */
  static validateQueryOptions(options = {}) {
    try {
      const { error, value } = FolderSchemas.queryOptions.validate(options, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false
      });

      if (error) {
        logger.warn('Folder query options validation failed', {
          options,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Options de requête invalides', error.details);
      }

      // Normaliser la direction
      if (value.direction) {
        value.direction = value.direction.toUpperCase();
      }

      logger.debug('Folder query options validated', { validatedOptions: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during folder query options validation', {
        options,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des options');
    }
  }

  /**
   * Valider les options de suppression
   * @param {Object} options - Options à valider
   * @returns {Object} Options validées
   * @throws {ValidationError} Si les options sont invalides
   */
  static validateDeleteOptions(options = {}) {
    try {
      const { error, value } = FolderSchemas.deleteOptions.validate(options, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Folder delete options validation failed', {
          options,
          errors: error.details.map(d => d.message)
        });
        throw new ValidationError('Options de suppression invalides', error.details);
      }

      logger.debug('Folder delete options validated', { validatedOptions: value });
      return value;

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Unexpected error during folder delete options validation', {
        options,
        error: error.message
      });
      throw new ValidationError('Erreur lors de la validation des options de suppression');
    }
  }

  /**
   * Valider les règles métier spécifiques aux dossiers
   * @param {Object} data - Données à valider
   * @param {string} operation - Type d'opération (create, update)
   * @throws {ValidationError} Si les règles métier ne sont pas respectées
   */
  static validateBusinessRules(data, operation) {
    const errors = [];

    // Validation du nom : mots interdits
    if (data.name) {
      const forbiddenWords = ['test', 'demo', 'example', 'sample', 'temp', 'temporary'];
      const nameLower = data.name.toLowerCase();
      
      const hasForbiddenWord = forbiddenWords.some(word => 
        nameLower.includes(word) && nameLower.length < 10
      );

      if (hasForbiddenWord) {
        errors.push({
          field: 'name',
          message: 'Le nom du dossier ne peut pas contenir uniquement des mots génériques comme "test", "demo", etc.'
        });
      }

      // Validation des caractères répétés
      if (/(.)\1{4,}/.test(data.name)) {
        errors.push({
          field: 'name',
          message: 'Le nom du dossier ne peut pas contenir plus de 4 caractères identiques consécutifs'
        });
      }

      // Validation de la longueur des mots
      const words = data.name.trim().split(/\s+/);
      if (words.some(word => word.length > 50)) {
        errors.push({
          field: 'name',
          message: 'Chaque mot du nom ne peut pas dépasser 50 caractères'
        });
      }

      // Validation des espaces
      if (data.name.trim() !== data.name) {
        // Déjà nettoyé par Joi, mais double vérification
        errors.push({
          field: 'name',
          message: 'Le nom ne peut pas commencer ou finir par des espaces'
        });
      }

      if (/\s{2,}/.test(data.name)) {
        errors.push({
          field: 'name',
          message: 'Le nom ne peut pas contenir plusieurs espaces consécutifs'
        });
      }
    }

    // Validation de la description
    if (data.description) {
      // Vérifier que la description apporte de la valeur
      if (data.description.length < 10 && data.description.length > 0) {
        errors.push({
          field: 'description',
          message: 'Si une description est fournie, elle doit être suffisamment détaillée (au moins 10 caractères)'
        });
      }

      // Validation des caractères répétés dans la description
      if (/(.)\1{9,}/.test(data.description)) {
        errors.push({
          field: 'description',
          message: 'La description ne peut pas contenir plus de 9 caractères identiques consécutifs'
        });
      }

      // Validation des lignes vides excessives
      if (/\n\s*\n\s*\n/.test(data.description)) {
        errors.push({
          field: 'description',
          message: 'La description ne peut pas contenir plus de 2 lignes vides consécutives'
        });
      }
    }

    // Validation spécifique à la création
    if (operation === 'create') {
      // Pour la création, le nom est obligatoire (déjà vérifié par Joi)
      if (!data.name) {
        errors.push({
          field: 'name',
          message: 'Le nom est obligatoire lors de la création d\'un dossier'
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
      logger.warn(`Folder business rules validation failed for ${operation}`, {
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

    // Nettoyer la description
    if (sanitized.description) {
      // Supprimer les caractères de contrôle sauf \n, \r, \t
      sanitized.description = sanitized.description.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '');
      
      // Normaliser les retours à la ligne
      sanitized.description = sanitized.description.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Limiter les lignes vides consécutives
      sanitized.description = sanitized.description.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      // Nettoyer les espaces en fin de lignes
      sanitized.description = sanitized.description.replace(/[ \t]+$/gm, '');
      
      // Trim général
      sanitized.description = sanitized.description.trim();
      
      // Convertir description vide en null
      if (sanitized.description === '') {
        sanitized.description = null;
      }
    }

    return sanitized;
  }

  /**
   * Valider et nettoyer des données complètes
   * @param {Object} data - Données à valider
   * @param {string} operation - Type d'opération
   * @returns {Object} Données validées et nettoyées
   */
  static validateAndSanitize(data, operation) {
    // D'abord nettoyer les données
    const sanitizedData = this.sanitize(data);

    // Puis valider selon l'opération
    switch (operation) {
      case 'create':
        return this.validateCreate(sanitizedData);
      
      case 'update':
        return this.validateUpdate(sanitizedData);
      
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
      name: {
        required: true,
        minLength: 1,
        maxLength: 255,
        pattern: '^[^<>:"/\\\\|?*\\x00-\\x1f]+',
        forbiddenWords: ['test', 'demo', 'example', 'sample', 'temp', 'temporary']
      },
      description: {
        required: false,
        maxLength: 2000,
        minLengthIfProvided: 10
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
}

module.exports = FolderValidator;