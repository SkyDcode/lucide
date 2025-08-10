// frontend/src/modules/graph/components/GraphCanvas.jsx - Canvas D3.js pour visualisation
import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import useD3 from '../hooks/useD3';
import useGraphInteraction from '../hooks/useGraphInteraction';

/**
 * Composant Canvas pour la visualisation D3.js du graphe
 * Gère le rendu SVG et les interactions de base
 */
const GraphCanvas = forwardRef(({
  data = { nodes: [], links: [] },
  config = {},
  onNodeClick,
  onNodeHover,
  onLinkClick,
  onLinkHover,
  onSelectionChange,
  className = '',
  style = {}
}, ref) => {
  
  // Configuration par défaut
  const defaultConfig = {
    width: 800,
    height: 600,
    background: 'transparent',
    ...config
  };

  // Hook D3 avec instance complète
  const { ref: containerRef, api, instance, error, isReady } = useD3({
    ...defaultConfig,
    data
  });

  // Hook pour les interactions avancées
  const {
    selectedId,
    hoveredId,
    selected,
    isActiveNode,
    isActiveLink,
    onClickNode,
    onHoverNode,
    clearHover,
    setSelectedId,
    attachD3Api,
    renderSatellites
  } = useGraphInteraction(data);

  // Attacher l'API D3 aux interactions
  useEffect(() => {
    if (api && isReady) {
      attachD3Api(api);
    }
  }, [api, isReady, attachD3Api]);

  // Configurer les gestionnaires d'événements D3Service
  useEffect(() => {
    if (!api || !instance) return;

    // Gestionnaire de clic sur nœud
    const handleNodeClick = ({ node, event }) => {
      onClickNode(node);
      onNodeClick?.(node, event);
      onSelectionChange?.(selectedId);
    };

    // Gestionnaire de survol nœud
    const handleNodeHover = ({ node, event }) => {
      onHoverNode(node);
      onNodeHover?.(node, event);
    };

    // Gestionnaire de sortie de survol nœud  
    const handleNodeLeave = ({ node, event }) => {
      clearHover();
      onNodeHover?.(null, event);
    };

    // Gestionnaire de clic sur lien
    const handleLinkClick = ({ link, event }) => {
      onLinkClick?.(link, event);
    };

    // Gestionnaire de survol lien
    const handleLinkHover = ({ link, event }) => {
      onLinkHover?.(link, event);
    };

    // Ajouter les gestionnaires d'événements
    api.addEventListener('nodeClick', handleNodeClick);
    api.addEventListener('nodeMouseEnter', handleNodeHover);
    api.addEventListener('nodeMouseLeave', handleNodeLeave);
    api.addEventListener('linkClick', handleLinkClick);
    api.addEventListener('linkMouseEnter', handleLinkHover);

    // Cleanup
    return () => {
      api.removeEventListener('nodeClick');
      api.removeEventListener('nodeMouseEnter');
      api.removeEventListener('nodeMouseLeave');
      api.removeEventListener('linkClick');
      api.removeEventListener('linkMouseEnter');
    };
  }, [api, instance, onClickNode, onHoverNode, clearHover, onNodeClick, onNodeHover, onLinkClick, onLinkHover, onSelectionChange, selectedId]);

  // Mise à jour du style des nœuds selon les interactions
  useEffect(() => {
    if (!instance || !data.nodes.length) return;

    // Appliquer les styles d'interaction via D3Service
    const { nodeElements, linkElements } = instance;
    
    if (nodeElements) {
      nodeElements
        .classed('active', d => isActiveNode(d.id))
        .classed('selected', d => d.id === selectedId)
        .classed('hovered', d => d.id === hoveredId);
    }

    if (linkElements) {
      linkElements
        .classed('active', d => isActiveLink(d))
        .style('opacity', d => isActiveLink(d) ? 1 : (selectedId || hoveredId ? 0.3 : 1));
    }
  }, [instance, selectedId, hoveredId, isActiveNode, isActiveLink, data.nodes.length]);

  // Rendu des satellites pour le nœud sélectionné
  useEffect(() => {
    renderSatellites();
  }, [renderSatellites]);

  // API exposée via ref
  useImperativeHandle(ref, () => ({
    // Accès direct à l'API D3
    d3Api: api,
    instance,
    
    // Méthodes de contrôle
    fitView: (nodes, padding) => api?.fitView(nodes, padding),
    centerOnNode: (node) => api?.centerOnNode(node),
    exportSVG: () => api?.exportSVG(),
    exportPNG: (callback) => api?.exportPNG(callback),
    
    // Contrôle de simulation
    playSimulation: () => api?.controlSimulation('play'),
    pauseSimulation: () => api?.controlSimulation('pause'),
    restartSimulation: () => api?.controlSimulation('restart'),
    
    // Layouts
    applyLayout: (type, options) => {
      switch (type) {
        case 'hierarchical':
          return api?.applyHierarchicalLayout(options);
        case 'circular':
          return api?.applyCircularLayout(options);
        case 'grid':
          return api?.applyGridLayout(options);
        case 'community':
          return api?.applyCommunityLayout(options);
        default:
          console.warn('Unknown layout type:', type);
      }
    },
    
    // Filtres
    filterByType: (visibleTypes) => api?.filterNodesByType(new Set(visibleTypes)),
    
    // Sélection
    selectNode: (nodeId) => setSelectedId(nodeId),
    clearSelection: () => setSelectedId(null),
    getSelected: () => selected,
    
    // Performance
    optimizeForLargeGraphs: (options) => api?.optimizeForLargeGraphs(options),
    getPerformanceStats: () => api?.getPerformanceStats(),
    
    // État
    isReady,
    hasError: !!error
  }), [api, instance, selected, setSelectedId, isReady, error]);

  // Styles CSS pour les interactions
  const canvasStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'grab',
    ...style
  };

  // Gestion d'erreur
  if (error) {
    return (
      <div 
        className={`graph-canvas-error ${className}`}
        style={canvasStyle}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#ef4444',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            Erreur de rendu du graphe
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {error.message || 'Erreur inconnue'}
          </div>
        </div>
      </div>
    );
  }

  // État de chargement
  if (!isReady) {
    return (
      <div 
        className={`graph-canvas-loading ${className}`}
        style={canvasStyle}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            Initialisation du graphe...
          </div>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Container SVG géré par D3Service */}
      <div 
        ref={containerRef}
        className={`graph-canvas ${className}`}
        style={canvasStyle}
      />
      
      {/* CSS pour les animations et interactions */}
      <style jsx>{`
        .graph-canvas {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .graph-canvas :global(.node) {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .graph-canvas :global(.node:hover) {
          stroke-width: 3px !important;
        }
        
        .graph-canvas :global(.node.selected) {
          stroke: #fbbf24 !important;
          stroke-width: 4px !important;
          filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
        }
        
        .graph-canvas :global(.node.hovered) {
          filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.6));
        }
        
        .graph-canvas :global(.link) {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .graph-canvas :global(.link:hover) {
          stroke-width: 3px !important;
          stroke-opacity: 1 !important;
        }
        
        .graph-canvas :global(.link.active) {
          stroke-opacity: 1 !important;
        }
        
        .graph-canvas :global(.label) {
          pointer-events: none;
          user-select: none;
          font-size: 12px;
          fill: #374151;
          font-weight: 500;
        }
        
        .graph-canvas :global(.overlay-sat line) {
          stroke: #64748b;
          stroke-width: 1;
          opacity: 0.8;
        }
        
        .graph-canvas :global(.overlay-sat circle) {
          fill: #94a3b8;
          stroke: #0f172a;
          stroke-width: 1;
        }
        
        .graph-canvas :global(.overlay-sat text) {
          font-size: 10px;
          fill: #e5e7eb;
          stroke: #0f172a;
          stroke-width: 0.25;
          text-anchor: middle;
          pointer-events: none;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .graph-canvas :global(.label) {
            font-size: 10px;
          }
          
          .graph-canvas :global(.overlay-sat text) {
            font-size: 8px;
          }
        }
      `}</style>
    </>
  );
});

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;