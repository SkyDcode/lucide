// frontend/src/modules/graph/algorithms/forceLayout.js - Algorithmes de layout par force dirigée
import * as d3 from 'd3';

/**
 * Algorithmes de layout par force dirigée pour la visualisation de graphes
 * Implémente différents types de simulations physiques pour positionner les nœuds
 */
class ForceLayout {

  /**
   * Configuration par défaut pour les forces
   */
  static defaultConfig = {
    // Forces principales
    link: {
      strength: 0.1,
      distance: 80,
      iterations: 1
    },
    charge: {
      strength: -300,
      distanceMin: 1,
      distanceMax: Infinity
    },
    center: {
      strength: 0.1,
      x: 400,
      y: 300
    },
    collision: {
      strength: 0.7,
      radius: 5,
      iterations: 1
    },
    
    // Paramètres de simulation
    simulation: {
      alpha: 1,
      alphaMin: 0.001,
      alphaDecay: 0.0228,
      alphaTarget: 0,
      velocityDecay: 0.4
    },

    // Contraintes
    bounds: {
      enabled: false,
      x: [0, 800],
      y: [0, 600],
      padding: 20
    }
  };

  /**
   * Créer une simulation de force basique
   * @param {Object} data - Données du graphe { nodes, links }
   * @param {Object} config - Configuration des forces
   * @returns {d3.Simulation} Simulation D3
   */
  static createBasicSimulation(data, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const { nodes, links } = data;

    // Créer la simulation
    const simulation = d3.forceSimulation(nodes)
      .alpha(finalConfig.simulation.alpha)
      .alphaMin(finalConfig.simulation.alphaMin)
      .alphaDecay(finalConfig.simulation.alphaDecay)
      .alphaTarget(finalConfig.simulation.alphaTarget)
      .velocityDecay(finalConfig.simulation.velocityDecay);

    // Ajouter les forces
    this.addLinkForce(simulation, links, finalConfig.link);
    this.addChargeForce(simulation, finalConfig.charge);
    this.addCenterForce(simulation, finalConfig.center);
    this.addCollisionForce(simulation, finalConfig.collision);

    // Ajouter les contraintes de limites si activées
    if (finalConfig.bounds.enabled) {
      this.addBoundaryForce(simulation, finalConfig.bounds);
    }

    return simulation;
  }

  /**
   * Créer une simulation hiérarchique
   * @param {Object} data - Données du graphe
   * @param {Object} config - Configuration
   * @returns {d3.Simulation} Simulation configurée pour hiérarchie
   */
  static createHierarchicalSimulation(data, config = {}) {
    const finalConfig = {
      ...this.defaultConfig,
      ...config,
      charge: { strength: -200 }, // Charge plus faible pour hiérarchie
      link: { strength: 0.2, distance: 120 } // Liens plus longs
    };

    const simulation = this.createBasicSimulation(data, finalConfig);

    // Ajouter une force de positionnement Y pour créer des niveaux
    const levels = this.calculateHierarchicalLevels(data);
    this.addHierarchicalForce(simulation, levels, config);

    return simulation;
  }

  /**
   * Créer une simulation avec clustering par communautés
   * @param {Object} data - Données du graphe
   * @param {Array} communities - Communautés détectées
   * @param {Object} config - Configuration
   * @returns {d3.Simulation} Simulation avec clustering
   */
  static createClusteredSimulation(data, communities, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const simulation = this.createBasicSimulation(data, finalConfig);

    // Ajouter la force de clustering
    this.addClusteringForce(simulation, communities, config);

    return simulation;
  }

  /**
   * Créer une simulation radiale (en cercles concentriques)
   * @param {Object} data - Données du graphe
   * @param {Object} config - Configuration
   * @returns {d3.Simulation} Simulation radiale
   */
  static createRadialSimulation(data, config = {}) {
    const {
      center = { x: 400, y: 300 },
      radius = 200,
      layers = 3
    } = config;

    const simulation = this.createBasicSimulation(data, config);

    // Calculer les niveaux radiaux basés sur la centralité
    const radialLevels = this.calculateRadialLevels(data, layers);
    this.addRadialForce(simulation, radialLevels, center, radius);

    return simulation;
  }

  /**
   * Créer une simulation avec disposition en grille magnétique
   * @param {Object} data - Données du graphe
   * @param {Object} config - Configuration de la grille
   * @returns {d3.Simulation} Simulation avec grille magnétique
   */
  static createGridSimulation(data, config = {}) {
    const {
      gridSize = 50,
      magnetStrength = 0.1,
      bounds = { x: [0, 800], y: [0, 600] }
    } = config;

    const simulation = this.createBasicSimulation(data, config);
    this.addGridForce(simulation, gridSize, magnetStrength, bounds);

    return simulation;
  }

  // ===========================================
  // FORCES INDIVIDUELLES
  // ===========================================

  /**
   * Ajouter la force de liaison
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Array} links - Liens du graphe
   * @param {Object} config - Configuration de la force
   * @private
   */
  static addLinkForce(simulation, links, config) {
    const linkForce = d3.forceLink(links)
      .id(d => d.id)
      .strength(config.strength)
      .distance(d => this.calculateLinkDistance(d, config))
      .iterations(config.iterations);

    simulation.force('link', linkForce);
  }

  /**
   * Ajouter la force de répulsion (charge)
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} config - Configuration de la force
   * @private
   */
  static addChargeForce(simulation, config) {
    const chargeForce = d3.forceManyBody()
      .strength(d => this.calculateChargeStrength(d, config))
      .distanceMin(config.distanceMin)
      .distanceMax(config.distanceMax);

    simulation.force('charge', chargeForce);
  }

  /**
   * Ajouter la force de centrage
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} config - Configuration de la force
   * @private
   */
  static addCenterForce(simulation, config) {
    const centerForce = d3.forceCenter(config.x, config.y)
      .strength(config.strength);

    simulation.force('center', centerForce);
  }

  /**
   * Ajouter la force de collision
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} config - Configuration de la force
   * @private
   */
  static addCollisionForce(simulation, config) {
    const collisionForce = d3.forceCollide()
      .radius(d => this.calculateCollisionRadius(d, config))
      .strength(config.strength)
      .iterations(config.iterations);

    simulation.force('collision', collisionForce);
  }

  /**
   * Ajouter une force de limite pour garder les nœuds dans les limites
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} bounds - Limites { x: [min, max], y: [min, max], padding }
   * @private
   */
  static addBoundaryForce(simulation, bounds) {
    const boundaryForce = (alpha) => {
      simulation.nodes().forEach(node => {
        const nodeRadius = node.radius || 5;
        
        // Contrainte X
        const minX = bounds.x[0] + bounds.padding + nodeRadius;
        const maxX = bounds.x[1] - bounds.padding - nodeRadius;
        if (node.x < minX) {
          node.vx += (minX - node.x) * alpha * 0.1;
        } else if (node.x > maxX) {
          node.vx += (maxX - node.x) * alpha * 0.1;
        }

        // Contrainte Y
        const minY = bounds.y[0] + bounds.padding + nodeRadius;
        const maxY = bounds.y[1] - bounds.padding - nodeRadius;
        if (node.y < minY) {
          node.vy += (minY - node.y) * alpha * 0.1;
        } else if (node.y > maxY) {
          node.vy += (maxY - node.y) * alpha * 0.1;
        }
      });
    };

    simulation.force('boundary', boundaryForce);
  }

  /**
   * Ajouter une force hiérarchique pour organiser en niveaux
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} levels - Niveaux hiérarchiques
   * @param {Object} config - Configuration
   * @private
   */
  static addHierarchicalForce(simulation, levels, config = {}) {
    const { levelHeight = 120, strength = 0.2 } = config;

    const hierarchicalForce = (alpha) => {
      simulation.nodes().forEach(node => {
        const level = levels[node.id] || 0;
        const targetY = level * levelHeight;
        node.vy += (targetY - node.y) * strength * alpha;
      });
    };

    simulation.force('hierarchical', hierarchicalForce);
  }

  /**
   * Ajouter une force de clustering pour regrouper les communautés
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Array} communities - Communautés
   * @param {Object} config - Configuration
   * @private
   */
  static addClusteringForce(simulation, communities, config = {}) {
    const {
      clusterStrength = 0.1,
      clusterRadius = 100,
      center = { x: 400, y: 300 }
    } = config;

    // Créer les centres de communautés
    const communityCenters = this.calculateCommunityCenters(communities, center, clusterRadius);
    
    // Mapping nœud -> communauté
    const nodeToCommunity = new Map();
    communities.forEach((community, index) => {
      community.forEach(nodeId => {
        nodeToCommunity.set(nodeId, index);
      });
    });

    const clusteringForce = (alpha) => {
      simulation.nodes().forEach(node => {
        const communityIndex = nodeToCommunity.get(node.id);
        if (communityIndex !== undefined && communityCenters[communityIndex]) {
          const center = communityCenters[communityIndex];
          const dx = center.x - node.x;
          const dy = center.y - node.y;
          
          node.vx += dx * clusterStrength * alpha;
          node.vy += dy * clusterStrength * alpha;
        }
      });
    };

    simulation.force('clustering', clusteringForce);
  }

  /**
   * Ajouter une force radiale pour disposer en cercles concentriques
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} levels - Niveaux radiaux
   * @param {Object} center - Centre de la disposition
   * @param {number} radius - Rayon de base
   * @private
   */
  static addRadialForce(simulation, levels, center, radius) {
    const radialForce = d3.forceRadial()
      .radius(d => {
        const level = levels[d.id] || 0;
        return radius * (level + 1) / 3; // Normaliser sur 3 niveaux
      })
      .x(center.x)
      .y(center.y)
      .strength(0.1);

    simulation.force('radial', radialForce);
  }

  /**
   * Ajouter une force de grille magnétique
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {number} gridSize - Taille de la grille
   * @param {number} strength - Force magnétique
   * @param {Object} bounds - Limites
   * @private
   */
  static addGridForce(simulation, gridSize, strength, bounds) {
    const gridForce = (alpha) => {
      simulation.nodes().forEach(node => {
        // Calculer la position de grille la plus proche
        const gridX = Math.round(node.x / gridSize) * gridSize;
        const gridY = Math.round(node.y / gridSize) * gridSize;
        
        // S'assurer que la position est dans les limites
        const clampedX = Math.max(bounds.x[0], Math.min(bounds.x[1], gridX));
        const clampedY = Math.max(bounds.y[0], Math.min(bounds.y[1], gridY));
        
        // Appliquer la force magnétique
        node.vx += (clampedX - node.x) * strength * alpha;
        node.vy += (clampedY - node.y) * strength * alpha;
      });
    };

    simulation.force('grid', gridForce);
  }

  // ===========================================
  // CALCULS UTILITAIRES
  // ===========================================

  /**
   * Calculer la distance d'un lien basée sur ses propriétés
   * @param {Object} link - Lien du graphe
   * @param {Object} config - Configuration
   * @returns {number} Distance calculée
   * @private
   */
  static calculateLinkDistance(link, config) {
    // Distance de base
    let distance = config.distance;

    // Ajuster selon la force du lien
    if (link.strength) {
      const strengthMap = { strong: 0.7, medium: 1, weak: 1.3 };
      distance *= strengthMap[link.strength] || 1;
    }

    // Ajuster selon le poids
    if (link.weight) {
      distance *= Math.max(0.5, 2 - link.weight / 5);
    }

    return distance;
  }

  /**
   * Calculer la force de charge d'un nœud
   * @param {Object} node - Nœud du graphe
   * @param {Object} config - Configuration
   * @returns {number} Force de charge
   * @private
   */
  static calculateChargeStrength(node, config) {
    let strength = config.strength;

    // Ajuster selon le degré du nœud
    if (node.degree) {
      // Les nœuds très connectés repoussent plus
      strength *= Math.max(0.5, 1 + node.degree / 20);
    }

    // Ajuster selon le type de nœud
    if (node.type) {
      const typeMultipliers = {
        person: 1.2,
        organization: 1.5,
        place: 0.8,
        document: 0.6
      };
      strength *= typeMultipliers[node.type] || 1;
    }

    return strength;
  }

  /**
   * Calculer le rayon de collision d'un nœud
   * @param {Object} node - Nœud du graphe
   * @param {Object} config - Configuration
   * @returns {number} Rayon de collision
   * @private
   */
  static calculateCollisionRadius(node, config) {
    let radius = config.radius;

    // Utiliser la taille du nœud si disponible
    if (node.size) {
      radius = node.size + 2; // Petit padding
    } else if (node.degree) {
      // Calculer basé sur le degré
      radius = Math.max(5, Math.min(20, 5 + node.degree));
    }

    return radius;
  }

  /**
   * Calculer les niveaux hiérarchiques basés sur la centralité
   * @param {Object} data - Données du graphe
   * @returns {Object} Mapping nodeId -> level
   * @private
   */
  static calculateHierarchicalLevels(data) {
    const levels = {};
    
    // Calculer les degrés
    const degrees = {};
    data.nodes.forEach(node => {
      degrees[node.id] = node.degree || 0;
    });

    // Trier par degré décroissant et assigner des niveaux
    const sortedNodes = [...data.nodes].sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
    const levelSize = Math.ceil(sortedNodes.length / 3);

    sortedNodes.forEach((node, index) => {
      levels[node.id] = Math.floor(index / levelSize);
    });

    return levels;
  }

  /**
   * Calculer les niveaux radiaux basés sur la centralité
   * @param {Object} data - Données du graphe
   * @param {number} layerCount - Nombre de couches
   * @returns {Object} Mapping nodeId -> level
   * @private
   */
  static calculateRadialLevels(data, layerCount = 3) {
    const levels = {};
    
    // Utiliser le degré comme mesure de centralité
    const degrees = data.nodes.map(node => node.degree || 0);
    const maxDegree = Math.max(...degrees);
    
    data.nodes.forEach(node => {
      const normalizedDegree = (node.degree || 0) / (maxDegree || 1);
      levels[node.id] = Math.floor(normalizedDegree * layerCount);
    });

    return levels;
  }

  /**
   * Calculer les centres des communautés
   * @param {Array} communities - Communautés
   * @param {Object} center - Centre global
   * @param {number} radius - Rayon de répartition
   * @returns {Array} Centres des communautés
   * @private
   */
  static calculateCommunityCenters(communities, center, radius) {
    const centers = [];
    
    communities.forEach((community, index) => {
      const angle = (index / communities.length) * 2 * Math.PI;
      centers.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      });
    });

    return centers;
  }

  // ===========================================
  // MÉTHODES DE CONTRÔLE DE SIMULATION
  // ===========================================

  /**
   * Démarrer une simulation avec callbacks
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} callbacks - Callbacks { onTick, onEnd }
   * @returns {d3.Simulation} Simulation démarrée
   */
  static startSimulation(simulation, callbacks = {}) {
    const { onTick, onEnd } = callbacks;

    if (onTick) {
      simulation.on('tick', onTick);
    }

    if (onEnd) {
      simulation.on('end', onEnd);
    }

    return simulation.restart();
  }

  /**
   * Arrêter progressivement une simulation
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {number} duration - Durée de l'arrêt en ms
   */
  static stopSimulation(simulation, duration = 1000) {
    const startAlpha = simulation.alpha();
    const startTime = Date.now();

    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const alpha = startAlpha * (1 - progress);
      
      simulation.alpha(alpha);
      
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        simulation.stop();
      }
    };

    fadeOut();
  }

  /**
   * Redémarrer une simulation avec nouvelle configuration
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} newConfig - Nouvelle configuration
   */
  static restartSimulation(simulation, newConfig = {}) {
    // Appliquer la nouvelle configuration
    Object.entries(newConfig).forEach(([forceName, config]) => {
      const force = simulation.force(forceName);
      if (force && config) {
        Object.entries(config).forEach(([key, value]) => {
          if (typeof force[key] === 'function') {
            force[key](value);
          }
        });
      }
    });

    // Redémarrer avec une nouvelle énergie
    simulation.alpha(1).restart();
  }

  /**
   * Optimiser les performances pour les grands graphes
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {number} nodeCount - Nombre de nœuds
   */
  static optimizeForLargeGraphs(simulation, nodeCount) {
    if (nodeCount > 500) {
      // Réduire les itérations et la précision pour les grands graphes
      simulation
        .force('link')?.iterations(1)
        .force('collision')?.iterations(1);
      
      // Convergence plus rapide
      simulation
        .alphaDecay(0.05)
        .velocityDecay(0.6);
    }

    if (nodeCount > 1000) {
      // Désactiver les forces coûteuses pour très grands graphes
      simulation.force('collision', null);
      
      // Force de charge simplifiée
      simulation.force('charge', d3.forceManyBody().strength(-30));
    }
  }

  /**
   * Créer un layout personnalisé avec forces personnalisées
   * @param {Object} data - Données du graphe
   * @param {Array} customForces - Forces personnalisées
   * @param {Object} config - Configuration de base
   * @returns {d3.Simulation} Simulation personnalisée
   */
  static createCustomSimulation(data, customForces = [], config = {}) {
    const simulation = this.createBasicSimulation(data, config);

    // Ajouter les forces personnalisées
    customForces.forEach(({ name, force }) => {
      simulation.force(name, force);
    });

    return simulation;
  }

  /**
   * Analyser les performances d'une simulation
   * @param {d3.Simulation} simulation - Simulation D3
   * @returns {Object} Métriques de performance
   */
  static analyzePerformance(simulation) {
    const nodes = simulation.nodes();
    const forces = [];
    
    // Lister les forces actives
    ['link', 'charge', 'center', 'collision', 'boundary'].forEach(forceName => {
      if (simulation.force(forceName)) {
        forces.push(forceName);
      }
    });

    return {
      nodeCount: nodes.length,
      activeForces: forces,
      alpha: simulation.alpha(),
      alphaMin: simulation.alphaMin(),
      isRunning: simulation.alpha() > simulation.alphaMin(),
      estimatedComplexity: this.estimateComplexity(nodes.length, forces.length)
    };
  }

  /**
   * Estimer la complexité computationnelle
   * @param {number} nodeCount - Nombre de nœuds
   * @param {number} forceCount - Nombre de forces
   * @returns {string} Niveau de complexité
   * @private
   */
  static estimateComplexity(nodeCount, forceCount) {
    const complexity = nodeCount * nodeCount * forceCount;
    
    if (complexity < 10000) return 'low';
    if (complexity < 100000) return 'medium';
    if (complexity < 1000000) return 'high';
    return 'very_high';
  }

  /**
   * Sauvegarder l'état d'une simulation
   * @param {d3.Simulation} simulation - Simulation D3
   * @returns {Object} État sauvegardé
   */
  static saveSimulationState(simulation) {
    return {
      nodes: simulation.nodes().map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        vx: node.vx,
        vy: node.vy
      })),
      alpha: simulation.alpha(),
      alphaTarget: simulation.alphaTarget(),
      forces: this.extractForceConfig(simulation)
    };
  }

  /**
   * Restaurer l'état d'une simulation
   * @param {d3.Simulation} simulation - Simulation D3
   * @param {Object} state - État à restaurer
   */
  static restoreSimulationState(simulation, state) {
    // Restaurer les positions des nœuds
    const nodeMap = new Map(simulation.nodes().map(node => [node.id, node]));
    
    state.nodes.forEach(savedNode => {
      const node = nodeMap.get(savedNode.id);
      if (node) {
        Object.assign(node, savedNode);
      }
    });

    // Restaurer les paramètres de simulation
    simulation
      .alpha(state.alpha)
      .alphaTarget(state.alphaTarget);

    // Restaurer la configuration des forces
    // (implémentation détaillée selon les besoins)
  }

  /**
   * Extraire la configuration des forces
   * @param {d3.Simulation} simulation - Simulation D3
   * @returns {Object} Configuration des forces
   * @private
   */
  static extractForceConfig(simulation) {
    const config = {};
    
    // Extraire la configuration de chaque force
    // (implémentation simplifiée)
    ['link', 'charge', 'center', 'collision'].forEach(forceName => {
      const force = simulation.force(forceName);
      if (force) {
        config[forceName] = {
          exists: true
          // Ajouter d'autres propriétés selon le type de force
        };
      }
    });

    return config;
  }
}

export default ForceLayout;