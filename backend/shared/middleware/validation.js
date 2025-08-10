// backend/shared/middleware/validation.js - Middleware de validation pour LUCIDE
const { logger } = require('./logging');

/**
 * Middleware de validation des requêtes
 * Valide les paramètres, query params et body selon un schéma défini
 */

/**
 * Valider une requête selon un schéma
 * @param {Object} schema - Schéma de validation
 * @param {Object} schema.params - Validation des paramètres URL
 * @param {Object} schema.query - Validation des query parameters
 * @param {Object} schema.body - Validation du body
 * @returns {Function} Middleware Express
 */
function validateRequest(schema = {}) {
  return (req, res, next) => {
    try {
      const errors = [];

      // Valider les paramètres URL
      if (schema.params) {
        const paramErrors = validateObject(req.params, schema.params, 'params');
        errors.push(...paramErrors);
      }

      // Valider les query parameters
      if (schema.query) {
        const queryErrors = validateObject(req.query, schema.query, 'query');
        errors.push(...queryErrors);
      }

      // Valider le body
      if (schema.body) {
        const bodyErrors = validateObject(req.body, schema.body, 'body');
        errors.push(...bodyErrors);
      }

      // Si erreurs, retourner une réponse d'erreur
      if (errors.length > 0) {
        logger.warn('Validation failed', {
          url: req.originalUrl,
          method: req.method,
          errors
        });

        return res.status(400).json({
          success: false,
          error: 'Données d\'entrée invalides',
          details: errors
        });
      }

      // Validation réussie, continuer
      next();

    } catch (error) {
      logger.error('Validation middleware error', {
        error: error.message,
        url: req.originalUrl
      });

      res.status(500).json({
        success: false,
        error: 'Erreur de validation interne'
      });
    }
  };
}

/**
 * Valider un objet selon un schéma
 * @param {Object} obj - Objet à valider
 * @param {Object} schema - Schéma de validation
 * @param {string} context - Contexte (params, query, body)
 * @returns {Array} Erreurs de validation
 */
function validateObject(obj, schema, context) {
  const errors = [];

  // Valider chaque champ du schéma
  Object.entries(schema).forEach(([field, rules]) => {
    const value = obj[field];
    const fieldErrors = validateField(value, rules, `${context}.${field}`);
    errors.push(...fieldErrors);
  });

  return errors;
}

/**
 * Valider un champ selon ses règles
 * @param {any} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateField(value, rules, fieldPath) {
  const errors = [];

  // Champ requis
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldPath} est requis`);
    return errors; // Arrêter la validation si le champ requis est manquant
  }

  // Si le champ n'est pas requis et est vide, pas d'autres validations
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // Type de données
  if (rules.type) {
    const typeError = validateType(value, rules.type, fieldPath);
    if (typeError) {
      errors.push(typeError);
      return errors; // Arrêter si le type est incorrect
    }
  }

  // Validation selon le type
  switch (rules.type) {
    case 'string':
      errors.push(...validateString(value, rules, fieldPath));
      break;
    case 'number':
      errors.push(...validateNumber(value, rules, fieldPath));
      break;
    case 'boolean':
      errors.push(...validateBoolean(value, rules, fieldPath));
      break;
    case 'array':
      errors.push(...validateArray(value, rules, fieldPath));
      break;
    case 'object':
      errors.push(...validateObjectField(value, rules, fieldPath));
      break;
    case 'email':
      errors.push(...validateEmail(value, rules, fieldPath));
      break;
    case 'url':
      errors.push(...validateUrl(value, rules, fieldPath));
      break;
    case 'date':
      errors.push(...validateDate(value, rules, fieldPath));
      break;
  }

  // Énumération
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${fieldPath} doit être une des valeurs: ${rules.enum.join(', ')}`);
  }

  return errors;
}

/**
 * Valider le type d'une valeur
 * @param {any} value - Valeur à valider
 * @param {string} expectedType - Type attendu
 * @param {string} fieldPath - Chemin du champ
 * @returns {string|null} Erreur de type ou null
 */
function validateType(value, expectedType, fieldPath) {
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  // Conversions automatiques
  if (expectedType === 'number' && typeof value === 'string' && !isNaN(value)) {
    return null; // String numérique acceptée
  }

  if (expectedType === 'boolean' && typeof value === 'string') {
    if (value === 'true' || value === 'false') {
      return null; // String boolean acceptée
    }
  }

  // Types spéciaux
  if (['email', 'url', 'date'].includes(expectedType)) {
    if (typeof value !== 'string') {
      return `${fieldPath} doit être une chaîne de caractères`;
    }
    return null;
  }

  // Vérification du type
  if (actualType !== expectedType) {
    return `${fieldPath} doit être de type ${expectedType}, reçu ${actualType}`;
  }

  return null;
}

/**
 * Valider une chaîne de caractères
 * @param {string} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateString(value, rules, fieldPath) {
  const errors = [];

  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`${fieldPath} doit contenir au moins ${rules.minLength} caractères`);
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`${fieldPath} ne peut pas dépasser ${rules.maxLength} caractères`);
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(`${fieldPath} ne respecte pas le format requis`);
  }

  return errors;
}

/**
 * Valider un nombre
 * @param {number} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateNumber(value, rules, fieldPath) {
  const errors = [];
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    errors.push(`${fieldPath} doit être un nombre valide`);
    return errors;
  }

  if (rules.min !== undefined && numValue < rules.min) {
    errors.push(`${fieldPath} doit être supérieur ou égal à ${rules.min}`);
  }

  if (rules.max !== undefined && numValue > rules.max) {
    errors.push(`${fieldPath} doit être inférieur ou égal à ${rules.max}`);
  }

  if (rules.integer && !Number.isInteger(numValue)) {
    errors.push(`${fieldPath} doit être un nombre entier`);
  }

  return errors;
}

/**
 * Valider un booléen
 * @param {boolean} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateBoolean(value, rules, fieldPath) {
  const errors = [];

  // Conversion automatique des strings
  if (typeof value === 'string') {
    if (value !== 'true' && value !== 'false') {
      errors.push(`${fieldPath} doit être 'true' ou 'false'`);
    }
  } else if (typeof value !== 'boolean') {
    errors.push(`${fieldPath} doit être un booléen`);
  }

  return errors;
}

/**
 * Valider un tableau
 * @param {Array} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateArray(value, rules, fieldPath) {
  const errors = [];

  if (!Array.isArray(value)) {
    errors.push(`${fieldPath} doit être un tableau`);
    return errors;
  }

  if (rules.minItems && value.length < rules.minItems) {
    errors.push(`${fieldPath} doit contenir au moins ${rules.minItems} élément(s)`);
  }

  if (rules.maxItems && value.length > rules.maxItems) {
    errors.push(`${fieldPath} ne peut pas contenir plus de ${rules.maxItems} élément(s)`);
  }

  // Valider les éléments du tableau
  if (rules.items) {
    value.forEach((item, index) => {
      const itemErrors = validateField(item, rules.items, `${fieldPath}[${index}]`);
      errors.push(...itemErrors);
    });
  }

  return errors;
}

/**
 * Valider un objet
 * @param {Object} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateObjectField(value, rules, fieldPath) {
  const errors = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${fieldPath} doit être un objet`);
    return errors;
  }

  // Valider les propriétés de l'objet
  if (rules.properties) {
    Object.entries(rules.properties).forEach(([prop, propRules]) => {
      const propErrors = validateField(value[prop], propRules, `${fieldPath}.${prop}`);
      errors.push(...propErrors);
    });
  }

  return errors;
}

/**
 * Valider une adresse email
 * @param {string} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateEmail(value, rules, fieldPath) {
  const errors = [];
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    errors.push(`${fieldPath} doit être une adresse email valide`);
  }

  return errors;
}

/**
 * Valider une URL
 * @param {string} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateUrl(value, rules, fieldPath) {
  const errors = [];
  
  try {
    new URL(value);
  } catch {
    errors.push(`${fieldPath} doit être une URL valide`);
  }

  return errors;
}

/**
 * Valider une date
 * @param {string} value - Valeur à valider
 * @param {Object} rules - Règles de validation
 * @param {string} fieldPath - Chemin du champ
 * @returns {Array} Erreurs de validation
 */
function validateDate(value, rules, fieldPath) {
  const errors = [];
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    errors.push(`${fieldPath} doit être une date valide`);
  }

  return errors;
}

/**
 * Middleware de validation des fichiers uploadés
 * @param {Object} options - Options de validation
 * @returns {Function} Middleware Express
 */
function validateFileUpload(options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB par défaut
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    required = false
  } = options;

  return (req, res, next) => {
    try {
      if (required && (!req.file && !req.files)) {
        return res.status(400).json({
          success: false,
          error: 'Fichier requis manquant'
        });
      }

      if (!req.file && !req.files) {
        return next(); // Pas de fichier, continuer
      }

      const files = req.files || [req.file];
      const errors = [];

      files.forEach((file, index) => {
        if (file.size > maxSize) {
          errors.push(`Fichier ${index + 1}: taille trop importante (max ${maxSize / 1024 / 1024}MB)`);
        }

        if (!allowedTypes.includes(file.mimetype)) {
          errors.push(`Fichier ${index + 1}: type non autorisé (${file.mimetype})`);
        }
      });

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Fichiers invalides',
          details: errors
        });
      }

      next();

    } catch (error) {
      logger.error('File validation error', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Erreur de validation des fichiers'
      });
    }
  };
}

/**
 * Créer un schéma de validation pour un ID
 * @param {string} fieldName - Nom du champ
 * @returns {Object} Schéma de validation
 */
function createIdSchema(fieldName = 'id') {
  return {
    [fieldName]: {
      type: 'number',
      required: true,
      min: 1,
      integer: true
    }
  };
}

/**
 * Créer un schéma de validation pour une pagination
 * @returns {Object} Schéma de validation
 */
function createPaginationSchema() {
  return {
    page: {
      type: 'number',
      min: 1,
      integer: true,
      default: 1
    },
    limit: {
      type: 'number',
      min: 1,
      max: 100,
      integer: true,
      default: 20
    }
  };
}

/**
 * Nettoyer et convertir les types de données
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Next middleware
 */
function sanitizeAndConvert(req, res, next) {
  try {
    // Convertir les paramètres URL
    Object.keys(req.params).forEach(key => {
      const value = req.params[key];
      if (!isNaN(value) && value !== '') {
        req.params[key] = parseInt(value);
      }
    });

    // Convertir les query parameters
    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      
      // Conversion des booléens
      if (value === 'true') req.query[key] = true;
      else if (value === 'false') req.query[key] = false;
      // Conversion des nombres
      else if (!isNaN(value) && value !== '') {
        req.query[key] = parseFloat(value);
      }
    });

    next();
  } catch (error) {
    logger.error('Sanitization error', { error: error.message });
    next();
  }
}

module.exports = {
  validateRequest,
  validateFileUpload,
  createIdSchema,
  createPaginationSchema,
  sanitizeAndConvert
};