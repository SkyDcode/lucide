// backend/core/relationships/services/GraphAnalysisService.js - Service d'analyse de graphe
const RelationshipModel = require('../models/RelationshipModel');
const EntityModel = require('../../entities/models/EntityModel');
const { logger } = require('../../../shared/middleware/logging');

/**
 * Service d'analyse avancée des graphes de relations
 * Fournit des algorithmes et métriques pour analyser les réseaux d'entités
 */
class GraphAnalysisService {

  /**
   * Analyser le graphe d'un dossier avec métriques complètes
   * @param {number} folderId - ID du dossier
   * @param {Object} options - Options d'analyse
   * @returns {Promise<Object>} Analyse complète du graphe
   */
  static async analyzeGraph(folderId, options = {}) {
    try {
      logger.info('Starting graph analysis', { folderId, options });

      // Récupérer les données du graphe
      const [entities, relationships] = await Promise.all([
        EntityModel.getByFolder(folderId),
        RelationshipModel.getByFolder(folderId)
      ]);

      if (entities.length === 0) {
        return this.getEmptyGraphAnalysis();
      }

      // Construire le graphe
      const graph = this.buildGraph(entities, relationships);

      // Calculer toutes les métriques
      const analysis = {
        basicMetrics: this.calculateBasicMetrics(graph),
        centralityMetrics: this.calculateCentralityMetrics(graph),
        clusteringMetrics: this.calculateClusteringMetrics(graph),
        communityDetection: await this.detectCommunities(graph),
        pathAnalysis: this.analyzeShortestPaths(graph),
        networkHealthScore: this.calculateNetworkHealthScore(graph),
        recommendations: this.generateRecommendations(graph),
        visualizationData: this.prepareVisualizationData(graph, options)
      };

      logger.success('Graph analysis completed', {
        folderId,
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length,
        healthScore: analysis.networkHealthScore
      });

      return analysis;

    } catch (error) {
      logger.error('Error in graph analysis', { folderId, error: error.message });
      throw error;
    }
  }

  /**
   * Construire la structure de graphe depuis les entités et relations
   * @param {Array} entities - Liste des entités
   * @param {Array} relationships - Liste des relations
   * @returns {Object} Structure de graphe
   * @private
   */
  static buildGraph(entities, relationships) {
    const graph = {
      nodes: new Map(),
      edges: [],
      adjacencyList: new Map(),
      nodeTypes: new Map(),
      edgeTypes: new Map()
    };

    // Ajouter les nœuds (entités)
    entities.forEach(entity => {
      const node = {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        attributes: entity.attributes || {},
        degree: 0,
        inDegree: 0,
        outDegree: 0,
        strength: 0,
        position: { x: entity.x || 0, y: entity.y || 0 }
      };
      
      graph.nodes.set(entity.id, node);
      graph.adjacencyList.set(entity.id, new Set());
      
      // Compter les types de nœuds
      const typeCount = graph.nodeTypes.get(entity.type) || 0;
      graph.nodeTypes.set(entity.type, typeCount + 1);
    });

    // Ajouter les arêtes (relations)
    relationships.forEach(rel => {
      const edge = {
        id: rel.id,
        source: rel.from_entity,
        target: rel.to_entity,
        type: rel.type,
        strength: rel.strength || 'medium',
        weight: this.getRelationshipWeight(rel.strength),
        description: rel.description
      };
      
      graph.edges.push(edge);
      
      // Mettre à jour les listes d'adjacence
      if (graph.adjacencyList.has(rel.from_entity)) {
        graph.adjacencyList.get(rel.from_entity).add(rel.to_entity);
      }
      if (graph.adjacencyList.has(rel.to_entity)) {
        graph.adjacencyList.get(rel.to_entity).add(rel.from_entity);
      }

      // Mettre à jour les degrés des nœuds
      if (graph.nodes.has(rel.from_entity)) {
        const fromNode = graph.nodes.get(rel.from_entity);
        fromNode.outDegree++;
        fromNode.degree++;
        fromNode.strength += edge.weight;
      }
      
      if (graph.nodes.has(rel.to_entity)) {
        const toNode = graph.nodes.get(rel.to_entity);
        toNode.inDegree++;
        toNode.degree++;
        toNode.strength += edge.weight;
      }

      // Compter les types d'arêtes
      const typeCount = graph.edgeTypes.get(rel.type) || 0;
      graph.edgeTypes.set(rel.type, typeCount + 1);
    });

    return graph;
  }

  /**
   * Calculer les métriques de base du graphe
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Métriques de base
   * @private
   */
  static calculateBasicMetrics(graph) {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.length;
    
    // Densité du graphe
    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    // Degrés
    const degrees = Array.from(graph.nodes.values()).map(node => node.degree);
    const avgDegree = degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
    const minDegree = degrees.length > 0 ? Math.min(...degrees) : 0;

    // Nœuds isolés
    const isolatedNodes = Array.from(graph.nodes.values()).filter(node => node.degree === 0);

    // Distribution des types
    const nodeTypeDistribution = Object.fromEntries(graph.nodeTypes);
    const edgeTypeDistribution = Object.fromEntries(graph.edgeTypes);

    return {
      nodeCount,
      edgeCount,
      density: Math.round(density * 1000) / 1000,
      avgDegree: Math.round(avgDegree * 100) / 100,
      maxDegree,
      minDegree,
      isolatedNodeCount: isolatedNodes.length,
      isolatedNodes: isolatedNodes.map(n => ({ id: n.id, name: n.name })),
      nodeTypeDistribution,
      edgeTypeDistribution
    };
  }

  /**
   * Calculer les métriques de centralité
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Métriques de centralité
   * @private
   */
  static calculateCentralityMetrics(graph) {
    const nodes = Array.from(graph.nodes.values());
    
    // Centralité de degré
    const degreeCentrality = this.calculateDegreeCentrality(graph);
    
    // Centralité de proximité (approximation pour les grands graphes)
    const closenessCentrality = this.calculateClosenessCentrality(graph);
    
    // Centralité d'intermédiarité (approximation)
    const betweennessCentrality = this.calculateBetweennessCentrality(graph);

    // Identifier les nœuds les plus centraux
    const topCentralNodes = this.getTopCentralNodes(graph, {
      degree: degreeCentrality,
      closeness: closenessCentrality,
      betweenness: betweennessCentrality
    });

    return {
      degreeCentrality,
      closenessCentrality,
      betweennessCentrality,
      topCentralNodes
    };
  }

  /**
   * Calculer la centralité de degré
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Centralités de degré normalisées
   * @private
   */
  static calculateDegreeCentrality(graph) {
    const nodeCount = graph.nodes.size;
    const centrality = {};
    
    if (nodeCount <= 1) return centrality;

    graph.nodes.forEach((node, nodeId) => {
      // Normaliser par le nombre maximum de connexions possibles
      centrality[nodeId] = node.degree / (nodeCount - 1);
    });

    return centrality;
  }

  /**
   * Calculer la centralité de proximité (version simplifiée)
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Centralités de proximité
   * @private
   */
  static calculateClosenessCentrality(graph) {
    const centrality = {};
    const nodeIds = Array.from(graph.nodes.keys());

    nodeIds.forEach(nodeId => {
      const distances = this.dijkstra(graph, nodeId);
      const validDistances = Object.values(distances).filter(d => d !== Infinity);
      
      if (validDistances.length > 1) {
        const sumDistances = validDistances.reduce((a, b) => a + b, 0);
        centrality[nodeId] = (validDistances.length - 1) / sumDistances;
      } else {
        centrality[nodeId] = 0;
      }
    });

    return centrality;
  }

  /**
   * Calculer la centralité d'intermédiarité (version simplifiée)
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Centralités d'intermédiarité
   * @private
   */
  static calculateBetweennessCentrality(graph) {
    const centrality = {};
    const nodeIds = Array.from(graph.nodes.keys());
    
    // Initialiser
    nodeIds.forEach(id => centrality[id] = 0);

    // Pour chaque paire de nœuds, calculer les chemins les plus courts
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const source = nodeIds[i];
        const target = nodeIds[j];
        
        const paths = this.findShortestPaths(graph, source, target);
        if (paths.length > 0) {
          paths.forEach(path => {
            // Chaque nœud intermédiaire gagne 1/nombre_de_chemins
            for (let k = 1; k < path.length - 1; k++) {
              centrality[path[k]] += 1 / paths.length;
            }
          });
        }
      }
    }

    // Normaliser
    const n = nodeIds.length;
    const normFactor = (n - 1) * (n - 2) / 2;
    if (normFactor > 0) {
      nodeIds.forEach(id => {
        centrality[id] /= normFactor;
      });
    }

    return centrality;
  }

  /**
   * Calculer les métriques de clustering
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Métriques de clustering
   * @private
   */
  static calculateClusteringMetrics(graph) {
    const localClustering = {};
    let globalClustering = 0;
    let triangleCount = 0;
    let validNodeCount = 0;

    graph.nodes.forEach((node, nodeId) => {
      const neighbors = Array.from(graph.adjacencyList.get(nodeId) || []);
      const degree = neighbors.length;

      if (degree < 2) {
        localClustering[nodeId] = 0;
        return;
      }

      // Compter les triangles (connexions entre voisins)
      let edgesAmongNeighbors = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (graph.adjacencyList.get(neighbors[i])?.has(neighbors[j])) {
            edgesAmongNeighbors++;
          }
        }
      }

      // Coefficient de clustering local
      const maxPossibleEdges = degree * (degree - 1) / 2;
      localClustering[nodeId] = maxPossibleEdges > 0 ? edgesAmongNeighbors / maxPossibleEdges : 0;
      
      globalClustering += localClustering[nodeId];
      triangleCount += edgesAmongNeighbors;
      validNodeCount++;
    });

    // Coefficient de clustering global (moyenne)
    globalClustering = validNodeCount > 0 ? globalClustering / validNodeCount : 0;

    return {
      localClustering,
      globalClustering: Math.round(globalClustering * 1000) / 1000,
      triangleCount,
      transitivity: this.calculateTransitivity(graph)
    };
  }

  /**
   * Détecter les communautés dans le graphe
   * @param {Object} graph - Structure du graphe
   * @returns {Promise<Object>} Communautés détectées
   * @private
   */
  static async detectCommunities(graph) {
    // Utiliser un algorithme simple de détection de communautés
    // (Louvain simplifié ou modularité)
    
    const communities = this.simpleLouvainCommunityDetection(graph);
    
    return {
      communities,
      communityCount: communities.length,
      modularity: this.calculateModularity(graph, communities),
      communityStats: communities.map((community, index) => ({
        id: index,
        size: community.length,
        nodes: community.map(nodeId => ({
          id: nodeId,
          name: graph.nodes.get(nodeId)?.name
        }))
      }))
    };
  }

  /**
   * Analyser les chemins les plus courts
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Analyse des chemins
   * @private
   */
  static analyzeShortestPaths(graph) {
    const nodeIds = Array.from(graph.nodes.keys());
    const allDistances = [];
    let totalDistance = 0;
    let pathCount = 0;
    let maxDistance = 0;
    let diameter = 0;

    // Calculer les distances entre toutes les paires
    for (let i = 0; i < nodeIds.length; i++) {
      const distances = this.dijkstra(graph, nodeIds[i]);
      
      for (let j = i + 1; j < nodeIds.length; j++) {
        const distance = distances[nodeIds[j]];
        if (distance !== Infinity) {
          allDistances.push(distance);
          totalDistance += distance;
          pathCount++;
          maxDistance = Math.max(maxDistance, distance);
        }
      }
    }

    diameter = maxDistance;
    const avgPathLength = pathCount > 0 ? totalDistance / pathCount : 0;
    
    // Connectivité
    const components = this.findConnectedComponents(graph);
    const isConnected = components.length === 1;

    return {
      diameter,
      avgPathLength: Math.round(avgPathLength * 100) / 100,
      maxDistance,
      isConnected,
      componentCount: components.length,
      largestComponentSize: components.length > 0 ? Math.max(...components.map(c => c.length)) : 0,
      components: components.map((component, index) => ({
        id: index,
        size: component.length,
        nodes: component.slice(0, 10) // Limiter pour l'affichage
      }))
    };
  }

  /**
   * Calculer le score de santé du réseau
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Score de santé
   * @private
   */
  static calculateNetworkHealthScore(graph) {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.length;
    
    let score = 0;
    const factors = {};

    // Facteur 1: Taille du réseau (0-25 points)
    if (nodeCount >= 20) factors.size = 25;
    else if (nodeCount >= 10) factors.size = 20;
    else if (nodeCount >= 5) factors.size = 15;
    else if (nodeCount >= 2) factors.size = 10;
    else factors.size = 0;

    // Facteur 2: Densité (0-25 points)
    const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1) / 2) : 0;
    if (density >= 0.3) factors.density = 25;
    else if (density >= 0.2) factors.density = 20;
    else if (density >= 0.1) factors.density = 15;
    else if (density >= 0.05) factors.density = 10;
    else factors.density = 0;

    // Facteur 3: Connectivité (0-25 points)
    const components = this.findConnectedComponents(graph);
    const isConnected = components.length === 1;
    if (isConnected) factors.connectivity = 25;
    else if (components.length <= 2) factors.connectivity = 15;
    else if (components.length <= nodeCount * 0.3) factors.connectivity = 10;
    else factors.connectivity = 0;

    // Facteur 4: Diversité des types (0-25 points)
    const uniqueNodeTypes = graph.nodeTypes.size;
    const uniqueEdgeTypes = graph.edgeTypes.size;
    if (uniqueNodeTypes >= 5 && uniqueEdgeTypes >= 3) factors.diversity = 25;
    else if (uniqueNodeTypes >= 3 && uniqueEdgeTypes >= 2) factors.diversity = 20;
    else if (uniqueNodeTypes >= 2) factors.diversity = 15;
    else factors.diversity = 10;

    score = Object.values(factors).reduce((a, b) => a + b, 0);

    return {
      score,
      maxScore: 100,
      percentage: score,
      grade: this.getHealthGrade(score),
      factors,
      recommendations: this.getHealthRecommendations(factors, graph)
    };
  }

  /**
   * Générer des recommandations d'amélioration
   * @param {Object} graph - Structure du graphe
   * @returns {Array} Recommandations
   * @private
   */
  static generateRecommendations(graph) {
    const recommendations = [];
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.length;

    // Nœuds isolés
    const isolatedNodes = Array.from(graph.nodes.values()).filter(n => n.degree === 0);
    if (isolatedNodes.length > 0) {
      recommendations.push({
        type: 'isolated_nodes',
        priority: 'high',
        title: 'Nœuds isolés détectés',
        description: `${isolatedNodes.length} entité(s) sans connexion`,
        action: 'Créer des relations pour connecter ces entités au réseau',
        affectedNodes: isolatedNodes.map(n => ({ id: n.id, name: n.name }))
      });
    }

    // Faible densité
    const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1) / 2) : 0;
    if (density < 0.1 && nodeCount > 5) {
      recommendations.push({
        type: 'low_density',
        priority: 'medium',
        title: 'Réseau peu dense',
        description: 'Le réseau pourrait révéler plus de connexions',
        action: 'Rechercher des relations supplémentaires entre entités',
        currentDensity: Math.round(density * 1000) / 1000
      });
    }

    // Composantes disconnectées
    const components = this.findConnectedComponents(graph);
    if (components.length > 1) {
      recommendations.push({
        type: 'disconnected_components',
        priority: 'medium',
        title: 'Composantes déconnectées',
        description: `${components.length} groupes d'entités séparés`,
        action: 'Identifier des liens entre les différents groupes',
        componentCount: components.length
      });
    }

    // Nœuds avec degré très élevé (hubs potentiels)
    const highDegreeNodes = Array.from(graph.nodes.values())
      .filter(n => n.degree > nodeCount * 0.2)
      .sort((a, b) => b.degree - a.degree);
    
    if (highDegreeNodes.length > 0) {
      recommendations.push({
        type: 'high_degree_nodes',
        priority: 'info',
        title: 'Nœuds centraux identifiés',
        description: 'Entités hautement connectées (points clés)',
        action: 'Vérifier l\'importance de ces entités dans l\'enquête',
        nodes: highDegreeNodes.slice(0, 5).map(n => ({ 
          id: n.id, 
          name: n.name, 
          degree: n.degree 
        }))
      });
    }

    return recommendations;
  }

  /**
   * Préparer les données pour la visualisation
   * @param {Object} graph - Structure du graphe
   * @param {Object} options - Options de visualisation
   * @returns {Object} Données formatées pour D3.js
   * @private
   */
  static prepareVisualizationData(graph, options = {}) {
    const { includePositions = true, includeWeights = true } = options;

    // Préparer les nœuds
    const nodes = Array.from(graph.nodes.values()).map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      degree: node.degree,
      size: this.calculateNodeSize(node, graph),
      color: this.getNodeColor(node.type),
      x: includePositions ? node.position.x : undefined,
      y: includePositions ? node.position.y : undefined,
      fx: node.position.x !== 0 ? node.position.x : undefined,
      fy: node.position.y !== 0 ? node.position.y : undefined
    }));

    // Préparer les liens
    const links = graph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      strength: edge.strength,
      weight: includeWeights ? edge.weight : 1,
      color: this.getEdgeColor(edge.type),
      strokeWidth: this.getEdgeWidth(edge.strength)
    }));

    return {
      nodes,
      links,
      metadata: {
        nodeCount: nodes.length,
        linkCount: links.length,
        nodeTypes: Array.from(graph.nodeTypes.keys()),
        edgeTypes: Array.from(graph.edgeTypes.keys())
      }
    };
  }

  // ===========================================
  // ALGORITHMES UTILITAIRES
  // ===========================================

  /**
   * Algorithme de Dijkstra pour les plus courts chemins
   * @private
   */
  static dijkstra(graph, startNode) {
    const distances = {};
    const visited = new Set();
    const queue = new Map();

    // Initialiser
    graph.nodes.forEach((_, nodeId) => {
      distances[nodeId] = Infinity;
      queue.set(nodeId, Infinity);
    });
    distances[startNode] = 0;
    queue.set(startNode, 0);

    while (queue.size > 0) {
      // Trouver le nœud non visité avec la plus petite distance
      let minNode = null;
      let minDistance = Infinity;
      for (const [nodeId, distance] of queue) {
        if (distance < minDistance) {
          minDistance = distance;
          minNode = nodeId;
        }
      }

      if (minNode === null) break;

      queue.delete(minNode);
      visited.add(minNode);

      // Mettre à jour les distances des voisins
      const neighbors = graph.adjacencyList.get(minNode) || new Set();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          const alt = distances[minNode] + 1; // Distance uniforme
          if (alt < distances[neighbor]) {
            distances[neighbor] = alt;
            queue.set(neighbor, alt);
          }
        }
      });
    }

    return distances;
  }

  /**
   * Trouver les composantes connexes
   * @private
   */
  static findConnectedComponents(graph) {
    const visited = new Set();
    const components = [];

    graph.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        const component = [];
        const stack = [nodeId];

        while (stack.length > 0) {
          const current = stack.pop();
          if (!visited.has(current)) {
            visited.add(current);
            component.push(current);

            const neighbors = graph.adjacencyList.get(current) || new Set();
            neighbors.forEach(neighbor => {
              if (!visited.has(neighbor)) {
                stack.push(neighbor);
              }
            });
          }
        }

        components.push(component);
      }
    });

    return components.sort((a, b) => b.length - a.length);
  }

  /**
   * Détection simple de communautés (algorithme glouton)
   * @private
   */
  static simpleLouvainCommunityDetection(graph) {
    // Version simplifiée pour éviter la complexité de Louvain complet
    const communities = [];
    const assigned = new Set();

    graph.nodes.forEach((_, nodeId) => {
      if (!assigned.has(nodeId)) {
        const community = [nodeId];
        assigned.add(nodeId);

        // Ajouter les voisins directs non assignés
        const neighbors = graph.adjacencyList.get(nodeId) || new Set();
        neighbors.forEach(neighbor => {
          if (!assigned.has(neighbor)) {
            community.push(neighbor);
            assigned.add(neighbor);
          }
        });

        communities.push(community);
      }
    });

    return communities;
  }

  /**
   * Calculer la modularité
   * @private
   */
  static calculateModularity(graph, communities) {
    // Implémentation simplifiée de la modularité
    const m = graph.edges.length;
    if (m === 0) return 0;

    let modularity = 0;

    communities.forEach(community => {
      const communitySet = new Set(community);
      let internalEdges = 0;
      let totalDegree = 0;

      // Compter les arêtes internes et le degré total
      community.forEach(nodeId => {
        const node = graph.nodes.get(nodeId);
        totalDegree += node.degree;

        const neighbors = graph.adjacencyList.get(nodeId) || new Set();
        neighbors.forEach(neighbor => {
          if (communitySet.has(neighbor)) {
            internalEdges++;
          }
        });
      });

      internalEdges /= 2; // Chaque arête est comptée deux fois
      const expectedEdges = (totalDegree * totalDegree) / (4 * m);
      modularity += (internalEdges / m) - (expectedEdges / m);
    });

    return Math.round(modularity * 1000) / 1000;
  }

  // ===========================================
  // MÉTHODES UTILITAIRES
  // ===========================================

  /**
   * Obtenir le poids d'une relation
   * @private
   */
  static getRelationshipWeight(strength) {
    const weights = { weak: 1, medium: 2, strong: 3 };
    return weights[strength] || 2;
  }

  /**
   * Calculer la taille d'un nœud pour la visualisation
   * @private
   */
  static calculateNodeSize(node, graph) {
    const minSize = 8;
    const maxSize = 30;
    const maxDegree = Math.max(...Array.from(graph.nodes.values()).map(n => n.degree));
    
    if (maxDegree === 0) return minSize;
    
    const ratio = node.degree / maxDegree;
    return minSize + (maxSize - minSize) * ratio;
  }

  /**
   * Obtenir la couleur d'un nœud selon son type
   * @private
   */
  static getNodeColor(nodeType) {
    const colors = {
      person: '#ef4444',
      place: '#10b981',
      organization: '#3b82f6',
      vehicle: '#f59e0b',
      account: '#8b5cf6',
      event: '#ec4899',
      document: '#6b7280',
      phone: '#06b6d4',
      email: '#84cc16',
      website: '#f97316'
    };
    return colors[nodeType] || '#9ca3af';
  }

  /**
   * Obtenir la couleur d'une arête selon son type
   * @private
   */
  static getEdgeColor(edgeType) {
    const colors = {
      family: '#ef4444',
      professional: '#3b82f6',
      criminal: '#dc2626',
      financial: '#059669',
      social: '#8b5cf6',
      connected: '#6b7280'
    };
    return colors[edgeType] || '#9ca3af';
  }

  /**
   * Obtenir l'épaisseur d'une arête selon sa force
   * @private
   */
  static getEdgeWidth(strength) {
    const widths = { weak: 1, medium: 2, strong: 3 };
    return widths[strength] || 2;
  }

  /**
   * Trouver les chemins les plus courts entre deux nœuds
   * @private
   */
  static findShortestPaths(graph, source, target, maxPaths = 3) {
    const paths = [];
    const queue = [[source]];
    const visited = new Set();
    let shortestLength = Infinity;

    while (queue.length > 0 && paths.length < maxPaths) {
      const currentPath = queue.shift();
      const currentNode = currentPath[currentPath.length - 1];

      if (currentPath.length > shortestLength) {
        break; // Tous les chemins suivants seront plus longs
      }

      if (currentNode === target) {
        paths.push([...currentPath]);
        shortestLength = Math.min(shortestLength, currentPath.length);
        continue;
      }

      const pathKey = currentPath.join('-');
      if (visited.has(pathKey)) continue;
      visited.add(pathKey);

      const neighbors = graph.adjacencyList.get(currentNode) || new Set();
      neighbors.forEach(neighbor => {
        if (!currentPath.includes(neighbor)) { // Éviter les cycles
          queue.push([...currentPath, neighbor]);
        }
      });
    }

    return paths;
  }

  /**
   * Calculer la transitivité du graphe
   * @private
   */
  static calculateTransitivity(graph) {
    let triangles = 0;
    let triplets = 0;

    graph.nodes.forEach((node, nodeId) => {
      const neighbors = Array.from(graph.adjacencyList.get(nodeId) || []);
      const degree = neighbors.length;

      if (degree < 2) return;

      // Compter les triplets (connexions possibles)
      triplets += degree * (degree - 1) / 2;

      // Compter les triangles (connexions réelles)
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (graph.adjacencyList.get(neighbors[i])?.has(neighbors[j])) {
            triangles++;
          }
        }
      }
    });

    return triplets > 0 ? triangles / triplets : 0;
  }

  /**
   * Identifier les nœuds les plus centraux
   * @private
   */
  static getTopCentralNodes(graph, centralities, topN = 5) {
    const nodeIds = Array.from(graph.nodes.keys());
    
    const topByDegree = nodeIds
      .sort((a, b) => (centralities.degree[b] || 0) - (centralities.degree[a] || 0))
      .slice(0, topN)
      .map(id => ({
        id,
        name: graph.nodes.get(id)?.name,
        value: centralities.degree[id] || 0,
        metric: 'degree'
      }));

    const topByCloseness = nodeIds
      .sort((a, b) => (centralities.closeness[b] || 0) - (centralities.closeness[a] || 0))
      .slice(0, topN)
      .map(id => ({
        id,
        name: graph.nodes.get(id)?.name,
        value: centralities.closeness[id] || 0,
        metric: 'closeness'
      }));

    const topByBetweenness = nodeIds
      .sort((a, b) => (centralities.betweenness[b] || 0) - (centralities.betweenness[a] || 0))
      .slice(0, topN)
      .map(id => ({
        id,
        name: graph.nodes.get(id)?.name,
        value: centralities.betweenness[id] || 0,
        metric: 'betweenness'
      }));

    return {
      byDegree: topByDegree,
      byCloseness: topByCloseness,
      byBetweenness: topByBetweenness,
      overall: this.combineTopNodes([topByDegree, topByCloseness, topByBetweenness], topN)
    };
  }

  /**
   * Combiner les top nœuds de différentes métriques
   * @private
   */
  static combineTopNodes(topLists, topN = 5) {
    const nodeScores = new Map();

    topLists.forEach(list => {
      list.forEach((node, index) => {
        const score = (list.length - index) / list.length; // Score inversé
        const currentScore = nodeScores.get(node.id) || 0;
        nodeScores.set(node.id, currentScore + score);
      });
    });

    return Array.from(nodeScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([nodeId, score]) => ({
        id: nodeId,
        name: topLists[0].find(n => n.id === nodeId)?.name || 'Unknown',
        combinedScore: Math.round(score * 1000) / 1000
      }));
  }

  /**
   * Obtenir le grade de santé du réseau
   * @private
   */
  static getHealthGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  /**
   * Générer des recommandations de santé
   * @private
   */
  static getHealthRecommendations(factors, graph) {
    const recommendations = [];

    if (factors.size < 20) {
      recommendations.push({
        factor: 'size',
        message: 'Ajouter plus d\'entités pour enrichir le réseau',
        impact: 'Améliore la richesse de l\'analyse'
      });
    }

    if (factors.density < 15) {
      recommendations.push({
        factor: 'density',
        message: 'Créer plus de relations entre les entités existantes',
        impact: 'Révèle des connexions cachées'
      });
    }

    if (factors.connectivity < 20) {
      recommendations.push({
        factor: 'connectivity',
        message: 'Connecter les groupes d\'entités isolés',
        impact: 'Unifie le réseau d\'investigation'
      });
    }

    if (factors.diversity < 20) {
      recommendations.push({
        factor: 'diversity',
        message: 'Diversifier les types d\'entités et de relations',
        impact: 'Permet une analyse plus complète'
      });
    }

    return recommendations;
  }

  /**
   * Retourner une analyse vide pour les graphes sans données
   * @private
   */
  static getEmptyGraphAnalysis() {
    return {
      basicMetrics: {
        nodeCount: 0,
        edgeCount: 0,
        density: 0,
        avgDegree: 0,
        maxDegree: 0,
        minDegree: 0,
        isolatedNodeCount: 0,
        isolatedNodes: [],
        nodeTypeDistribution: {},
        edgeTypeDistribution: {}
      },
      centralityMetrics: {
        degreeCentrality: {},
        closenessCentrality: {},
        betweennessCentrality: {},
        topCentralNodes: { byDegree: [], byCloseness: [], byBetweenness: [], overall: [] }
      },
      clusteringMetrics: {
        localClustering: {},
        globalClustering: 0,
        triangleCount: 0,
        transitivity: 0
      },
      communityDetection: {
        communities: [],
        communityCount: 0,
        modularity: 0,
        communityStats: []
      },
      pathAnalysis: {
        diameter: 0,
        avgPathLength: 0,
        maxDistance: 0,
        isConnected: false,
        componentCount: 0,
        largestComponentSize: 0,
        components: []
      },
      networkHealthScore: {
        score: 0,
        maxScore: 100,
        percentage: 0,
        grade: 'F',
        factors: { size: 0, density: 0, connectivity: 0, diversity: 0 },
        recommendations: []
      },
      recommendations: [{
        type: 'empty_graph',
        priority: 'high',
        title: 'Graphe vide',
        description: 'Aucune entité dans ce dossier',
        action: 'Commencer par ajouter des entités à analyser'
      }],
      visualizationData: {
        nodes: [],
        links: [],
        metadata: { nodeCount: 0, linkCount: 0, nodeTypes: [], edgeTypes: [] }
      }
    };
  }

  /**
   * Exporter les métriques au format JSON
   * @param {Object} analysis - Résultats d'analyse
   * @returns {Object} Données exportables
   */
  static exportAnalysis(analysis) {
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      analysis: {
        summary: {
          nodeCount: analysis.basicMetrics.nodeCount,
          edgeCount: analysis.basicMetrics.edgeCount,
          density: analysis.basicMetrics.density,
          healthScore: analysis.networkHealthScore.score,
          healthGrade: analysis.networkHealthScore.grade
        },
        metrics: analysis,
        recommendations: analysis.recommendations
      }
    };
  }

  /**
   * Valider la structure du graphe
   * @param {Object} graph - Structure du graphe
   * @returns {Object} Résultat de validation
   */
  static validateGraph(graph) {
    const errors = [];
    const warnings = [];

    // Vérifier la cohérence des nœuds et arêtes
    graph.edges.forEach(edge => {
      if (!graph.nodes.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node ${edge.source}`);
      }
      if (!graph.nodes.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node ${edge.target}`);
      }
    });

    // Vérifier les auto-références
    const selfLoops = graph.edges.filter(edge => edge.source === edge.target);
    if (selfLoops.length > 0) {
      warnings.push(`${selfLoops.length} self-referencing edge(s) detected`);
    }

    // Vérifier les doublons d'arêtes
    const edgeKeys = new Set();
    const duplicates = [];
    graph.edges.forEach(edge => {
      const key = `${Math.min(edge.source, edge.target)}-${Math.max(edge.source, edge.target)}-${edge.type}`;
      if (edgeKeys.has(key)) {
        duplicates.push(edge.id);
      } else {
        edgeKeys.add(key);
      }
    });
    
    if (duplicates.length > 0) {
      warnings.push(`${duplicates.length} duplicate edge(s) detected`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        nodeCount: graph.nodes.size,
        edgeCount: graph.edges.length,
        selfLoops: selfLoops.length,
        duplicates: duplicates.length
      }
    };
  }
}

module.exports = GraphAnalysisService;