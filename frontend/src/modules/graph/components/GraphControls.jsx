// frontend/src/modules/graph/components/GraphControls.jsx - Contrôles de navigation et layout
import React, { useState, useCallback } from 'react';

/**
 * Composant de contrôles pour la navigation et la manipulation du graphe
 * Fournit des boutons et options pour les layouts, simulation, export, etc.
 */
const GraphControls = ({
  // État du graphe
  isSimulationRunning = false,
  hasData = false,
  stats = { nodeCount: 0, linkCount: 0 },
  
  // Layout actuel
  currentLayout = 'force',
  layoutOptions = {},
  
  // Callbacks d'actions
  onLayoutChange,
  onSimulationToggle,
  onSimulationRestart,
  onFitView,
  onCenterSelected,
  onExportSVG,
  onExportPNG,
  onOptimizeLayout,
  onResetView,
  
  // Options d'affichage
  showLayoutControls = true,
  showSimulationControls = true,
  showViewControls = true,
  showExportControls = true,
  showAdvancedControls = false,
  
  // Style
  position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  orientation = 'vertical', // 'vertical', 'horizontal'
  size = 'medium', // 'small', 'medium', 'large'
  className = '',
  style = {}
}) => {
  
  // État local
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Layouts disponibles
  const layouts = [
    { id: 'force', name: 'Force dirigée', icon: '⚡', description: 'Layout physique par défaut' },
    { id: 'circular', name: 'Circulaire', icon: '⭕', description: 'Disposition en cercle' },
    { id: 'hierarchical', name: 'Hiérarchique', icon: '🌳', description: 'Niveaux par importance' },
    { id: 'grid', name: 'Grille', icon: '⚏', description: 'Disposition en grille' },
    { id: 'radial', name: 'Radial', icon: '🎯', description: 'Rayons concentriques' }
  ];

  // Tailles des contrôles
  const sizes = {
    small: { button: 32, icon: 14, gap: 4, padding: 8 },
    medium: { button: 40, icon: 16, gap: 6, padding: 12 },
    large: { button: 48, icon: 20, gap: 8, padding: 16 }
  };

  const sizeConfig = sizes[size];

  // Positions
  const positions = {
    'top-right': { top: '16px', right: '16px' },
    'top-left': { top: '16px', left: '16px' },
    'bottom-right': { bottom: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' }
  };

  // Gestionnaires d'événements
  const handleLayoutChange = useCallback((layoutId, options = {}) => {
    onLayoutChange?.(layoutId, { ...layoutOptions, ...options });
  }, [onLayoutChange, layoutOptions]);

  const handleSimulationToggle = useCallback(() => {
    onSimulationToggle?.(!isSimulationRunning);
  }, [onSimulationToggle, isSimulationRunning]);

  const handleExport = useCallback(async (type) => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      if (type === 'svg') {
        await onExportSVG?.();
      } else if (type === 'png') {
        await onExportPNG?.();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, onExportSVG, onExportPNG]);

  // Styles de base
  const containerStyle = {
    position: 'absolute',
    ...positions[position],
    display: 'flex',
    flexDirection: orientation === 'vertical' ? 'column' : 'row',
    gap: `${sizeConfig.gap}px`,
    zIndex: 1000,
    ...style
  };

  const buttonBaseStyle = {
    width: `${sizeConfig.button}px`,
    height: `${sizeConfig.button}px`,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${sizeConfig.icon}px`,
    transition: 'all 0.2s ease',
    position: 'relative'
  };

  const panelStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: `${sizeConfig.padding}px`,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    minWidth: orientation === 'vertical' ? '200px' : 'auto',
    maxWidth: '300px'
  };

  // Composant Bouton avec tooltip
  const ControlButton = ({ 
    icon, 
    label, 
    onClick, 
    disabled = false, 
    active = false,
    tooltip,
    children
  }) => (
    <button
      style={{
        ...buttonBaseStyle,
        backgroundColor: active 
          ? 'rgba(59, 130, 246, 0.9)' 
          : disabled 
            ? 'rgba(255, 255, 255, 0.5)'
            : 'rgba(255, 255, 255, 0.9)',
        color: active ? 'white' : disabled ? '#9ca3af' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setShowTooltip(tooltip)}
      onMouseLeave={() => setShowTooltip(null)}
      disabled={disabled}
      title={tooltip}
    >
      {children || icon}
      
      {/* Tooltip */}
      {showTooltip === tooltip && (
        <div style={{
          position: 'absolute',
          [position.includes('right') ? 'right' : 'left']: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '6px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          marginLeft: position.includes('right') ? '-8px' : '8px',
          marginRight: position.includes('left') ? '-8px' : '8px',
          zIndex: 1001
        }}>
          {tooltip}
        </div>
      )}
    </button>
  );

  return (
    <div className={`graph-controls ${className}`} style={containerStyle}>
      
      {/* Bouton principal d'expansion */}
      <ControlButton
        icon="⚙️"
        tooltip="Contrôles du graphe"
        onClick={() => setIsExpanded(!isExpanded)}
        active={isExpanded}
      />

      {/* Panel de contrôles */}
      {isExpanded && (
        <div style={panelStyle}>
          
          {/* Statistiques */}
          {hasData && (
            <div style={{ 
              marginBottom: '16px', 
              fontSize: '12px', 
              color: '#6b7280',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '12px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Réseau</div>
              <div>Nœuds: {stats.nodeCount}</div>
              <div>Liens: {stats.linkCount}</div>
              {stats.density && (
                <div>Densité: {(stats.density * 100).toFixed(1)}%</div>
              )}
            </div>
          )}

          {/* Contrôles de layout */}
          {showLayoutControls && hasData && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Layout
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '4px' 
              }}>
                {layouts.map(layout => (
                  <button
                    key={layout.id}
                    style={{
                      padding: '8px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: currentLayout === layout.id 
                        ? '#3b82f6' 
                        : '#f3f4f6',
                      color: currentLayout === layout.id ? 'white' : '#374151',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleLayoutChange(layout.id)}
                    title={layout.description}
                  >
                    <span>{layout.icon}</span>
                    <span>{layout.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contrôles de simulation */}
          {showSimulationControls && hasData && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Simulation
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isSimulationRunning ? '#ef4444' : '#10b981',
                    color: 'white',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onClick={handleSimulationToggle}
                >
                  {isSimulationRunning ? '⏸️ Pause' : '▶️ Jouer'}
                </button>
                <button
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onClick={onSimulationRestart}
                  title="Redémarrer la simulation"
                >
                  🔄
                </button>
              </div>
            </div>
          )}

          {/* Contrôles de vue */}
          {showViewControls && hasData && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Navigation
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onClick={onFitView}
                >
                  🔍 Ajuster
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onClick={onCenterSelected}
                >
                  🎯 Centrer
                </button>
              </div>
            </div>
          )}

          {/* Contrôles d'export */}
          {showExportControls && hasData && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Export
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#14b8a6',
                    color: 'white',
                    fontSize: '11px',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isExporting ? 0.6 : 1
                  }}
                  onClick={() => handleExport('svg')}
                  disabled={isExporting}
                >
                  📄 SVG
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#f472b6',
                    color: 'white',
                    fontSize: '11px',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isExporting ? 0.6 : 1
                  }}
                  onClick={() => handleExport('png')}
                  disabled={isExporting}
                >
                  🖼️ PNG
                </button>
              </div>
            </div>
          )}

          {/* Contrôles avancés */}
          {showAdvancedControls && hasData && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Avancé
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  style={{
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onClick={onOptimizeLayout}
                >
                  ⚡ Optimiser
                </button>
                <button
                  style={{
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onClick={onResetView}
                >
                  🔄 Reset
                </button>
              </div>
            </div>
          )}

          {/* Indicateur d'export */}
          {isExporting && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              zIndex: 1002
            }}>
              Export en cours...
            </div>
          )}
        </div>
      )}

      {/* Contrôles rapides (toujours visibles) */}
      {!isExpanded && hasData && (
        <>
          {/* Simulation toggle */}
          {showSimulationControls && (
            <ControlButton
              icon={isSimulationRunning ? "⏸️" : "▶️"}
              tooltip={isSimulationRunning ? "Pause simulation" : "Démarrer simulation"}
              onClick={handleSimulationToggle}
              active={isSimulationRunning}
            />
          )}

          {/* Fit view */}
          {showViewControls && (
            <ControlButton
              icon="🔍"
              tooltip="Ajuster la vue"
              onClick={onFitView}
            />
          )}
        </>
      )}

      {/* Styles CSS */}
      <style jsx>{`
        .graph-controls button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .graph-controls button:active {
          transform: translateY(0);
        }
        
        .graph-controls button:disabled {
          transform: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Animation d'apparition du panel */
        .graph-controls > div:nth-child(2) {
          animation: slideIn 0.2s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .graph-controls {
            font-size: 12px !important;
          }
          
          .graph-controls button {
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  );
};

GraphControls.displayName = 'GraphControls';

export default GraphControls;