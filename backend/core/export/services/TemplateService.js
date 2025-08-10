// backend/core/export/services/TemplateService.js - Service de gestion des templates
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError } = require('../../../shared/middleware/errorHandler');
const { getEntityType, formatAttributesForDisplay } = require('../../../shared/constants/entityTypes');
const { getRelationshipType, formatRelationshipForDisplay } = require('../../../shared/constants/relationshipTypes');

/**
 * Service de gestion des templates Handlebars pour l'export LUCIDE
 * Gère le chargement, la compilation et le rendu des templates
 */
class TemplateService {

  /**
   * Initialiser le service avec les helpers Handlebars
   */
  static initialize() {
    this.registerHelpers();
    this.templatesCache = new Map();
    logger.info('TemplateService initialized with Handlebars helpers');
  }

  /**
   * Enregistrer les helpers Handlebars personnalisés
   */
  static registerHelpers() {
    // Helper pour formater les dates
    Handlebars.registerHelper('formatDate', function(dateString, format = 'DD/MM/YYYY HH:mm') {
      if (!dateString) return 'Non défini';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      switch (format) {
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'DD/MM/YYYY HH:mm':
          return `${day}/${month}/${year} ${hours}:${minutes}`;
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        default:
          return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
    });

    // Helper pour formater les attributs d'entité
    Handlebars.registerHelper('formatEntityAttributes', function(type, attributes) {
      const formatted = formatAttributesForDisplay(type, attributes);
      return Object.entries(formatted)
        .map(([label, value]) => `<strong>${label}:</strong> ${value}`)
        .join('<br>');
    });

    // Helper pour obtenir l'icône d'un type d'entité
    Handlebars.registerHelper('getEntityIcon', function(type) {
      const entityType = getEntityType(type);
      return entityType ? entityType.icon : '❓';
    });

    // Helper pour obtenir la couleur d'un type d'entité
    Handlebars.registerHelper('getEntityColor', function(type) {
      const entityType = getEntityType(type);
      return entityType ? entityType.color : '#64748b';
    });

    // Helper pour formater une relation
    Handlebars.registerHelper('formatRelation', function(type, strength) {
      const formatted = formatRelationshipForDisplay(type, strength);
      return formatted.name;
    });

    // Helper pour la couleur d'une relation
    Handlebars.registerHelper('getRelationColor', function(type) {
      const relationConfig = getRelationshipType(type);
      return relationConfig ? relationConfig.color : '#6b7280';
    });

    // Helper conditionnel
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper pour compter les éléments
    Handlebars.registerHelper('count', function(array) {
      return Array.isArray(array) ? array.length : 0;
    });

    // Helper pour formater les nombres
    Handlebars.registerHelper('formatNumber', function(number) {
      if (typeof number !== 'number') return '0';
      return number.toLocaleString('fr-FR');
    });

    // Helper pour truncate le texte
    Handlebars.registerHelper('truncate', function(text, length = 100) {
      if (!text || typeof text !== 'string') return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    });

    // Helper pour capitaliser
    Handlebars.registerHelper('capitalize', function(text) {
      if (!text || typeof text !== 'string') return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    });

    // Helper pour générer une liste HTML
    Handlebars.registerHelper('toList', function(array, options) {
      if (!Array.isArray(array) || array.length === 0) {
        return '<p>Aucun élément</p>';
      }
      
      const items = array.map(item => `<li>${options.fn(item)}</li>`).join('');
      return `<ul>${items}</ul>`;
    });

    // Helper pour les statistiques
    Handlebars.registerHelper('percentage', function(value, total) {
      if (!total || total === 0) return '0%';
      return Math.round((value / total) * 100) + '%';
    });

    // Helper pour JSON pretty print
    Handlebars.registerHelper('json', function(obj) {
      return JSON.stringify(obj, null, 2);
    });

    // Helper pour vérifier si un objet est vide
    Handlebars.registerHelper('isEmpty', function(obj) {
      if (!obj) return true;
      if (Array.isArray(obj)) return obj.length === 0;
      if (typeof obj === 'object') return Object.keys(obj).length === 0;
      return false;
    });

    // Helper pour générer un ID unique
    Handlebars.registerHelper('uniqueId', function() {
      return 'id_' + Math.random().toString(36).substr(2, 9);
    });

    // Helper pour les couleurs d'état
    Handlebars.registerHelper('statusColor', function(status) {
      const colors = {
        'active': '#22c55e',
        'inactive': '#ef4444',
        'pending': '#f59e0b',
        'confirmed': '#10b981',
        'suspicious': '#dc2626'
      };
      return colors[status] || '#6b7280';
    });
  }

  /**
   * Charger un template depuis le disque
   * @param {string} templateName - Nom du template (sans extension)
   * @returns {Promise<string>} Contenu du template
   */
  static async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      logger.info('Template loaded successfully', { templateName, templatePath });
      return templateContent;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new ValidationError(`Template "${templateName}" non trouvé`);
      }
      logger.error('Error loading template', { templateName, error: error.message });
      throw error;
    }
  }

  /**
   * Compiler un template Handlebars
   * @param {string} templateContent - Contenu du template
   * @param {string} templateName - Nom du template pour le cache
   * @returns {Function} Template compilé
   */
  static compileTemplate(templateContent, templateName) {
    try {
      const compiled = Handlebars.compile(templateContent);
      
      // Mettre en cache si nom fourni
      if (templateName) {
        this.templatesCache.set(templateName, compiled);
      }
      
      logger.info('Template compiled successfully', { templateName });
      return compiled;
    } catch (error) {
      logger.error('Error compiling template', { templateName, error: error.message });
      throw new ValidationError(`Erreur compilation template: ${error.message}`);
    }
  }

  /**
   * Obtenir un template compilé (avec cache)
   * @param {string} templateName - Nom du template
   * @returns {Promise<Function>} Template compilé
   */
  static async getCompiledTemplate(templateName) {
    try {
      // Vérifier le cache
      if (this.templatesCache.has(templateName)) {
        logger.debug('Template retrieved from cache', { templateName });
        return this.templatesCache.get(templateName);
      }

      // Charger et compiler
      const templateContent = await this.loadTemplate(templateName);
      const compiled = this.compileTemplate(templateContent, templateName);
      
      return compiled;
    } catch (error) {
      logger.error('Error getting compiled template', { templateName, error: error.message });
      throw error;
    }
  }

  /**
   * Rendre un template avec des données
   * @param {string} templateName - Nom du template
   * @param {Object} data - Données à injecter
   * @param {Object} options - Options de rendu
   * @returns {Promise<string>} HTML rendu
   */
  static async renderTemplate(templateName, data = {}, options = {}) {
    try {
      const {
        additionalHelpers = {},
        partials = {}
      } = options;

      // Enregistrer les helpers additionnels temporairement
      const tempHelpers = [];
      Object.entries(additionalHelpers).forEach(([name, helper]) => {
        Handlebars.registerHelper(name, helper);
        tempHelpers.push(name);
      });

      // Enregistrer les partials temporairement
      const tempPartials = [];
      Object.entries(partials).forEach(([name, content]) => {
        Handlebars.registerPartial(name, content);
        tempPartials.push(name);
      });

      // Obtenir le template compilé
      const template = await this.getCompiledTemplate(templateName);

      // Enrichir les données avec des métadonnées
      const enrichedData = {
        ...data,
        _meta: {
          generatedAt: new Date().toISOString(),
          templateName,
          version: '1.0.0',
          generator: 'LUCIDE Export Service'
        }
      };

      // Rendre le template
      const rendered = template(enrichedData);

      // Nettoyer les helpers et partials temporaires
      tempHelpers.forEach(name => Handlebars.unregisterHelper(name));
      tempPartials.forEach(name => Handlebars.unregisterPartial(name));

      logger.success('Template rendered successfully', { 
        templateName, 
        dataKeys: Object.keys(data),
        renderedLength: rendered.length
      });

      return rendered;
    } catch (error) {
      logger.error('Error rendering template', { 
        templateName, 
        data: Object.keys(data), 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Valider les données requises pour un template
   * @param {string} templateName - Nom du template
   * @param {Object} data - Données à valider
   * @returns {Object} { valid: boolean, missing: Array, errors: Array }
   */
  static validateTemplateData(templateName, data) {
    const validationRules = {
      'entity-report': {
        required: ['entity'],
        entityFields: ['id', 'name', 'type']
      },
      'folder-summary': {
        required: ['folder', 'entities', 'relationships'],
        folderFields: ['id', 'name']
      },
      'network-analysis': {
        required: ['folder', 'entities', 'relationships', 'stats'],
        statsFields: ['total_entities', 'total_relationships']
      }
    };

    const rules = validationRules[templateName];
    if (!rules) {
      return { valid: true, missing: [], errors: [] };
    }

    const missing = [];
    const errors = [];

    // Vérifier les champs requis
    rules.required.forEach(field => {
      if (!data[field]) {
        missing.push(field);
      }
    });

    // Vérifications spécifiques par template
    if (templateName === 'entity-report' && data.entity) {
      rules.entityFields.forEach(field => {
        if (!data.entity[field]) {
          errors.push(`Champ entity.${field} manquant`);
        }
      });
    }

    if (templateName === 'folder-summary' && data.folder) {
      rules.folderFields.forEach(field => {
        if (!data.folder[field]) {
          errors.push(`Champ folder.${field} manquant`);
        }
      });
    }

    if (templateName === 'network-analysis' && data.stats) {
      rules.statsFields.forEach(field => {
        if (data.stats[field] === undefined) {
          errors.push(`Champ stats.${field} manquant`);
        }
      });
    }

    const valid = missing.length === 0 && errors.length === 0;

    logger.info('Template data validation', {
      templateName,
      valid,
      missing,
      errors
    });

    return { valid, missing, errors };
  }

  /**
   * Précharger tous les templates en cache
   * @returns {Promise<void>}
   */
  static async preloadTemplates() {
    const templateNames = ['entity-report', 'folder-summary', 'network-analysis'];
    
    try {
      await Promise.all(
        templateNames.map(name => this.getCompiledTemplate(name))
      );
      
      logger.success('All templates preloaded successfully', { 
        count: templateNames.length,
        templates: templateNames
      });
    } catch (error) {
      logger.error('Error preloading templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Vider le cache des templates
   */
  static clearCache() {
    const cacheSize = this.templatesCache.size;
    this.templatesCache.clear();
    logger.info('Template cache cleared', { previousSize: cacheSize });
  }

  /**
   * Obtenir les informations du cache
   * @returns {Object} Informations sur le cache
   */
  static getCacheInfo() {
    return {
      size: this.templatesCache.size,
      templates: Array.from(this.templatesCache.keys()),
      memory: process.memoryUsage()
    };
  }

  /**
   * Créer un template dynamique à partir d'un string
   * @param {string} templateString - Template Handlebars sous forme de string
   * @param {Object} data - Données à injecter
   * @returns {Promise<string>} HTML rendu
   */
  static async renderTemplateString(templateString, data = {}) {
    try {
      const template = Handlebars.compile(templateString);
      const rendered = template({
        ...data,
        _meta: {
          generatedAt: new Date().toISOString(),
          type: 'dynamic',
          generator: 'LUCIDE Export Service'
        }
      });

      logger.info('Dynamic template rendered successfully', {
        templateLength: templateString.length,
        renderedLength: rendered.length
      });

      return rendered;
    } catch (error) {
      logger.error('Error rendering dynamic template', { error: error.message });
      throw new ValidationError(`Erreur rendu template dynamique: ${error.message}`);
    }
  }

  /**
   * Obtenir la liste des templates disponibles
   * @returns {Promise<Array>} Liste des templates
   */
  static async getAvailableTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates');
      const files = await fs.readdir(templatesDir);
      
      const templates = files
        .filter(file => file.endsWith('.hbs'))
        .map(file => {
          const name = file.replace('.hbs', '');
          return {
            name,
            filename: file,
            cached: this.templatesCache.has(name)
          };
        });

      logger.info('Available templates listed', { count: templates.length });
      return templates;
    } catch (error) {
      logger.error('Error listing templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Valider la syntaxe d'un template
   * @param {string} templateContent - Contenu du template
   * @returns {Object} { valid: boolean, errors: Array }
   */
  static validateTemplateSyntax(templateContent) {
    try {
      Handlebars.compile(templateContent);
      return { valid: true, errors: [] };
    } catch (error) {
      return { 
        valid: false, 
        errors: [error.message] 
      };
    }
  }
}

// Initialiser le service au chargement du module
TemplateService.initialize();

module.exports = TemplateService;