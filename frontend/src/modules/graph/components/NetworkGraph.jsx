// frontend/src/modules/graph/components/NetworkGraph.jsx - Composant principal de visualisation
import React, { useRef, useCallback, useState, useEffect } from 'react';
import GraphCanvas from './GraphCanvas';
import useGraph from '../hooks/useGraph';
import useGraphInteraction from '../hooks/useGraphInteraction';
import './NetworkGraph.css';

/**
 * Composant principal de visualisation de réseau
 * Intègre GraphCanvas avec la logique de données et les interactions
 */
const NetworkGraph = ({
  // Paramètres de données
  mode = 'folder', // 'folder' ou 'entity'
  folderId,
  entityId,
  depth = 2,
  types = [],
  includeIsolated = true,
  
  // Configuration visuelle
  width = 800,
  height = 600,
  config = {},
  
  // Callbacks d'événements
  onNodeClick,
  onNodeDoubleClick,
  onNodeHover,
  onLinkClick,
  onLinkHover,
  onSelectionChange,
  onLayoutChange,
  onSimulationStateChange,
  
  // Contrôles externes
  selectedNodeId,
  layoutType = 'force',
  layoutOptions = {},
  simulationRunning = true,
  filters = {},
  
  // Style et classe
  className = '',
  style = {},
  
  // Options avancées
  showSatellites = false,
  autoFit = true,
  optimizePerformance = true
}) => {
  
  // Références
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Hook principal pour les données du graphe
  const {
    graph,
    loading,
    error,
    hasData,
    isEmpty,
    stats,
    degrees,
    sizeFn,
    simulationRunning: simRunning,
    applyLayout,
    setForces,
    controlSimulation,
    centerOnNodes,
    filterByTypes,
    attachGraphInstance,
    refetch
  } = useGraph({
    mode,
    folderId,
    entityId,
    depth,
    types,
    includeIsolated
  });

  // Hook pour les interactions avancées
  const {
    selectedId,
    hoveredId,
    selected,
    setSelectedId,
    centerSelected,
    toggleSatellites,
    satVisible
  } = useGraphInteraction(graph);

  // Configuration complète pour D3Service
  const graphConfig = {
    width,
    height,
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
    },
    ...config
  };

  // Attacher l'instance de graphe quand le canvas est prêt
  useEffect(() => {
    if (canvasRef.current?.instance && !isInitialized) {
      attachGraphInstance(canvasRef.current.instance);
      setIsInitialized(true);
    }
  }, [canvasRef.current?.instance, attachGraphInstance, isInitialized]);

  // Synchroniser la sélection externe
  useEffect(() => {
    if (selectedNodeId !== selectedId) {
      setSelectedId(selectedNodeId);
    }
  }, [selectedNodeId, selectedId, setSelectedId]);

  // Appliquer le layout quand il change
  useEffect(() => {
    if (hasData && isInitialized && layoutType) {
      applyLayout(layoutType, layoutOptions);
      onLayoutChange?.(layoutType, layoutOptions);
    }
  }, [layoutType, layoutOptions, hasData, isInitialized, applyLayout, onLayoutChange]);

  // Contrôler la simulation
  useEffect(() => {
    if (isInitialized) {
      controlSimulation(simulationRunning ? 'play' : 'pause');
    }
  }, [simulationRunning, isInitialized, controlSimulation]);

  // Appliquer les filtres
  useEffect(() => {
    if (isInitialized && filters.types) {
      filterByTypes(filters.types);
    }
  }, [filters.types, isInitialized, filterByTypes]);

  // Auto-fit après chargement des données
  useEffect(() => {
    if (hasData && isInitialized && autoFit && canvasRef.current) {
      // Attendre que D3 termine le rendu initial
      setTimeout(() => {
        canvasRef.current?.fitView();
      }, 500);
    }
  }, [hasData, isInitialized, autoFit]);

  // Optimisation des performances pour les grands graphes
  useEffect(() => {
    if (isInitialized && optimizePerformance && stats.nodeCount > 500) {
      canvasRef.current?.optimizeForLargeGraphs({
        nodeThreshold: 500,
        enableLOD: true
      });
    }
  }, [isInitialized, optimizePerformance, stats.nodeCount]);

  // Notification des changements d'état de simulation
  useEffect(() => {
    onSimulationStateChange?.(simRunning);
  }, [simRunning, onSimulationStateChange]);

  // Gestionnaires d'événements
  const handleNodeClick = useCallback((node, event) => {
    setSelectedId(node.id);
    onNodeClick?.(node, event);
    onSelectionChange?.(node.id, node);
  }, [setSelectedId, onNodeClick, onSelectionChange]);

  const handleNodeDoubleClick = useCallback((node, event) => {
    centerOnNodes([node.id]);
    onNodeDoubleClick?.(node, event);
  }, [centerOnNodes, onNodeDoubleClick]);

  const handleNodeHover = useCallback((node, event) => {
    onNodeHover?.(node, event);
  }, [onNodeHover]);

  const handleLinkClick = useCallback((link, event) => {
    onLinkClick?.(link, event);
  }, [onLinkClick]);

  const handleLinkHover = useCallback((link, event) => {
    onLinkHover?.(link, event);
  }, [onLinkHover]);

  // API publique exposée
  const publicAPI = {
    // Données
    graph,
    stats,
    selected,
    hasData,
    isEmpty,
    loading,
    error,
    
    // Actions
    refetch,
    selectNode: setSelectedId,
    clearSelection: () => setSelectedId(null),
    centerOnSelected: centerSelected,
    fitView: () => canvasRef.current?.fitView(),
    centerOnNodes,
    
    // Layouts
    applyLayout: (type, options) => {
      applyLayout(type, options);
      canvasRef.current?.applyLayout(type, options);
    },
    
    // Simulation
    playSimulation: () => {
      controlSimulation('play');
      canvasRef.current?.playSimulation();
    },
    pauseSimulation: () => {
      controlSimulation('pause');
      canvasRef.current?.pauseSimulation();
    },
    restartSimulation: () => {
      controlSimulation('restart');
      canvasRef.current?.restartSimulation();
    },
    
    // Export
    exportSVG: () => canvasRef.current?.exportSVG(),
    exportPNG: (callback) => canvasRef.current?.exportPNG(callback),
    
    // Filtres
    filterByTypes,
    
    // Satellites
    toggleSatellites,
    
    // Performance
    getPerformanceStats: () => canvasRef.current?.getPerformanceStats()
  };

  // Exposer l'API via une ref si nécessaire
  React.useImperativeHandle(React.createRef(), () => publicAPI);

  // Styles du conteneur
  const containerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    ...style
  };

  // État de chargement
  if (loading) {
    return (
      <div className={`network-graph-loading ${className}`} style={containerStyle}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          color: '#6b7280'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            Chargement du graphe...
          </div>
          {mode === 'folder' && folderId && (
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Dossier #{folderId}
            </div>
          )}
          {mode === 'entity' && entityId && (
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Entité #{entityId} (profondeur: {depth})
            </div>
          )}
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className={`network-graph-error ${className}`} style={containerStyle}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          color: '#ef4444',
          textAlign: 'center',
          padding: '32px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            Erreur de chargement
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            {error.message || 'Impossible de charger les données du graphe'}
          </div>
          <button
            onClick={refetch}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Graphe vide
  if (isEmpty) {
    return (
      <div className={`network-graph-empty ${className}`} style={containerStyle}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          color: '#6b7280',
          textAlign: 'center',
          padding: '32px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>
            Aucune donnée à afficher
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7, maxWidth: '400px' }}>
            {mode === 'folder' 
              ? `Le dossier #${folderId} ne contient aucune entité ou relation.`
              : `L'entité #${entityId} n'a aucune relation à la profondeur ${depth}.`
            }
          </div>
          <button
            onClick={refetch}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`network-graph ${className}`} style={containerStyle}>
      {/* Statistiques du graphe */}
      {stats.hasData && (
        <div className="network-graph__stats">
          <div className="stats-card">
            <div className="stats-title">Réseau</div>
            <div className="stats-item">Nœuds: {stats.nodeCount}</div>
            <div className="stats-item">Liens: {stats.linkCount}</div>
            <div className="stats-item">Densité: {(stats.density * 100).toFixed(1)}%</div>
            {stats.isolatedCount > 0 && (
              <div className="stats-item stats-warning">
                Isolés: {stats.isolatedCount}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indicateur de simulation */}
      {isInitialized && (
        <div className="network-graph__simulation-indicator">
          <div className="indicator-card">
            <div className={`status-dot ${simRunning ? 'active' : 'paused'}`} />
            <span>{simRunning ? 'Simulation active' : 'Simulation en pause'}</span>
          </div>
        </div>
      )}

      {/* Informations sur la sélection */}
      {selected && (
        <div className="network-graph__selection-info">
          <div className="selection-card">
            <div className="selection-title">
              {selected.name || `Nœud ${selected.id}`}
            </div>
            <div className="selection-type">
              Type: {selected.type || 'Inconnu'}
            </div>
            {selected.degree !== undefined && (
              <div className="selection-connections">
                Connexions: {selected.degree}
              </div>
            )}
            {showSatellites && (
              <button
                onClick={toggleSatellites}
                className={`satellite-toggle ${satVisible ? 'active' : ''}`}
              >
                {satVisible ? 'Masquer détails' : 'Afficher détails'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Canvas principal */}
      <GraphCanvas
        ref={canvasRef}
        data={graph}
        config={graphConfig}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeHover={handleNodeHover}
        onLinkClick={handleLinkClick}
        onLinkHover={handleLinkHover}
        onSelectionChange={onSelectionChange}
        style={{ flex: 1 }}
      />
    </div>
  );
};

NetworkGraph.displayName = 'NetworkGraph';

export default NetworkGraph;