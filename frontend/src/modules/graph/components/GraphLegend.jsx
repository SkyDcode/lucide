// frontend/src/modules/graph/components/GraphLegend.jsx - Légende interactive du graphe
import React, { useMemo, useState, useCallback } from 'react';
import Button from '../../../components/ui/Button/Button';
import { ENTITY_TYPES, ENTITY_CATEGORIES } from '../../../shared/constants/entityTypes';
import { RELATIONSHIP_TYPES, RELATIONSHIP_CATEGORIES } from '../../../shared/constants/relationshipTypes';
import './GraphLegend.css';

/**
 * Composant de légende interactive pour le graphe
 * Affiche les types d'entités, relations et leur signification
 */
const GraphLegend = ({
  // Données pour calculer les statistiques
  nodes = [],
  links = [],
  
  // Configuration d'affichage
  showEntityTypes = true,
  showRelationshipTypes = true,
  showStatistics = true,
  showColorCoding = true,
  showSizeCoding = false,
  
  // Position et style
  position = 'bottom-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  collapsible = true,
  defaultCollapsed = false,
  
  // Callbacks d'interaction
  onEntityTypeClick,
  onRelationshipTypeClick,
  onToggleVisibility,
  
  // Options avancées
  compactMode = false,
  showCounts = true,
  showExamples = false,
  
  // Style personnalisé
  className = '',
  style = {}
}) => {
  
  // État local
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState('entities');
  
  // Calculer les statistiques des types présents dans le graphe
  const entityStats = useMemo(() => {
    const stats = {};
    
    nodes.forEach(node => {
      const type = node.type || 'unknown';
      if (!stats[type]) {
        stats[type] = {
          count: 0,
          config: ENTITY_TYPES[type] || {
            name: 'Inconnu',
            color: '#9ca3af',
            icon: 'help-circle',
            category: 'unknown'
          }
        };
      }
      stats[type].count++;
    });
    
    return stats;
  }, [nodes]);
  
  const relationshipStats = useMemo(() => {
    const stats = {};
    
    links.forEach(link => {
      const type = link.type || 'connected';
      if (!stats[type]) {
        stats[type] = {
          count: 0,
          config: RELATIONSHIP_TYPES[type] || {
            name: 'Connecté',
            color: '#6b7280',
            category: 'generic'
          }
        };
      }
      stats[type].count++;
    });
    
    return stats;
  }, [links]);
  
  // Grouper les types par catégorie
  const entitiesByCategory = useMemo(() => {
    const grouped = {};
    
    Object.entries(entityStats).forEach(([type, data]) => {
      const category = data.config.category || 'unknown';
      if (!grouped[category]) {
        grouped[category] = {
          category: ENTITY_CATEGORIES[category] || {
            name: 'Autres',
            icon: 'folder',
            color: '#9ca3af'
          },
          types: []
        };
      }
      grouped[category].types.push({ type, ...data });
    });
    
    return grouped;
  }, [entityStats]);
  
  const relationshipsByCategory = useMemo(() => {
    const grouped = {};
    
    Object.entries(relationshipStats).forEach(([type, data]) => {
      const category = data.config.category || 'generic';
      if (!grouped[category]) {
        grouped[category] = {
          category: RELATIONSHIP_CATEGORIES[category] || {
            name: 'Générique',
            icon: 'link',
            color: '#6b7280'
          },
          types: []
        };
      }
      grouped[category].types.push({ type, ...data });
    });
    
    return grouped;
  }, [relationshipStats]);
  
  // Calculer les statistiques globales
  const globalStats = useMemo(() => {
    return {
      totalNodes: nodes.length,
      totalLinks: links.length,
      entityTypes: Object.keys(entityStats).length,
      relationshipTypes: Object.keys(relationshipStats).length,
      categories: {
        entities: Object.keys(entitiesByCategory).length,
        relationships: Object.keys(relationshipsByCategory).length
      }
    };
  }, [nodes.length, links.length, entityStats, relationshipStats, entitiesByCategory, relationshipsByCategory]);
  
  // Gestionnaire de clic sur un type d'entité
  const handleEntityTypeClick = useCallback((type, config) => {
    onEntityTypeClick?.(type, config);
  }, [onEntityTypeClick]);
  
  // Gestionnaire de clic sur un type de relation
  const handleRelationshipTypeClick = useCallback((type, config) => {
    onRelationshipTypeClick?.(type, config);
  }, [onRelationshipTypeClick]);
  
  // Basculer l'état réduit/étendu
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);
  
  // Obtenir les classes CSS pour le positionnement
  const getPositionClasses = () => {
    const baseClasses = ['graph-legend'];
    baseClasses.push(`graph-legend--${position}`);
    
    if (isCollapsed) baseClasses.push('graph-legend--collapsed');
    if (compactMode) baseClasses.push('graph-legend--compact');
    if (className) baseClasses.push(className);
    
    return baseClasses.join(' ');
  };
  
  // Rendu d'un type d'entité
  const renderEntityType = (typeData) => {
    const { type, config, count } = typeData;
    
    return (
      <div
        key={type}
        className="legend-item legend-item--entity"
        onClick={() => handleEntityTypeClick(type, config)}
      >
        <div className="legend-item__visual">
          <div
            className="legend-item__color legend-item__color--circle"
            style={{ backgroundColor: config.color }}
          >
            <span className="legend-item__icon">{config.icon}</span>
          </div>
        </div>
        
        <div className="legend-item__content">
          <div className="legend-item__name">{config.name}</div>
          {showCounts && (
            <div className="legend-item__count">{count}</div>
          )}
          {showExamples && (
            <div className="legend-item__description">{config.description}</div>
          )}
        </div>
      </div>
    );
  };
  
  // Rendu d'un type de relation
  const renderRelationshipType = (typeData) => {
    const { type, config, count } = typeData;
    
    return (
      <div
        key={type}
        className="legend-item legend-item--relationship"
        onClick={() => handleRelationshipTypeClick(type, config)}
      >
        <div className="legend-item__visual">
          <div
            className="legend-item__color legend-item__color--line"
            style={{ backgroundColor: config.color }}
          />
        </div>
        
        <div className="legend-item__content">
          <div className="legend-item__name">{config.name}</div>
          {showCounts && (
            <div className="legend-item__count">{count}</div>
          )}
          {showExamples && (
            <div className="legend-item__description">{config.description}</div>
          )}
        </div>
      </div>
    );
  };
  
  // Rendu d'une catégorie d'entités
  const renderEntityCategory = (categoryKey, categoryData) => {
    const { category, types } = categoryData;
    
    return (
      <div key={categoryKey} className="legend-category">
        <div className="legend-category__header">
          <span className="legend-category__icon">{category.icon}</span>
          <span className="legend-category__name">{category.name}</span>
          <span className="legend-category__count">({types.length})</span>
        </div>
        
        <div className="legend-category__items">
          {types.map(renderEntityType)}
        </div>
      </div>
    );
  };
  
  // Rendu d'une catégorie de relations
  const renderRelationshipCategory = (categoryKey, categoryData) => {
    const { category, types } = categoryData;
    
    return (
      <div key={categoryKey} className="legend-category">
        <div className="legend-category__header">
          <span className="legend-category__icon">{category.icon}</span>
          <span className="legend-category__name">{category.name}</span>
          <span className="legend-category__count">({types.length})</span>
        </div>
        
        <div className="legend-category__items">
          {types.map(renderRelationshipType)}
        </div>
      </div>
    );
  };
  
  // Rendu des statistiques
  const renderStatistics = () => {
    if (!showStatistics) return null;
    
    return (
      <div className="legend-statistics">
        <div className="legend-statistics__title">Statistiques</div>
        <div className="legend-statistics__grid">
          <div className="legend-stat">
            <div className="legend-stat__value">{globalStats.totalNodes}</div>
            <div className="legend-stat__label">Nœuds</div>
          </div>
          
          <div className="legend-stat">
            <div className="legend-stat__value">{globalStats.totalLinks}</div>
            <div className="legend-stat__label">Liens</div>
          </div>
          
          <div className="legend-stat">
            <div className="legend-stat__value">{globalStats.entityTypes}</div>
            <div className="legend-stat__label">Types d'entités</div>
          </div>
          
          <div className="legend-stat">
            <div className="legend-stat__value">{globalStats.relationshipTypes}</div>
            <div className="legend-stat__label">Types de relations</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Rendu du codage par couleur
  const renderColorCoding = () => {
    if (!showColorCoding) return null;
    
    return (
      <div className="legend-color-coding">
        <div className="legend-color-coding__title">Codage couleur</div>
        <div className="legend-color-coding__items">
          <div className="legend-coding-item">
            <div className="legend-coding-item__visual">
              <div className="legend-coding-item__circle" style={{ backgroundColor: '#3b82f6' }} />
            </div>
            <div className="legend-coding-item__label">Nœud normal</div>
          </div>
          
          <div className="legend-coding-item">
            <div className="legend-coding-item__visual">
              <div className="legend-coding-item__circle legend-coding-item__circle--highlighted" style={{ backgroundColor: '#fbbf24' }} />
            </div>
            <div className="legend-coding-item__label">Nœud sélectionné</div>
          </div>
          
          <div className="legend-coding-item">
            <div className="legend-coding-item__visual">
              <div className="legend-coding-item__line" style={{ backgroundColor: '#6b7280' }} />
            </div>
            <div className="legend-coding-item__label">Relation normale</div>
          </div>
          
          <div className="legend-coding-item">
            <div className="legend-coding-item__visual">
              <div className="legend-coding-item__line legend-coding-item__line--thick" style={{ backgroundColor: '#ef4444' }} />
            </div>
            <div className="legend-coding-item__label">Relation forte</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Rendu du codage par taille
  const renderSizeCoding = () => {
    if (!showSizeCoding) return null;
    
    return (
      <div className="legend-size-coding">
        <div className="legend-size-coding__title">Codage taille</div>
        <div className="legend-size-coding__items">
          <div className="legend-coding-item">
            <div className="legend-coding-item__visual">
              <div className="legend-coding-item__circle legend-coding-item__circle--small" />
            </div>
            <div className="legend-coding-item__label">Peu de connexions</div>
          </div>
          
          <div className="legend-coding-item">
            <div className="legend-coding-item__visual">
              <div className="legend-coding-item__circle legend-coding-item__circle--medium" />
            </div>
            <div className="legend-coding-item__label">Connexions moyennes</div>
          </div>
          
          <div className="legend-coding-item">
            <div className="legend-coding-item__visual">
              <div className="legend-coding-item__circle legend-coding-item__circle--large" />
            </div>
            <div className="legend-coding-item__label">Nombreuses connexions</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Rendu des onglets
  const renderTabs = () => {
    const tabs = [];
    
    if (showEntityTypes && Object.keys(entityStats).length > 0) {
      tabs.push({
        key: 'entities',
        label: 'Entités',
        count: globalStats.entityTypes
      });
    }
    
    if (showRelationshipTypes && Object.keys(relationshipStats).length > 0) {
      tabs.push({
        key: 'relationships',
        label: 'Relations',
        count: globalStats.relationshipTypes
      });
    }
    
    if (showStatistics || showColorCoding || showSizeCoding) {
      tabs.push({
        key: 'info',
        label: 'Info',
        count: null
      });
    }
    
    if (tabs.length <= 1) return null;
    
    return (
      <div className="legend-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`legend-tab ${activeTab === tab.key ? 'legend-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="legend-tab__label">{tab.label}</span>
            {tab.count !== null && (
              <span className="legend-tab__count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  };
  
  // Rendu du contenu principal
  const renderContent = () => {
    if (isCollapsed) return null;
    
    switch (activeTab) {
      case 'entities':
        if (!showEntityTypes || Object.keys(entityStats).length === 0) {
          return (
            <div className="legend-empty">
              <div className="legend-empty__message">Aucune entité dans le graphe</div>
            </div>
          );
        }
        
        return (
          <div className="legend-content legend-content--entities">
            {Object.entries(entitiesByCategory)
              .sort(([, a], [, b]) => b.types.length - a.types.length)
              .map(([categoryKey, categoryData]) => 
                renderEntityCategory(categoryKey, categoryData)
              )}
          </div>
        );
      
      case 'relationships':
        if (!showRelationshipTypes || Object.keys(relationshipStats).length === 0) {
          return (
            <div className="legend-empty">
              <div className="legend-empty__message">Aucune relation dans le graphe</div>
            </div>
          );
        }
        
        return (
          <div className="legend-content legend-content--relationships">
            {Object.entries(relationshipsByCategory)
              .sort(([, a], [, b]) => b.types.length - a.types.length)
              .map(([categoryKey, categoryData]) => 
                renderRelationshipCategory(categoryKey, categoryData)
              )}
          </div>
        );
      
      case 'info':
        return (
          <div className="legend-content legend-content--info">
            {renderStatistics()}
            {renderColorCoding()}
            {renderSizeCoding()}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Rendu de la version réduite
  const renderCollapsedView = () => {
    if (!isCollapsed) return null;
    
    return (
      <div className="legend-collapsed">
        <div className="legend-collapsed__content">
          <div className="legend-collapsed__icon">📊</div>
          <div className="legend-collapsed__text">
            <div className="legend-collapsed__title">Légende</div>
            <div className="legend-collapsed__stats">
              {globalStats.totalNodes} nœuds • {globalStats.totalLinks} liens
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Ne pas afficher si aucune donnée
  if (nodes.length === 0 && links.length === 0) {
    return null;
  }
  
  return (
    <div className={getPositionClasses()} style={style}>
      {/* En-tête avec contrôles */}
      <div className="legend-header">
        {!isCollapsed && (
          <>
            <div className="legend-header__title">
              <span className="legend-header__icon">📊</span>
              <span className="legend-header__text">Légende du graphe</span>
            </div>
            
            <div className="legend-header__actions">
              {onToggleVisibility && (
                <Button
                  variant="ghost"
                  size="small"
                  onClick={onToggleVisibility}
                  title="Basculer la visibilité"
                  className="legend-action-btn"
                >
                  👁️
                </Button>
              )}
              
              {collapsible && (
                <Button
                  variant="ghost"
                  size="small"
                  onClick={toggleCollapsed}
                  title="Réduire la légende"
                  className="legend-action-btn"
                >
                  ➖
                </Button>
              )}
            </div>
          </>
        )}
        
        {isCollapsed && collapsible && (
          <Button
            variant="ghost"
            size="small"
            onClick={toggleCollapsed}
            title="Développer la légende"
            className="legend-expand-btn"
          >
            ➕
          </Button>
        )}
      </div>
      
      {/* Contenu */}
      <div className="legend-body">
        {renderCollapsedView()}
        
        {!isCollapsed && (
          <>
            {renderTabs()}
            
            <div className="legend-content-wrapper">
              {renderContent()}
            </div>
          </>
        )}
      </div>
      
      {/* Pied de page avec informations supplémentaires */}
      {!isCollapsed && !compactMode && (
        <div className="legend-footer">
          <div className="legend-footer__help">
            💡 Cliquez sur les éléments pour les filtrer
          </div>
        </div>
      )}
    </div>
  );
};

GraphLegend.displayName = 'GraphLegend';

export default GraphLegend;