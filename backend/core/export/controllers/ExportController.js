// backend/core/export/controllers/ExportController.js - Contrôleur d'export LUCIDE
const TemplateService = require('../services/TemplateService');
const PDFService = require('../services/PDFService');
const FolderModel = require('../../folders/models/FolderModel');
const EntityModel = require('../../entities/models/EntityModel');
const RelationshipModel = require('../../relationships/models/RelationshipModel');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError } = require('../../../shared/middleware/errorHandler');
const { getEntityType } = require('../../../shared/constants/entityTypes');
const { getRelationshipType } = require('../../../shared/constants/relationshipTypes');

/**
 * Contrôleur pour les fonctionnalités d'export LUCIDE
 * Gère l'export des données en différents formats (PDF, HTML, JSON)
 */
class ExportController {

  /**
   * Exporter une entité en PDF
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async exportEntityToPDF(req, res) {
    try {
      const { entityId } = req.params;
      const {
        format = 'A4',
        watermark = false,
        watermarkText = 'CONFIDENTIEL',
        includeRelationships = true,
        includeFiles = true
      } = req.query;

      logger.info('Exporting entity to PDF', { entityId, format, watermark });

      // Récupérer l'entité
      const entity = await EntityModel.findById(entityId);
      if (!entity) {
        throw new NotFoundError('Entité', entityId);
      }

      // Récupérer les relations si demandées
      let relationships = [];
      if (includeRelationships === 'true') {
        relationships = await RelationshipModel.getByEntity(entityId, {
          includeEntityInfo: true
        });
      }

      // Récupérer les fichiers si demandés
      let files = [];
      if (includeFiles === 'true') {
        // TODO: Implémenter la récupération des fichiers
        // files = await MediaModel.getByEntity(entityId);
      }

      // Préparer les données pour le template
      const templateData = {
        entity,
        relationships,
        files,
        classification: 'CONFIDENTIEL',
        investigation_notes: req.body?.notes || null
      };

      // Générer le HTML à partir du template
      const htmlContent = await TemplateService.renderTemplate(
        'entity-report',
        templateData
      );

      // Options PDF
      const pdfOptions = {
        format: format.toUpperCase(),
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '25mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size: 10px; color: #666; text-align: center; width: 100%;">Fiche d'identité - ${entity.name}</div>`,
        footerTemplate: `
          <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 5px;">
            <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
            <span style="float: right;">LUCIDE - ${watermarkText}</span>
          </div>
        `
      };

      // Générer le PDF
      let pdfBuffer;
      if (watermark === 'true') {
        pdfBuffer = await PDFService.generatePDFWithWatermark(
          htmlContent,
          watermarkText,
          pdfOptions
        );
      } else {
        pdfBuffer = await PDFService.generatePDFFromHTML(htmlContent, pdfOptions);
      }

      // Définir les headers de réponse
      const filename = `entite_${entity.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      logger.success('Entity PDF export completed', {
        entityId,
        entityName: entity.name,
        pdfSize: pdfBuffer.length,
        filename
      });

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('Error exporting entity to PDF', {
        entityId: req.params.entityId,
        error: error.message
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return res.status(error.statusCode || 400).json({
          error: error.message,
          type: error.constructor.name
        });
      }

      res.status(500).json({
        error: 'Erreur lors de l\'export PDF de l\'entité',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Exporter un dossier en PDF
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async exportFolderToPDF(req, res) {
    try {
      const { folderId } = req.params;
      const {
        format = 'A4',
        watermark = false,
        watermarkText = 'CONFIDENTIEL',
        includeEntityDetails = false
      } = req.query;

      logger.info('Exporting folder to PDF', { folderId, format, watermark });

      // Récupérer le dossier
      const folder = await FolderModel.findById(folderId);
      if (!folder) {
        throw new NotFoundError('Dossier', folderId);
      }

      // Récupérer les entités du dossier
      const entities = await EntityModel.getByFolder(folderId);

      // Récupérer les relations du dossier
      const relationships = await RelationshipModel.getByFolder(folderId);

      // Calculer les statistiques
      const stats = await EntityModel.getStatisticsByFolder(folderId);

      // Grouper les entités par type
      const entityTypeGroups = this.groupEntitiesByType(entities);

      // Analyser les relations
      const relationshipStats = this.analyzeRelationships(relationships);

      // Identifier les entités centrales
      const centralEntities = this.findCentralEntities(entities, 5);

      // Générer les recommandations
      const recommendations = this.generateRecommendations(entities, relationships, stats);

      // Préparer les données pour le template
      const templateData = {
        folder,
        entities,
        relationships,
        stats,
        entityTypeGroups,
        relationshipStats,
        centralEntities,
        recommendations,
        classification: 'CONFIDENTIEL'
      };

      // Générer le HTML à partir du template
      const htmlContent = await TemplateService.renderTemplate(
        'folder-summary',
        templateData
      );

      // Options PDF
      const pdfOptions = {
        format: format.toUpperCase(),
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '25mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size: 10px; color: #666; text-align: center; width: 100%;">Résumé du dossier - ${folder.name}</div>`,
        footerTemplate: `
          <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 5px;">
            <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
            <span style="float: right;">LUCIDE - ${watermarkText}</span>
          </div>
        `
      };

      // Générer le PDF
      let pdfBuffer;
      if (watermark === 'true') {
        pdfBuffer = await PDFService.generatePDFWithWatermark(
          htmlContent,
          watermarkText,
          pdfOptions
        );
      } else {
        pdfBuffer = await PDFService.generatePDFFromHTML(htmlContent, pdfOptions);
      }

      // Définir les headers de réponse
      const filename = `dossier_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      logger.success('Folder PDF export completed', {
        folderId,
        folderName: folder.name,
        entitiesCount: entities.length,
        relationshipsCount: relationships.length,
        pdfSize: pdfBuffer.length,
        filename
      });

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('Error exporting folder to PDF', {
        folderId: req.params.folderId,
        error: error.message
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return res.status(error.statusCode || 400).json({
          error: error.message,
          type: error.constructor.name
        });
      }

      res.status(500).json({
        error: 'Erreur lors de l\'export PDF du dossier',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Exporter une entité en HTML
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async exportEntityToHTML(req, res) {
    try {
      const { entityId } = req.params;
      const { includeRelationships = true, includeFiles = true } = req.query;

      logger.info('Exporting entity to HTML', { entityId });

      // Récupérer l'entité
      const entity = await EntityModel.findById(entityId);
      if (!entity) {
        throw new NotFoundError('Entité', entityId);
      }

      // Récupérer les relations si demandées
      let relationships = [];
      if (includeRelationships === 'true') {
        relationships = await RelationshipModel.getByEntity(entityId, {
          includeEntityInfo: true
        });
      }

      // Récupérer les fichiers si demandés
      let files = [];
      if (includeFiles === 'true') {
        // TODO: Implémenter la récupération des fichiers
        // files = await MediaModel.getByEntity(entityId);
      }

      // Préparer les données pour le template
      const templateData = {
        entity,
        relationships,
        files,
        classification: 'CONFIDENTIEL'
      };

      // Générer le HTML à partir du template
      const htmlContent = await TemplateService.renderTemplate(
        'entity-report',
        templateData
      );

      // Définir les headers de réponse
      const filename = `entite_${entity.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      logger.success('Entity HTML export completed', {
        entityId,
        entityName: entity.name,
        htmlSize: htmlContent.length,
        filename
      });

      res.send(htmlContent);

    } catch (error) {
      logger.error('Error exporting entity to HTML', {
        entityId: req.params.entityId,
        error: error.message
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return res.status(error.statusCode || 400).json({
          error: error.message,
          type: error.constructor.name
        });
      }

      res.status(500).json({
        error: 'Erreur lors de l\'export HTML de l\'entité',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Exporter des données en JSON
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async exportToJSON(req, res) {
    try {
      const { type, id } = req.params;
      const { format = 'pretty', includeMetadata = true } = req.query;

      logger.info('Exporting to JSON', { type, id, format });

      let data = {};
      let filename = '';

      switch (type) {
        case 'entity':
          data.entity = await EntityModel.findById(id);
          if (!data.entity) {
            throw new NotFoundError('Entité', id);
          }
          data.relationships = await RelationshipModel.getByEntity(id, {
            includeEntityInfo: true
          });
          filename = `entite_${data.entity.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
          break;

        case 'folder':
          data.folder = await FolderModel.findById(id);
          if (!data.folder) {
            throw new NotFoundError('Dossier', id);
          }
          data.entities = await EntityModel.getByFolder(id);
          data.relationships = await RelationshipModel.getByFolder(id);
          data.stats = await EntityModel.getStatisticsByFolder(id);
          filename = `dossier_${data.folder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
          break;

        default:
          throw new ValidationError(`Type d'export non supporté: ${type}`);
      }

      // Ajouter les métadonnées si demandées
      if (includeMetadata === 'true') {
        data._metadata = {
          exportedAt: new Date().toISOString(),
          exportedBy: 'LUCIDE Export Service',
          version: '1.0.0',
          type,
          id,
          format
        };
      }

      // Formater le JSON
      const jsonContent = format === 'pretty' 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      // Définir les headers de réponse
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      logger.success('JSON export completed', {
        type,
        id,
        jsonSize: jsonContent.length,
        filename
      });

      res.send(jsonContent);

    } catch (error) {
      logger.error('Error exporting to JSON', {
        type: req.params.type,
        id: req.params.id,
        error: error.message
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return res.status(error.statusCode || 400).json({
          error: error.message,
          type: error.constructor.name
        });
      }

      res.status(500).json({
        error: 'Erreur lors de l\'export JSON',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtenir la liste des formats d'export disponibles
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async getAvailableFormats(req, res) {
    try {
      const formats = {
        pdf: {
          name: 'PDF',
          description: 'Document PDF pour impression et archivage',
          mimeType: 'application/pdf',
          extensions: ['.pdf'],
          features: ['watermark', 'pagination', 'print-ready'],
          sizes: ['A4', 'A3', 'Letter', 'Legal']
        },
        html: {
          name: 'HTML',
          description: 'Page web autonome',
          mimeType: 'text/html',
          extensions: ['.html'],
          features: ['standalone', 'responsive', 'printable']
        },
        json: {
          name: 'JSON',
          description: 'Données structurées pour import/export',
          mimeType: 'application/json',
          extensions: ['.json'],
          features: ['structured', 'machine-readable', 'import-compatible']
        }
      };

      const templates = await TemplateService.getAvailableTemplates();

      res.json({
        success: true,
        formats,
        templates: templates.map(t => ({
          name: t.name,
          cached: t.cached,
          description: this.getTemplateDescription(t.name)
        })),
        capabilities: {
          watermark: true,
          multiPage: true,
          customSizes: true,
          metadata: true
        }
      });

    } catch (error) {
      logger.error('Error getting available formats', { error: error.message });
      res.status(500).json({
        error: 'Erreur lors de la récupération des formats disponibles'
      });
    }
  }

  /**
   * Prévisualiser un export sans le télécharger
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async previewExport(req, res) {
    try {
      const { type, id } = req.params;
      const { template = 'entity-report' } = req.query;

      logger.info('Generating export preview', { type, id, template });

      let data = {};

      switch (type) {
        case 'entity':
          data.entity = await EntityModel.findById(id);
          if (!data.entity) {
            throw new NotFoundError('Entité', id);
          }
          data.relationships = await RelationshipModel.getByEntity(id, {
            includeEntityInfo: true
          });
          break;

        case 'folder':
          data.folder = await FolderModel.findById(id);
          if (!data.folder) {
            throw new NotFoundError('Dossier', id);
          }
          data.entities = await EntityModel.getByFolder(id);
          data.relationships = await RelationshipModel.getByFolder(id);
          data.stats = await EntityModel.getStatisticsByFolder(id);
          data.entityTypeGroups = this.groupEntitiesByType(data.entities);
          data.relationshipStats = this.analyzeRelationships(data.relationships);
          data.centralEntities = this.findCentralEntities(data.entities, 3);
          break;

        default:
          throw new ValidationError(`Type de prévisualisation non supporté: ${type}`);
      }

      // Générer le HTML de prévisualisation
      const htmlContent = await TemplateService.renderTemplate(template, data);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      logger.error('Error generating export preview', {
        type: req.params.type,
        id: req.params.id,
        error: error.message
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return res.status(error.statusCode || 400).json({
          error: error.message,
          type: error.constructor.name
        });
      }

      res.status(500).json({
        error: 'Erreur lors de la génération de la prévisualisation'
      });
    }
  }

  /**
   * Grouper les entités par type
   * @param {Array} entities - Liste des entités
   * @returns {Array} Entités groupées par type
   */
  static groupEntitiesByType(entities) {
    const groups = {};
    
    entities.forEach(entity => {
      if (!groups[entity.type]) {
        const entityType = getEntityType(entity.type);
        groups[entity.type] = {
          name: entityType ? entityType.name : entity.type,
          icon: entityType ? entityType.icon : '❓',
          color: entityType ? entityType.color : '#64748b',
          entities: []
        };
      }
      groups[entity.type].entities.push(entity);
    });

    return Object.values(groups).sort((a, b) => b.entities.length - a.entities.length);
  }

  /**
   * Analyser les statistiques des relations
   * @param {Array} relationships - Liste des relations
   * @returns {Array} Statistiques des relations
   */
  static analyzeRelationships(relationships) {
    const stats = {};
    
    relationships.forEach(rel => {
      if (!stats[rel.type]) {
        stats[rel.type] = 0;
      }
      stats[rel.type]++;
    });

    return Object.entries(stats)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Identifier les entités centrales (avec le plus de connexions)
   * @param {Array} entities - Liste des entités
   * @param {number} limit - Nombre max d'entités à retourner
   * @returns {Array} Entités centrales
   */
  static findCentralEntities(entities, limit = 5) {
    return entities
      .filter(entity => entity.connection_count > 0)
      .sort((a, b) => b.connection_count - a.connection_count)
      .slice(0, limit);
  }

  /**
   * Générer des recommandations d'investigation
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @param {Object} stats - Statistiques du dossier
   * @returns {Array} Recommandations
   */
  static generateRecommendations(entities, relationships, stats) {
    const recommendations = [];

    // Recommandations basées sur le nombre d'entités
    if (entities.length < 5) {
      recommendations.push(
        'Enrichir le dossier avec plus d\'entités pour une analyse plus complète'
      );
    }

    // Recommandations basées sur les relations
    if (relationships.length === 0) {
      recommendations.push(
        'Établir des relations entre les entités pour identifier les connexions'
      );
    } else if (relationships.length < entities.length) {
      recommendations.push(
        'Analyser les entités isolées qui pourraient avoir des connexions non identifiées'
      );
    }

    // Recommandations basées sur les types d'entités
    const personEntities = entities.filter(e => e.type === 'person');
    if (personEntities.length > 0 && relationships.filter(r => r.type === 'family').length === 0) {
      recommendations.push(
        'Investiguer les liens familiaux entre les personnes identifiées'
      );
    }

    // Recommandations basées sur la connectivité
    const isolatedEntities = entities.filter(e => e.connection_count === 0);
    if (isolatedEntities.length > 0) {
      recommendations.push(
        `Analyser les ${isolatedEntities.length} entité(s) isolée(s) pour identifier d'éventuelles connexions`
      );
    }

    // Recommandations basées sur la centralité
    const highlyConnected = entities.filter(e => e.connection_count > 5);
    if (highlyConnected.length > 0) {
      recommendations.push(
        'Approfondir l\'investigation des entités centrales qui peuvent être des points clés du réseau'
      );
    }

    return recommendations.length > 0 ? recommendations : [
      'Continuer à enrichir le dossier avec de nouvelles entités et relations',
      'Vérifier la cohérence des informations collectées',
      'Documenter les sources et la fiabilité des données'
    ];
  }

  /**
   * Obtenir la description d'un template
   * @param {string} templateName - Nom du template
   * @returns {string} Description
   */
  static getTemplateDescription(templateName) {
    const descriptions = {
      'entity-report': 'Fiche d\'identité complète d\'une entité avec ses relations et attributs',
      'folder-summary': 'Résumé d\'un dossier d\'enquête avec vue d\'ensemble et statistiques',
      'network-analysis': 'Analyse approfondie du réseau avec métriques de centralité et clusters'
    };

    return descriptions[templateName] || 'Template personnalisé';
  }

  /**
   * Valider les paramètres d'export
   * @param {Object} params - Paramètres à valider
   * @returns {Object} Paramètres validés
   */
  static validateExportParams(params) {
    const {
      format = 'A4',
      watermark = false,
      watermarkText = 'CONFIDENTIEL',
      includeRelationships = true,
      includeFiles = true
    } = params;

    // Valider le format
    const validFormats = ['A4', 'A3', 'Letter', 'Legal'];
    if (!validFormats.includes(format.toUpperCase())) {
      throw new ValidationError(`Format invalide: ${format}. Formats supportés: ${validFormats.join(', ')}`);
    }

    // Valider le texte de filigrane
    if (watermarkText && watermarkText.length > 50) {
      throw new ValidationError('Le texte du filigrane ne peut pas dépasser 50 caractères');
    }

    return {
      format: format.toUpperCase(),
      watermark: watermark === 'true' || watermark === true,
      watermarkText: watermarkText || 'CONFIDENTIEL',
      includeRelationships: includeRelationships === 'true' || includeRelationships === true,
      includeFiles: includeFiles === 'true' || includeFiles === true
    };
  }

  /**
   * Obtenir les statistiques d'export
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async getExportStats(req, res) {
    try {
      const stats = {
        service: 'ExportController',
        templates: await TemplateService.getCacheInfo(),
        pdf: PDFService.getStats(),
        availableFormats: ['PDF', 'HTML', 'JSON'],
        features: {
          watermark: true,
          multiPage: true,
          customTemplates: true,
          batchExport: false // TODO: Implémenter l'export par lot
        }
      };

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      logger.error('Error getting export stats', { error: error.message });
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques d\'export'
      });
    }
  }

  /**
   * Tester la fonctionnalité d'export
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async testExport(req, res) {
    try {
      logger.info('Testing export functionality...');

      const testResults = {
        templates: false,
        pdf: false,
        overall: false
      };

      // Tester les templates
      try {
        const testData = {
          entity: {
            id: 999,
            name: 'Test Entity',
            type: 'person',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            attributes: { test: 'value' }
          }
        };

        await TemplateService.renderTemplate('entity-report', testData);
        testResults.templates = true;
        logger.info('Templates test passed');
      } catch (error) {
        logger.error('Templates test failed', { error: error.message });
      }

      // Tester le service PDF
      try {
        testResults.pdf = await PDFService.testService();
        if (testResults.pdf) {
          logger.info('PDF service test passed');
        }
      } catch (error) {
        logger.error('PDF service test failed', { error: error.message });
      }

      testResults.overall = testResults.templates && testResults.pdf;

      res.json({
        success: testResults.overall,
        message: testResults.overall 
          ? 'Tous les tests d\'export ont réussi' 
          : 'Certains tests d\'export ont échoué',
        results: testResults,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error testing export functionality', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Erreur lors du test des fonctionnalités d\'export'
      });
    }
  }
}

module.exports = ExportController;