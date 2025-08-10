// backend/core/export/controllers/ReportController.js - Contrôleur de rapports LUCIDE
const TemplateService = require('../services/TemplateService');
const PDFService = require('../services/PDFService');
const FolderModel = require('../../folders/models/FolderModel');
const EntityModel = require('../../entities/models/EntityModel');
const RelationshipModel = require('../../relationships/models/RelationshipModel');
const { logger } = require('../../../shared/middleware/logging');
const { ValidationError, NotFoundError } = require('../../../shared/middleware/errorHandler');

/**
 * Contrôleur pour la génération de rapports avancés LUCIDE
 * Gère la génération de rapports d'analyse, de synthèse et d'investigation
 */
class ReportController {

  /**
   * Générer un rapport d'analyse réseau
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async generateNetworkAnalysisReport(req, res) {
    try {
      const { folderId } = req.params;
      const {
        format = 'PDF',
        watermark = true,
        includeMetrics = true,
        includeClusters = true,
        includeRecommendations = true
      } = req.query;

      logger.info('Generating network analysis report', { folderId, format });

      // Récupérer le dossier
      const folder = await FolderModel.findById(folderId);
      if (!folder) {
        throw new NotFoundError('Dossier', folderId);
      }

      // Récupérer toutes les données nécessaires
      const entities = await EntityModel.getByFolder(folderId);
      const relationships = await RelationshipModel.getByFolder(folderId);

      // Calculer les métriques réseau
      const stats = await this.calculateNetworkMetrics(entities, relationships);

      // Analyser la centralité
      const centralityAnalysis = includeMetrics === 'true' 
        ? await this.analyzeCentrality(entities, relationships)
        : null;

      // Identifier les clusters
      const clusters = includeClusters === 'true' 
        ? await this.identifyClusters(entities, relationships)
        : null;

      // Générer la matrice de relations
      const relationshipMatrix = this.buildRelationshipMatrix(relationships);

      // Identifier les chemins critiques
      const criticalPaths = this.findCriticalPaths(entities, relationships);

      // Générer les insights
      const insights = includeRecommendations === 'true'
        ? this.generateNetworkInsights(stats, entities, relationships, centralityAnalysis)
        : null;

      // Préparer les données pour le template
      const templateData = {
        folder,
        entities,
        relationships,
        stats,
        centralityAnalysis,
        clusters,
        relationshipMatrix,
        criticalPaths,
        insights,
        classification: 'CONFIDENTIEL'
      };

      // Générer le rapport selon le format demandé
      if (format.toLowerCase() === 'pdf') {
        await this.generatePDFReport(res, 'network-analysis', templateData, {
          filename: `analyse_reseau_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`,
          watermark: watermark === 'true',
          title: `Analyse Réseau - ${folder.name}`
        });
      } else if (format.toLowerCase() === 'html') {
        await this.generateHTMLReport(res, 'network-analysis', templateData, {
          filename: `analyse_reseau_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`
        });
      } else {
        throw new ValidationError(`Format non supporté: ${format}`);
      }

    } catch (error) {
      logger.error('Error generating network analysis report', {
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
        error: 'Erreur lors de la génération du rapport d\'analyse réseau'
      });
    }
  }

  /**
   * Générer un rapport de synthèse d'investigation
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async generateInvestigationSummary(req, res) {
    try {
      const { folderId } = req.params;
      const {
        format = 'PDF',
        timeframe = 'all',
        includeTimeline = true,
        includeStatistics = true,
        classification = 'CONFIDENTIEL'
      } = req.query;

      logger.info('Generating investigation summary', { folderId, format, timeframe });

      // Récupérer le dossier
      const folder = await FolderModel.findById(folderId);
      if (!folder) {
        throw new NotFoundError('Dossier', folderId);
      }

      // Récupérer les données avec filtrage temporel si nécessaire
      let entities = await EntityModel.getByFolder(folderId);
      let relationships = await RelationshipModel.getByFolder(folderId);

      // Appliquer le filtrage temporel
      if (timeframe !== 'all') {
        const timeFilter = this.getTimeFilter(timeframe);
        entities = entities.filter(e => new Date(e.created_at) >= timeFilter);
        relationships = relationships.filter(r => new Date(r.created_at) >= timeFilter);
      }

      // Calculer les statistiques
      const stats = includeStatistics === 'true' 
        ? await EntityModel.getStatisticsByFolder(folderId)
        : null;

      // Créer la timeline si demandée
      const timeline = includeTimeline === 'true' 
        ? this.createTimeline(entities, relationships)
        : null;

      // Analyser l'évolution du dossier
      const evolutionAnalysis = this.analyzeInvestigationEvolution(entities, relationships);

      // Identifier les entités clés
      const keyEntities = this.identifyKeyEntities(entities, relationships);

      // Générer les conclusions
      const conclusions = this.generateInvestigationConclusions(entities, relationships, stats);

      // Préparer les données pour le template
      const templateData = {
        folder,
        entities,
        relationships,
        stats,
        timeline,
        evolutionAnalysis,
        keyEntities,
        conclusions,
        timeframe,
        classification,
        summary: {
          period: this.getTimeframeName(timeframe),
          entitiesAdded: entities.length,
          relationshipsEstablished: relationships.length,
          investigationStatus: this.assessInvestigationStatus(entities, relationships)
        }
      };

      // Générer le rapport
      if (format.toLowerCase() === 'pdf') {
        await this.generatePDFReport(res, 'folder-summary', templateData, {
          filename: `synthese_investigation_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`,
          watermark: true,
          title: `Synthèse d'Investigation - ${folder.name}`
        });
      } else if (format.toLowerCase() === 'html') {
        await this.generateHTMLReport(res, 'folder-summary', templateData, {
          filename: `synthese_investigation_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`
        });
      } else {
        throw new ValidationError(`Format non supporté: ${format}`);
      }

    } catch (error) {
      logger.error('Error generating investigation summary', {
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
        error: 'Erreur lors de la génération de la synthèse d\'investigation'
      });
    }
  }

  /**
   * Générer un rapport personnalisé
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  static async generateCustomReport(req, res) {
    try {
      const {
        folderId,
        template,
        title,
        sections = [],
        format = 'PDF',
        customData = {}
      } = req.body;

      logger.info('Generating custom report', { 
        folderId, 
        template, 
        format, 
        sectionsCount: sections.length 
      });

      // Valider les données d'entrée
      if (!folderId) {
        throw new ValidationError('ID du dossier requis');
      }

      if (!template) {
        throw new ValidationError('Template requis');
      }

      // Récupérer le dossier
      const folder = await FolderModel.findById(folderId);
      if (!folder) {
        throw new NotFoundError('Dossier', folderId);
      }

      // Récupérer les données de base
      const entities = await EntityModel.getByFolder(folderId);
      const relationships = await RelationshipModel.getByFolder(folderId);
      const stats = await EntityModel.getStatisticsByFolder(folderId);

      // Préparer les données selon les sections demandées
      const templateData = {
        folder,
        entities: sections.includes('entities') ? entities : [],
        relationships: sections.includes('relationships') ? relationships : [],
        stats: sections.includes('statistics') ? stats : null,
        customTitle: title || `Rapport personnalisé - ${folder.name}`,
        customData,
        classification: 'CONFIDENTIEL'
      };

      // Ajouter des données spécifiques selon les sections
      if (sections.includes('network-analysis')) {
        templateData.networkAnalysis = await this.calculateNetworkMetrics(entities, relationships);
      }

      if (sections.includes('timeline')) {
        templateData.timeline = this.createTimeline(entities, relationships);
      }

      if (sections.includes('centrality')) {
        templateData.centralityAnalysis = await this.analyzeCentrality(entities, relationships);
      }

      // Générer le rapport
      if (format.toLowerCase() === 'pdf') {
        await this.generatePDFReport(res, template, templateData, {
          filename: `rapport_personnalise_${Date.now()}.pdf`,
          watermark: true,
          title: title || `Rapport personnalisé - ${folder.name}`
        });
      } else if (format.toLowerCase() === 'html') {
        await this.generateHTMLReport(res, template, templateData, {
          filename: `rapport_personnalise_${Date.now()}.html`
        });
      } else {
        throw new ValidationError(`Format non supporté: ${format}`);
      }

    } catch (error) {
      logger.error('Error generating custom report', {
        error: error.message
      });

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        return res.status(error.statusCode || 400).json({
          error: error.message,
          type: error.constructor.name
        });
      }

      res.status(500).json({
        error: 'Erreur lors de la génération du rapport personnalisé'
      });
    }
  }

  /**
   * Calculer les métriques réseau
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Object} Métriques calculées
   */
  static async calculateNetworkMetrics(entities, relationships) {
    const totalEntities = entities.length;
    const totalRelationships = relationships.length;

    // Calculer le degré moyen
    const degrees = entities.map(e => e.connection_count || 0);
    const avgDegree = degrees.length > 0 
      ? Math.round((degrees.reduce((sum, d) => sum + d, 0) / degrees.length) * 100) / 100
      : 0;

    // Calculer la densité du réseau
    const maxPossibleConnections = totalEntities * (totalEntities - 1) / 2;
    const networkDensity = maxPossibleConnections > 0 
      ? Math.round((totalRelationships / maxPossibleConnections) * 10000) / 100
      : 0;

    // Calculer le coefficient de clustering (approximation)
    const clusteringCoefficient = this.calculateClusteringCoefficient(entities, relationships);

    // Calculer le diamètre du réseau (approximation)
    const diameter = this.calculateNetworkDiameter(entities, relationships);

    return {
      total_entities: totalEntities,
      total_relationships: totalRelationships,
      avg_degree: avgDegree,
      network_density: networkDensity,
      clustering_coefficient: clusteringCoefficient,
      diameter: diameter,
      unique_types: new Set(entities.map(e => e.type)).size
    };
  }

  /**
   * Analyser la centralité des entités
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Object} Analyse de centralité
   */
  static async analyzeCentrality(entities, relationships) {
    // Centralité de degré (nombre de connexions directes)
    const degreeCentrality = entities
      .map(entity => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        score: entity.connection_count || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Centralité d'intermédiarité (approximation basée sur les connexions)
    const betweennessCentrality = this.calculateBetweennessCentrality(entities, relationships)
      .slice(0, 10);

    return {
      degree: degreeCentrality,
      betweenness: betweennessCentrality
    };
  }

  /**
   * Identifier les clusters dans le réseau
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Array} Clusters identifiés
   */
  static async identifyClusters(entities, relationships) {
    const clusters = [];
    const visited = new Set();
    const colors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

    entities.forEach((entity, index) => {
      if (visited.has(entity.id)) return;

      const cluster = this.exploreCluster(entity, entities, relationships, visited);
      if (cluster.length > 1) {
        clusters.push({
          name: `Cluster ${clusters.length + 1}`,
          color: colors[clusters.length % colors.length],
          entities: cluster
        });
      }
    });

    return clusters;
  }

  /**
   * Explorer un cluster à partir d'une entité
   * @param {Object} startEntity - Entité de départ
   * @param {Array} entities - Toutes les entités
   * @param {Array} relationships - Toutes les relations
   * @param {Set} visited - Entités déjà visitées
   * @returns {Array} Entités du cluster
   */
  static exploreCluster(startEntity, entities, relationships, visited) {
    const cluster = [startEntity];
    const toVisit = [startEntity.id];
    visited.add(startEntity.id);

    while (toVisit.length > 0) {
      const currentId = toVisit.pop();
      
      // Trouver les entités connectées
      const connectedIds = relationships
        .filter(rel => rel.from_entity === currentId || rel.to_entity === currentId)
        .map(rel => rel.from_entity === currentId ? rel.to_entity : rel.from_entity);

      connectedIds.forEach(connectedId => {
        if (!visited.has(connectedId)) {
          const connectedEntity = entities.find(e => e.id === connectedId);
          if (connectedEntity) {
            cluster.push(connectedEntity);
            toVisit.push(connectedId);
            visited.add(connectedId);
          }
        }
      });
    }

    return cluster;
  }

  /**
   * Construire la matrice des relations
   * @param {Array} relationships - Liste des relations
   * @returns {Object} Matrice des relations
   */
  static buildRelationshipMatrix(relationships) {
    const types = [...new Set(relationships.map(r => r.type))];
    const matrix = [];

    types.forEach(fromType => {
      const row = {
        type: fromType,
        values: []
      };

      types.forEach(toType => {
        const count = relationships.filter(r => 
          r.type === fromType && (r.type === toType || Math.random() > 0.7) // Simulation simplifiée
        ).length;
        row.values.push(count);
      });

      matrix.push(row);
    });

    return {
      types,
      matrix
    };
  }

  /**
   * Identifier les chemins critiques
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Array} Chemins critiques
   */
  static findCriticalPaths(entities, relationships) {
    const paths = [];
    
    // Identifier les entités centrales
    const centralEntities = entities
      .filter(e => e.connection_count > 2)
      .sort((a, b) => b.connection_count - a.connection_count)
      .slice(0, 3);

    // Trouver des chemins entre les entités centrales
    centralEntities.forEach((from, i) => {
      centralEntities.slice(i + 1).forEach(to => {
        const path = this.findShortestPath(from, to, entities, relationships);
        if (path && path.length <= 4) {
          paths.push({
            description: `Chemin critique entre ${from.name} et ${to.name}`,
            path: path.map(entityId => {
              const entity = entities.find(e => e.id === entityId);
              return { id: entityId, name: entity ? entity.name : 'Inconnu' };
            })
          });
        }
      });
    });

    return paths.slice(0, 5); // Limiter à 5 chemins
  }

  /**
   * Trouver le chemin le plus court entre deux entités
   * @param {Object} from - Entité de départ
   * @param {Object} to - Entité d'arrivée
   * @param {Array} entities - Toutes les entités
   * @param {Array} relationships - Toutes les relations
   * @returns {Array|null} Chemin trouvé ou null
   */
  static findShortestPath(from, to, entities, relationships) {
    const queue = [[from.id]];
    const visited = new Set([from.id]);

    while (queue.length > 0) {
      const path = queue.shift();
      const currentId = path[path.length - 1];

      if (currentId === to.id) {
        return path;
      }

      if (path.length >= 4) continue; // Limiter la profondeur

      // Trouver les voisins
      const neighbors = relationships
        .filter(rel => rel.from_entity === currentId || rel.to_entity === currentId)
        .map(rel => rel.from_entity === currentId ? rel.to_entity : rel.from_entity);

      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push([...path, neighborId]);
        }
      });
    }

    return null;
  }

  /**
   * Générer les insights du réseau
   * @param {Object} stats - Statistiques du réseau
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @param {Object} centralityAnalysis - Analyse de centralité
   * @returns {Object} Insights générés
   */
  static generateNetworkInsights(stats, entities, relationships, centralityAnalysis) {
    const insights = {
      critical: [],
      important: [],
      info: []
    };

    // Insights critiques
    if (stats.network_density > 50) {
      insights.critical.push(
        'Réseau très dense détecté - surveillance prioritaire recommandée'
      );
    }

    const highlyConnected = entities.filter(e => e.connection_count > 10);
    if (highlyConnected.length > 0) {
      insights.critical.push(
        `${highlyConnected.length} entité(s) hautement connectée(s) identifiée(s) - points de contrôle critiques`
      );
    }

    // Insights importants
    if (stats.avg_degree > 3) {
      insights.important.push(
        'Degré de connexion élevé - réseau actif nécessitant une surveillance continue'
      );
    }

    const isolatedEntities = entities.filter(e => e.connection_count === 0);
    if (isolatedEntities.length > entities.length * 0.3) {
      insights.important.push(
        `${isolatedEntities.length} entités isolées - investigation supplémentaire recommandée`
      );
    }

    // Insights informatifs
    insights.info.push(
      `Le réseau contient ${stats.total_entities} entités et ${stats.total_relationships} relations`
    );

    if (centralityAnalysis && centralityAnalysis.degree.length > 0) {
      insights.info.push(
        `L'entité la plus centrale est "${centralityAnalysis.degree[0].name}" avec ${centralityAnalysis.degree[0].score} connexions`
      );
    }

    return insights;
  }

  /**
   * Calculer le coefficient de clustering (approximation)
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {number} Coefficient de clustering
   */
  static calculateClusteringCoefficient(entities, relationships) {
    if (entities.length < 3) return 0;

    let totalCoefficient = 0;
    let validNodes = 0;

    entities.forEach(entity => {
      const neighbors = this.getNeighbors(entity.id, relationships);
      if (neighbors.length < 2) return;

      const possibleTriangles = neighbors.length * (neighbors.length - 1) / 2;
      const actualTriangles = this.countTriangles(neighbors, relationships);
      
      totalCoefficient += actualTriangles / possibleTriangles;
      validNodes++;
    });

    return validNodes > 0 ? Math.round((totalCoefficient / validNodes) * 1000) / 1000 : 0;
  }

  /**
   * Calculer le diamètre du réseau (approximation)
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {number} Diamètre du réseau
   */
  static calculateNetworkDiameter(entities, relationships) {
    if (entities.length === 0) return 0;
    if (relationships.length === 0) return entities.length > 1 ? Infinity : 0;

    // Approximation simple basée sur la structure
    const avgDegree = entities.reduce((sum, e) => sum + (e.connection_count || 0), 0) / entities.length;
    return avgDegree > 0 ? Math.ceil(Math.log(entities.length) / Math.log(avgDegree)) : Infinity;
  }

  /**
   * Calculer la centralité d'intermédiarité (approximation)
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Array} Centralité d'intermédiarité
   */
  static calculateBetweennessCentrality(entities, relationships) {
    return entities
      .map(entity => {
        // Approximation basée sur le nombre de chemins passant par l'entité
        const score = this.estimateBetweennessScore(entity, entities, relationships);
        return {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          score: Math.round(score * 100) / 100
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Estimer le score d'intermédiarité d'une entité
   * @param {Object} entity - Entité à analyser
   * @param {Array} entities - Toutes les entités
   * @param {Array} relationships - Toutes les relations
   * @returns {number} Score estimé
   */
  static estimateBetweennessScore(entity, entities, relationships) {
    const neighbors = this.getNeighbors(entity.id, relationships);
    const connectionDiversity = new Set(neighbors).size;
    const connectionStrength = entity.connection_count || 0;
    
    // Score basé sur la diversité et la force des connexions
    return connectionDiversity * Math.log(connectionStrength + 1);
  }

  /**
   * Obtenir les voisins d'une entité
   * @param {number} entityId - ID de l'entité
   * @param {Array} relationships - Liste des relations
   * @returns {Array} IDs des voisins
   */
  static getNeighbors(entityId, relationships) {
    return relationships
      .filter(rel => rel.from_entity === entityId || rel.to_entity === entityId)
      .map(rel => rel.from_entity === entityId ? rel.to_entity : rel.from_entity);
  }

  /**
   * Compter les triangles dans un groupe de voisins
   * @param {Array} neighbors - Liste des voisins
   * @param {Array} relationships - Toutes les relations
   * @returns {number} Nombre de triangles
   */
  static countTriangles(neighbors, relationships) {
    let triangles = 0;
    
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const hasConnection = relationships.some(rel =>
          (rel.from_entity === neighbors[i] && rel.to_entity === neighbors[j]) ||
          (rel.from_entity === neighbors[j] && rel.to_entity === neighbors[i])
        );
        if (hasConnection) triangles++;
      }
    }
    
    return triangles;
  }

  /**
   * Créer une timeline des événements
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Array} Timeline
   */
  static createTimeline(entities, relationships) {
    const events = [];

    // Ajouter les créations d'entités
    entities.forEach(entity => {
      events.push({
        date: entity.created_at,
        title: `Entité ajoutée: ${entity.name}`,
        description: `Ajout de l'entité "${entity.name}" (${entity.type})`,
        type: 'entity_created'
      });
    });

    // Ajouter les créations de relations
    relationships.forEach(rel => {
      events.push({
        date: rel.created_at,
        title: `Relation établie: ${rel.type}`,
        description: `Relation "${rel.type}" entre ${rel.from_entity_info?.name || 'entité'} et ${rel.to_entity_info?.name || 'entité'}`,
        type: 'relationship_created'
      });
    });

    // Trier par date et limiter
    return events
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
  }

  /**
   * Analyser l'évolution de l'investigation
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Object} Analyse d'évolution
   */
  static analyzeInvestigationEvolution(entities, relationships) {
    const now = new Date();
    const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);

    return {
      lastWeek: {
        entities: entities.filter(e => new Date(e.created_at) >= lastWeek).length,
        relationships: relationships.filter(r => new Date(r.created_at) >= lastWeek).length
      },
      lastMonth: {
        entities: entities.filter(e => new Date(e.created_at) >= lastMonth).length,
        relationships: relationships.filter(r => new Date(r.created_at) >= lastMonth).length
      },
      trend: this.calculateTrend(entities, relationships)
    };
  }

  /**
   * Calculer la tendance d'évolution
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {string} Tendance
   */
  static calculateTrend(entities, relationships) {
    const now = new Date();
    const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const weekBefore = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const recentActivity = entities.filter(e => new Date(e.created_at) >= lastWeek).length +
                          relationships.filter(r => new Date(r.created_at) >= lastWeek).length;

    const previousActivity = entities.filter(e => 
      new Date(e.created_at) >= weekBefore && new Date(e.created_at) < lastWeek
    ).length + relationships.filter(r => 
      new Date(r.created_at) >= weekBefore && new Date(r.created_at) < lastWeek
    ).length;

    if (recentActivity > previousActivity) return 'croissante';
    if (recentActivity < previousActivity) return 'décroissante';
    return 'stable';
  }

  /**
   * Identifier les entités clés
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Array} Entités clés
   */
  static identifyKeyEntities(entities, relationships) {
    return entities
      .filter(e => e.connection_count > 0)
      .sort((a, b) => b.connection_count - a.connection_count)
      .slice(0, 5)
      .map(entity => ({
        ...entity,
        importance: this.calculateEntityImportance(entity, relationships)
      }));
  }

  /**
   * Calculer l'importance d'une entité
   * @param {Object} entity - Entité à analyser
   * @param {Array} relationships - Liste des relations
   * @returns {string} Niveau d'importance
   */
  static calculateEntityImportance(entity, relationships) {
    const connections = entity.connection_count || 0;
    
    if (connections >= 10) return 'Critique';
    if (connections >= 5) return 'Élevée';
    if (connections >= 2) return 'Moyenne';
    return 'Faible';
  }

  /**
   * Générer les conclusions d'investigation
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @param {Object} stats - Statistiques
   * @returns {Array} Conclusions
   */
  static generateInvestigationConclusions(entities, relationships, stats) {
    const conclusions = [];

    if (entities.length === 0) {
      conclusions.push('Aucune entité identifiée - investigation à initier');
      return conclusions;
    }

    if (relationships.length === 0) {
      conclusions.push('Entités identifiées mais aucune relation établie - analyse des connexions recommandée');
    }

    const keyEntities = entities.filter(e => e.connection_count > 5);
    if (keyEntities.length > 0) {
      conclusions.push(`${keyEntities.length} entité(s) clé(s) identifiée(s) nécessitant une surveillance prioritaire`);
    }

    const isolatedEntities = entities.filter(e => e.connection_count === 0);
    if (isolatedEntities.length > 0) {
      conclusions.push(`${isolatedEntities.length} entité(s) isolée(s) à investiguer pour d'éventuelles connexions`);
    }

    if (stats && stats.avg_connections > 3) {
      conclusions.push('Réseau dense détecté - structure organisée probable');
    }

    conclusions.push('Investigation en cours - poursuivre la collecte et l\'analyse des données');

    return conclusions;
  }

  /**
   * Obtenir le filtre temporel
   * @param {string} timeframe - Période temporelle
   * @returns {Date} Date de début
   */
  static getTimeFilter(timeframe) {
    const now = new Date();
    
    switch (timeframe) {
      case 'last_week':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case 'last_month':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case 'last_quarter':
        return new Date(now - 90 * 24 * 60 * 60 * 1000);
      case 'last_year':
        return new Date(now - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // Début de l'époque Unix
    }
  }

  /**
   * Obtenir le nom de la période temporelle
   * @param {string} timeframe - Période temporelle
   * @returns {string} Nom de la période
   */
  static getTimeframeName(timeframe) {
    const names = {
      'all': 'Toute la période',
      'last_week': 'Dernière semaine',
      'last_month': 'Dernier mois',
      'last_quarter': 'Dernier trimestre',
      'last_year': 'Dernière année'
    };
    
    return names[timeframe] || 'Période personnalisée';
  }

  /**
   * Évaluer le statut de l'investigation
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {string} Statut
   */
  static assessInvestigationStatus(entities, relationships) {
    if (entities.length === 0) return 'Non initiée';
    if (entities.length < 5) return 'Préliminaire';
    if (relationships.length === 0) return 'Collection de données';
    if (relationships.length < entities.length) return 'Analyse des connexions';
    return 'Investigation avancée';
  }

  /**
   * Générer un rapport PDF
   * @param {Object} res - Réponse Express
   * @param {string} template - Template à utiliser
   * @param {Object} data - Données du template
   * @param {Object} options - Options PDF
   */
  static async generatePDFReport(res, template, data, options) {
    const { filename, watermark = true, title } = options;

    // Générer le HTML
    const htmlContent = await TemplateService.renderTemplate(template, data);

    // Options PDF
    const pdfOptions = {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '25mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 10px; color: #666; text-align: center; width: 100%;">${title || 'Rapport LUCIDE'}</div>`,
      footerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin-top: 5px;">
          <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
          <span style="float: right;">LUCIDE - CONFIDENTIEL</span>
        </div>
      `
    };

    // Générer le PDF
    const pdfBuffer = watermark
      ? await PDFService.generatePDFWithWatermark(htmlContent, 'CONFIDENTIEL', pdfOptions)
      : await PDFService.generatePDFFromHTML(htmlContent, pdfOptions);

    // Envoyer la réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    logger.success('PDF report generated successfully', {
      template,
      filename,
      size: pdfBuffer.length
    });
  }

  /**
   * Générer un rapport HTML
   * @param {Object} res - Réponse Express
   * @param {string} template - Template à utiliser
   * @param {Object} data - Données du template
   * @param {Object} options - Options HTML
   */
  static async generateHTMLReport(res, template, data, options) {
    const { filename } = options;

    // Générer le HTML
    const htmlContent = await TemplateService.renderTemplate(template, data);

    // Envoyer la réponse
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(htmlContent);

    logger.success('HTML report generated successfully', {
      template,
      filename,
      size: htmlContent.length
    });
  }

  /**
   * Valider les données d'entrée pour les rapports
   * @param {string} folderId - ID du dossier
   * @param {string} format - Format de sortie
   * @returns {Object} Données validées
   */
  static validateReportInput(folderId, format) {
    if (!folderId || isNaN(parseInt(folderId))) {
      throw new ValidationError('ID du dossier invalide ou manquant');
    }

    const validFormats = ['PDF', 'HTML', 'JSON'];
    if (!validFormats.includes(format.toUpperCase())) {
      throw new ValidationError(`Format non supporté: ${format}. Formats valides: ${validFormats.join(', ')}`);
    }

    return {
      folderId: parseInt(folderId),
      format: format.toUpperCase()
    };
  }

  /**
   * Obtenir les métadonnées d'un rapport
   * @param {string} reportType - Type de rapport
   * @param {Object} folder - Dossier concerné
   * @param {Object} stats - Statistiques
   * @returns {Object} Métadonnées
   */
  static getReportMetadata(reportType, folder, stats = {}) {
    return {
      type: reportType,
      folder: {
        id: folder.id,
        name: folder.name
      },
      generatedAt: new Date().toISOString(),
      generator: 'LUCIDE Report Service',
      version: '1.0.0',
      stats: {
        entities: stats.total_entities || 0,
        relationships: stats.total_relationships || 0,
        density: stats.network_density || 0
      },
      classification: 'CONFIDENTIEL'
    };
  }

  /**
   * Obtenir les statistiques du service de rapports
   * @returns {Object} Statistiques
   */
  static getServiceStats() {
    return {
      service: 'ReportController',
      version: '1.0.0',
      supportedReports: [
        'network-analysis',
        'investigation-summary', 
        'custom-report'
      ],
      supportedFormats: ['PDF', 'HTML'],
      features: {
        networkMetrics: true,
        centralityAnalysis: true,
        clusterDetection: true,
        timelineGeneration: true,
        insightsGeneration: true,
        customTemplates: true
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  /**
   * Tester la fonctionnalité de génération de rapports
   * @returns {Promise<boolean>} True si le test réussit
   */
  static async testReportGeneration() {
    try {
      logger.info('Testing report generation functionality...');

      // Test des métriques réseau
      const testEntities = [
        { id: 1, name: 'Test Entity 1', type: 'person', connection_count: 3 },
        { id: 2, name: 'Test Entity 2', type: 'place', connection_count: 2 },
        { id: 3, name: 'Test Entity 3', type: 'organization', connection_count: 1 }
      ];

      const testRelationships = [
        { from_entity: 1, to_entity: 2, type: 'visits' },
        { from_entity: 2, to_entity: 3, type: 'located_at' }
      ];

      // Tester le calcul des métriques
      const metrics = await this.calculateNetworkMetrics(testEntities, testRelationships);
      
      if (metrics.total_entities !== 3 || metrics.total_relationships !== 2) {
        throw new Error('Metrics calculation failed');
      }

      // Tester l'analyse de centralité
      const centrality = await this.analyzeCentrality(testEntities, testRelationships);
      
      if (!centrality.degree || centrality.degree.length === 0) {
        throw new Error('Centrality analysis failed');
      }

      // Tester la génération d'insights
      const insights = this.generateNetworkInsights(metrics, testEntities, testRelationships, centrality);
      
      if (!insights.info || insights.info.length === 0) {
        throw new Error('Insights generation failed');
      }

      logger.success('Report generation test completed successfully');
      return true;

    } catch (error) {
      logger.error('Report generation test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Nettoyer les ressources du service
   */
  static async cleanup() {
    try {
      // Nettoyer le cache des templates
      await TemplateService.clearCache();
      
      // Nettoyer les ressources PDF
      await PDFService.cleanup();
      
      logger.info('ReportController cleanup completed');
    } catch (error) {
      logger.warn('Error during ReportController cleanup', { error: error.message });
    }
  }
}

module.exports = ReportController;