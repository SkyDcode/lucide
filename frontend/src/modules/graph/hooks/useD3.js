// frontend/src/modules/graph/hooks/useD3.js - Adapté pour D3Service complet
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import D3Service from '../services/d3Service';

/**
 * Hook pour initialiser et gérer une instance D3 de visualisation de graphe
 * Compatible avec la classe D3Service complète
 */
export default function useD3(options = {}) {
  const {
    background = 'transparent',
    width = 800,
    height = 600,
    data = { nodes: [], links: [] },
    config = {}
  } = options;

  const containerRef = useRef(null);
  const [graphInstance, setGraphInstance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Nettoyer l'instance précédente
      if (graphInstance) {
        D3Service.cleanup(graphInstance);
      }

      // Configuration de base
      const graphConfig = {
        width,
        height,
        ...config
      };

      // Appliquer le background au conteneur
      containerRef.current.style.background = background;

      // Créer une nouvelle instance de graphe
      const instance = D3Service.createGraph(containerRef.current, data, graphConfig);

      setGraphInstance(instance);
      setError(null);
      
    } catch (err) {
      console.error('Error creating D3 graph instance:', err);
      setError(err);
    }

    // Cleanup au démontage
    return () => {
      if (graphInstance) {
        D3Service.cleanup(graphInstance);
      }
    };
  }, [width, height, background, JSON.stringify(data), JSON.stringify(config)]); // Recréer si les dimensions ou données changent

  // Mettre à jour les données si elles changent
  useEffect(() => {
    if (graphInstance && data && Object.keys(data).length > 0) {
      D3Service.updateData(graphInstance, data);
    }
  }, [graphInstance]); // Retiré data car maintenant géré dans l'effet principal

  // Mettre à jour la configuration si elle change
  useEffect(() => {
    if (graphInstance && config && Object.keys(config).length > 0) {
      // Appliquer les changements de configuration
      Object.assign(graphInstance.config, config);
      
      // Redémarrer la simulation si nécessaire
      if (config.simulation) {
        D3Service.controlSimulation(graphInstance, 'restart');
      }
    }
  }, [graphInstance]); // Retiré config car maintenant géré dans l'effet principal

  // API publique du hook
  const api = graphInstance ? {
    // Référence à l'instance complète
    instance: graphInstance,
    
    // Éléments SVG principaux  
    svg: graphInstance.svg,
    gRoot: graphInstance.mainGroup,
    gLinks: graphInstance.linksGroup,
    gNodes: graphInstance.nodesGroup,
    gLabels: graphInstance.labelsGroup,
    
    // Comportements
    zoom: graphInstance.zoom,
    
    // Méthodes utilitaires
    fitView: (nodes = [], padding = 50) => {
      if (nodes.length > 0) {
        const bounds = D3Service.calculateGraphBounds(nodes);
        const graphWidth = bounds.maxX - bounds.minX;
        const graphHeight = bounds.maxY - bounds.minY;
        
        if (graphWidth === 0 && graphHeight === 0) return;
        
        const scale = Math.min(
          (width - padding * 2) / Math.max(graphWidth, 1),
          (height - padding * 2) / Math.max(graphHeight, 1)
        ) * 0.9;
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const translateX = width / 2 - centerX * scale;
        const translateY = height / 2 - centerY * scale;
        
        graphInstance.svg
          .transition()
          .duration(750)
          .call(graphInstance.zoom.transform, 
            d3.zoomIdentity.translate(translateX, translateY).scale(scale)
          );
      } else {
        D3Service.fitToView(graphInstance);
      }
    },
    
    calculateBounds: (nodes) => D3Service.calculateGraphBounds(nodes),
    updateData: (newData) => D3Service.updateData(graphInstance, newData),
    centerOnNode: (node) => D3Service.centerOnNode(graphInstance, node),
    filterNodesByType: (visibleTypes) => D3Service.filterNodesByType(graphInstance, visibleTypes),
    controlSimulation: (action) => D3Service.controlSimulation(graphInstance, action),
    
    // Layouts
    applyHierarchicalLayout: (options) => D3Service.applyHierarchicalLayout(graphInstance, options),
    applyCircularLayout: (options) => D3Service.applyCircularLayout(graphInstance, options),
    applyGridLayout: (options) => D3Service.applyGridLayout(graphInstance, options),
    applyCommunityLayout: (communities) => D3Service.applyCommunityLayout(graphInstance, communities),
    
    // Export
    exportSVG: () => D3Service.exportSVG(graphInstance),
    exportPNG: (callback) => D3Service.exportPNG(graphInstance, callback),
    
    // Événements
    addEventListener: (eventName, callback) => D3Service.addEventListener(graphInstance, eventName, callback),
    removeEventListener: (eventName) => D3Service.removeEventListener(graphInstance, eventName),
    
    // Performance
    optimizeForLargeGraphs: (options) => D3Service.optimizeForLargeGraphs(graphInstance, options),
    getPerformanceStats: () => D3Service.getPerformanceStats(graphInstance),
    
    // Cleanup
    destroy: () => {
      D3Service.cleanup(graphInstance);
      setGraphInstance(null);
    }
  } : null;

  return { 
    ref: containerRef, 
    api,
    instance: graphInstance,
    error,
    isReady: !!graphInstance && !error
  };
}