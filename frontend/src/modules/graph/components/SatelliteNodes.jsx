// frontend/src/modules/graph/components/SatelliteNodes.jsx - Nœuds satellites détaillés
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import Button from '../../../components/ui/Button/Button';
import NodeHelpers from '../utils/nodeHelpers';

/**
 * Composant pour afficher les nœuds satellites autour d'un nœud central sélectionné
 * Affiche les détails des entités connectées sous forme de nœuds flottants
 */
const SatelliteNodes = ({
  // Nœud central sélectionné
  centralNode,
  
  // Données du graphe
  nodes = [],
  links = [],
  
  // Configuration
  visible = false,
  maxSatellites = 8,
  radius = 120,
  animationDuration = 300,
  
  // Callbacks
  onSatelliteClick,
  onSatelliteHover,
  onSatelliteDoubleClick,
  onClose,
  
  // Style et position
  container,
  transform = { x: 0, y: 0, k: 1 },
  
  // Options avancées
  showLabels = true,
  showConnections = true,
  groupByType = false,
  autoPosition = true,
  
  // Classe CSS
  className = ''
}) => {
  
  // Références
  const svgRef = useRef(null);
  const groupRef = useRef(null);
  const animationRef = useRef(null);
  
  // Calculer les nœuds satellites
  const satelliteData = useMemo(() => {
    if (!centralNode || !visible) return { satellites: [], connections: [] };
    
    // Trouver tous les nœuds connectés au nœud central
    const connectedNodeIds = new Set();
    const connectionData = [];
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === centralNode.id) {
        connectedNodeIds.add(targetId);
        connectionData.push({
          ...link,
          direction: 'outgoing',
          connectedNodeId: targetId
        });
      } else if (targetId === centralNode.id) {
        connectedNodeIds.add(sourceId);
        connectionData.push({
          ...link,
          direction: 'incoming',
          connectedNodeId: sourceId
        });
      }
    });
    
    // Obtenir les nœuds connectés
    let connectedNodes = nodes.filter(node => 
      connectedNodeIds.has(node.id) && node.id !== centralNode.id
    );
    
    // Grouper par type si demandé
    if (groupByType) {
      const nodesByType = NodeHelpers.groupNodes(connectedNodes, 'type');
      connectedNodes = Object.values(nodesByType).flat();
    }
    
    // Limiter le nombre de satellites
    connectedNodes = connectedNodes.slice(0, maxSatellites);
    
    // Calculer les positions des satellites
    const satellites = connectedNodes.map((node, index) => {
      const angle = (index / Math.max(connectedNodes.length, 1)) * 2 * Math.PI;
      const adjustedRadius = groupByType ? 
        radius + (NodeHelpers.getNodeTypeConfig(node.type).category === 'individual' ? 0 : 30) :
        radius;
      
      return {
        ...node,
        satelliteId: `satellite-${node.id}`,
        angle,
        radius: adjustedRadius,
        x: centralNode.x + Math.cos(angle) * adjustedRadius,
        y: centralNode.y + Math.sin(angle) * adjustedRadius,
        connectionInfo: connectionData.find(c => c.connectedNodeId === node.id),
        size: NodeHelpers.calculateNodeSize(node, { sizeBy: 'degree', minSize: 6, maxSize: 16 }),
        color: NodeHelpers.getNodeColor(node, { colorBy: 'type' }),
        typeConfig: NodeHelpers.getNodeTypeConfig(node.type)
      };
    });
    
    return { satellites, connections: connectionData };
  }, [centralNode, nodes, links, visible, maxSatellites, radius, groupByType]);
  
  // Position ajustée selon le transform
  const adjustedCentralPosition = useMemo(() => {
    if (!centralNode) return { x: 0, y: 0 };
    
    return {
      x: centralNode.x * transform.k + transform.x,
      y: centralNode.y * transform.k + transform.y
    };
  }, [centralNode, transform]);
  
  // Créer le SVG overlay si nécessaire
  useEffect(() => {
    if (!container || !visible) return;
    
    // Créer ou obtenir le SVG overlay
    let svg = d3.select(container).select('.satellite-overlay');
    
    if (svg.empty()) {
      svg = d3.select(container)
        .append('svg')
        .attr('class', 'satellite-overlay')
        .style('position', 'absolute')
        .style('top', 0)
        .style('left', 0)
        .style('pointer-events', 'none')
        .style('z-index', 1000);
    }
    
    // Ajuster la taille du SVG
    const containerRect = container.getBoundingClientRect();
    svg
      .attr('width', containerRect.width)
      .attr('height', containerRect.height);
    
    svgRef.current = svg.node();
    
    return () => {
      if (!visible) {
        svg.remove();
      }
    };
  }, [container, visible]);
  
  // Animer l'apparition/disparition des satellites
  useEffect(() => {
    if (!svgRef.current || !satelliteData.satellites.length) return;
    
    const svg = d3.select(svgRef.current);
    const group = svg.select('.satellites-group').empty() ?
      svg.append('g').attr('class', 'satellites-group') :
      svg.select('.satellites-group');
    
    groupRef.current = group.node();
    
    if (visible) {
      renderSatellites(group);
    } else {
      animateHide(group);
    }
  }, [satelliteData, visible, adjustedCentralPosition]);
  
  // Fonction de rendu des satellites
  const renderSatellites = useCallback((group) => {
    if (!group || !satelliteData.satellites.length) return;
    
    // Lignes de connexion
    if (showConnections) {
      const connections = group.selectAll('.satellite-connection')
        .data(satelliteData.satellites, d => d.satelliteId);
      
      connections.exit()
        .transition()
        .duration(animationDuration / 2)
        .attr('opacity', 0)
        .remove();
      
      connections.enter()
        .append('line')
        .attr('class', 'satellite-connection')
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0)
        .attr('x1', adjustedCentralPosition.x)
        .attr('y1', adjustedCentralPosition.y)
        .attr('x2', adjustedCentralPosition.x)
        .attr('y2', adjustedCentralPosition.y)
        .transition()
        .duration(animationDuration)
        .attr('opacity', 0.6)
        .attr('x2', d => d.x * transform.k + transform.x)
        .attr('y2', d => d.y * transform.k + transform.y);
    }
    
    // Nœuds satellites
    const satellites = group.selectAll('.satellite-node')
      .data(satelliteData.satellites, d => d.satelliteId);
    
    satellites.exit()
      .transition()
      .duration(animationDuration / 2)
      .attr('opacity', 0)
      .attr('r', 0)
      .remove();
    
    const satelliteEnter = satellites.enter()
      .append('g')
      .attr('class', 'satellite-node')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all');
    
    // Cercle du satellite
    satelliteEnter
      .append('circle')
      .attr('r', 0)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('cx', adjustedCentralPosition.x)
      .attr('cy', adjustedCentralPosition.y);
    
    // Icône du type
    satelliteEnter
      .append('text')
      .attr('class', 'satellite-icon')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .attr('opacity', 0)
      .attr('x', adjustedCentralPosition.x)
      .attr('y', adjustedCentralPosition.y)
      .text(d => d.typeConfig.icon);
    
    // Label si activé
    if (showLabels) {
      satelliteEnter
        .append('text')
        .attr('class', 'satellite-label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .attr('fill', '#374151')
        .attr('opacity', 0)
        .attr('x', adjustedCentralPosition.x)
        .attr('y', adjustedCentralPosition.y + 25)
        .text(d => NodeHelpers.formatNodeLabel(d, { maxLength: 12 }));
    }
    
    // Badge de connexion
    satelliteEnter
      .append('circle')
      .attr('class', 'connection-badge')
      .attr('r', 6)
      .attr('fill', d => d.connectionInfo?.direction === 'outgoing' ? '#3b82f6' : '#10b981')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .attr('cx', d => (d.x * transform.k + transform.x) + 12)
      .attr('cy', d => (d.y * transform.k + transform.y) - 12);
    
    satelliteEnter
      .append('text')
      .attr('class', 'connection-icon')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '8px')
      .attr('fill', '#fff')
      .attr('opacity', 0)
      .attr('x', d => (d.x * transform.k + transform.x) + 12)
      .attr('y', d => (d.y * transform.k + transform.y) - 12)
      .text(d => d.connectionInfo?.direction === 'outgoing' ? '→' : '←');
    
    // Animation d'entrée
    const allSatellites = satelliteEnter.merge(satellites);
    
    allSatellites.select('circle:not(.connection-badge)')
      .transition()
      .duration(animationDuration)
      .delay((d, i) => i * 50)
      .attr('opacity', 1)
      .attr('r', d => d.size)
      .attr('cx', d => d.x * transform.k + transform.x)
      .attr('cy', d => d.y * transform.k + transform.y);
    
    allSatellites.select('.satellite-icon')
      .transition()
      .duration(animationDuration)
      .delay((d, i) => i * 50 + 100)
      .attr('opacity', 1)
      .attr('x', d => d.x * transform.k + transform.x)
      .attr('y', d => d.y * transform.k + transform.y);
    
    if (showLabels) {
      allSatellites.select('.satellite-label')
        .transition()
        .duration(animationDuration)
        .delay((d, i) => i * 50 + 150)
        .attr('opacity', 1)
        .attr('x', d => d.x * transform.k + transform.x)
        .attr('y', d => (d.y * transform.k + transform.y) + 25);
    }
    
    allSatellites.select('.connection-badge')
      .transition()
      .duration(animationDuration)
      .delay((d, i) => i * 50 + 200)
      .attr('opacity', 0.9);
    
    allSatellites.select('.connection-icon')
      .transition()
      .duration(animationDuration)
      .delay((d, i) => i * 50 + 200)
      .attr('opacity', 1);
    
    // Interactions
    allSatellites
      .on('click', (event, d) => {
        event.stopPropagation();
        onSatelliteClick?.(d, event);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        onSatelliteDoubleClick?.(d, event);
      })
      .on('mouseenter', (event, d) => {
        // Effet de survol
        d3.select(event.currentTarget)
          .select('circle:not(.connection-badge)')
          .transition()
          .duration(150)
          .attr('r', d.size * 1.3)
          .attr('stroke-width', 3);
        
        onSatelliteHover?.(d, event);
      })
      .on('mouseleave', (event, d) => {
        // Retour à la normale
        d3.select(event.currentTarget)
          .select('circle:not(.connection-badge)')
          .transition()
          .duration(150)
          .attr('r', d.size)
          .attr('stroke-width', 2);
        
        onSatelliteHover?.(null, event);
      });
      
  }, [satelliteData, adjustedCentralPosition, transform, showLabels, showConnections, animationDuration, onSatelliteClick, onSatelliteHover, onSatelliteDoubleClick]);
  
  // Fonction d'animation de masquage
  const animateHide = useCallback((group) => {
    if (!group) return;
    
    group.selectAll('.satellite-node, .satellite-connection')
      .transition()
      .duration(animationDuration / 2)
      .attr('opacity', 0)
      .on('end', () => {
        group.selectAll('*').remove();
      });
  }, [animationDuration]);
  
  // Bouton de fermeture (overlay React)
  const renderCloseButton = () => {
    if (!visible || !adjustedCentralPosition) return null;
    
    const buttonStyle = {
      position: 'absolute',
      left: adjustedCentralPosition.x + radius + 20,
      top: adjustedCentralPosition.y - 15,
      zIndex: 1001,
      transform: 'translate(-50%, -50%)'
    };
    
    return (
      <Button
        variant="ghost"
        size="small"
        onClick={onClose}
        style={buttonStyle}
        title="Fermer les satellites"
      >
        ✕
      </Button>
    );
  };
  
  // Informations de contexte
  const renderContextInfo = () => {
    if (!visible || !satelliteData.satellites.length || !adjustedCentralPosition) return null;
    
    const infoStyle = {
      position: 'absolute',
      left: adjustedCentralPosition.x,
      top: adjustedCentralPosition.y - radius - 40,
      transform: 'translate(-50%, 0)',
      background: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      fontWeight: '500',
      color: '#374151',
      zIndex: 1001,
      backdropFilter: 'blur(4px)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    };
    
    return (
      <div style={infoStyle}>
        {satelliteData.satellites.length} connexion{satelliteData.satellites.length > 1 ? 's' : ''}
        {maxSatellites < satelliteData.connections.length && 
          ` (${satelliteData.connections.length - maxSatellites} masquée${satelliteData.connections.length - maxSatellites > 1 ? 's' : ''})`
        }
      </div>
    );
  };
  
  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  if (!visible || !centralNode || !satelliteData.satellites.length) {
    return null;
  }
  
  return (
    <div className={`satellite-nodes ${className}`}>
      {renderContextInfo()}
      {renderCloseButton()}
    </div>
  );
};

SatelliteNodes.displayName = 'SatelliteNodes';

export default SatelliteNodes;