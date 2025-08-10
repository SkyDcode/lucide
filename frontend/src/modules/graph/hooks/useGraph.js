// frontend/src/modules/graph/hooks/useGraph.js - Adapté pour D3Service complet
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../shared/services/api';
import D3Service from '../services/d3Service';

/**
 * Hook principal pour charger et gérer un graphe depuis l'API backend
 * Compatible avec la classe D3Service complète
 */
export default function useGraph(params) {
  // États principaux
  const [raw, setRaw] = useState({ nodes: [], edges: [], stats: null });
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Références
  const graphInstanceRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Configuration de la visualisation
  const [config, setConfig] = useState({
    width: 800,
    height: 600,
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
    nodes: {
      radius: { min: 8, max: 30, default: 12 },
      stroke: { width: 2, color: '#fff' },
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
      }
    },
    links: {
      stroke: {
        width: { min: 1, max: 5, default: 2 },
        color: '#6b7280',
        opacity: 0.7,
      },
      distance: { min: 30, max: 200, default: 80 }
    }
  });

  // Traitement des paramètres de types
  const typesParam = useMemo(() => {
    const t = params?.types;
    if (!t) return undefined;
    if (Array.isArray(t)) return t.join(',');
    return String(t);
  }, [params?.types]);

  /**
   * Récupérer les données du graphe depuis l'API
   */
  const fetchGraph = useCallback(async () => {
    if (!params || (!params.folderId && !params.entityId)) return;

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      let url = '';
      const queryParams = new URLSearchParams();
      
      // Ajouter les paramètres communs
      if (typesParam) queryParams.set('types', typesParam);
      if (params.includeIsolated === false) queryParams.set('include_isolated', 'false');

      // Construire l'URL selon le mode
      if (params.mode === 'folder' && params.folderId) {
        url = `/relationships/folder/${params.folderId}/graph/visualization`;
      } else if (params.mode === 'entity' && params.entityId) {
        url = `/relationships/graph/entity/${params.entityId}`;
        if (params.depth) queryParams.set('depth', String(params.depth));
      } else {
        throw new Error('Mode ou paramètres invalides');
      }

      // Effectuer la requête
      const response = await api.get(`${url}?${queryParams.toString()}`, {
        signal: abortControllerRef.current.signal
      });

      const data = response?.data || { nodes: [], links: [] };
      
      setRaw({
        nodes: data.nodes || [],
        edges: data.links || data.edges || [],
        stats: data.metadata || data.stats || null
      });

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching graph data:', err);
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [params, typesParam]);

  /**
   * Normaliser les données pour D3Service
   */
  const normalizeGraphData = useCallback((nodes, edges) => {
    // Normaliser les nœuds pour D3Service
    const normalizedNodes = nodes.map(node => ({
      id: node.id,
      name: node.name || `Node ${node.id}`,
      type: node.type || 'unknown',
      degree: node.degree || 0,
      size: node.size,
      color: node.color,
      x: typeof node.x === 'number' ? node.x : undefined,
      y: typeof node.y === 'number' ? node.y : undefined,
      // Préserver toutes les autres propriétés
      ...node
    }));

    // Normaliser les liens pour D3Service
    const normalizedLinks = edges.map(edge => ({
      id: edge.id || `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'connected',
      strength: edge.strength || 'medium',
      weight: edge.weight || 1,
      color: edge.color,
      // Préserver toutes les autres propriétés
      ...edge
    }));

    return {
      nodes: normalizedNodes,
      links: normalizedLinks
    };
  }, []);

  /**
   * Normaliser et mettre à jour les données du graphe
   */
  useEffect(() => {
    const normalized = normalizeGraphData(raw.nodes, raw.edges);
    setGraph(normalized);
  }, [raw, normalizeGraphData]);

  /**
   * Charger les données au montage et lors du changement de paramètres
   */
  useEffect(() => {
    fetchGraph();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchGraph]);

  // Calculs dérivés - simples car D3Service se charge des calculs complexes
  const degrees = useMemo(() => {
    const deg = new Map();
    graph.nodes.forEach(node => deg.set(node.id, node.degree || 0));
    return deg;
  }, [graph.nodes]);

  const sizeFn = useMemo(() => {
    const maxDegree = Math.max(...Array.from(degrees.values()), 1);
    return (nodeId) => {
      const degree = degrees.get(nodeId) || 0;
      const ratio = degree / maxDegree;
      return 8 + (20 - 8) * ratio;
    };
  }, [degrees]);

  /**
   * Attacher une instance de graphe D3
   */
  const attachGraphInstance = useCallback((instance) => {
    graphInstanceRef.current = instance;
    
    // Écouter les événements de simulation
    if (instance && instance.simulation) {
      const simulation = instance.simulation;
      
      // Surveiller l'état de la simulation
      const checkSimulationState = () => {
        const isRunning = simulation.alpha() > simulation.alphaMin();
        setSimulationRunning(isRunning);
        
        if (isRunning) {
          requestAnimationFrame(checkSimulationState);
        }
      };
      
      simulation.on('tick', () => {
        checkSimulationState();
      });
      
      simulation.on('end', () => {
        setSimulationRunning(false);
      });
      
      // État initial
      checkSimulationState();
    }
  }, []);

  /**
   * Appliquer un type de layout
   */
  const applyLayout = useCallback((type, options = {}) => {
    if (!graphInstanceRef.current || !graph.nodes.length) return;

    try {
      setSimulationRunning(true);
      const instance = graphInstanceRef.current;
      
      switch (type) {
        case 'force':
          // Redémarrer la simulation de force par défaut
          D3Service.controlSimulation(instance, 'restart');
          break;

        case 'circular':
          D3Service.applyCircularLayout(instance, {
            radius: options.radius || 200,
            groupByType: options.groupByType || false
          });
          break;

        case 'hierarchical':
          D3Service.applyHierarchicalLayout(instance, {
            levels: options.levels || 3,
            spacing: options.spacing || 100
          });
          break;

        case 'grid':
          D3Service.applyGridLayout(instance, {
            spacing: options.spacing || 80,
            groupByType: options.groupByType || false
          });
          break;

        case 'community':
          if (options.communities) {
            D3Service.applyCommunityLayout(instance, options.communities);
          }
          break;

        default:
          console.warn('Unknown layout type:', type);
      }
    } catch (err) {
      console.error('Error applying layout:', err);
      setSimulationRunning(false);
    }
  }, [graph.nodes.length]);

  /**
   * Configurer les forces de la simulation
   */
  const setForces = useCallback((newForces) => {
    if (!graphInstanceRef.current) return;

    try {
      const instance = graphInstanceRef.current;
      const simulation = instance.simulation;
      
      // Mettre à jour la configuration
      if (newForces.simulation) {
        Object.assign(instance.config.simulation, newForces.simulation);
      }
      
      // Appliquer les nouvelles forces
      if (newForces.link) {
        simulation.force('link').strength(newForces.link.strength || 0.1);
      }
      if (newForces.charge) {
        simulation.force('charge').strength(newForces.charge.strength || -300);
      }
      if (newForces.center) {
        simulation.force('center').strength(newForces.center.strength || 0.1);
      }
      if (newForces.collision) {
        simulation.force('collision').strength(newForces.collision.strength || 1);
      }

      // Relancer la simulation
      const alpha = newForces.alpha !== undefined ? newForces.alpha : 0.3;
      simulation.alpha(alpha).restart();
      setSimulationRunning(true);

    } catch (err) {
      console.error('Error setting forces:', err);
    }
  }, []);

  /**
   * Contrôler la simulation
   */
  const controlSimulation = useCallback((action) => {
    if (!graphInstanceRef.current) return;

    try {
      D3Service.controlSimulation(graphInstanceRef.current, action);
      
      // Mettre à jour l'état
      switch (action) {
        case 'play':
        case 'restart':
          setSimulationRunning(true);
          break;
        case 'pause':
          setSimulationRunning(false);
          break;
      }
    } catch (err) {
      console.error('Error controlling simulation:', err);
    }
  }, []);

  /**
   * Mettre à jour la configuration
   */
  const updateConfig = useCallback((newConfig) => {
    setConfig(prev => {
      const merged = { ...prev, ...newConfig };
      
      // Fusionner les objets imbriqués
      if (newConfig.simulation) {
        merged.simulation = { ...prev.simulation, ...newConfig.simulation };
      }
      if (newConfig.nodes) {
        merged.nodes = { ...prev.nodes, ...newConfig.nodes };
      }
      if (newConfig.links) {
        merged.links = { ...prev.links, ...newConfig.links };
      }
      
      return merged;
    });
  }, []);

  /**
   * Centrer la vue sur certains nœuds
   */
  const centerOnNodes = useCallback((nodeIds = []) => {
    if (!graphInstanceRef.current || !nodeIds.length) return;

    try {
      const targetNodes = graph.nodes.filter(node => nodeIds.includes(node.id));
      if (targetNodes.length > 0) {
        const bounds = D3Service.calculateGraphBounds(targetNodes);
        
        // Utiliser la méthode de centrage de D3Service
        if (targetNodes.length === 1) {
          D3Service.centerOnNode(graphInstanceRef.current, targetNodes[0]);
        } else {
          // Pour plusieurs nœuds, ajuster la vue
          D3Service.fitToView(graphInstanceRef.current);
        }
      }
    } catch (err) {
      console.error('Error centering on nodes:', err);
    }
  }, [graph.nodes]);

  /**
   * Filtrer les nœuds par type
   */
  const filterByTypes = useCallback((visibleTypes) => {
    if (!graphInstanceRef.current) return;

    try {
      const visibleTypeSet = new Set(visibleTypes);
      D3Service.filterNodesByType(graphInstanceRef.current, visibleTypeSet);
    } catch (err) {
      console.error('Error filtering by types:', err);
    }
  }, []);

  /**
   * Obtenir les statistiques du graphe
   */
  const getGraphStats = useCallback(() => {
    const nodeCount = graph.nodes.length;
    const linkCount = graph.links.length;
    const maxDegree = Math.max(...Array.from(degrees.values()), 0);
    const avgDegree = nodeCount > 0 ? (linkCount * 2) / nodeCount : 0;
    const isolatedNodes = graph.nodes.filter(node => (degrees.get(node.id) || 0) === 0);

    return {
      nodeCount,
      linkCount,
      maxDegree,
      avgDegree: Math.round(avgDegree * 100) / 100,
      isolatedCount: isolatedNodes.length,
      density: nodeCount > 1 ? linkCount / (nodeCount * (nodeCount - 1) / 2) : 0,
      hasData: nodeCount > 0
    };
  }, [graph, degrees]);

  return {
    // Données
    raw,
    graph,
    loading,
    error,
    
    // Métriques calculées
    degrees,
    sizeFn,
    stats: getGraphStats(),
    
    // État de la simulation
    simulationRunning,
    config,
    
    // Actions
    refetch: fetchGraph,
    applyLayout,
    setForces,
    controlSimulation,
    updateConfig,
    centerOnNodes,
    filterByTypes,
    attachGraphInstance,
    
    // Utilitaires
    hasData: graph.nodes.length > 0,
    isEmpty: graph.nodes.length === 0,
    isLoading: loading,
    hasError: !!error,
    
    // Accès direct à l'instance D3Service
    graphInstance: graphInstanceRef.current
  };
}