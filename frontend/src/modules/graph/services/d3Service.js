// frontend/src/modules/graph/services/d3Service.js - Service D3.js pour la visualisation de graphe
import * as d3 from 'd3';

/**
 * Service D3.js pour la création et gestion des visualisations de graphe
 * Encapsule toutes les opérations D3 pour les graphes de relations
 */
class D3Service {
  /**
   * Configuration par défaut pour les graphes
   */
  static defaultConfig = {
    // Dimensions
    width: 800,
    height: 600,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },

    // Forces
    simulation: {
      strength: {
        link: 0.1,
        charge: -300,
        center: 0.1,
        collision: 1,
      },
      decay: 0.99,
      velocityDecay: 0.4,
      alphaMin: 0.001,
      alphaDecay: 0.0228,
    },

    // Nœuds
    nodes: {
      radius: {
        min: 8,
        max: 30,
        default: 12,
      },
      stroke: {
        width: 2,
        color: '#fff',
      },
      colors: {
        person: '#ef4444',
        place: '#10b981',
        organization: '#3b82f6',
        vehicle: '#f59e0b',
        account: '#8b5cf6',
        event: '#ec4899',
        document: '#6b7280',
        phone: '#06b6d4',
        email: '#84cc16',
        website: '#f97316',
        default: '#9ca3af',
      },
    },

    // Liens
    links: {
      stroke: {
        width: {
          min: 1,
          max: 5,
          default: 2,
        },
        color: '#6b7280',
        opacity: 0.7,
      },
      distance: {
        min: 30,
        max: 200,
        default: 80,
      },
    },

    // Labels
    labels: {
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      color: '#374151',
      offset: 15,
    },

    // Interactions
    drag: {
      enabled: true,
      alpha: 0.3,
    },
    zoom: {
      enabled: true,
      scaleExtent: [0.1, 10],
      duration: 300,
    },

    // Animations
    transitions: {
      duration: 300,
      ease: d3.easeQuadInOut,
    },
  };

  /**
   * Créer une nouvelle visualisation de graphe
   * @param {HTMLElement} container - Conteneur DOM
   * @param {Object} data - Données du graphe { nodes, links }
   * @param {Object} config - Configuration personnalisée
   * @returns {Object} Instance de visualisation
   */
  static createGraph(container, data, config = {}) {
    const finalConfig = this.mergeConfig(config);
    const { width, height } = finalConfig;

    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();

    // Créer le SVG principal
    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'graph-visualization');

    // Créer les groupes principaux
    const defs = svg.append('defs');
    const mainGroup = svg.append('g').attr('class', 'main-group');

    // Ajouter les définitions (motifs, filtres, etc.)
    this.createDefinitions(defs);

    // Créer les groupes pour les différents éléments
    const linksGroup = mainGroup.append('g').attr('class', 'links');
    const nodesGroup = mainGroup.append('g').attr('class', 'nodes');
    const labelsGroup = mainGroup.append('g').attr('class', 'labels');

    // Configurer le zoom
    const zoom = this.createZoomBehavior(svg, mainGroup, finalConfig);

    // Créer la simulation de forces
    const simulation = this.createSimulation(data, finalConfig);

    // Créer l'instance de visualisation
    const graphInstance = {
      svg,
      mainGroup,
      linksGroup,
      nodesGroup,
      labelsGroup,
      simulation,
      zoom,
      config: finalConfig,
      data: { ...data },
      state: {
        selectedNodes: new Set(),
        highlightedNodes: new Set(),
        filteredTypes: new Set(),
        isPlaying: true,
      },
    };

    // Rendre les éléments
    this.renderLinks(graphInstance);
    this.renderNodes(graphInstance);
    this.renderLabels(graphInstance);

    // Démarrer la simulation
    this.startSimulation(graphInstance);

    return graphInstance;
  }

  /**
   * Fusionner la configuration par défaut avec la configuration personnalisée
   * @param {Object} customConfig - Configuration personnalisée
   * @returns {Object} Configuration fusionnée
   * @private
   */
  static mergeConfig(customConfig) {
    return {
      ...this.defaultConfig,
      ...customConfig,
      simulation: { ...this.defaultConfig.simulation, ...customConfig.simulation },
      nodes: { ...this.defaultConfig.nodes, ...customConfig.nodes },
      links: { ...this.defaultConfig.links, ...customConfig.links },
      labels: { ...this.defaultConfig.labels, ...customConfig.labels },
    };
  }

  /**
   * Créer les définitions SVG (filtres, motifs, etc.)
   * @param {d3.Selection} defs - Élément defs
   * @private
   */
  static createDefinitions(defs) {
    // Filtre pour l'ombre portée
    const dropShadow = defs.append('filter').attr('id', 'drop-shadow').attr('height', '130%');

    dropShadow.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 3);

    dropShadow.append('feOffset').attr('dx', 2).attr('dy', 2).attr('result', 'offset');

    dropShadow.append('feFlood').attr('flood-color', '#000000').attr('flood-opacity', 0.2);

    dropShadow.append('feComposite').attr('in2', 'offset').attr('operator', 'in');

    const feMerge = dropShadow.append('feMerge');
    feMerge.append('feMergeNode');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Filtre de surbrillance
    const glow = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('height', '300%')
      .attr('width', '300%')
      .attr('x', '-100%')
      .attr('y', '-100%');

    glow.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur');

    const glowMerge = glow.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Motifs pour les nœuds spéciaux
    this.createNodePatterns(defs);
  }

  /**
   * Créer des motifs pour différents types de nœuds
   * @param {d3.Selection} defs - Élément defs
   * @private
   */
  static createNodePatterns(defs) {
    // Motif pour les nœuds centraux
    const centralPattern = defs
      .append('pattern')
      .attr('id', 'central-node-pattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 4)
      .attr('height', 4);

    centralPattern.append('rect').attr('width', 4).attr('height', 4).attr('fill', '#fbbf24');

    centralPattern
      .append('path')
      .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1);
  }

  /**
   * Créer le comportement de zoom
   * @param {d3.Selection} svg - Élément SVG
   * @param {d3.Selection} mainGroup - Groupe principal
   * @param {Object} config - Configuration
   * @returns {d3.ZoomBehavior} Comportement de zoom
   * @private
   */
  static createZoomBehavior(svg, mainGroup, config) {
    const { zoom: zoomConfig } = config;

    const zoomBehavior = d3
      .zoom()
      .scaleExtent(zoomConfig.scaleExtent)
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
      });

    if (zoomConfig.enabled) {
      svg.call(zoomBehavior);
    }

    return zoomBehavior;
  }

  /**
   * Créer la simulation de forces
   * @param {Object} data - Données du graphe
   * @param {Object} config - Configuration
   * @returns {d3.Simulation} Simulation de forces
   * @private
   */
  static createSimulation(data, config) {
    const { width, height, simulation: simConfig } = config;

    const simulation = d3
      .forceSimulation(data.nodes)
      .force(
        'link',
        d3
          .forceLink(data.links)
          .id((d) => d.id)
          .strength(simConfig.strength.link)
          .distance((d) => this.calculateLinkDistance(d, config))
      )
      .force('charge', d3.forceManyBody().strength(simConfig.strength.charge))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(simConfig.strength.center))
      .force(
        'collision',
        d3.forceCollide().radius((d) => this.calculateNodeRadius(d, config) + 5).strength(simConfig.strength.collision)
      )
      .alphaDecay(simConfig.alphaDecay)
      .velocityDecay(simConfig.velocityDecay);

    return simulation;
  }

  /**
   * Rendre les liens
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static renderLinks(graphInstance) {
    const { linksGroup, data, config } = graphInstance;

    const links = linksGroup
      .selectAll('.link')
      .data(data.links, (d) => d.id)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', (d) => this.getLinkColor(d, config))
      .attr('stroke-width', (d) => this.calculateLinkWidth(d, config))
      .attr('stroke-opacity', config.links.stroke.opacity)
      .style('cursor', 'pointer');

    // Ajouter les interactions sur les liens
    this.addLinkInteractions(links, graphInstance);

    graphInstance.linkElements = links;
  }

  /**
   * Rendre les nœuds
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static renderNodes(graphInstance) {
    const { nodesGroup, data, config } = graphInstance;

    const nodes = nodesGroup
      .selectAll('.node')
      .data(data.nodes, (d) => d.id)
      .join('circle')
      .attr('class', 'node')
      .attr('r', (d) => this.calculateNodeRadius(d, config))
      .attr('fill', (d) => this.getNodeColor(d, config))
      .attr('stroke', config.nodes.stroke.color)
      .attr('stroke-width', config.nodes.stroke.width)
      .style('cursor', 'grab');

    // Ajouter les interactions sur les nœuds
    this.addNodeInteractions(nodes, graphInstance);

    graphInstance.nodeElements = nodes;
  }

  /**
   * Rendre les labels
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static renderLabels(graphInstance) {
    const { labelsGroup, data, config } = graphInstance;

    const labels = labelsGroup
      .selectAll('.label')
      .data(data.nodes, (d) => d.id)
      .join('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', config.labels.offset)
      .attr('font-size', config.labels.fontSize)
      .attr('font-family', config.labels.fontFamily)
      .attr('fill', config.labels.color)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .text((d) => this.formatNodeLabel(d));

    graphInstance.labelElements = labels;
  }

  /**
   * Ajouter les interactions sur les nœuds
   * @param {d3.Selection} nodes - Sélection des nœuds
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static addNodeInteractions(nodes, graphInstance) {
    const { simulation, config } = graphInstance;

    // Drag behavior
    if (config.drag.enabled) {
      const dragBehavior = d3
        .drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(config.drag.alpha).restart();
          d.fx = d.x;
          d.fy = d.y;
          if (event.sourceEvent) event.sourceEvent.stopPropagation();
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          // Garder la position fixe ou la libérer selon la préférence
          if (!event.sourceEvent || !event.sourceEvent.shiftKey) {
            d.fx = null;
            d.fy = null;
          }
        });

      nodes.call(dragBehavior);
    }

    // Événements de survol
    nodes
      .on('mouseenter', (event, d) => this.onNodeMouseEnter(event, d, graphInstance))
      .on('mouseleave', (event, d) => this.onNodeMouseLeave(event, d, graphInstance))
      .on('click', (event, d) => this.onNodeClick(event, d, graphInstance))
      .on('dblclick', (event, d) => this.onNodeDoubleClick(event, d, graphInstance));
  }

  /**
   * Ajouter les interactions sur les liens
   * @param {d3.Selection} links - Sélection des liens
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static addLinkInteractions(links, graphInstance) {
    links
      .on('mouseenter', (event, d) => this.onLinkMouseEnter(event, d, graphInstance))
      .on('mouseleave', (event, d) => this.onLinkMouseLeave(event, d, graphInstance))
      .on('click', (event, d) => this.onLinkClick(event, d, graphInstance));
  }

  /**
   * Démarrer la simulation
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static startSimulation(graphInstance) {
    const { simulation, nodeElements, linkElements, labelElements } = graphInstance;

    simulation.on('tick', () => {
      // Mettre à jour les positions des liens
      linkElements
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      // Mettre à jour les positions des nœuds
      nodeElements.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

      // Mettre à jour les positions des labels
      labelElements.attr('x', (d) => d.x).attr('y', (d) => d.y);
    });
  }

  // ===========================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ===========================================

  /**
   * Gestionnaire pour l'entrée de souris sur un nœud
   * @param {Event} event - Événement
   * @param {Object} node - Données du nœud
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static onNodeMouseEnter(event, node, graphInstance) {
    const { nodeElements, linkElements } = graphInstance;

    // Mettre en surbrillance le nœud
    nodeElements
      .filter((d) => d.id === node.id)
      .attr('filter', 'url(#glow)')
      .transition()
      .duration(200)
      .attr('r', (d) => this.calculateNodeRadius(d, graphInstance.config) * 1.2);

    // Mettre en surbrillance les liens connectés
    const connectedLinks = linkElements.filter((d) => d.source.id === node.id || d.target.id === node.id);

    connectedLinks
      .transition()
      .duration(200)
      .attr('stroke-opacity', 1)
      .attr('stroke-width', (d) => this.calculateLinkWidth(d, graphInstance.config) * 1.5);

    // Diminuer l'opacité des autres éléments
    nodeElements
      .filter((d) => d.id !== node.id)
      .transition()
      .duration(200)
      .attr('opacity', 0.3);

    linkElements
      .filter((d) => d.source.id !== node.id && d.target.id !== node.id)
      .transition()
      .duration(200)
      .attr('opacity', 0.1);

    // Émettre un événement personnalisé
    this.emitEvent(graphInstance, 'nodeMouseEnter', { node, event });
  }

  /**
   * Gestionnaire pour la sortie de souris d'un nœud
   * @param {Event} event - Événement
   * @param {Object} node - Données du nœud
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static onNodeMouseLeave(event, node, graphInstance) {
    const { nodeElements, linkElements, config } = graphInstance;

    // Restaurer l'apparence normale
    nodeElements
      .attr('filter', null)
      .transition()
      .duration(200)
      .attr('r', (d) => this.calculateNodeRadius(d, config))
      .attr('opacity', 1);

    linkElements
      .transition()
      .duration(200)
      .attr('stroke-opacity', config.links.stroke.opacity)
      .attr('stroke-width', (d) => this.calculateLinkWidth(d, config))
      .attr('opacity', 1);

    this.emitEvent(graphInstance, 'nodeMouseLeave', { node, event });
  }

  /**
   * Gestionnaire pour le clic sur un nœud
   * @param {Event} event - Événement
   * @param {Object} node - Données du nœud
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static onNodeClick(event, node, graphInstance) {
    const { state } = graphInstance;

    // Gérer la sélection
    if (event.ctrlKey || event.metaKey) {
      // Sélection multiple
      if (state.selectedNodes.has(node.id)) {
        state.selectedNodes.delete(node.id);
      } else {
        state.selectedNodes.add(node.id);
      }
    } else {
      // Sélection simple
      state.selectedNodes.clear();
      state.selectedNodes.add(node.id);
    }

    this.updateNodeSelection(graphInstance);
    this.emitEvent(graphInstance, 'nodeClick', { node, event, selected: state.selectedNodes });
  }

  /**
   * Gestionnaire pour le double-clic sur un nœud
   * @param {Event} event - Événement
   * @param {Object} node - Données du nœud
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static onNodeDoubleClick(event, node, graphInstance) {
    // Centrer la vue sur le nœud
    this.centerOnNode(graphInstance, node);
    this.emitEvent(graphInstance, 'nodeDoubleClick', { node, event });
  }

  /**
   * Gestionnaire pour l'entrée de souris sur un lien
   * @param {Event} event - Événement
   * @param {Object} link - Données du lien
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static onLinkMouseEnter(event, link, graphInstance) {
    const { linkElements } = graphInstance;

    linkElements
      .filter((d) => d.id === link.id)
      .transition()
      .duration(200)
      .attr('stroke-width', (d) => this.calculateLinkWidth(d, graphInstance.config) * 2)
      .attr('stroke-opacity', 1);

    this.emitEvent(graphInstance, 'linkMouseEnter', { link, event });
  }

  /**
   * Gestionnaire pour la sortie de souris d'un lien
   * @param {Event} event - Événement
   * @param {Object} link - Données du lien
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static onLinkMouseLeave(event, link, graphInstance) {
    const { linkElements, config } = graphInstance;

    linkElements
      .filter((d) => d.id === link.id)
      .transition()
      .duration(200)
      .attr('stroke-width', (d) => this.calculateLinkWidth(d, config))
      .attr('stroke-opacity', config.links.stroke.opacity);

    this.emitEvent(graphInstance, 'linkMouseLeave', { link, event });
  }

  /**
   * Gestionnaire pour le clic sur un lien
   * @param {Event} event - Événement
   * @param {Object} link - Données du lien
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static onLinkClick(event, link, graphInstance) {
    this.emitEvent(graphInstance, 'linkClick', { link, event });
  }

  // ===========================================
  // MÉTHODES UTILITAIRES DE CALCUL
  // ===========================================

  /**
   * Calculer le rayon d'un nœud
   * @param {Object} node - Données du nœud
   * @param {Object} config - Configuration
   * @returns {number} Rayon du nœud
   * @private
   */
  static calculateNodeRadius(node, config) {
    const { radius } = config.nodes;

    if (node.size !== undefined) {
      return Math.max(radius.min, Math.min(radius.max, node.size));
    }

    if (node.degree !== undefined) {
      // Calculer basé sur le degré
      const maxDegree = 20; // Valeur arbitraire, pourrait être calculée dynamiquement
      const ratio = Math.min(node.degree / maxDegree, 1);
      return radius.min + (radius.max - radius.min) * ratio;
    }

    return radius.default;
  }

  /**
   * Calculer la largeur d'un lien
   * @param {Object} link - Données du lien
   * @param {Object} config - Configuration
   * @returns {number} Largeur du lien
   * @private
   */
  static calculateLinkWidth(link, config) {
    const { width } = config.links.stroke;

    if (link.weight !== undefined) {
      const ratio = Math.min(link.weight / 5, 1); // Normaliser sur 5
      return width.min + (width.max - width.min) * ratio;
    }

    if (link.strength) {
      const strengthMap = { weak: 1, medium: 2, strong: 3 };
      const strengthValue = strengthMap[link.strength] || 2;
      return width.min + (width.max - width.min) * (strengthValue / 3);
    }

    return width.default;
  }

  /**
   * Calculer la distance d'un lien
   * @param {Object} link - Données du lien
   * @param {Object} config - Configuration
   * @returns {number} Distance du lien
   * @private
   */
  static calculateLinkDistance(link, config) {
    const { distance } = config.links;

    if (link.distance !== undefined) {
      return link.distance;
    }

    // Distance inversement proportionnelle à la force du lien
    if (link.strength) {
      const strengthMap = { strong: 0.7, medium: 1, weak: 1.3 };
      const multiplier = strengthMap[link.strength] || 1;
      return distance.default * multiplier;
    }

    return distance.default;
  }

  /**
   * Obtenir la couleur d'un nœud
   * @param {Object} node - Données du nœud
   * @param {Object} config - Configuration
   * @returns {string} Couleur du nœud
   * @private
   */
  static getNodeColor(node, config) {
    const { colors } = config.nodes;

    if (node.color) {
      return node.color;
    }

    if (node.type && colors[node.type]) {
      return colors[node.type];
    }

    return colors.default;
  }

  /**
   * Obtenir la couleur d'un lien
   * @param {Object} link - Données du lien
   * @param {Object} config - Configuration
   * @returns {string} Couleur du lien
   * @private
   */
  static getLinkColor(link, config) {
    if (link.color) {
      return link.color;
    }

    return config.links.stroke.color;
  }

  /**
   * Formater le label d'un nœud
   * @param {Object} node - Données du nœud
   * @returns {string} Label formaté
   * @private
   */
  static formatNodeLabel(node) {
    if (node.label) {
      return node.label;
    }

    if (node.name && node.name.length > 15) {
      return node.name.substring(0, 12) + '...';
    }

    return node.name || `Node ${node.id}`;
  }

  // ===========================================
  // MÉTHODES PUBLIQUES DE CONTRÔLE
  // ===========================================

  /**
   * Mettre à jour les données du graphe
   * @param {Object} graphInstance - Instance de graphe
   * @param {Object} newData - Nouvelles données
   */
  static updateData(graphInstance, newData) {
    graphInstance.data = { ...newData };

    // Mettre à jour la simulation
    graphInstance.simulation.nodes(newData.nodes).force('link').links(newData.links);

    // Re-rendre les éléments
    this.renderLinks(graphInstance);
    this.renderNodes(graphInstance);
    this.renderLabels(graphInstance);

    // Redémarrer la simulation
    graphInstance.simulation.alpha(1).restart();
  }

  /**
   * Centrer la vue sur un nœud
   * @param {Object} graphInstance - Instance de graphe
   * @param {Object} node - Nœud à centrer
   */
  static centerOnNode(graphInstance, node) {
    const { svg, config } = graphInstance;
    const { width, height } = config;

    const scale = d3.zoomTransform(svg.node()).k;
    const x = -node.x * scale + width / 2;
    const y = -node.y * scale + height / 2;

    svg
      .transition()
      .duration(config.transitions.duration)
      .ease(config.transitions.ease)
      .call(graphInstance.zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
  }

  /**
   * Ajuster la vue pour afficher tout le graphe
   * @param {Object} graphInstance - Instance de graphe
   */
  static fitToView(graphInstance) {
    const { svg, data, config } = graphInstance;
    const { width, height, margin } = config;

    if (data.nodes.length === 0) return;

    // Calculer les limites du graphe
    const bounds = this.calculateGraphBounds(data.nodes);
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;

    // Calculer l'échelle pour ajuster le graphe
    const scale =
      Math.min(
        (width - margin.left - margin.right) / Math.max(graphWidth, 1),
        (height - margin.top - margin.bottom) / Math.max(graphHeight, 1)
      ) * 0.9; // Marge de sécurité

    // Calculer la translation pour centrer
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const translateX = width / 2 - centerX * scale;
    const translateY = height / 2 - centerY * scale;

    svg
      .transition()
      .duration(config.transitions.duration)
      .ease(config.transitions.ease)
      .call(graphInstance.zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  /**
   * Calculer les limites du graphe
   * @param {Array} nodes - Nœuds du graphe
   * @returns {Object} Limites { minX, maxX, minY, maxY }
   * @private
   */
  static calculateGraphBounds(nodes) {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    nodes.forEach((node) => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    return { minX, maxX, minY, maxY };
  }

  /**
   * Mettre à jour la sélection des nœuds
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static updateNodeSelection(graphInstance) {
    const { nodeElements, state, config } = graphInstance;

    nodeElements
      .classed('selected', (d) => state.selectedNodes.has(d.id))
      .attr('stroke-width', (d) => (state.selectedNodes.has(d.id) ? config.nodes.stroke.width * 2 : config.nodes.stroke.width));
  }

  /**
   * Filtrer les nœuds par type
   * @param {Object} graphInstance - Instance de graphe
   * @param {Set} visibleTypes - Types visibles
   */
  static filterNodesByType(graphInstance, visibleTypes) {
    const { nodeElements, linkElements, labelElements } = graphInstance;

    nodeElements.style('display', (d) => (visibleTypes.has(d.type) ? null : 'none'));

    labelElements.style('display', (d) => (visibleTypes.has(d.type) ? null : 'none'));

    linkElements.style('display', (d) => (visibleTypes.has(d.source.type) && visibleTypes.has(d.target.type) ? null : 'none'));

    graphInstance.state.filteredTypes = new Set([...visibleTypes]);
  }

  /**
   * Contrôler la simulation
   * @param {Object} graphInstance - Instance de graphe
   * @param {string} action - Action ('play', 'pause', 'restart')
   */
  static controlSimulation(graphInstance, action) {
    const { simulation, state } = graphInstance;

    switch (action) {
      case 'play':
        if (!state.isPlaying) {
          simulation.alpha(0.3).restart();
          state.isPlaying = true;
        }
        break;
      case 'pause':
        simulation.stop();
        state.isPlaying = false;
        break;
      case 'restart':
        simulation.alpha(1).restart();
        state.isPlaying = true;
        break;
    }
  }

  /**
   * Émettre un événement personnalisé
   * @param {Object} graphInstance - Instance de graphe
   * @param {string} eventName - Nom de l'événement
   * @param {Object} detail - Détails de l'événement
   * @private
   */
  static emitEvent(graphInstance, eventName, detail) {
    if (graphInstance.eventCallbacks && graphInstance.eventCallbacks[eventName]) {
      graphInstance.eventCallbacks[eventName](detail);
    }
  }

  /**
   * Ajouter un gestionnaire d'événement
   * @param {Object} graphInstance - Instance de graphe
   * @param {string} eventName - Nom de l'événement
   * @param {Function} callback - Fonction de callback
   */
  static addEventListener(graphInstance, eventName, callback) {
    if (!graphInstance.eventCallbacks) {
      graphInstance.eventCallbacks = {};
    }
    graphInstance.eventCallbacks[eventName] = callback;
  }

  /**
   * Supprimer un gestionnaire d'événement
   * @param {Object} graphInstance - Instance de graphe
   * @param {string} eventName - Nom de l'événement
   */
  static removeEventListener(graphInstance, eventName) {
    if (graphInstance.eventCallbacks) {
      delete graphInstance.eventCallbacks[eventName];
    }
  }

  /**
   * Nettoyer une instance de graphe
   * @param {Object} graphInstance - Instance de graphe
   */
  static cleanup(graphInstance) {
    if (graphInstance.simulation) {
      graphInstance.simulation.stop();
    }

    if (graphInstance.svg) {
      graphInstance.svg.selectAll('*').remove();
    }

    if (graphInstance.eventCallbacks) {
      graphInstance.eventCallbacks = {};
    }
  }

  /**
   * Exporter le graphe au format SVG
   * @param {Object} graphInstance - Instance de graphe
   * @returns {string} SVG en tant que string
   */
  static exportSVG(graphInstance) {
    const { svg } = graphInstance;
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg.node());
  }

  /**
   * Exporter le graphe au format PNG
   * @param {Object} graphInstance - Instance de graphe
   * @param {Function} callback - Callback avec l'URL de l'image (data URL)
   */
  static exportPNG(graphInstance, callback) {
    const svgString = this.exportSVG(graphInstance);
    const { width, height } = graphInstance.config;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      callback(dataUrl);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      console.error('Impossible de charger le SVG pour export PNG');
    };

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.src = url;
  }

  // ===========================================
  // LAYOUTS SPÉCIALISÉS
  // ===========================================

  /**
   * Appliquer un layout en force dirigée hiérarchique
   * @param {Object} graphInstance - Instance de graphe
   * @param {Object} options - Options du layout
   */
  static applyHierarchicalLayout(graphInstance, options = {}) {
    const { simulation, data } = graphInstance;
    const { levels = 3, spacing = 100 } = options;

    // Calculer les niveaux hiérarchiques basés sur les degrés
    const sortedNodes = [...data.nodes].sort((a, b) => (b.degree || 0) - (a.degree || 0));
    const nodesPerLevel = Math.ceil(sortedNodes.length / Math.max(levels, 1));

    sortedNodes.forEach((node, index) => {
      const level = Math.floor(index / nodesPerLevel);
      const positionInLevel = index % nodesPerLevel;

      node.fx = (positionInLevel - nodesPerLevel / 2) * spacing;
      node.fy = level * spacing - (levels * spacing) / 2;
    });

    simulation.alpha(1).restart();

    // Libérer les positions après la stabilisation
    setTimeout(() => {
      data.nodes.forEach((node) => {
        node.fx = null;
        node.fy = null;
      });
    }, 3000);
  }

  /**
   * Appliquer un layout circulaire
   * @param {Object} graphInstance - Instance de graphe
   * @param {Object} options - Options du layout
   */
  static applyCircularLayout(graphInstance, options = {}) {
    const { simulation, data, config } = graphInstance;
    const { radius = 200, groupByType = false } = options;
    const { width, height } = config;

    const centerX = width / 2;
    const centerY = height / 2;

    if (groupByType) {
      // Grouper par type en cercles concentriques
      const types = [...new Set(data.nodes.map((n) => n.type))];
      const radiusStep = radius / Math.max(types.length, 1);

      types.forEach((type, typeIndex) => {
        const typeNodes = data.nodes.filter((n) => n.type === type);
        const typeRadius = (typeIndex + 1) * radiusStep;

        typeNodes.forEach((node, nodeIndex) => {
          const angle = (nodeIndex / typeNodes.length) * 2 * Math.PI;
          node.fx = centerX + typeRadius * Math.cos(angle);
          node.fy = centerY + typeRadius * Math.sin(angle);
        });
      });
    } else {
      // Cercle simple
      data.nodes.forEach((node, index) => {
        const angle = (index / Math.max(data.nodes.length, 1)) * 2 * Math.PI;
        node.fx = centerX + radius * Math.cos(angle);
        node.fy = centerY + radius * Math.sin(angle);
      });
    }

    simulation.alpha(1).restart();

    // Libérer les positions après la stabilisation
    setTimeout(() => {
      data.nodes.forEach((node) => {
        node.fx = null;
        node.fy = null;
      });
    }, 3000);
  }

  /**
   * Appliquer un layout en grille
   * @param {Object} graphInstance - Instance de graphe
   * @param {Object} options - Options du layout
   */
  static applyGridLayout(graphInstance, options = {}) {
    const { simulation, data, config } = graphInstance;
    const { spacing = 80, groupByType = false } = options;
    const { width, height } = config;

    let nodes = [...data.nodes];

    if (groupByType) {
      // Trier par type puis par degré
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return String(a.type || '').localeCompare(String(b.type || ''));
        }
        return (b.degree || 0) - (a.degree || 0);
      });
    } else {
      // Trier par degré
      nodes.sort((a, b) => (b.degree || 0) - (a.degree || 0));
    }

    const cols = Math.ceil(Math.sqrt(Math.max(nodes.length, 1)));
    const rows = Math.ceil(nodes.length / cols);

    const totalWidth = (cols - 1) * spacing;
    const totalHeight = (rows - 1) * spacing;
    const startX = width / 2 - totalWidth / 2;
    const startY = height / 2 - totalHeight / 2;

    nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      node.fx = startX + col * spacing;
      node.fy = startY + row * spacing;
    });

    simulation.alpha(1).restart();

    // Libérer les positions après la stabilisation
    setTimeout(() => {
      data.nodes.forEach((node) => {
        node.fx = null;
        node.fy = null;
      });
    }, 3000);
  }

  // ===========================================
  // ALGORITHMES DE LAYOUT AVANCÉS
  // ===========================================

  /**
   * Calculer le layout par force dirigée avec clustering
   * @param {Object} graphInstance - Instance de graphe
   * @param {Array} communities - Communautés détectées
   */
  static applyCommunityLayout(graphInstance, communities) {
    const { simulation, data, config } = graphInstance;
    const { width, height } = config;

    // Créer des centres pour chaque communauté
    const communityCount = Math.max(communities.length, 1);
    const communityRadius = Math.min(width, height) / 4;
    const centerX = width / 2;
    const centerY = height / 2;

    const communityCenters = communities.map((community, index) => {
      const angle = (index / communityCount) * 2 * Math.PI;
      return {
        x: centerX + communityRadius * Math.cos(angle),
        y: centerY + communityRadius * Math.sin(angle),
      };
    });

    // Assigner chaque nœud à sa communauté
    const nodeToCommunity = new Map();
    communities.forEach((community, index) => {
      community.nodes.forEach((nodeId) => {
        nodeToCommunity.set(nodeId, index);
      });
    });

    // Utiliser des forces X/Y vers le centre de la communauté
    simulation
      .force(
        'communityX',
        d3
          .forceX((d) => {
            const i = nodeToCommunity.get(d.id);
            return i !== undefined ? communityCenters[i].x : centerX;
          })
          .strength(0.1)
      )
      .force(
        'communityY',
        d3
          .forceY((d) => {
            const i = nodeToCommunity.get(d.id);
            return i !== undefined ? communityCenters[i].y : centerY;
          })
          .strength(0.1)
      );

    simulation.alpha(1).restart();
  }

  /**
   * Optimiser les positions des nœuds pour réduire les croisements
   * @param {Object} graphInstance - Instance de graphe
   */
  static optimizeLayout(graphInstance) {
    const { data } = graphInstance;

    // Algorithme simple d'optimisation par échange
    const iterations = 100;
    let bestCrossings = this.countEdgeCrossings(data);

    for (let i = 0; i < iterations; i++) {
      const node1 = data.nodes[Math.floor(Math.random() * data.nodes.length)];
      const node2 = data.nodes[Math.floor(Math.random() * data.nodes.length)];

      if (!node1 || !node2 || node1 === node2) continue;

      // Sauvegarder positions originales
      const a = { x: node1.x, y: node1.y };
      const b = { x: node2.x, y: node2.y };

      // Échanger
      node1.x = b.x;
      node1.y = b.y;
      node2.x = a.x;
      node2.y = a.y;

      const newCrossings = this.countEdgeCrossings(data);

      if (newCrossings < bestCrossings) {
        bestCrossings = newCrossings;
      } else {
        // Annuler l'échange
        node1.x = a.x;
        node1.y = a.y;
        node2.x = b.x;
        node2.y = b.y;
      }
    }
  }

  /**
   * Compter les croisements d'arêtes
   * @param {Object} data - Données du graphe
   * @returns {number} Nombre de croisements
   * @private
   */
  static countEdgeCrossings(data) {
    let crossings = 0;
    const links = data.links || [];

    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        if (this.doLinesIntersect(links[i], links[j])) {
          crossings++;
        }
      }
    }

    return crossings;
  }

  /**
   * Vérifier si deux lignes se croisent
   * @param {Object} line1 - Première ligne
   * @param {Object} line2 - Deuxième ligne
   * @returns {boolean} True si les lignes se croisent
   * @private
   */
  static doLinesIntersect(line1, line2) {
    const { source: a, target: b } = line1;
    const { source: c, target: d } = line2;

    if (!a || !b || !c || !d) return false;

    // Vérifier si les lignes partagent un nœud
    if (a.id === c.id || a.id === d.id || b.id === c.id || b.id === d.id) {
      return false;
    }

    // Calcul de l'intersection de deux segments de ligne
    const det = (b.x - a.x) * (d.y - c.y) - (d.x - c.x) * (b.y - a.y);

    if (det === 0) {
      return false; // Lignes parallèles
    }

    const u = ((c.x - a.x) * (d.y - c.y) - (d.x - c.x) * (c.y - a.y)) / det;
    const v = ((c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)) / det;

    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }

  // ===========================================
  // UTILITAIRES DE PERFORMANCE
  // ===========================================

  /**
   * Optimiser les performances pour les grands graphes
   * @param {Object} graphInstance - Instance de graphe
   * @param {Object} options - Options d'optimisation
   */
  static optimizeForLargeGraphs(graphInstance, options = {}) {
    const { data, simulation } = graphInstance;
    const { nodeThreshold = 1000, enableLOD = true } = options;

    if ((data.nodes || []).length > nodeThreshold) {
      // Réduire la complexité de la simulation
      simulation
        .force('charge', d3.forceManyBody().strength(-50))
        .force('collision', null) // Désactiver les collisions
        .alphaDecay(0.05); // Convergence plus rapide

      if (enableLOD) {
        this.enableLevelOfDetail(graphInstance);
      }
    }
  }

  /**
   * Activer le niveau de détail (LOD)
   * @param {Object} graphInstance - Instance de graphe
   * @private
   */
  static enableLevelOfDetail(graphInstance) {
    const { zoom, labelElements } = graphInstance;

    // Masquer les labels à faible zoom
    zoom.on('zoom.lod', (event) => {
      const scale = event.transform.k;

      if (scale < 0.5) {
        labelElements.style('display', 'none');
      } else {
        labelElements.style('display', null);
      }
    });
  }

  /**
   * Calculer les statistiques de performance
   * @param {Object} graphInstance - Instance de graphe
   * @returns {Object} Statistiques de performance
   */
  static getPerformanceStats(graphInstance) {
    const { data, simulation } = graphInstance;

    return {
      nodeCount: (data.nodes || []).length,
      linkCount: (data.links || []).length,
      simulationAlpha: simulation.alpha(),
      isRunning: simulation.alpha() > simulation.alphaMin(),
      complexity: (data.nodes || []).length * (data.links || []).length,
      memoryUsage: this.estimateMemoryUsage(data),
    };
  }

  /**
   * Estimer l'utilisation mémoire
   * @param {Object} data - Données du graphe
   * @returns {number} Utilisation mémoire estimée en MB
   * @private
   */
  static estimateMemoryUsage(data) {
    // Estimation approximative
    const nodeSize = 200; // bytes par nœud (approximation)
    const linkSize = 100; // bytes par lien (approximation)

    const totalBytes = ((data.nodes || []).length * nodeSize) + ((data.links || []).length * linkSize);
    return Math.round((totalBytes / 1024 / 1024) * 100) / 100; // MB
  }
}

export default D3Service;