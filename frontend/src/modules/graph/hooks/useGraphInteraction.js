// frontend/src/modules/graph/hooks/useGraphInteraction.js - Hook pour les interactions avancées
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

/**
 * Hook pour gérer les interactions avancées avec le graphe
 * Gère la sélection, le survol, les satellites et les actions sur les nœuds
 */
const useGraphInteraction = (graph = { nodes: [], links: [] }) => {
  // État de sélection et survol
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [multiSelection, setMultiSelection] = useState(new Set());
  
  // État des nœuds satellites
  const [satellitesVisible, setSatellitesVisible] = useState(false);
  const [satelliteNodes, setSatelliteNodes] = useState([]);
  
  // État des interactions
  const [draggedNode, setDraggedNode] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  
  // Références pour les timeouts
  const hoverTimeoutRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  
  // Obtenir le nœud sélectionné
  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return graph.nodes.find(node => node.id === selectedId) || null;
  }, [selectedId, graph.nodes]);
  
  // Obtenir le nœud survolé
  const hoveredNode = useMemo(() => {
    if (!hoveredId) return null;
    return graph.nodes.find(node => node.id === hoveredId) || null;
  }, [hoveredId, graph.nodes]);
  
  // Obtenir les nœuds multi-sélectionnés
  const selectedNodes = useMemo(() => {
    if (multiSelection.size === 0) return [];
    return graph.nodes.filter(node => multiSelection.has(node.id));
  }, [multiSelection, graph.nodes]);
  
  // Obtenir les voisins d'un nœud
  const getNodeNeighbors = useCallback((nodeId) => {
    const neighbors = new Set();
    const connectedLinks = [];
    
    graph.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === nodeId) {
        neighbors.add(targetId);
        connectedLinks.push(link);
      } else if (targetId === nodeId) {
        neighbors.add(sourceId);
        connectedLinks.push(link);
      }
    });
    
    const neighborNodes = graph.nodes.filter(node => neighbors.has(node.id));
    
    return {
      nodes: neighborNodes,
      links: connectedLinks,
      nodeIds: Array.from(neighbors)
    };
  }, [graph.nodes, graph.links]);
  
  // Calculer les nœuds satellites pour le nœud sélectionné
  const calculateSatelliteNodes = useCallback((nodeId) => {
    if (!nodeId) return [];
    
    const neighbors = getNodeNeighbors(nodeId);
    const centerNode = graph.nodes.find(n => n.id === nodeId);
    
    if (!centerNode || neighbors.nodes.length === 0) return [];
    
    // Créer des nœuds satellites pour chaque voisin
    const satellites = neighbors.nodes.map((neighbor, index) => {
      const angle = (index / neighbors.nodes.length) * 2 * Math.PI;
      const radius = 80; // Distance des satellites
      
      return {
        id: `satellite-${neighbor.id}`,
        type: 'satellite',
        originalNode: neighbor,
        name: neighbor.name,
        x: centerNode.x + Math.cos(angle) * radius,
        y: centerNode.y + Math.sin(angle) * radius,
        radius: 8,
        color: neighbor.color || '#9ca3af',
        angle,
        distance: radius
      };
    });
    
    return satellites;
  }, [graph.nodes, getNodeNeighbors]);
  
  // Gestionnaire de sélection de nœud
  const handleNodeSelection = useCallback((nodeId, options = {}) => {
    const { multiple = false, toggle = false, clear = false } = options;
    
    if (clear) {
      setSelectedId(null);
      setMultiSelection(new Set());
      return;
    }
    
    if (multiple) {
      setMultiSelection(prev => {
        const newSelection = new Set(prev);
        if (toggle && newSelection.has(nodeId)) {
          newSelection.delete(nodeId);
        } else {
          newSelection.add(nodeId);
        }
        return newSelection;
      });
    } else {
      if (toggle && selectedId === nodeId) {
        setSelectedId(null);
      } else {
        setSelectedId(nodeId);
        setMultiSelection(new Set([nodeId]));
      }
    }
  }, [selectedId]);
  
  // Gestionnaire de survol avec debounce
  const handleNodeHover = useCallback((nodeId, options = {}) => {
    const { delay = 100, persist = false } = options;
    
    // Annuler le timeout précédent
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (nodeId && delay > 0) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredId(nodeId);
      }, delay);
    } else {
      setHoveredId(nodeId);
    }
    
    // Gérer la persistance du survol
    if (!persist && !nodeId) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredId(null);
      }, 500);
    }
  }, []);
  
  // Gestionnaire de double-clic
  const handleNodeDoubleClick = useCallback((nodeId) => {
    // Centrer sur le nœud et afficher/masquer les satellites
    if (nodeId === selectedId) {
      setSatellitesVisible(prev => !prev);
    } else {
      setSelectedId(nodeId);
      setSatellitesVisible(true);
    }
  }, [selectedId]);
  
  // Gestionnaire de clic avec détection du double-clic
  const handleNodeClick = useCallback((nodeId, event = {}) => {
    const { ctrlKey = false, shiftKey = false, metaKey = false } = event;
    const isMultiSelect = ctrlKey || metaKey;
    const isRangeSelect = shiftKey;
    
    // Annuler le timeout de clic précédent
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // Délai pour détecter le double-clic
    clickTimeoutRef.current = setTimeout(() => {
      if (isRangeSelect && selectedId && nodeId !== selectedId) {
        // Sélection par plage (sélectionner le chemin entre les nœuds)
        const path = findShortestPath(selectedId, nodeId);
        if (path.length > 0) {
          setMultiSelection(new Set(path));
        }
      } else {
        handleNodeSelection(nodeId, {
          multiple: isMultiSelect,
          toggle: isMultiSelect
        });
      }
    }, 200);
  }, [selectedId, handleNodeSelection]);
  
  // Trouver le plus court chemin entre deux nœuds
  const findShortestPath = useCallback((startId, endId) => {
    // Implémentation BFS simple
    const visited = new Set();
    const queue = [[startId]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const nodeId = path[path.length - 1];
      
      if (nodeId === endId) {
        return path;
      }
      
      if (visited.has(nodeId)) {
        continue;
      }
      
      visited.add(nodeId);
      
      const neighbors = getNodeNeighbors(nodeId).nodeIds;
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          queue.push([...path, neighborId]);
        }
      });
    }
    
    return [];
  }, [getNodeNeighbors]);
  
  // Gestionnaire de drag
  const handleNodeDrag = useCallback((nodeId, action, position = {}) => {
    switch (action) {
      case 'start':
        setDraggedNode(nodeId);
        break;
      case 'drag':
        // Mise à jour de la position en temps réel
        break;
      case 'end':
        setDraggedNode(null);
        break;
    }
  }, []);
  
  // Sélection par zone
  const handleAreaSelection = useCallback((area) => {
    if (!area) {
      setSelectionBox(null);
      return;
    }
    
    setSelectionBox(area);
    
    // Trouver tous les nœuds dans la zone
    const nodesInArea = graph.nodes.filter(node => {
      return node.x >= area.x &&
             node.x <= area.x + area.width &&
             node.y >= area.y &&
             node.y <= area.y + area.height;
    });
    
    const nodeIds = nodesInArea.map(node => node.id);
    setMultiSelection(new Set(nodeIds));
  }, [graph.nodes]);
  
  // Basculer l'affichage des satellites
  const toggleSatellites = useCallback(() => {
    setSatellitesVisible(prev => !prev);
  }, []);
  
  // Centrer sur le nœud sélectionné
  const centerOnSelected = useCallback(() => {
    if (selectedNode) {
      // Cette fonction sera appelée par le composant parent
      return { x: selectedNode.x, y: selectedNode.y };
    }
    return null;
  }, [selectedNode]);
  
  // Mettre à jour les satellites quand la sélection change
  useEffect(() => {
    if (selectedId && satellitesVisible) {
      const satellites = calculateSatelliteNodes(selectedId);
      setSatelliteNodes(satellites);
    } else {
      setSatelliteNodes([]);
    }
  }, [selectedId, satellitesVisible, calculateSatelliteNodes]);
  
  // Nettoyer les timeouts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);
  
  // Obtenir les nœuds avec état d'interaction
  const getNodesWithInteractionState = useCallback(() => {
    return graph.nodes.map(node => ({
      ...node,
      isSelected: selectedId === node.id,
      isMultiSelected: multiSelection.has(node.id),
      isHovered: hoveredId === node.id,
      isDragged: draggedNode === node.id,
      isNeighborSelected: selectedId && getNodeNeighbors(selectedId).nodeIds.includes(node.id),
      isNeighborHovered: hoveredId && getNodeNeighbors(hoveredId).nodeIds.includes(node.id)
    }));
  }, [graph.nodes, selectedId, multiSelection, hoveredId, draggedNode, getNodeNeighbors]);
  
  // Obtenir les liens avec état d'interaction
  const getLinksWithInteractionState = useCallback(() => {
    return graph.links.map(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      return {
        ...link,
        isHighlighted: (selectedId && (sourceId === selectedId || targetId === selectedId)) ||
                      (hoveredId && (sourceId === hoveredId || targetId === hoveredId)),
        isSelected: multiSelection.has(sourceId) && multiSelection.has(targetId),
        opacity: selectedId || hoveredId ? 
          ((sourceId === selectedId || targetId === selectedId || 
            sourceId === hoveredId || targetId === hoveredId) ? 1 : 0.2) : 1
      };
    });
  }, [graph.links, selectedId, hoveredId, multiSelection]);
  
  // Actions de raccourcis clavier
  const handleKeyboardAction = useCallback((action, event = {}) => {
    switch (action) {
      case 'selectAll':
        setMultiSelection(new Set(graph.nodes.map(n => n.id)));
        break;
      case 'clearSelection':
        handleNodeSelection(null, { clear: true });
        break;
      case 'deleteSelected':
        // Cette action sera gérée par le composant parent
        return Array.from(multiSelection);
      case 'escape':
        setSelectedId(null);
        setMultiSelection(new Set());
        setSatellitesVisible(false);
        setSelectionBox(null);
        break;
      case 'toggleSatellites':
        if (selectedId) {
          toggleSatellites();
        }
        break;
    }
  }, [graph.nodes, multiSelection, selectedId, handleNodeSelection, toggleSatellites]);
  
  // Obtenir les statistiques de sélection
  const getSelectionStats = useCallback(() => {
    const stats = {
      selectedCount: multiSelection.size,
      hasSelection: selectedId !== null || multiSelection.size > 0,
      hasSingleSelection: selectedId !== null && multiSelection.size <= 1,
      hasMultiSelection: multiSelection.size > 1,
      satellitesCount: satelliteNodes.length,
      satellitesVisible
    };
    
    if (selectedNode) {
      const neighbors = getNodeNeighbors(selectedNode.id);
      stats.selectedNodeNeighbors = neighbors.nodes.length;
      stats.selectedNodeConnections = neighbors.links.length;
    }
    
    return stats;
  }, [selectedId, selectedNode, multiSelection, satelliteNodes, satellitesVisible, getNodeNeighbors]);
  
  // Interface publique du hook
  return {
    // État de sélection
    selectedId,
    selectedNode,
    hoveredId,
    hoveredNode,
    multiSelection,
    selectedNodes,
    
    // État des satellites
    satellitesVisible,
    satelliteNodes,
    satVisible: satellitesVisible, // Alias pour compatibilité
    
    // État de drag et sélection
    draggedNode,
    isSelectionMode,
    selectionBox,
    
    // Actions de base
    setSelectedId,
    setHoveredId,
    selectNode: handleNodeSelection,
    clearSelection: () => handleNodeSelection(null, { clear: true }),
    
    // Gestionnaires d'événements
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeHover,
    handleNodeDrag,
    handleAreaSelection,
    handleKeyboardAction,
    
    // Actions spécialisées
    toggleSatellites,
    centerOnSelected,
    centerSelected: centerOnSelected, // Alias
    
    // Utilitaires
    getNodeNeighbors,
    findShortestPath,
    getNodesWithInteractionState,
    getLinksWithInteractionState,
    getSelectionStats,
    
    // État calculé
    hasSelection: selectedId !== null || multiSelection.size > 0,
    hasMultiSelection: multiSelection.size > 1,
    selectionCount: multiSelection.size,
    
    // Nœud actuellement sélectionné (alias)
    selected: selectedNode
  };
};

export default useGraphInteraction;