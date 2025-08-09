// frontend/src/modules/graph/utils/graphCalculations.js - Utilitaires de calcul pour les graphes
import * as d3 from 'd3';

/**
 * Utilitaires de calcul pour l'analyse et la manipulation des graphes
 * Fournit des fonctions mathématiques et algorithmiques pour les visualisations
 */
class GraphCalculations {

  /**
   * Calculer les métriques de base d'un graphe
   * @param {Object} data - Données du graphe { nodes, links }
   * @returns {Object} Métriques calculées
   */
  static calculateBasicMetrics(data) {
    const { nodes, links } = data;
    const nodeCount = nodes.length;
    const linkCount = links.length;
    
    // Densité du graphe
    const maxPossibleLinks = nodeCount * (nodeCount - 1) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
    
    // Calcul des degrés
    const degrees = this.calculateDegrees(data);
    const degreeValues = Object.values(degrees);
    const avgDegree = degreeValues.length > 0 ? degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length : 0;
    const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;
    const minDegree = degreeValues.length > 0 ? Math.min(...degreeValues) : 0;
    
    // Nœuds isolés
    const isolatedNodes = nodes.filter(node => (degrees[node.id] || 0) === 0);
    
    return {
      nodeCount,
      linkCount,
      density: Math.round(density * 1000) / 1000,
      avgDegree: Math.round(avgDegree * 100) / 100,
      maxDegree,
      minDegree,
      isolatedNodeCount: isolatedNodes.length,
      isolatedNodes: isolatedNodes.map(n => ({ id: n.id, name: n.name }))
    };
  }

  /**
   * Calculer les degrés de tous les nœuds
   * @param {Object} data - Données du graphe
   * @returns {Object} Mapping nodeId -> degree
   */
  static calculateDegrees(data) {
    const degrees = {};
    
    // Initialiser tous les nœuds avec degré 0
    data.nodes.forEach(node => {
      degrees[node.id] = 0;
    });
    
    // Compter les connexions
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (degrees[sourceId] !== undefined) degrees[sourceId]++;
      if (degrees[targetId] !== undefined) degrees[targetId]++;
    });
    
    return degrees;
  }

  /**
   * Calculer la centralité de degré
   * @param {Object} data - Données du graphe
   * @returns {Object} Centralités normalisées
   */
  static calculateDegreeCentrality(data) {
    const degrees = this.calculateDegrees(data);
    const nodeCount = data.nodes.length;
    const centrality = {};
    
    if (nodeCount <= 1) return centrality;
    
    // Normaliser par le nombre maximum de connexions possibles
    Object.entries(degrees).forEach(([nodeId, degree]) => {
      centrality[nodeId] = degree / (nodeCount - 1);
    });
    
    return centrality;
  }

  /**
   * Calculer la centralité de proximité (closeness centrality)
   * @param {Object} data - Données du graphe
   * @returns {Object} Centralités de proximité
   */
  static calculateClosenessCentrality(data) {
    const centrality = {};
    const adjacencyList = this.buildAdjacencyList(data);
    
    data.nodes.forEach(node => {
      const distances = this.dijkstra(adjacencyList, node.id);
      const validDistances = Object.values(distances).filter(d => d !== Infinity && d > 0);
      
      if (validDistances.length > 0) {
        const sumDistances = validDistances.reduce((a, b) => a + b, 0);
        centrality[node.id] = validDistances.length / sumDistances;
      } else {
        centrality[node.id] = 0;
      }
    });
    
    return centrality;
  }

  /**
   * Calculer la centralité d'intermédiarité (betweenness centrality)
   * @param {Object} data - Données du graphe
   * @returns {Object} Centralités d'intermédiarité
   */
  static calculateBetweennessCentrality(data) {
    const centrality = {};
    const adjacencyList = this.buildAdjacencyList(data);
    
    // Initialiser
    data.nodes.forEach(node => {
      centrality[node.id] = 0;
    });
    
    // Pour chaque paire de nœuds
    data.nodes.forEach(source => {
      data.nodes.forEach(target => {
        if (source.id !== target.id) {
          const paths = this.findAllShortestPaths(adjacencyList, source.id, target.id);
          
          if (paths.length > 0) {
            paths.forEach(path => {
              // Chaque nœud intermédiaire gagne 1/nombre_de_chemins
              for (let i = 1; i < path.length - 1; i++) {
                centrality[path[i]] += 1 / paths.length;
              }
            });
          }
        }
      });
    });
    
    // Normaliser
    const n = data.nodes.length;
    const normFactor = (n - 1) * (n - 2) / 2;
    if (normFactor > 0) {
      Object.keys(centrality).forEach(nodeId => {
        centrality[nodeId] /= normFactor;
      });
    }
    
    return centrality;
  }

  /**
   * Construire la liste d'adjacence
   * @param {Object} data - Données du graphe
   * @returns {Map} Liste d'adjacence
   */
  static buildAdjacencyList(data) {
    const adjacencyList = new Map();
    
    // Initialiser avec tous les nœuds
    data.nodes.forEach(node => {
      adjacencyList.set(node.id, new Set());
    });
    
    // Ajouter les connexions
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (adjacencyList.has(sourceId)) {
        adjacencyList.get(sourceId).add(targetId);
      }
      if (adjacencyList.has(targetId)) {
        adjacencyList.get(targetId).add(sourceId);
      }
    });
    
    return adjacencyList;
  }

  /**
   * Algorithme de Dijkstra pour les plus courts chemins
   * @param {Map} adjacencyList - Liste d'adjacence
   * @param {string|number} startNode - Nœud de départ
   * @returns {Object} Distances vers tous les nœuds
   */
  static dijkstra(adjacencyList, startNode) {
    const distances = {};
    const visited = new Set();
    const queue = new Map();
    
    // Initialiser les distances
    adjacencyList.forEach((_, nodeId) => {
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
      const neighbors = adjacencyList.get(minNode) || new Set();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          const alt = distances[minNode] + 1; // Poids uniforme
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
   * Trouver tous les plus courts chemins entre deux nœuds
   * @param {Map} adjacencyList - Liste d'adjacence
   * @param {string|number} source - Nœud source
   * @param {string|number} target - Nœud cible
   * @returns {Array} Tous les plus courts chemins
   */
  static findAllShortestPaths(adjacencyList, source, target) {
    const paths = [];
    const queue = [[source]];
    const distances = { [source]: 0 };
    let shortestLength = Infinity;
    
    while (queue.length > 0) {
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
      
      const neighbors = adjacencyList.get(currentNode) || new Set();
      neighbors.forEach(neighbor => {
        if (!currentPath.includes(neighbor)) { // Éviter les cycles
          const newPath = [...currentPath, neighbor];
          const newDistance = currentPath.length;
          
          if (distances[neighbor] === undefined || newDistance <= distances[neighbor]) {
            distances[neighbor] = newDistance;
            queue.push(newPath);
          }
        }
      });
    }
    
    return paths.filter(path => path.length === shortestLength);
  }

  /**
   * Détecter les composantes connexes
   * @param {Object} data - Données du graphe
   * @returns {Array} Composantes connexes
   */
  static findConnectedComponents(data) {
    const adjacencyList = this.buildAdjacencyList(data);
    const visited = new Set();
    const components = [];
    
    data.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = [];
        const stack = [node.id];
        
        while (stack.length > 0) {
          const current = stack.pop();
          if (!visited.has(current)) {
            visited.add(current);
            component.push(current);
            
            const neighbors = adjacencyList.get(current) || new Set();
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
   * Calculer le coefficient de clustering
   * @param {Object} data - Données du graphe
   * @returns {Object} Coefficients locaux et global
   */
  static calculateClusteringCoefficient(data) {
    const adjacencyList = this.buildAdjacencyList(data);
    const localClustering = {};
    let globalClustering = 0;
    let validNodeCount = 0;
    
    data.nodes.forEach(node => {
      const neighbors = Array.from(adjacencyList.get(node.id) || []);
      const degree = neighbors.length;
      
      if (degree < 2) {
        localClustering[node.id] = 0;
        return;
      }
      
      // Compter les connexions entre voisins
      let edgesAmongNeighbors = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (adjacencyList.get(neighbors[i])?.has(neighbors[j])) {
            edgesAmongNeighbors++;
          }
        }
      }
      
      // Coefficient de clustering local
      const maxPossibleEdges = degree * (degree - 1) / 2;
      localClustering[node.id] = maxPossibleEdges > 0 ? edgesAmongNeighbors / maxPossibleEdges : 0;
      
      globalClustering += localClustering[node.id];
      validNodeCount++;
    });
    
    // Coefficient de clustering global (moyenne)
    globalClustering = validNodeCount > 0 ? globalClustering / validNodeCount : 0;
    
    return {
      local: localClustering,
      global: Math.round(globalClustering * 1000) / 1000
    };
  }

  /**
   * Calculer la distance moyenne entre tous les nœuds
   * @param {Object} data - Données du graphe
   * @returns {Object} Analyse des distances
   */
  static calculateAveragePathLength(data) {
    const adjacencyList = this.buildAdjacencyList(data);
    const allDistances = [];
    let totalDistance = 0;
    let pathCount = 0;
    let maxDistance = 0;
    
    data.nodes.forEach(source => {
      const distances = this.dijkstra(adjacencyList, source.id);
      
      data.nodes.forEach(target => {
        if (source.id !== target.id) {
          const distance = distances[target.id];
          if (distance !== Infinity) {
            allDistances.push(distance);
            totalDistance += distance;
            pathCount++;
            maxDistance = Math.max(maxDistance, distance);
          }
        }
      });
    });
    
    const avgPathLength = pathCount > 0 ? totalDistance / pathCount : 0;
    const diameter = maxDistance;
    
    // Calculer la distribution des distances
    const distanceDistribution = {};
    allDistances.forEach(distance => {
      distanceDistribution[distance] = (distanceDistribution[distance] || 0) + 1;
    });
    
    return {
      average: Math.round(avgPathLength * 100) / 100,
      diameter,
      distribution: distanceDistribution,
      totalPaths: pathCount
    };
  }

  /**
   * Détecter les communautés avec l'algorithme de Louvain simplifié
   * @param {Object} data - Données du graphe
   * @returns {Array} Communautés détectées
   */
  static detectCommunities(data) {
    // Implémentation simplifiée de l'algorithme de Louvain
    const adjacencyList = this.buildAdjacencyList(data);
    const communities = [];
    const assigned = new Set();
    
    data.nodes.forEach(node => {
      if (!assigned.has(node.id)) {
        const community = [node.id];
        assigned.add(node.id);
        
        // Ajouter les voisins directs non assignés avec une probabilité
        const neighbors = adjacencyList.get(node.id) || new Set();
        neighbors.forEach(neighbor => {
          if (!assigned.has(neighbor) && Math.random() > 0.3) {
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
   * Calculer la modularité d'une partition en communautés
   * @param {Object} data - Données du graphe
   * @param {Array} communities - Communautés
   * @returns {number} Modularité
   */
  static calculateModularity(data, communities) {
    const m = data.links.length;
    if (m === 0) return 0;
    
    const degrees = this.calculateDegrees(data);
    let modularity = 0;
    
    communities.forEach(community => {
      const communitySet = new Set(community);
      let internalEdges = 0;
      let totalDegree = 0;
      
      // Compter les arêtes internes et le degré total
      community.forEach(nodeId => {
        totalDegree += degrees[nodeId] || 0;
        
        data.links.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          if ((sourceId === nodeId && communitySet.has(targetId)) ||
              (targetId === nodeId && communitySet.has(sourceId))) {
            internalEdges += 0.5; // Chaque arête est comptée une fois
          }
        });
      });
      
      const expectedEdges = (totalDegree * totalDegree) / (4 * m);
      modularity += (internalEdges / m) - (expectedEdges / m);
    });
    
    return Math.round(modularity * 1000) / 1000;
  }

  /**
   * Calculer les positions optimales pour un layout en force
   * @param {Object} data - Données du graphe
   * @param {Object} options - Options du layout
   * @returns {Object} Nouvelles positions
   */
  static calculateForceLayout(data, options = {}) {
    const {
      iterations = 50,
      repulsionStrength = 1000,
      attractionStrength = 0.1,
      damping = 0.9,
      centeringStrength = 0.01
    } = options;
    
    // Initialiser les positions si elles n'existent pas
    const nodes = data.nodes.map(node => ({
      ...node,
      x: node.x || Math.random() * 800,
      y: node.y || Math.random() * 600,
      vx: 0,
      vy: 0
    }));
    
    const links = data.links;
    
    for (let iteration = 0; iteration < iterations; iteration++) {
      // Calculer les forces de répulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
          
          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }
      
      // Calculer les forces d'attraction pour les liens
      links.forEach(link => {
        const source = nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
        const target = nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target));
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
          
          const force = attractionStrength * distance;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });
      
      // Force de centrage
      const centerX = 400; // Centre approximatif
      const centerY = 300;
      
      nodes.forEach(node => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        
        node.vx += dx * centeringStrength;
        node.vy += dy * centeringStrength;
      });
      
      // Appliquer les vélocités et le damping
      nodes.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      });
    }
    
    return nodes.map(node => ({
      id: node.id,
      x: node.x,
      y: node.y
    }));
  }

  /**
   * Calculer un layout circulaire
   * @param {Object} data - Données du graphe
   * @param {Object} options - Options du layout
   * @returns {Object} Nouvelles positions
   */
  static calculateCircularLayout(data, options = {}) {
    const {
      radius = 200,
      centerX = 400,
      centerY = 300,
      sortBy = 'degree'
    } = options;
    
    let sortedNodes = [...data.nodes];
    
    if (sortBy === 'degree') {
      const degrees = this.calculateDegrees(data);
      sortedNodes.sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
    } else if (sortBy === 'name') {
      sortedNodes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    
    return sortedNodes.map((node, index) => {
      const angle = (index / sortedNodes.length) * 2 * Math.PI;
      return {
        id: node.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  }

  /**
   * Calculer un layout en grille
   * @param {Object} data - Données du graphe
   * @param {Object} options - Options du layout
   * @returns {Object} Nouvelles positions
   */
  static calculateGridLayout(data, options = {}) {
    const {
      spacing = 100,
      startX = 50,
      startY = 50,
      sortBy = 'degree'
    } = options;
    
    let sortedNodes = [...data.nodes];
    
    if (sortBy === 'degree') {
      const degrees = this.calculateDegrees(data);
      sortedNodes.sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
    }
    
    const cols = Math.ceil(Math.sqrt(sortedNodes.length));
    
    return sortedNodes.map((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      return {
        id: node.id,
        x: startX + col * spacing,
        y: startY + row * spacing
      };
    });
  }

  /**
   * Calculer un layout hiérarchique
   * @param {Object} data - Données du graphe
   * @param {Object} options - Options du layout
   * @returns {Object} Nouvelles positions
   */
  static calculateHierarchicalLayout(data, options = {}) {
    const {
      levels = 3,
      levelHeight = 150,
      nodeSpacing = 100,
      startY = 50
    } = options;
    
    const degrees = this.calculateDegrees(data);
    const sortedNodes = [...data.nodes].sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
    
    const nodesPerLevel = Math.ceil(sortedNodes.length / levels);
    const positions = [];
    
    for (let level = 0; level < levels; level++) {
      const levelNodes = sortedNodes.slice(level * nodesPerLevel, (level + 1) * nodesPerLevel);
      const levelWidth = (levelNodes.length - 1) * nodeSpacing;
      const startX = -levelWidth / 2;
      
      levelNodes.forEach((node, index) => {
        positions.push({
          id: node.id,
          x: startX + index * nodeSpacing,
          y: startY + level * levelHeight
        });
      });
    }
    
    return positions;
  }

  /**
   * Optimiser un layout existant pour réduire les croisements
   * @param {Object} data - Données du graphe avec positions
   * @param {Object} options - Options d'optimisation
   * @returns {Object} Positions optimisées
   */
  static optimizeLayout(data, options = {}) {
    const { iterations = 100, temperature = 100 } = options;
    
    let currentNodes = data.nodes.map(node => ({ ...node }));
    let bestNodes = currentNodes.map(node => ({ ...node }));
    let currentCost = this.calculateLayoutCost(data, currentNodes);
    let bestCost = currentCost;
    
    for (let i = 0; i < iterations; i++) {
      const temp = temperature * (1 - i / iterations); // Refroidissement
      
      // Perturber aléatoirement une position
      const nodeIndex = Math.floor(Math.random() * currentNodes.length);
      const originalX = currentNodes[nodeIndex].x;
      const originalY = currentNodes[nodeIndex].y;
      
      currentNodes[nodeIndex].x += (Math.random() - 0.5) * temp;
      currentNodes[nodeIndex].y += (Math.random() - 0.5) * temp;
      
      const newCost = this.calculateLayoutCost(data, currentNodes);
      
      // Accepter ou rejeter le changement
      if (newCost < currentCost || Math.random() < Math.exp(-(newCost - currentCost) / temp)) {
        currentCost = newCost;
        
        if (newCost < bestCost) {
          bestCost = newCost;
          bestNodes = currentNodes.map(node => ({ ...node }));
        }
      } else {
        // Annuler le changement
        currentNodes[nodeIndex].x = originalX;
        currentNodes[nodeIndex].y = originalY;
      }
    }
    
    return bestNodes.map(node => ({
      id: node.id,
      x: node.x,
      y: node.y
    }));
  }

  /**
   * Calculer le coût d'un layout (nombre de croisements + longueur des arêtes)
   * @param {Object} data - Données du graphe
   * @param {Array} nodes - Nœuds avec positions
   * @returns {number} Coût du layout
   * @private
   */
  static calculateLayoutCost(data, nodes) {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    let cost = 0;
    
    // Coût des croisements d'arêtes
    const edgeCrossings = this.countEdgeCrossings(data, nodeMap);
    cost += edgeCrossings * 1000; // Pénalité élevée pour les croisements
    
    // Coût de la longueur totale des arêtes
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const source = nodeMap.get(sourceId);
      const target = nodeMap.get(targetId);
      
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        cost += length;
      }
    });
    
    return cost;
  }

  /**
   * Compter les croisements d'arêtes
   * @param {Object} data - Données du graphe
   * @param {Map} nodeMap - Mapping id -> node avec positions
   * @returns {number} Nombre de croisements
   * @private
   */
  static countEdgeCrossings(data, nodeMap) {
    let crossings = 0;
    const links = data.links;
    
    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        if (this.doEdgesIntersect(links[i], links[j], nodeMap)) {
          crossings++;
        }
      }
    }
    
    return crossings;
  }

  /**
   * Vérifier si deux arêtes se croisent
   * @param {Object} edge1 - Première arête
   * @param {Object} edge2 - Deuxième arête
   * @param {Map} nodeMap - Mapping id -> node avec positions
   * @returns {boolean} True si les arêtes se croisent
   * @private
   */
  static doEdgesIntersect(edge1, edge2, nodeMap) {
    const source1Id = typeof edge1.source === 'object' ? edge1.source.id : edge1.source;
    const target1Id = typeof edge1.target === 'object' ? edge1.target.id : edge1.target;
    const source2Id = typeof edge2.source === 'object' ? edge2.source.id : edge2.source;
    const target2Id = typeof edge2.target === 'object' ? edge2.target.id : edge2.target;
    
    // Vérifier si les arêtes partagent un nœud
    if (source1Id === source2Id || source1Id === target2Id || 
        target1Id === source2Id || target1Id === target2Id) {
      return false;
    }
    
    const a = nodeMap.get(source1Id);
    const b = nodeMap.get(target1Id);
    const c = nodeMap.get(source2Id);
    const d = nodeMap.get(target2Id);
    
    if (!a || !b || !c || !d) return false;
    
    // Calcul de l'intersection de deux segments de ligne
    const det = (b.x - a.x) * (d.y - c.y) - (d.x - c.x) * (b.y - a.y);
    
    if (Math.abs(det) < 1e-10) {
      return false; // Lignes parallèles
    }
    
    const u = ((c.x - a.x) * (d.y - c.y) - (d.x - c.x) * (c.y - a.y)) / det;
    const v = ((c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)) / det;
    
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }

  /**
   * Calculer la matrice de distances entre tous les nœuds
   * @param {Object} data - Données du graphe
   * @returns {Object} Matrice de distances
   */
  static calculateDistanceMatrix(data) {
    const adjacencyList = this.buildAdjacencyList(data);
    const matrix = {};
    
    data.nodes.forEach(source => {
      matrix[source.id] = this.dijkstra(adjacencyList, source.id);
    });
    
    return matrix;
  }

  /**
   * Identifier les ponts (arêtes critiques) dans le graphe
   * @param {Object} data - Données du graphe
   * @returns {Array} Arêtes qui sont des ponts
   */
  static findBridges(data) {
    const bridges = [];
    const adjacencyList = this.buildAdjacencyList(data);
    
    // Pour chaque arête, vérifier si sa suppression augmente le nombre de composantes
    const originalComponents = this.findConnectedComponents(data);
    
    data.links.forEach(link => {
      // Créer un graphe temporaire sans cette arête
      const tempData = {
        nodes: data.nodes,
        links: data.links.filter(l => l !== link)
      };
      
      const newComponents = this.findConnectedComponents(tempData);
      
      if (newComponents.length > originalComponents.length) {
        bridges.push(link);
      }
    });
    
    return bridges;
  }

  /**
   * Identifier les points d'articulation (nœuds critiques) dans le graphe
   * @param {Object} data - Données du graphe
   * @returns {Array} Nœuds qui sont des points d'articulation
   */
  static findArticulationPoints(data) {
    const articulationPoints = [];
    const originalComponents = this.findConnectedComponents(data);
    
    data.nodes.forEach(node => {
      // Créer un graphe temporaire sans ce nœud
      const tempData = {
        nodes: data.nodes.filter(n => n.id !== node.id),
        links: data.links.filter(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return sourceId !== node.id && targetId !== node.id;
        })
      };
      
      const newComponents = this.findConnectedComponents(tempData);
      
      if (newComponents.length > originalComponents.length) {
        articulationPoints.push(node);
      }
    });
    
    return articulationPoints;
  }

  /**
   * Calculer des métriques de petit monde (small-world)
   * @param {Object} data - Données du graphe
   * @returns {Object} Métriques de petit monde
   */
  static calculateSmallWorldMetrics(data) {
    const clustering = this.calculateClusteringCoefficient(data);
    const pathLength = this.calculateAveragePathLength(data);
    
    // Générer un graphe aléatoire équivalent pour comparaison
    const randomGraph = this.generateRandomGraph(data.nodes.length, data.links.length);
    const randomClustering = this.calculateClusteringCoefficient(randomGraph);
    const randomPathLength = this.calculateAveragePathLength(randomGraph);
    
    // Calculer les ratios
    const clusteringRatio = clustering.global / (randomClustering.global || 0.001);
    const pathLengthRatio = pathLength.average / (randomPathLength.average || 1);
    
    // Score de petit monde (sigma)
    const sigma = clusteringRatio / (pathLengthRatio || 1);
    
    return {
      clustering: clustering.global,
      pathLength: pathLength.average,
      clusteringRatio,
      pathLengthRatio,
      sigma,
      isSmallWorld: sigma > 1 && clusteringRatio > 1 && pathLengthRatio <= 2
    };
  }

  /**
   * Générer un graphe aléatoire avec le même nombre de nœuds et d'arêtes
   * @param {number} nodeCount - Nombre de nœuds
   * @param {number} linkCount - Nombre d'arêtes
   * @returns {Object} Graphe aléatoire
   * @private
   */
  static generateRandomGraph(nodeCount, linkCount) {
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
    const links = [];
    const usedPairs = new Set();
    
    while (links.length < linkCount && links.length < nodeCount * (nodeCount - 1) / 2) {
      const source = Math.floor(Math.random() * nodeCount);
      const target = Math.floor(Math.random() * nodeCount);
      
      if (source !== target) {
        const pair = `${Math.min(source, target)}-${Math.max(source, target)}`;
        if (!usedPairs.has(pair)) {
          usedPairs.add(pair);
          links.push({ source, target });
        }
      }
    }
    
    return { nodes, links };
  }
}

export default GraphCalculations;