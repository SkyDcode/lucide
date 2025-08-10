// frontend/src/modules/graph/components/GraphFilters.jsx - Filtres visuels pour le graphe
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Button from '../../../components/ui/Button/Button';
import './GraphFilters.css';

/**
 * Composant de filtres visuels pour le graphe
 * Permet de filtrer les nœuds et liens par différents critères
 */
const GraphFilters = ({
  // Données du graphe
  nodes = [],
  links = [],
  
  // État des filtres
  activeFilters = {},
  onFiltersChange,
  
  // Configuration
  showEntityTypes = true,
  showRelationshipTypes = true,
  showNodeMetrics = true,
  showLinkMetrics = true,
  showTimeFilters = false,
  
  // Options avancées
  collapsible = true,
  defaultCollapsed = false,
  position = 'left', // 'left', 'right', 'bottom'
  
  // Style
  className = '',
  style = {}
}) => {
  
  // État local
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [expandedSections, setExpandedSections] = useState({
    entityTypes: true,
    relationshipTypes: false,
    nodeMetrics: false,
    linkMetrics: false,
    timeFilters: false
  });

  // Calcul des options de filtres disponibles
  const filterOptions = useMemo(() => {
    const entityTypes = new Map();
    const relationshipTypes = new Map();
    const nodeMetrics = { degrees: [], centralities: [] };
    const linkMetrics = { strengths: new Set(), categories: new Set() };
    const timeRange = { min: null, max: null };

    // Analyser les nœuds
    nodes.forEach(node => {
      // Types d'entités
      const type = node.type || 'unknown';
      entityTypes.set(type, {
        key: type,
        label: node.type_config?.name || type,
        color: node.type_config?.color || '#9ca3af',
        icon: node.type_config?.icon || '❓',
        count: (entityTypes.get(type)?.count || 0) + 1
      });

      // Métriques des nœuds
      if (node.degree !== undefined) {
        nodeMetrics.degrees.push(node.degree);
      }
      if (node.betweennessCentrality !== undefined) {
        nodeMetrics.centralities.push(node.betweennessCentrality);
      }

      // Analyse temporelle
      if (node.created_at) {
        const date = new Date(node.created_at);
        if (!timeRange.min || date < timeRange.min) timeRange.min = date;
        if (!timeRange.max || date > timeRange.max) timeRange.max = date;
      }
    });

    // Analyser les liens
    links.forEach(link => {
      // Types de relations
      const type = link.type || 'connected';
      relationshipTypes.set(type, {
        key: type,
        label: link.config?.name || type,
        color: link.config?.color || '#6b7280',
        category: link.config?.category || 'generic',
        count: (relationshipTypes.get(type)?.count || 0) + 1
      });

      // Métriques des liens
      if (link.strength) {
        linkMetrics.strengths.add(link.strength);
      }
      if (link.category) {
        linkMetrics.categories.add(link.category);
      }
    });

    return {
      entityTypes: Array.from(entityTypes.values()).sort((a, b) => b.count - a.count),
      relationshipTypes: Array.from(relationshipTypes.values()).sort((a, b) => b.count - a.count),
      nodeMetrics: {
        degreeRange: nodeMetrics.degrees.length > 0 ? [
          Math.min(...nodeMetrics.degrees),
          Math.max(...nodeMetrics.degrees)
        ] : [0, 0],
        centralityRange: nodeMetrics.centralities.length > 0 ? [
          Math.min(...nodeMetrics.centralities),
          Math.max(...nodeMetrics.centralities)
        ] : [0, 1]
      },
      linkMetrics: {
        strengths: Array.from(linkMetrics.strengths),
        categories: Array.from(linkMetrics.categories)
      },
      timeRange
    };
  }, [nodes, links]);

  // Gestion des changements de filtres
  const handleFilterChange = useCallback((filterType, filterKey, value) => {
    const newFilters = { ...activeFilters };
    
    if (!newFilters[filterType]) {
      newFilters[filterType] = {};
    }

    if (filterType === 'entityTypes' || filterType === 'relationshipTypes') {
      // Filtres de type checkbox multiple
      if (!newFilters[filterType].selected) {
        newFilters[filterType].selected = new Set();
      }
      
      const selected = new Set(newFilters[filterType].selected);
      if (value) {
        selected.add(filterKey);
      } else {
        selected.delete(filterKey);
      }
      newFilters[filterType].selected = selected;
    } else {
      // Autres types de filtres
      newFilters[filterType][filterKey] = value;
    }

    onFiltersChange?.(newFilters);
  }, [activeFilters, onFiltersChange]);

  // Gestion de la sélection/désélection de tous les éléments
  const handleSelectAll = useCallback((filterType, selectAll = true) => {
    const newFilters = { ...activeFilters };
    
    if (!newFilters[filterType]) {
      newFilters[filterType] = {};
    }

    if (selectAll) {
      const allKeys = filterType === 'entityTypes' 
        ? filterOptions.entityTypes.map(t => t.key)
        : filterOptions.relationshipTypes.map(t => t.key);
      newFilters[filterType].selected = new Set(allKeys);
    } else {
      newFilters[filterType].selected = new Set();
    }

    onFiltersChange?.(newFilters);
  }, [activeFilters, onFiltersChange, filterOptions]);

  // Gestion de l'expansion/réduction des sections
  const toggleSection = useCallback((sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  // Réinitialiser tous les filtres
  const resetAllFilters = useCallback(() => {
    onFiltersChange?.({});
  }, [onFiltersChange]);

  // Compter les filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    Object.values(activeFilters).forEach(filterGroup => {
      if (filterGroup.selected && filterGroup.selected.size > 0) {
        count += filterGroup.selected.size;
      } else {
        count += Object.keys(filterGroup).length;
      }
    });
    return count;
  }, [activeFilters]);

  // Styles du conteneur
  const containerClasses = [
    'graph-filters',
    `graph-filters--${position}`,
    isCollapsed && 'graph-filters--collapsed',
    className
  ].filter(Boolean).join(' ');

  // Rendu d'une section de filtres
  const renderFilterSection = (sectionKey, title, content, showCondition = true) => {
    if (!showCondition) return null;

    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="filter-section">
        <div 
          className="filter-section__header"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="filter-section__title">{title}</span>
          <span className={`filter-section__toggle ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {isExpanded && (
          <div className="filter-section__content">
            {content}
          </div>
        )}
      </div>
    );
  };

  // Rendu des filtres de types d'entités
  const renderEntityTypesFilter = () => {
    const selectedTypes = activeFilters.entityTypes?.selected || new Set();
    const allSelected = selectedTypes.size === filterOptions.entityTypes.length;
    const noneSelected = selectedTypes.size === 0;

    return (
      <div className="entity-types-filter">
        <div className="filter-controls">
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleSelectAll('entityTypes', true)}
            disabled={allSelected}
          >
            Tout sélectionner
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleSelectAll('entityTypes', false)}
            disabled={noneSelected}
          >
            Tout désélectionner
          </Button>
        </div>
        
        <div className="entity-types-list">
          {filterOptions.entityTypes.map(entityType => {
            const isSelected = selectedTypes.has(entityType.key);
            
            return (
              <label
                key={entityType.key}
                className={`entity-type-item ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleFilterChange('entityTypes', entityType.key, e.target.checked)}
                />
                <div className="entity-type-info">
                  <div className="entity-type-visual">
                    <span 
                      className="entity-type-color"
                      style={{ backgroundColor: entityType.color }}
                    />
                    <span className="entity-type-icon">{entityType.icon}</span>
                  </div>
                  <div className="entity-type-text">
                    <span className="entity-type-label">{entityType.label}</span>
                    <span className="entity-type-count">({entityType.count})</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Rendu des filtres de types de relations
  const renderRelationshipTypesFilter = () => {
    const selectedTypes = activeFilters.relationshipTypes?.selected || new Set();
    const allSelected = selectedTypes.size === filterOptions.relationshipTypes.length;
    const noneSelected = selectedTypes.size === 0;

    return (
      <div className="relationship-types-filter">
        <div className="filter-controls">
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleSelectAll('relationshipTypes', true)}
            disabled={allSelected}
          >
            Tout sélectionner
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleSelectAll('relationshipTypes', false)}
            disabled={noneSelected}
          >
            Tout désélectionner
          </Button>
        </div>
        
        <div className="relationship-types-list">
          {filterOptions.relationshipTypes.map(relType => {
            const isSelected = selectedTypes.has(relType.key);
            
            return (
              <label
                key={relType.key}
                className={`relationship-type-item ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleFilterChange('relationshipTypes', relType.key, e.target.checked)}
                />
                <div className="relationship-type-info">
                  <div className="relationship-type-visual">
                    <span 
                      className="relationship-type-color"
                      style={{ backgroundColor: relType.color }}
                    />
                  </div>
                  <div className="relationship-type-text">
                    <span className="relationship-type-label">{relType.label}</span>
                    <span className="relationship-type-count">({relType.count})</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Rendu des filtres de métriques de nœuds
  const renderNodeMetricsFilter = () => {
    const [minDegree, maxDegree] = filterOptions.nodeMetrics.degreeRange;
    const currentMinDegree = activeFilters.nodeMetrics?.minDegree ?? minDegree;
    const currentMaxDegree = activeFilters.nodeMetrics?.maxDegree ?? maxDegree;

    return (
      <div className="node-metrics-filter">
        <div className="metric-range">
          <label className="metric-label">Degré de connexion</label>
          <div className="range-inputs">
            <input
              type="number"
              min={minDegree}
              max={maxDegree}
              value={currentMinDegree}
              onChange={(e) => handleFilterChange('nodeMetrics', 'minDegree', parseInt(e.target.value))}
              className="range-input"
              placeholder="Min"
            />
            <span className="range-separator">-</span>
            <input
              type="number"
              min={minDegree}
              max={maxDegree}
              value={currentMaxDegree}
              onChange={(e) => handleFilterChange('nodeMetrics', 'maxDegree', parseInt(e.target.value))}
              className="range-input"
              placeholder="Max"
            />
          </div>
          <div className="range-info">
            Plage: {minDegree} - {maxDegree}
          </div>
        </div>
      </div>
    );
  };

  // Rendu des filtres de métriques de liens
  const renderLinkMetricsFilter = () => {
    const selectedStrengths = activeFilters.linkMetrics?.strengths || new Set();

    return (
      <div className="link-metrics-filter">
        <div className="strength-filter">
          <label className="metric-label">Force des relations</label>
          <div className="strength-options">
            {['weak', 'medium', 'strong'].map(strength => {
              const isSelected = selectedStrengths.has(strength);
              const strengthLabels = {
                weak: 'Faible',
                medium: 'Moyenne', 
                strong: 'Forte'
              };
              
              return (
                <label key={strength} className={`strength-item ${isSelected ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const newStrengths = new Set(selectedStrengths);
                      if (e.target.checked) {
                        newStrengths.add(strength);
                      } else {
                        newStrengths.delete(strength);
                      }
                      handleFilterChange('linkMetrics', 'strengths', newStrengths);
                    }}
                  />
                  <span className="strength-label">{strengthLabels[strength]}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Rendu des filtres temporels
  const renderTimeFilters = () => {
    const { min: minDate, max: maxDate } = filterOptions.timeRange;
    if (!minDate || !maxDate) return <div className="no-time-data">Aucune donnée temporelle</div>;

    const currentStartDate = activeFilters.timeFilters?.startDate || minDate.toISOString().split('T')[0];
    const currentEndDate = activeFilters.timeFilters?.endDate || maxDate.toISOString().split('T')[0];

    return (
      <div className="time-filters">
        <div className="date-range">
          <label className="metric-label">Période</label>
          <div className="date-inputs">
            <input
              type="date"
              value={currentStartDate}
              min={minDate.toISOString().split('T')[0]}
              max={maxDate.toISOString().split('T')[0]}
              onChange={(e) => handleFilterChange('timeFilters', 'startDate', e.target.value)}
              className="date-input"
            />
            <span className="date-separator">à</span>
            <input
              type="date"
              value={currentEndDate}
              min={minDate.toISOString().split('T')[0]}
              max={maxDate.toISOString().split('T')[0]}
              onChange={(e) => handleFilterChange('timeFilters', 'endDate', e.target.value)}
              className="date-input"
            />
          </div>
        </div>
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className={containerClasses} style={style}>
        <div className="graph-filters__collapsed">
          <Button
            variant="ghost"
            size="small"
            icon="🔍"
            onClick={() => setIsCollapsed(false)}
            className="expand-button"
          >
            Filtres {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} style={style}>
      <div className="graph-filters__header">
        <div className="header-title">
          <span className="title-text">Filtres</span>
          {activeFiltersCount > 0 && (
            <span className="active-count">{activeFiltersCount}</span>
          )}
        </div>
        <div className="header-actions">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="small"
              onClick={resetAllFilters}
              className="reset-button"
            >
              Réinitialiser
            </Button>
          )}
          {collapsible && (
            <Button
              variant="ghost"
              size="small"
              icon="—"
              onClick={() => setIsCollapsed(true)}
              className="collapse-button"
            />
          )}
        </div>
      </div>

      <div className="graph-filters__content">
        {renderFilterSection(
          'entityTypes',
          'Types d\'entités',
          renderEntityTypesFilter(),
          showEntityTypes && filterOptions.entityTypes.length > 0
        )}

        {renderFilterSection(
          'relationshipTypes', 
          'Types de relations',
          renderRelationshipTypesFilter(),
          showRelationshipTypes && filterOptions.relationshipTypes.length > 0
        )}

        {renderFilterSection(
          'nodeMetrics',
          'Métriques des nœuds',
          renderNodeMetricsFilter(),
          showNodeMetrics && filterOptions.nodeMetrics.degreeRange[1] > 0
        )}

        {renderFilterSection(
          'linkMetrics',
          'Métriques des liens', 
          renderLinkMetricsFilter(),
          showLinkMetrics && filterOptions.linkMetrics.strengths.length > 0
        )}

        {renderFilterSection(
          'timeFilters',
          'Filtres temporels',
          renderTimeFilters(),
          showTimeFilters && filterOptions.timeRange.min && filterOptions.timeRange.max
        )}
      </div>
    </div>
  );
};

GraphFilters.displayName = 'GraphFilters';

export default GraphFilters;