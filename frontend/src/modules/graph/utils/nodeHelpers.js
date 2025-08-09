// frontend/src/modules/graph/utils/nodeHelpers.js - Utilitaires pour les nœuds du graphe

/**
 * Utilitaires pour la manipulation et l'analyse des nœuds dans les graphes
 * Fournit des fonctions d'aide pour la gestion des entités visualisées
 */
class NodeHelpers {

  /**
   * Configuration des types de nœuds avec leurs propriétés visuelles
   */
  static nodeTypes = {
    person: {
      name: 'Personne',
      icon: '👤',
      color: '#ef4444',
      defaultSize: 16,
      category: 'individual'
    },
    place: {
      name: 'Lieu',
      icon: '📍',
      color: '#10b981',
      defaultSize: 14,
      category: 'location'
    },
    organization: {
      name: 'Organisation',
      icon: '🏢',
      color: '#3b82f6',
      defaultSize: 18,
      category: 'entity'
    },
    vehicle: {
      name: 'Véhicule',
      icon: '🚗',
      color: '#f59e0b',
      defaultSize: 14,
      category: 'object'
    },
    account: {
      name: 'Compte',
      icon: '💳',
      color: '#8b5cf6',
      defaultSize: 12,
      category: 'digital'
    },
    event: {
      name: 'Événement',
      icon: '📅',
      color: '#ec4899',
      defaultSize: 15,
      category: 'temporal'
    },
    document: {
      name: 'Document',
      icon: '📄',
      color: '#6b7280',
      defaultSize: 13,
      category: 'object'
    },
    phone: {
      name: 'Téléphone',
      icon: '📱',
      color: '#06b6d4',
      defaultSize: 12,
      category: 'digital'
    },
    email: {
      name: 'Email',
      icon: '📧',
      color: '#84cc16',
      defaultSize: 12,
      category: 'digital'
    },
    website: {
      name: 'Site Web',
      icon: '🌐',
      color: '#f97316',
      defaultSize: 13,
      category: 'digital'
    }
  };

  /**
   * Obtenir la configuration d'un type de nœud
   * @param {string} type - Type du nœud
   * @returns {Object} Configuration du type
   */
  static getNodeTypeConfig(type) {
    return this.nodeTypes[type] || {
      name: 'Inconnu',
      icon: '❓',
      color: '#9ca3af',
      defaultSize: 12,
      category: 'unknown'
    };
  }

  /**
   * Calculer la taille d'un nœud basée sur ses propriétés
   * @param {Object} node - Nœud à analyser
   * @param {Object} options - Options de calcul
   * @returns {number} Taille calculée
   */
  static calculateNodeSize(node, options = {}) {
    const {
      sizeBy = 'degree',
      minSize = 8,
      maxSize = 30,
      baseSizeMultiplier = 1
    } = options;

    const typeConfig = this.getNodeTypeConfig(node.type);
    let baseSize = typeConfig.defaultSize * baseSizeMultiplier;

    switch (sizeBy) {
      case 'degree':
        if (node.degree !== undefined) {
          // Normaliser le degré (supposer max 20 pour la normalisation)
          const maxDegree = options.maxDegree || 20;
          const ratio = Math.min(node.degree / maxDegree, 1);
          return Math.max(minSize, baseSize + (maxSize - baseSize) * ratio);
        }
        break;

      case 'betweenness':
        if (node.betweennessCentrality !== undefined) {
          const ratio = Math.min(node.betweennessCentrality, 1);
          return Math.max(minSize, baseSize + (maxSize - baseSize) * ratio);
        }
        break;

      case 'closeness':
        if (node.closenessCentrality !== undefined) {
          const ratio = Math.min(node.closenessCentrality, 1);
          return Math.max(minSize, baseSize + (maxSize - baseSize) * ratio);
        }
        break;

      case 'custom':
        if (node.size !== undefined) {
          return Math.max(minSize, Math.min(maxSize, node.size));
        }
        break;

      case 'connections':
        if (node.connectionCount !== undefined) {
          const maxConnections = options.maxConnections || 50;
          const ratio = Math.min(node.connectionCount / maxConnections, 1);
          return Math.max(minSize, baseSize + (maxSize - baseSize) * ratio);
        }
        break;
    }

    return Math.max(minSize, baseSize);
  }

  /**
   * Obtenir la couleur d'un nœud
   * @param {Object} node - Nœud à analyser
   * @param {Object} options - Options de coloration
   * @returns {string} Couleur hexadécimale
   */
  static getNodeColor(node, options = {}) {
    const {
      colorBy = 'type',
      customColors = {},
      selectedColor = '#fbbf24',
      highlightColor = '#f59e0b',
      opacity = 1
    } = options;

    // États spéciaux
    if (node.isSelected) {
      return this.addOpacity(selectedColor, opacity);
    }
    
    if (node.isHighlighted) {
      return this.addOpacity(highlightColor, opacity);
    }

    // Couleur personnalisée directe
    if (node.color) {
      return this.addOpacity(node.color, opacity);
    }

    // Couleurs personnalisées par ID
    if (customColors[node.id]) {
      return this.addOpacity(customColors[node.id], opacity);
    }

    switch (colorBy) {
      case 'type':
        const typeConfig = this.getNodeTypeConfig(node.type);
        return this.addOpacity(typeConfig.color, opacity);

      case 'degree':
        return this.addOpacity(this.getDegreeColor(node.degree), opacity);

      case 'centrality':
        return this.addOpacity(this.getCentralityColor(node), opacity);

      case 'community':
        return this.addOpacity(this.getCommunityColor(node.community), opacity);

      case 'activity':
        return this.addOpacity(this.getActivityColor(node), opacity);

      default:
        const defaultConfig = this.getNodeTypeConfig(node.type);
        return this.addOpacity(defaultConfig.color, opacity);
    }
  }

  /**
   * Obtenir une couleur basée sur le degré
   * @param {number} degree - Degré du nœud
   * @returns {string} Couleur hexadécimale
   * @private
   */
  static getDegreeColor(degree = 0) {
    // Échelle de couleur du bleu (faible degré) au rouge (haut degré)
    if (degree === 0) return '#e5e7eb'; // Gris pour les nœuds isolés
    if (degree <= 2) return '#3b82f6'; // Bleu
    if (degree <= 5) return '#06b6d4'; // Cyan
    if (degree <= 10) return '#10b981'; // Vert
    if (degree <= 15) return '#f59e0b'; // Orange
    return '#ef4444'; // Rouge pour les hubs
  }

  /**
   * Obtenir une couleur basée sur la centralité
   * @param {Object} node - Nœud avec métriques de centralité
   * @returns {string} Couleur hexadécimale
   * @private
   */
  static getCentralityColor(node) {
    const centrality = Math.max(
      node.betweennessCentrality || 0,
      node.closenessCentrality || 0,
      node.degreeCentrality || 0
    );
    
    // Échelle de couleur basée sur la centralité maximale
    if (centrality < 0.1) return '#e5e7eb';
    if (centrality < 0.3) return '#a3a3a3';
    if (centrality < 0.5) return '#fbbf24';
    if (centrality < 0.7) return '#f97316';
    return '#dc2626';
  }

  /**
   * Obtenir une couleur basée sur la communauté
   * @param {number|string} community - ID de la communauté
   * @returns {string} Couleur hexadécimale
   * @private
   */
  static getCommunityColor(community) {
    if (community === undefined || community === null) {
      return '#9ca3af';
    }

    // Palette de couleurs pour les communautés
    const communityColors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
      '#14b8a6', '#f472b6', '#a855f7', '#22d3ee', '#facc15'
    ];

    const index = typeof community === 'number' 
      ? community % communityColors.length
      : community.toString().charCodeAt(0) % communityColors.length;

    return communityColors[index];
  }

  /**
   * Obtenir une couleur basée sur l'activité
   * @param {Object} node - Nœud avec informations d'activité
   * @returns {string} Couleur hexadécimale
   * @private
   */
  static getActivityColor(node) {
    const now = new Date();
    const createdAt = new Date(node.created_at || node.createdAt || now);
    const updatedAt = new Date(node.updated_at || node.updatedAt || createdAt);
    
    const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate <= 1) return '#10b981'; // Vert - très récent
    if (daysSinceUpdate <= 7) return '#3b82f6'; // Bleu - récent
    if (daysSinceUpdate <= 30) return '#f59e0b'; // Orange - modéré
    return '#6b7280'; // Gris - ancien
  }

  /**
   * Ajouter de l'opacité à une couleur hexadécimale
   * @param {string} color - Couleur hexadécimale
   * @param {number} opacity - Opacité (0-1)
   * @returns {string} Couleur avec opacité
   * @private
   */
  static addOpacity(color, opacity) {
    if (opacity === 1) return color;
    
    // Convertir hex en rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Formater le label d'un nœud pour l'affichage
   * @param {Object} node - Nœud à formater
   * @param {Object} options - Options de formatage
   * @returns {string} Label formaté
   */
  static formatNodeLabel(node, options = {}) {
    const {
      showType = false,
      showDegree = false,
      maxLength = 15,
      showIcon = false,
      multiline = false
    } = options;

    let label = node.label || node.name || `Node ${node.id}`;

    // Tronquer si nécessaire
    if (label.length > maxLength) {
      label = label.substring(0, maxLength - 3) + '...';
    }

    // Ajouter l'icône du type
    if (showIcon) {
      const typeConfig = this.getNodeTypeConfig(node.type);
      label = `${typeConfig.icon} ${label}`;
    }

    // Ajouter le type
    if (showType) {
      const typeConfig = this.getNodeTypeConfig(node.type);
      if (multiline) {
        label += `\n[${typeConfig.name}]`;
      } else {
        label += ` (${typeConfig.name})`;
      }
    }

    // Ajouter le degré
    if (showDegree && node.degree !== undefined) {
      if (multiline) {
        label += `\nConnexions: ${node.degree}`;
      } else {
        label += ` [${node.degree}]`;
      }
    }

    return label;
  }

  /**
   * Calculer la position optimale pour le label d'un nœud
   * @param {Object} node - Nœud
   * @param {Object} options - Options de positionnement
   * @returns {Object} Position { x, y, anchor }
   */
  static calculateLabelPosition(node, options = {}) {
    const {
      nodeRadius = 12,
      labelOffset = 5,
      avoidOverlap = true,
      preferredSide = 'bottom'
    } = options;

    const positions = {
      bottom: { x: node.x, y: node.y + nodeRadius + labelOffset, anchor: 'middle' },
      top: { x: node.x, y: node.y - nodeRadius - labelOffset, anchor: 'middle' },
      right: { x: node.x + nodeRadius + labelOffset, y: node.y, anchor: 'start' },
      left: { x: node.x - nodeRadius - labelOffset, y: node.y, anchor: 'end' }
    };

    if (!avoidOverlap) {
      return positions[preferredSide] || positions.bottom;
    }

    // TODO: Implémenter la logique d'évitement de collision
    // Pour l'instant, retourner la position préférée
    return positions[preferredSide] || positions.bottom;
  }

  /**
   * Créer des groupes de nœuds basés sur leurs propriétés
   * @param {Array} nodes - Liste des nœuds
   * @param {string} groupBy - Propriété de groupage
   * @returns {Object} Groupes de nœuds
   */
  static groupNodes(nodes, groupBy = 'type') {
    const groups = {};

    nodes.forEach(node => {
      let groupKey;

      switch (groupBy) {
        case 'type':
          groupKey = node.type || 'unknown';
          break;
        case 'degree':
          if (node.degree === 0) groupKey = 'isolated';
          else if (node.degree <= 2) groupKey = 'low';
          else if (node.degree <= 5) groupKey = 'medium';
          else groupKey = 'high';
          break;
        case 'community':
          groupKey = node.community || 'unassigned';
          break;
        case 'activity':
          const now = new Date();
          const updatedAt = new Date(node.updated_at || node.updatedAt || now);
          const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
          
          if (daysSinceUpdate <= 7) groupKey = 'recent';
          else if (daysSinceUpdate <= 30) groupKey = 'moderate';
          else groupKey = 'old';
          break;
        default:
          groupKey = node[groupBy] || 'unknown';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(node);
    });

    return groups;
  }

  /**
   * Filtrer les nœuds selon des critères
   * @param {Array} nodes - Liste des nœuds
   * @param {Object} filters - Critères de filtrage
   * @returns {Array} Nœuds filtrés
   */
  static filterNodes(nodes, filters = {}) {
    return nodes.filter(node => {
      // Filtre par type
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(node.type)) {
          return false;
        }
      }

      // Filtre par degré minimum
      if (filters.minDegree !== undefined) {
        if ((node.degree || 0) < filters.minDegree) {
          return false;
        }
      }

      // Filtre par degré maximum
      if (filters.maxDegree !== undefined) {
        if ((node.degree || 0) > filters.maxDegree) {
          return false;
        }
      }

      // Filtre par recherche textuelle
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const nodeName = (node.name || '').toLowerCase();
        const nodeLabel = (node.label || '').toLowerCase();
        
        if (!nodeName.includes(searchTerm) && !nodeLabel.includes(searchTerm)) {
          return false;
        }
      }

      // Filtre par IDs spécifiques
      if (filters.nodeIds && filters.nodeIds.length > 0) {
        if (!filters.nodeIds.includes(node.id)) {
          return false;
        }
      }

      // Filtre par communauté
      if (filters.communities && filters.communities.length > 0) {
        if (!filters.communities.includes(node.community)) {
          return false;
        }
      }

      // Filtre par activité récente
      if (filters.recentActivity) {
        const now = new Date();
        const updatedAt = new Date(node.updated_at || node.updatedAt || now);
        const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > filters.recentActivity) {
          return false;
        }
      }

      // Filtre par centralité minimum
      if (filters.minCentrality !== undefined) {
        const maxCentrality = Math.max(
          node.betweennessCentrality || 0,
          node.closenessCentrality || 0,
          node.degreeCentrality || 0
        );
        
        if (maxCentrality < filters.minCentrality) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Trier les nœuds selon différents critères
   * @param {Array} nodes - Liste des nœuds
   * @param {string} sortBy - Critère de tri
   * @param {string} order - Ordre (asc/desc)
   * @returns {Array} Nœuds triés
   */
  static sortNodes(nodes, sortBy = 'name', order = 'asc') {
    const sortedNodes = [...nodes];
    
    sortedNodes.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'name':
          valueA = (a.name || '').toLowerCase();
          valueB = (b.name || '').toLowerCase();
          break;
        case 'type':
          valueA = a.type || '';
          valueB = b.type || '';
          break;
        case 'degree':
          valueA = a.degree || 0;
          valueB = b.degree || 0;
          break;
        case 'centrality':
          valueA = Math.max(
            a.betweennessCentrality || 0,
            a.closenessCentrality || 0,
            a.degreeCentrality || 0
          );
          valueB = Math.max(
            b.betweennessCentrality || 0,
            b.closenessCentrality || 0,
            b.degreeCentrality || 0
          );
          break;
        case 'created_at':
          valueA = new Date(a.created_at || a.createdAt || 0);
          valueB = new Date(b.created_at || b.createdAt || 0);
          break;
        case 'updated_at':
          valueA = new Date(a.updated_at || a.updatedAt || 0);
          valueB = new Date(b.updated_at || b.updatedAt || 0);
          break;
        default:
          valueA = a[sortBy] || '';
          valueB = b[sortBy] || '';
      }

      let comparison = 0;
      if (valueA < valueB) comparison = -1;
      else if (valueA > valueB) comparison = 1;

      return order === 'desc' ? -comparison : comparison;
    });

    return sortedNodes;
  }

  /**
   * Trouver les nœuds les plus connectés (hubs)
   * @param {Array} nodes - Liste des nœuds
   * @param {number} topN - Nombre de hubs à retourner
   * @returns {Array} Nœuds hubs
   */
  static findHubs(nodes, topN = 5) {
    return this.sortNodes(nodes, 'degree', 'desc').slice(0, topN);
  }

  /**
   * Trouver les nœuds isolés (sans connexions)
   * @param {Array} nodes - Liste des nœuds
   * @returns {Array} Nœuds isolés
   */
  static findIsolatedNodes(nodes) {
    return nodes.filter(node => (node.degree || 0) === 0);
  }

  /**
   * Calculer des statistiques sur les nœuds
   * @param {Array} nodes - Liste des nœuds
   * @returns {Object} Statistiques
   */
  static calculateNodeStatistics(nodes) {
    if (nodes.length === 0) {
      return {
        total: 0,
        byType: {},
        degrees: { min: 0, max: 0, avg: 0 },
        isolated: 0,
        hubs: []
      };
    }

    // Statistiques par type
    const byType = {};
    nodes.forEach(node => {
      const type = node.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Statistiques de degré
    const degrees = nodes.map(node => node.degree || 0);
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);
    const avgDegree = degrees.reduce((a, b) => a + b, 0) / degrees.length;

    // Nœuds isolés
    const isolatedCount = nodes.filter(node => (node.degree || 0) === 0).length;

    // Hubs (top 5)
    const hubs = this.findHubs(nodes, 5);

    return {
      total: nodes.length,
      byType,
      degrees: {
        min: minDegree,
        max: maxDegree,
        avg: Math.round(avgDegree * 100) / 100
      },
      isolated: isolatedCount,
      hubs: hubs.map(hub => ({
        id: hub.id,
        name: hub.name,
        degree: hub.degree,
        type: hub.type
      }))
    };
  }

  /**
   * Générer des suggestions pour améliorer un nœud
   * @param {Object} node - Nœud à analyser
   * @param {Array} allNodes - Tous les nœuds du graphe
   * @returns {Array} Suggestions d'amélioration
   */
  static generateNodeSuggestions(node, allNodes = []) {
    const suggestions = [];

    // Suggestion pour nœud isolé
    if ((node.degree || 0) === 0) {
      suggestions.push({
        type: 'isolation',
        priority: 'high',
        message: 'Ce nœud est isolé',
        action: 'Rechercher des connexions avec d\'autres entités'
      });
    }

    // Suggestion pour nœud avec peu d'informations
    const hasLimitedInfo = !node.name || node.name.length < 3;
    if (hasLimitedInfo) {
      suggestions.push({
        type: 'information',
        priority: 'medium',
        message: 'Informations limitées sur cette entité',
        action: 'Ajouter plus de détails et d\'attributs'
      });
    }

    // Suggestion pour hub potentiel
    if ((node.degree || 0) > 10) {
      suggestions.push({
        type: 'hub',
        priority: 'info',
        message: 'Cette entité est un hub important',
        action: 'Vérifier la qualité et l\'exactitude des connexions'
      });
    }

    // Suggestion pour type d'entité rare
    const sameTypeNodes = allNodes.filter(n => n.type === node.type);
    if (sameTypeNodes.length === 1) {
      suggestions.push({
        type: 'uniqueness',
        priority: 'medium',
        message: 'Seule entité de ce type dans le graphe',
        action: 'Rechercher d\'autres entités similaires'
      });
    }

    return suggestions;
  }

  /**
   * Créer un résumé d'un nœud pour l'affichage
   * @param {Object} node - Nœud à résumer
   * @param {Object} options - Options de résumé
   * @returns {Object} Résumé du nœud
   */
  static createNodeSummary(node, options = {}) {
    const { includeMetrics = true, includeTypeInfo = true } = options;
    
    const typeConfig = this.getNodeTypeConfig(node.type);
    
    const summary = {
      id: node.id,
      name: node.name || `Node ${node.id}`,
      type: node.type,
      typeDisplay: typeConfig.name
    };

    if (includeTypeInfo) {
      summary.typeInfo = {
        icon: typeConfig.icon,
        color: typeConfig.color,
        category: typeConfig.category
      };
    }

    if (includeMetrics) {
      summary.metrics = {
        degree: node.degree || 0,
        connections: node.connectionCount || 0,
        centrality: {
          degree: node.degreeCentrality || 0,
          betweenness: node.betweennessCentrality || 0,
          closeness: node.closenessCentrality || 0
        }
      };
    }

    // Ajouter les attributs custom s'ils existent
    if (node.attributes && Object.keys(node.attributes).length > 0) {
      summary.attributes = node.attributes;
    }

    // Ajouter les informations temporelles
    if (node.created_at || node.createdAt) {
      summary.createdAt = node.created_at || node.createdAt;
    }
    
    if (node.updated_at || node.updatedAt) {
      summary.updatedAt = node.updated_at || node.updatedAt;
    }

    return summary;
  }

  /**
   * Valider la structure d'un nœud
   * @param {Object} node - Nœud à valider
   * @returns {Object} Résultat de validation
   */
  static validateNode(node) {
    const errors = [];
    const warnings = [];

    // Validation des champs obligatoires
    if (!node.id) {
      errors.push('Node ID is required');
    }

    if (!node.name && !node.label) {
      warnings.push('Node should have a name or label');
    }

    if (!node.type) {
      warnings.push('Node should have a type specified');
    } else if (!this.nodeTypes[node.type]) {
      warnings.push(`Unknown node type: ${node.type}`);
    }

    // Validation des coordonnées
    if (node.x !== undefined && (typeof node.x !== 'number' || isNaN(node.x))) {
      errors.push('Node x coordinate must be a valid number');
    }

    if (node.y !== undefined && (typeof node.y !== 'number' || isNaN(node.y))) {
      errors.push('Node y coordinate must be a valid number');
    }

    // Validation des métriques
    if (node.degree !== undefined && (typeof node.degree !== 'number' || node.degree < 0)) {
      errors.push('Node degree must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Créer un nœud par défaut avec des valeurs saines
   * @param {Object} baseData - Données de base
   * @returns {Object} Nœud créé
   */
  static createDefaultNode(baseData = {}) {
    const typeConfig = this.getNodeTypeConfig(baseData.type || 'unknown');
    
    return {
      id: baseData.id || Date.now().toString(),
      name: baseData.name || 'Nouveau nœud',
      type: baseData.type || 'unknown',
      x: baseData.x || 0,
      y: baseData.y || 0,
      degree: 0,
      size: typeConfig.defaultSize,
      color: typeConfig.color,
      attributes: baseData.attributes || {},
      created_at: new Date().toISOString(),
      ...baseData
    };
  }
}

export default NodeHelpers;