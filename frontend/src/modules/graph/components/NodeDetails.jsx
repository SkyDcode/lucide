// frontend/src/modules/graph/components/NodeDetails.jsx - Panneau de détails des nœuds
import React, { useState, useMemo, useCallback } from 'react';
import Button from '../../../components/ui/Button/Button';
import Modal from '../../../components/ui/Modal/Modal';
import './NodeDetails.css';

/**
 * Composant de panneau détaillé pour afficher les informations d'un nœud
 * Peut être affiché en modal ou en panneau latéral
 */
const NodeDetails = ({
  // Nœud à afficher
  node = null,
  
  // Données du graphe pour le contexte
  graph = { nodes: [], links: [] },
  
  // Configuration d'affichage
  mode = 'panel', // 'panel', 'modal', 'overlay'
  position = 'right', // 'left', 'right', 'bottom' (pour mode panel)
  
  // Callbacks
  onClose,
  onNodeAction,
  onRelationshipAction,
  
  // Options d'affichage
  showConnections = true,
  showAttributes = true,
  showActions = true,
  showTimeline = true,
  showExport = true,
  
  // Style
  className = '',
  style = {}
}) => {
  
  // État local
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({
    attributes: true,
    connections: true,
    timeline: false,
    actions: false
  });
  
  // Calculer les connexions du nœud
  const nodeConnections = useMemo(() => {
    if (!node) return { incoming: [], outgoing: [], total: 0 };
    
    const incoming = [];
    const outgoing = [];
    
    graph.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (targetId === node.id) {
        const sourceNode = graph.nodes.find(n => n.id === sourceId);
        if (sourceNode) {
          incoming.push({
            ...link,
            connectedNode: sourceNode,
            direction: 'incoming'
          });
        }
      } else if (sourceId === node.id) {
        const targetNode = graph.nodes.find(n => n.id === targetId);
        if (targetNode) {
          outgoing.push({
            ...link,
            connectedNode: targetNode,
            direction: 'outgoing'
          });
        }
      }
    });
    
    return {
      incoming,
      outgoing,
      total: incoming.length + outgoing.length,
      all: [...incoming, ...outgoing]
    };
  }, [node, graph.nodes, graph.links]);
  
  // Calculer les statistiques du nœud
  const nodeStats = useMemo(() => {
    if (!node) return null;
    
    const stats = {
      connectionCount: nodeConnections.total,
      incomingCount: nodeConnections.incoming.length,
      outgoingCount: nodeConnections.outgoing.length,
      centrality: {
        degree: node.degreeCentrality || 0,
        betweenness: node.betweennessCentrality || 0,
        closeness: node.closenessCentrality || 0
      },
      attributes: {
        total: Object.keys(node.attributes || {}).length,
        filled: Object.values(node.attributes || {}).filter(v => v !== null && v !== undefined && v !== '').length
      }
    };
    
    stats.attributes.completeness = stats.attributes.total > 0 
      ? Math.round((stats.attributes.filled / stats.attributes.total) * 100) 
      : 0;
    
    return stats;
  }, [node, nodeConnections]);
  
  // Formater les attributs pour l'affichage
  const formattedAttributes = useMemo(() => {
    if (!node?.attributes) return [];
    
    return Object.entries(node.attributes)
      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => {
        // Déterminer le type d'attribut pour le formatage
        let displayValue = value;
        let type = 'text';
        
        if (typeof value === 'boolean') {
          displayValue = value ? 'Oui' : 'Non';
          type = 'boolean';
        } else if (typeof value === 'number') {
          displayValue = value.toLocaleString();
          type = 'number';
        } else if (typeof value === 'string') {
          if (value.includes('@') && value.includes('.')) {
            type = 'email';
          } else if (value.startsWith('http')) {
            type = 'url';
          } else if (value.match(/^\+?[\d\s\-\(\)]+$/)) {
            type = 'phone';
          } else if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
            type = 'date';
            displayValue = new Date(value).toLocaleDateString('fr-FR');
          }
        }
        
        return {
          key,
          value,
          displayValue,
          type,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [node?.attributes]);
  
  // Obtenir l'icône du type de nœud
  const getNodeTypeIcon = useCallback((nodeType) => {
    const typeIcons = {
      person: '👤',
      place: '📍',
      organization: '🏢',
      vehicle: '🚗',
      account: '💳',
      event: '📅',
      document: '📄',
      phone: '📱',
      email: '📧',
      website: '🌐'
    };
    return typeIcons[nodeType] || '❓';
  }, []);
  
  // Obtenir la couleur du type de relation
  const getRelationshipColor = useCallback((relationType) => {
    const typeColors = {
      family: '#ef4444',
      friend: '#22c55e',
      colleague: '#3b82f6',
      business: '#8b5cf6',
      connected: '#6b7280'
    };
    return typeColors[relationType] || '#6b7280';
  }, []);
  
  // Basculer l'expansion d'une section
  const toggleSection = useCallback((sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);
  
  // Gestionnaire d'action sur le nœud
  const handleNodeAction = useCallback((action, data = {}) => {
    onNodeAction?.(action, { node, ...data });
  }, [node, onNodeAction]);
  
  // Gestionnaire d'action sur une relation
  const handleRelationshipAction = useCallback((action, relationship, data = {}) => {
    onRelationshipAction?.(action, { relationship, node, ...data });
  }, [node, onRelationshipAction]);
  
  // Fermer le panneau
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);
  
  // Exporter les données du nœud
  const handleExport = useCallback((format = 'json') => {
    const exportData = {
      node: {
        id: node.id,
        name: node.name,
        type: node.type,
        attributes: node.attributes,
        stats: nodeStats
      },
      connections: nodeConnections.all.map(conn => ({
        type: conn.type,
        direction: conn.direction,
        connectedNode: {
          id: conn.connectedNode.id,
          name: conn.connectedNode.name,
          type: conn.connectedNode.type
        }
      })),
      exportDate: new Date().toISOString()
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `node-${node.id}-${node.name || 'details'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    handleNodeAction('export', { format, data: exportData });
  }, [node, nodeStats, nodeConnections, handleNodeAction]);
  
  // Si aucun nœud n'est sélectionné
  if (!node) {
    if (mode === 'modal') return null;
    
    return (
      <div className={`node-details node-details--${mode} node-details--${position} node-details--empty ${className}`} style={style}>
        <div className="node-details__empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Aucun nœud sélectionné</div>
          <div className="empty-message">
            Cliquez sur un nœud du graphe pour voir ses détails
          </div>
        </div>
      </div>
    );
  }
  
  // Rendu de l'en-tête du nœud
  const renderNodeHeader = () => (
    <div className="node-details__header">
      <div className="node-header-main">
        <div className="node-icon">
          {getNodeTypeIcon(node.type)}
        </div>
        <div className="node-info">
          <h3 className="node-name" title={node.name}>
            {node.name || `Nœud ${node.id}`}
          </h3>
          <div className="node-type">
            {node.type_config?.name || node.type || 'Type inconnu'}
          </div>
        </div>
        <div className="node-actions-header">
          {showActions && (
            <Button
              variant="ghost"
              size="small"
              icon="⚙"
              onClick={() => toggleSection('actions')}
              title="Actions"
            />
          )}
          {mode === 'modal' ? (
            <Button
              variant="ghost"
              size="small"
              icon="✕"
              onClick={handleClose}
              title="Fermer"
            />
          ) : (
            onClose && (
              <Button
                variant="ghost"
                size="small"
                icon="✕"
                onClick={handleClose}
                title="Fermer"
              />
            )
          )}
        </div>
      </div>
      
      {nodeStats && (
        <div className="node-stats-summary">
          <div className="stat-item">
            <span className="stat-value">{nodeStats.connectionCount}</span>
            <span className="stat-label">Connexions</span>
          </div>
          {nodeStats.attributes.total > 0 && (
            <div className="stat-item">
              <span className="stat-value">{nodeStats.attributes.completeness}%</span>
              <span className="stat-label">Complétude</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  // Rendu des onglets
  const renderTabs = () => (
    <div className="node-details__tabs">
      <button
        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        Vue d'ensemble
      </button>
      {showConnections && nodeConnections.total > 0 && (
        <button
          className={`tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          Connexions ({nodeConnections.total})
        </button>
      )}
      {showAttributes && formattedAttributes.length > 0 && (
        <button
          className={`tab ${activeTab === 'attributes' ? 'active' : ''}`}
          onClick={() => setActiveTab('attributes')}
        >
          Attributs ({formattedAttributes.length})
        </button>
      )}
      {showTimeline && (
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Chronologie
        </button>
      )}
    </div>
  );
  
  // Rendu de la vue d'ensemble
  const renderOverview = () => (
    <div className="overview-content">
      {/* Informations de base */}
      <div className="info-section">
        <h4 className="section-title">Informations générales</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">ID</span>
            <span className="info-value">{node.id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Type</span>
            <span className="info-value">
              <span 
                className="type-indicator" 
                style={{ backgroundColor: node.type_config?.color || '#9ca3af' }}
              />
              {node.type_config?.name || node.type}
            </span>
          </div>
          {node.created_at && (
            <div className="info-item">
              <span className="info-label">Créé le</span>
              <span className="info-value">
                {new Date(node.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
          {node.updated_at && (
            <div className="info-item">
              <span className="info-label">Modifié le</span>
              <span className="info-value">
                {new Date(node.updated_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Métriques de centralité */}
      {nodeStats && (
        <div className="metrics-section">
          <h4 className="section-title">Métriques du réseau</h4>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Degré de centralité</span>
              <span className="metric-value">
                {(nodeStats.centrality.degree * 100).toFixed(1)}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Centralité d'intermédiarité</span>
              <span className="metric-value">
                {(nodeStats.centrality.betweenness * 100).toFixed(1)}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Centralité de proximité</span>
              <span className="metric-value">
                {(nodeStats.centrality.closeness * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Aperçu des connexions */}
      {showConnections && nodeConnections.total > 0 && (
        <div className="connections-overview">
          <h4 className="section-title">Aperçu des connexions</h4>
          <div className="connection-summary">
            <div className="connection-type">
              <span className="connection-count">{nodeConnections.incoming.length}</span>
              <span className="connection-label">Entrantes</span>
            </div>
            <div className="connection-type">
              <span className="connection-count">{nodeConnections.outgoing.length}</span>
              <span className="connection-label">Sortantes</span>
            </div>
          </div>
          
          {/* Top connexions */}
          {nodeConnections.all.length > 0 && (
            <div className="top-connections">
              <h5>Principales connexions</h5>
              {nodeConnections.all.slice(0, 3).map((conn, index) => (
                <div key={index} className="connection-preview">
                  <span className="connection-node">
                    {getNodeTypeIcon(conn.connectedNode.type)} {conn.connectedNode.name}
                  </span>
                  <span className="connection-type-label">{conn.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  // Rendu des connexions détaillées
  const renderConnections = () => (
    <div className="connections-content">
      {nodeConnections.all.length === 0 ? (
        <div className="no-connections">
          <div className="no-data-icon">🔗</div>
          <div className="no-data-title">Aucune connexion</div>
          <div className="no-data-message">Ce nœud n'a pas de connexion avec d'autres nœuds</div>
        </div>
      ) : (
        <div className="connections-list">
          {nodeConnections.all.map((connection, index) => (
            <div key={index} className="connection-item">
              <div className="connection-header">
                <div className="connected-node">
                  <span className="node-icon">
                    {getNodeTypeIcon(connection.connectedNode.type)}
                  </span>
                  <span className="node-name">
                    {connection.connectedNode.name || `Nœud ${connection.connectedNode.id}`}
                  </span>
                  <span className="node-type">
                    {connection.connectedNode.type}
                  </span>
                </div>
                <div className="connection-actions">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleRelationshipAction('view', connection)}
                    title="Voir la relation"
                  >
                    👁
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleRelationshipAction('edit', connection)}
                    title="Modifier la relation"
                  >
                    ✏
                  </Button>
                </div>
              </div>
              
              <div className="connection-details">
                <div className="relation-info">
                  <span 
                    className="relation-type"
                    style={{ color: getRelationshipColor(connection.type) }}
                  >
                    {connection.type}
                  </span>
                  <span className={`relation-direction ${connection.direction}`}>
                    {connection.direction === 'incoming' ? '← Entrant' : '→ Sortant'}
                  </span>
                  {connection.strength && (
                    <span className={`relation-strength ${connection.strength}`}>
                      {connection.strength}
                    </span>
                  )}
                </div>
                
                {connection.description && (
                  <div className="relation-description">
                    {connection.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  // Rendu des attributs détaillés
  const renderAttributes = () => (
    <div className="attributes-content">
      {formattedAttributes.length === 0 ? (
        <div className="no-attributes">
          <div className="no-data-icon">📋</div>
          <div className="no-data-title">Aucun attribut</div>
          <div className="no-data-message">Ce nœud n'a pas d'attributs définis</div>
        </div>
      ) : (
        <div className="attributes-list">
          {formattedAttributes.map((attr, index) => (
            <div key={index} className="attribute-item">
              <div className="attribute-label">{attr.label}</div>
              <div className={`attribute-value attribute-type-${attr.type}`}>
                {attr.type === 'url' ? (
                  <a href={attr.value} target="_blank" rel="noopener noreferrer">
                    {attr.displayValue}
                  </a>
                ) : attr.type === 'email' ? (
                  <a href={`mailto:${attr.value}`}>
                    {attr.displayValue}
                  </a>
                ) : attr.type === 'phone' ? (
                  <a href={`tel:${attr.value}`}>
                    {attr.displayValue}
                  </a>
                ) : (
                  attr.displayValue
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  // Rendu de la chronologie
  const renderTimeline = () => (
    <div className="timeline-content">
      <div className="timeline-item">
        <div className="timeline-date">
          {node.created_at ? new Date(node.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
        </div>
        <div className="timeline-event">
          <strong>Création</strong> - Nœud ajouté au graphe
        </div>
      </div>
      
      {node.updated_at && node.updated_at !== node.created_at && (
        <div className="timeline-item">
          <div className="timeline-date">
            {new Date(node.updated_at).toLocaleDateString('fr-FR')}
          </div>
          <div className="timeline-event">
            <strong>Modification</strong> - Dernière mise à jour
          </div>
        </div>
      )}
      
      {/* Ajouter d'autres événements de timeline ici */}
    </div>
  );
  
  // Rendu des actions
  const renderActions = () => (
    <div className="actions-content">
      <div className="action-group">
        <h5>Actions sur le nœud</h5>
        <div className="actions-grid">
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleNodeAction('edit')}
            icon="✏"
          >
            Modifier
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleNodeAction('duplicate')}
            icon="📋"
          >
            Dupliquer
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleNodeAction('center')}
            icon="🎯"
          >
            Centrer
          </Button>
          {showExport && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => handleExport('json')}
              icon="💾"
            >
              Exporter
            </Button>
          )}
        </div>
      </div>
      
      <div className="action-group">
        <h5>Actions sur les connexions</h5>
        <div className="actions-grid">
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleNodeAction('addConnection')}
            icon="🔗"
          >
            Ajouter une relation
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleNodeAction('showPath')}
            icon="🛤"
          >
            Chemin vers...
          </Button>
        </div>
      </div>
      
      <div className="action-group danger">
        <h5>Actions destructives</h5>
        <div className="actions-grid">
          <Button
            variant="danger"
            size="small"
            onClick={() => handleNodeAction('delete')}
            icon="🗑"
          >
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
  
  // Rendu du contenu selon l'onglet actif
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'connections':
        return renderConnections();
      case 'attributes':
        return renderAttributes();
      case 'timeline':
        return renderTimeline();
      default:
        return renderOverview();
    }
  };
  
  // Rendu principal du composant
  const content = (
    <div className={`node-details node-details--${mode} node-details--${position} ${className}`} style={style}>
      {renderNodeHeader()}
      {renderTabs()}
      <div className="node-details__content">
        {renderTabContent()}
      </div>
      
      {/* Actions rapides en bas */}
      {showActions && expandedSections.actions && (
        <div className="node-details__footer">
          {renderActions()}
        </div>
      )}
    </div>
  );
  
  // Rendu selon le mode
  if (mode === 'modal') {
    return (
      <Modal
        isOpen={!!node}
        onClose={handleClose}
        title={`Détails - ${node.name || `Nœud ${node.id}`}`}
        size="large"
        className="node-details-modal"
      >
        {content}
      </Modal>
    );
  }
  
  return content;
};

NodeDetails.displayName = 'NodeDetails';

export default NodeDetails;