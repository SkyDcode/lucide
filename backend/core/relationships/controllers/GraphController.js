// backend/core/relationships/controllers/GraphController.js - Contrôleur pour l'analyse de graphe
const GraphAnalysisService = require('../services/GraphAnalysisService');
const RelationshipService = require('../services/RelationshipService');
const { logger } = require('../../../shared/middleware/logging');
const { asyncHandler, ValidationError, NotFoundError } = require('../../../shared/middleware/errorHandler');

/**
 * Contrôleur pour l'analyse et la visualisation des graphes de relations
 * Fournit des endpoints pour l'analyse de réseaux et la génération de données de visualisation
 */
class GraphController {

  /**
   * Analyser le graphe complet d'un dossier
   * GET /api/relationships/folder/:folderId/graph/analysis
   */
  static analyzeGraph = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { 
      includePositions = true,
      includeWeights = true,
      includeCentrality = false,
      includeCommunities = false,
      includeRecommendations = true
    } = req.query;

    logger.info('Analyzing graph for folder', { 
      folderId, 
      options: { includePositions, includeWeights, includeCentrality, includeCommunities }
    });

    const options = {
      includePositions: includePositions === 'true',
      includeWeights: includeWeights === 'true'
    };

    const analysis = await GraphAnalysisService.analyzeGraph(folderId, options);

    // Filtrer les résultats selon les options demandées
    const response = {
      basicMetrics: analysis.basicMetrics,
      visualizationData: analysis.visualizationData,
      networkHealthScore: analysis.networkHealthScore
    };

    if (includeCentrality === 'true') {
      response.centralityMetrics = analysis.centralityMetrics;
    }

    if (includeCommunities === 'true') {
      response.communityDetection = analysis.communityDetection;
      response.clusteringMetrics = analysis.clusteringMetrics;
    }

    if (includeRecommendations === 'true') {
      response.recommendations = analysis.recommendations;
    }

    // Toujours inclure l'analyse des chemins pour la connectivité
    response.pathAnalysis = {
      isConnected: analysis.pathAnalysis.isConnected,
      componentCount: analysis.pathAnalysis.componentCount,
      diameter: analysis.pathAnalysis.diameter
    };

    res.json({
      success: true,
      data: response,
      metadata: {
        folderId: parseInt(folderId),
        analysisTimestamp: new Date().toISOString(),
        options
      }
    });
  });

  /**
   * Obtenir les données de visualisation pour D3.js
   * GET /api/relationships/folder/:folderId/graph/visualization
   */
  static getVisualizationData = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { 
      includePositions = true,
      includeWeights = true,
      filterTypes,
      minDegree = 0,
      maxNodes = 1000
    } = req.query;

    logger.info('Getting visualization data', { 
      folderId, 
      filterTypes, 
      minDegree, 
      maxNodes 
    });

    const options = {
      includePositions: includePositions === 'true',
      includeWeights: includeWeights === 'true'
    };

    const analysis = await GraphAnalysisService.analyzeGraph(folderId, options);
    let { nodes, links } = analysis.visualizationData;

    // Appliquer les filtres
    if (filterTypes) {
      const allowedTypes = filterTypes.split(',');
      nodes = nodes.filter(node => allowedTypes.includes(node.type));
      const nodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(link => nodeIds.has(link.source) && nodeIds.has(link.target));
    }

    if (minDegree > 0) {
      nodes = nodes.filter(node => node.degree >= parseInt(minDegree));
      const nodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(link => nodeIds.has(link.source) && nodeIds.has(link.target));
    }

    if (maxNodes && nodes.length > parseInt(maxNodes)) {
      // Garder les nœuds les plus connectés
      nodes = nodes
        .sort((a, b) => b.degree - a.degree)
        .slice(0, parseInt(maxNodes));
      const nodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(link => nodeIds.has(link.source) && nodeIds.has(link.target));
    }

    res.json({
      success: true,
      data: {
        nodes,
        links,
        metadata: {
          originalNodeCount: analysis.visualizationData.nodes.length,
          filteredNodeCount: nodes.length,
          originalLinkCount: analysis.visualizationData.links.length,
          filteredLinkCount: links.length,
          filters: { filterTypes, minDegree, maxNodes }
        }
      }
    });
  });

  /**
   * Calculer les métriques de centralité
   * GET /api/relationships/folder/:folderId/graph/centrality
   */
  static getCentralityMetrics = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { topN = 10 } = req.query;

    logger.info('Calculating centrality metrics', { folderId, topN });

    const analysis = await GraphAnalysisService.analyzeGraph(folderId);
    const centralityMetrics = analysis.centralityMetrics;

    // Enrichir avec les informations des entités
    const enrichTopNodes = (topNodes) => {
      return topNodes.map(node => ({
        ...node,
        centralityScore: Math.round(node.value * 1000) / 1000
      }));
    };

    const response = {
      degreeCentrality: centralityMetrics.degreeCentrality,
      closenessCentrality: centralityMetrics.closenessCentrality,
      betweennessCentrality: centralityMetrics.betweennessCentrality,
      topNodes: {
        byDegree: enrichTopNodes(centralityMetrics.topCentralNodes.byDegree.slice(0, topN)),
        byCloseness: enrichTopNodes(centralityMetrics.topCentralNodes.byCloseness.slice(0, topN)),
        byBetweenness: enrichTopNodes(centralityMetrics.topCentralNodes.byBetweenness.slice(0, topN)),
        overall: enrichTopNodes(centralityMetrics.topCentralNodes.overall.slice(0, topN))
      }
    };

    res.json({
      success: true,
      data: response,
      metadata: {
        folderId: parseInt(folderId),
        topN: parseInt(topN),
        calculatedAt: new Date().toISOString()
      }
    });
  });

  /**
   * Détecter les communautés dans le graphe
   * GET /api/relationships/folder/:folderId/graph/communities
   */
  static getCommunityDetection = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { minCommunitySize = 2 } = req.query;

    logger.info('Detecting communities', { folderId, minCommunitySize });

    const analysis = await GraphAnalysisService.analyzeGraph(folderId);
    const { communityDetection, clusteringMetrics } = analysis;

    // Filtrer les communautés par taille minimale
    const filteredCommunities = communityDetection.communityStats.filter(
      community => community.size >= parseInt(minCommunitySize)
    );

    res.json({
      success: true,
      data: {
        communities: filteredCommunities,
        totalCommunities: communityDetection.communityCount,
        filteredCommunities: filteredCommunities.length,
        modularity: communityDetection.modularity,
        clusteringCoefficient: clusteringMetrics.globalClustering,
        triangleCount: clusteringMetrics.triangleCount
      },
      metadata: {
        folderId: parseInt(folderId),
        minCommunitySize: parseInt(minCommunitySize),
        algorithm: 'simplified_louvain'
      }
    });
  });

  /**
   * Analyser les chemins entre entités
   * GET /api/relationships/graph/paths/:sourceId/:targetId
   */
  static analyzePaths = asyncHandler(async (req, res) => {
    const { sourceId, targetId } = req.params;
    const { maxPaths = 5, maxLength = 6 } = req.query;

    if (sourceId === targetId) {
      throw new ValidationError('Source and target entities must be different');
    }

    logger.info('Analyzing paths between entities', { 
      sourceId, targetId, maxPaths, maxLength 
    });

    // Récupérer le dossier des entités pour construire le graphe
    const EntityModel = require('../../entities/models/EntityModel');
    const [sourceEntity, targetEntity] = await Promise.all([
      EntityModel.findById(sourceId),
      EntityModel.findById(targetId)
    ]);

    if (!sourceEntity) {
      throw new NotFoundError('Source entity', sourceId);
    }
    if (!targetEntity) {
      throw new NotFoundError('Target entity', targetId);
    }

    // Utiliser le même dossier pour les deux entités
    const folderId = sourceEntity.folder_id;
    const analysis = await GraphAnalysisService.analyzeGraph(folderId);

    // Analyser les chemins (cette fonctionnalité devrait être ajoutée au service)
    const pathAnalysis = await this.findPathsBetweenEntities(
      analysis, 
      parseInt(sourceId), 
      parseInt(targetId), 
      { maxPaths: parseInt(maxPaths), maxLength: parseInt(maxLength) }
    );

    res.json({
      success: true,
      data: pathAnalysis,
      metadata: {
        sourceEntity: { id: sourceEntity.id, name: sourceEntity.name },
        targetEntity: { id: targetEntity.id, name: targetEntity.name },
        folderId,
        searchParams: { maxPaths, maxLength }
      }
    });
  });

  /**
   * Obtenir le score de santé du réseau
   * GET /api/relationships/folder/:folderId/graph/health
   */
  static getNetworkHealth = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { includeRecommendations = true } = req.query;

    logger.info('Getting network health score', { folderId });

    const analysis = await GraphAnalysisService.analyzeGraph(folderId);
    const healthScore = analysis.networkHealthScore;

    const response = {
      score: healthScore.score,
      maxScore: healthScore.maxScore,
      percentage: healthScore.percentage,
      grade: healthScore.grade,
      factors: healthScore.factors
    };

    if (includeRecommendations === 'true') {
      response.recommendations = healthScore.recommendations;
      response.generalRecommendations = analysis.recommendations;
    }

    res.json({
      success: true,
      data: response,
      metadata: {
        folderId: parseInt(folderId),
        evaluatedAt: new Date().toISOString()
      }
    });
  });

  /**
   * Exporter l'analyse complète du graphe
   * GET /api/relationships/folder/:folderId/graph/export
   */
  static exportGraphAnalysis = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { format = 'json', includeRawData = false } = req.query;

    logger.info('Exporting graph analysis', { folderId, format });

    const analysis = await GraphAnalysisService.analyzeGraph(folderId);

    if (format === 'json') {
      const exportData = GraphAnalysisService.exportAnalysis(analysis);
      
      if (includeRawData === 'true') {
        exportData.rawData = {
          nodes: analysis.visualizationData.nodes,
          links: analysis.visualizationData.links
        };
      }

      const filename = `graph-analysis-${folderId}-${new Date().toISOString().split('T')[0]}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    } else {
      throw new ValidationError('Only JSON format is currently supported');
    }
  });

  /**
   * Obtenir les métriques de base rapides
   * GET /api/relationships/folder/:folderId/graph/metrics
   */
  static getBasicMetrics = asyncHandler(async (req, res) => {
    const { folderId } = req.params;

    logger.info('Getting basic graph metrics', { folderId });

    const analysis = await GraphAnalysisService.analyzeGraph(folderId);
    const { basicMetrics, pathAnalysis, networkHealthScore } = analysis;

    res.json({
      success: true,
      data: {
        nodeCount: basicMetrics.nodeCount,
        edgeCount: basicMetrics.edgeCount,
        density: basicMetrics.density,
        avgDegree: basicMetrics.avgDegree,
        isConnected: pathAnalysis.isConnected,
        componentCount: pathAnalysis.componentCount,
        healthScore: networkHealthScore.score,
        healthGrade: networkHealthScore.grade,
        isolatedNodeCount: basicMetrics.isolatedNodeCount,
        typeDistribution: {
          nodes: basicMetrics.nodeTypeDistribution,
          edges: basicMetrics.edgeTypeDistribution
        }
      },
      metadata: {
        folderId: parseInt(folderId),
        timestamp: new Date().toISOString()
      }
    });
  });

  /**
   * Valider la structure du graphe
   * GET /api/relationships/folder/:folderId/graph/validate
   */
  static validateGraph = asyncHandler(async (req, res) => {
    const { folderId } = req.params;

    logger.info('Validating graph structure', { folderId });

    // Construire le graphe pour validation
    const EntityModel = require('../../entities/models/EntityModel');
    const RelationshipModel = require('../models/RelationshipModel');
    
    const [entities, relationships] = await Promise.all([
      EntityModel.getByFolder(folderId),
      RelationshipModel.getByFolder(folderId)
    ]);

    // Créer une structure de graphe simplifiée pour la validation
    const graph = {
      nodes: new Map(entities.map(e => [e.id, e])),
      edges: relationships
    };

    const validation = GraphAnalysisService.validateGraph(graph);

    res.json({
      success: true,
      data: validation,
      metadata: {
        folderId: parseInt(folderId),
        validatedAt: new Date().toISOString()
      }
    });
  });

  /**
   * Suggérer des améliorations pour le graphe
   * GET /api/relationships/folder/:folderId/graph/suggestions
   */
  static getGraphSuggestions = asyncHandler(async (req, res) => {
    const { folderId } = req.params;
    const { includeEntitySuggestions = true, includeStructuralSuggestions = true } = req.query;

    logger.info('Getting graph improvement suggestions', { folderId });

    const analysis = await GraphAnalysisService.analyzeGraph(folderId);
    const suggestions = {
      structural: [],
      entities: [],
      relationships: []
    };

    if (includeStructuralSuggestions === 'true') {
      suggestions.structural = analysis.recommendations;
    }

    if (includeEntitySuggestions === 'true') {
      // Utiliser le service de relations pour obtenir des suggestions d'entités
      try {
        const entitySuggestions = await RelationshipService.suggestRelationsForEntity(
          analysis.basicMetrics.isolatedNodes[0]?.id
        );
        suggestions.entities = entitySuggestions.slice(0, 5);
      } catch (error) {
        // Ignorer si pas d'entités isolées
      }
    }

    res.json({
      success: true,
      data: suggestions,
      metadata: {
        folderId: parseInt(folderId),
        generatedAt: new Date().toISOString()
      }
    });
  });

  // ===========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ===========================================

  /**
   * Trouver les chemins entre deux entités
   * @param {Object} analysis - Analyse du graphe
   * @param {number} sourceId - ID entité source
   * @param {number} targetId - ID entité cible
   * @param {Object} options - Options de recherche
   * @returns {Promise<Object>} Chemins trouvés
   * @private
   */
  static async findPathsBetweenEntities(analysis, sourceId, targetId, options = {}) {
    const { maxPaths = 5, maxLength = 6 } = options;
    
    // Construire un graphe simplifié pour la recherche de chemins
    const adjacencyList = new Map();
    const nodeNames = new Map();

    // Initialiser la liste d'adjacence
    analysis.visualizationData.nodes.forEach(node => {
      adjacencyList.set(node.id, new Set());
      nodeNames.set(node.id, node.name);
    });

    // Remplir la liste d'adjacence
    analysis.visualizationData.links.forEach(link => {
      adjacencyList.get(link.source)?.add(link.target);
      adjacencyList.get(link.target)?.add(link.source); // Graphe non-dirigé
    });

    // Recherche BFS pour trouver les chemins
    const paths = [];
    const queue = [[sourceId]];
    const visited = new Set();
    let shortestLength = Infinity;

    while (queue.length > 0 && paths.length < maxPaths) {
      const currentPath = queue.shift();
      const currentNode = currentPath[currentPath.length - 1];

      // Si le chemin est trop long, ignorer
      if (currentPath.length > maxLength) {
        continue;
      }

      // Si on a trouvé la cible
      if (currentNode === targetId) {
        const pathWithNames = currentPath.map(nodeId => ({
          id: nodeId,
          name: nodeNames.get(nodeId) || `Entity ${nodeId}`
        }));
        
        paths.push({
          path: pathWithNames,
          length: currentPath.length - 1, // Nombre d'arêtes
          score: this.calculatePathScore(currentPath, analysis)
        });
        
        shortestLength = Math.min(shortestLength, currentPath.length);
        continue;
      }

      // Si le chemin est déjà plus long que le plus court trouvé
      if (currentPath.length > shortestLength) {
        continue;
      }

      // Explorer les voisins
      const neighbors = adjacencyList.get(currentNode) || new Set();
      neighbors.forEach(neighbor => {
        if (!currentPath.includes(neighbor)) { // Éviter les cycles
          const newPath = [...currentPath, neighbor];
          const pathKey = newPath.join('-');
          
          if (!visited.has(pathKey)) {
            visited.add(pathKey);
            queue.push(newPath);
          }
        }
      });
    }

    // Trier les chemins par score (puis par longueur)
    paths.sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length; // Plus court d'abord
      }
      return b.score - a.score; // Meilleur score d'abord
    });

    return {
      paths: paths.slice(0, maxPaths),
      totalFound: paths.length,
      shortestLength: shortestLength === Infinity ? -1 : shortestLength - 1,
      searchStats: {
        maxPathsRequested: maxPaths,
        maxLengthAllowed: maxLength,
        nodesExplored: visited.size
      }
    };
  }

  /**
   * Calculer le score d'un chemin
   * @param {Array} path - Chemin entre entités
   * @param {Object} analysis - Analyse du graphe
   * @returns {number} Score du chemin
   * @private
   */
  static calculatePathScore(path, analysis) {
    let score = 0;
    
    // Score basé sur les degrés des nœuds intermédiaires
    for (let i = 1; i < path.length - 1; i++) {
      const nodeId = path[i];
      const node = analysis.visualizationData.nodes.find(n => n.id === nodeId);
      if (node) {
        score += node.degree; // Les nœuds bien connectés augmentent le score
      }
    }

    // Score basé sur les forces des relations
    for (let i = 0; i < path.length - 1; i++) {
      const sourceId = path[i];
      const targetId = path[i + 1];
      const link = analysis.visualizationData.links.find(l => 
        (l.source === sourceId && l.target === targetId) ||
        (l.source === targetId && l.target === sourceId)
      );
      
      if (link) {
        const strengthScore = { weak: 1, medium: 2, strong: 3 };
        score += strengthScore[link.strength] || 2;
      }
    }

    return score;
  }

  /**
   * Health check spécifique au module graphe
   * GET /api/relationships/graph/health
   */
  static healthCheck = asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'graph-analysis',
      checks: {
        graphAnalysisService: 'unknown',
        algorithms: 'unknown',
        visualization: 'unknown'
      }
    };

    try {
      // Test du service d'analyse
      const testAnalysis = GraphAnalysisService.getEmptyGraphAnalysis();
      health.checks.graphAnalysisService = testAnalysis ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.checks.graphAnalysisService = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Test des algorithmes de base
      const testGraph = {
        nodes: new Map([[1, { id: 1, degree: 0 }], [2, { id: 2, degree: 0 }]]),
        edges: [],
        adjacencyList: new Map([[1, new Set()], [2, new Set()]])
      };
      
      const validation = GraphAnalysisService.validateGraph(testGraph);
      health.checks.algorithms = validation.isValid ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.checks.algorithms = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Test de préparation des données de visualisation
      const testAnalysis = GraphAnalysisService.getEmptyGraphAnalysis();
      health.checks.visualization = testAnalysis.visualizationData ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.checks.visualization = 'unhealthy';
      health.status = 'degraded';
    }

    res.json({
      success: true,
      data: health
    });
  });

  /**
   * Middleware d'erreur spécifique au graphe
   */
  static handleGraphError = (err, req, res, next) => {
    logger.error('Graph analysis error', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      requestId: req.requestId,
      params: req.params,
      query: req.query
    });

    // Erreurs spécifiques à l'analyse de graphe
    if (err.message?.includes('graph')) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erreur lors de l\'analyse du graphe',
          code: 'GRAPH_ANALYSIS_ERROR',
          details: process.env.NODE_ENV === 'development' ? err.message : null
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Erreurs de mémoire (graphes trop grands)
    if (err.message?.includes('memory') || err.code === 'ERR_OUT_OF_MEMORY') {
      return res.status(507).json({
        success: false,
        error: {
          message: 'Graphe trop volumineux pour l\'analyse',
          code: 'GRAPH_TOO_LARGE',
          recommendation: 'Essayez de filtrer les données ou d\'analyser un sous-ensemble'
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Passer au gestionnaire d'erreur global
    next(err);
  };

  /**
   * Middleware de validation des paramètres de graphe
   */
  static validateGraphParams = (req, res, next) => {
    const { folderId } = req.params;
    
    if (folderId && (isNaN(parseInt(folderId)) || parseInt(folderId) <= 0)) {
      throw new ValidationError('ID de dossier invalide');
    }

    // Valider les paramètres de requête spécifiques au graphe
    const { topN, maxPaths, maxLength, minDegree, maxNodes } = req.query;
    
    if (topN && (isNaN(parseInt(topN)) || parseInt(topN) < 1 || parseInt(topN) > 100)) {
      throw new ValidationError('topN doit être entre 1 et 100');
    }
    
    if (maxPaths && (isNaN(parseInt(maxPaths)) || parseInt(maxPaths) < 1 || parseInt(maxPaths) > 50)) {
      throw new ValidationError('maxPaths doit être entre 1 et 50');
    }
    
    if (maxLength && (isNaN(parseInt(maxLength)) || parseInt(maxLength) < 2 || parseInt(maxLength) > 20)) {
      throw new ValidationError('maxLength doit être entre 2 et 20');
    }
    
    if (minDegree && (isNaN(parseInt(minDegree)) || parseInt(minDegree) < 0)) {
      throw new ValidationError('minDegree doit être >= 0');
    }
    
    if (maxNodes && (isNaN(parseInt(maxNodes)) || parseInt(maxNodes) < 1 || parseInt(maxNodes) > 10000)) {
      throw new ValidationError('maxNodes doit être entre 1 et 10000');
    }

    next();
  };

  /**
   * Middleware de mise en cache pour les analyses coûteuses
   */
  static cacheGraphAnalysis = (durationMinutes = 5) => {
    const cache = new Map();
    
    return (req, res, next) => {
      const cacheKey = `${req.originalUrl}:${JSON.stringify(req.query)}`;
      const cached = cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < durationMinutes * 60 * 1000) {
        logger.info('Serving cached graph analysis', { cacheKey });
        return res.json(cached.data);
      }
      
      // Intercepter la réponse pour la mettre en cache
      const originalJson = res.json;
      res.json = function(data) {
        if (data.success) {
          cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          
          // Nettoyer le cache périodiquement
          if (cache.size > 100) {
            const oldestKeys = Array.from(cache.keys()).slice(0, 20);
            oldestKeys.forEach(key => cache.delete(key));
          }
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  };
}

module.exports = GraphController;