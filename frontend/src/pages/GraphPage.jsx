// frontend/src/pages/GraphPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/ui/Button/Button';
import { useAppStore } from '../shared/store/appStore';
import { useNotifications } from '../shared/hooks/useNotifications';
import { useNavigation } from '../shared/hooks/useNavigation';
import NetworkGraph from '../modules/graph/components/NetworkGraph';
import GraphControls from '../modules/graph/components/GraphControls';
import GraphFilters from '../modules/graph/components/GraphFilters';

export default function GraphPage() {
  const { folderId: folderIdStr } = useParams();
  const folderId = Number(folderIdStr);
  const { setCurrentFolderId } = useAppStore();
  const { notify } = useNotifications();
  const { goToEntities, goToFolders } = useNavigation();

  // États du graphe
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ nodeCount: 0, linkCount: 0, density: 0 });

  // États des contrôles
  const [currentLayout, setCurrentLayout] = useState('force');
  const [layoutOptions, setLayoutOptions] = useState({});
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [filters, setFilters] = useState({
    types: [],
    showIsolated: true,
    minConnections: 0
  });

  // État d'affichage
  const [showFilters, setShowFilters] = useState(false);
  const [graphInstance, setGraphInstance] = useState(null);

  // Vérifier que le folderId est valide
  useEffect(() => {
    if (!folderId || isNaN(folderId)) {
      notify({ type: 'error', message: 'ID de dossier invalide' });
      goToFolders();
      return;
    }
    setCurrentFolderId(folderId);
  }, [folderId, setCurrentFolderId, notify, goToFolders]);

  // Charger les données du graphe
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/relationships/graph?folderId=${folderId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Traiter les données
      const nodes = data.nodes || [];
      const links = data.links || [];
      
      // Calculer les statistiques
      const nodeCount = nodes.length;
      const linkCount = links.length;
      const density = nodeCount > 1 ? (linkCount * 2) / (nodeCount * (nodeCount - 1)) : 0;
      
      setGraphData({ nodes, links });
      setStats({ nodeCount, linkCount, density });
      
      if (nodeCount === 0) {
        notify({ 
          type: 'info', 
          message: 'Aucune entité avec des relations trouvée dans ce dossier' 
        });
      }
      
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(err);
      notify({ 
        type: 'error', 
        message: `Erreur chargement graphe: ${err.message || 'Erreur inconnue'}` 
      });
    } finally {
      setLoading(false);
    }
  }, [folderId, notify]);

  // Charger les données au montage
  useEffect(() => {
    if (folderId) {
      fetchGraphData();
    }
  }, [folderId, fetchGraphData]);

  // Gestionnaires des contrôles
  const handleLayoutChange = useCallback((layoutId, options = {}) => {
    setCurrentLayout(layoutId);
    setLayoutOptions({ ...layoutOptions, ...options });
    
    // Appliquer le layout au graphe si l'instance est disponible
    if (graphInstance) {
      graphInstance.applyLayout(layoutId, options);
    }
  }, [layoutOptions, graphInstance]);

  const handleSimulationToggle = useCallback((running) => {
    setSimulationRunning(running);
    
    if (graphInstance) {
      if (running) {
        graphInstance.playSimulation();
      } else {
        graphInstance.pauseSimulation();
      }
    }
  }, [graphInstance]);

  const handleSimulationRestart = useCallback(() => {
    if (graphInstance) {
      graphInstance.restartSimulation();
    }
    setSimulationRunning(true);
  }, [graphInstance]);

  const handleFitView = useCallback(() => {
    if (graphInstance) {
      graphInstance.fitView();
    }
  }, [graphInstance]);

  const handleCenterSelected = useCallback(() => {
    if (graphInstance && selectedNodeId) {
      graphInstance.centerOnNodes([selectedNodeId]);
    }
  }, [graphInstance, selectedNodeId]);

  const handleExportSVG = useCallback(async () => {
    if (graphInstance) {
      try {
        const svg = await graphInstance.exportSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graphe-dossier-${folderId}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        notify({ type: 'success', message: 'Graphe exporté en SVG' });
      } catch (err) {
        notify({ type: 'error', message: 'Erreur lors de l\'export SVG' });
      }
    }
  }, [graphInstance, folderId, notify]);

  const handleExportPNG = useCallback(async () => {
    if (graphInstance) {
      try {
        await graphInstance.exportPNG((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `graphe-dossier-${folderId}.png`;
          a.click();
          URL.revokeObjectURL(url);
          notify({ type: 'success', message: 'Graphe exporté en PNG' });
        });
      } catch (err) {
        notify({ type: 'error', message: 'Erreur lors de l\'export PNG' });
      }
    }
  }, [graphInstance, folderId, notify]);

  const handleOptimizeLayout = useCallback(() => {
    if (graphInstance) {
      // Optimisation automatique du layout
      const nodeCount = graphData.nodes.length;
      let optimalLayout = 'force';
      
      if (nodeCount > 100) {
        optimalLayout = 'grid';
      } else if (nodeCount > 50) {
        optimalLayout = 'hierarchical';
      } else if (nodeCount < 10) {
        optimalLayout = 'circular';
      }
      
      handleLayoutChange(optimalLayout);
      notify({ type: 'info', message: `Layout optimisé: ${optimalLayout}` });
    }
  }, [graphInstance, graphData.nodes.length, handleLayoutChange, notify]);

  const handleResetView = useCallback(() => {
    if (graphInstance) {
      graphInstance.restartSimulation();
      handleLayoutChange('force', {});
      setSelectedNodeId(null);
      setFilters({ types: [], showIsolated: true, minConnections: 0 });
      notify({ type: 'info', message: 'Vue réinitialisée' });
    }
  }, [graphInstance, handleLayoutChange, notify]);

  // Gestionnaires du graphe
  const handleNodeClick = useCallback((node, event) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleNodeDoubleClick = useCallback((node, event) => {
    // Naviguer vers les entités pour éditer cette entité
    goToEntities(folderId);
  }, [goToEntities, folderId]);

  const handleSelectionChange = useCallback((nodeId, node) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleLayoutChangeGraph = useCallback((layoutType, options) => {
    setCurrentLayout(layoutType);
    setLayoutOptions(options);
  }, []);

  const handleSimulationStateChange = useCallback((running) => {
    setSimulationRunning(running);
  }, []);

  // Gestionnaire des filtres
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    
    if (graphInstance && newFilters.types) {
      graphInstance.filterByTypes(newFilters.types);
    }
  }, [graphInstance]);

  const hasData = graphData.nodes.length > 0;

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <button
              onClick={goToFolders}
              className="hover:text-blue-600 transition-colors"
            >
              Dossiers
            </button>
            <span>›</span>
            <span>Dossier #{folderId}</span>
            <span>›</span>
            <span className="font-medium text-gray-900">Graphique</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Graphique des relations</h1>
          <p className="text-gray-600 mt-1">
            Visualisez les connexions entre les entités de votre enquête
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => goToEntities(folderId)}
            icon="👥"
          >
            Voir les entités
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            icon="🔍"
            active={showFilters}
          >
            {showFilters ? 'Masquer filtres' : 'Filtres'}
          </Button>
          <Button
            variant="secondary"
            onClick={fetchGraphData}
            disabled={loading}
            icon={loading ? "⟳" : "↻"}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {hasData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.nodeCount}</div>
              <div className="text-sm text-gray-600">Entités</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.linkCount}</div>
              <div className="text-sm text-gray-600">Relations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(stats.density * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Densité</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{currentLayout}</div>
              <div className="text-sm text-gray-600">Layout actuel</div>
            </div>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-lg mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Erreur de chargement</h3>
              <p className="text-red-600 text-sm mt-1">
                {error.message || 'Impossible de charger le graphe'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={fetchGraphData}
              className="ml-auto"
            >
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="grid grid-cols-12 gap-6">
        {/* Graphique principal */}
        <div className={`${showFilters ? 'col-span-9' : 'col-span-12'} transition-all duration-300`}>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
            <div className="relative h-full">
              <NetworkGraph
                mode="folder"
                folderId={folderId}
                width="100%"
                height="100%"
                config={{
                  background: '#f8fafc',
                  nodes: {
                    radius: { min: 8, max: 30, default: 12 }
                  }
                }}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onSelectionChange={handleSelectionChange}
                onLayoutChange={handleLayoutChangeGraph}
                onSimulationStateChange={handleSimulationStateChange}
                selectedNodeId={selectedNodeId}
                layoutType={currentLayout}
                layoutOptions={layoutOptions}
                simulationRunning={simulationRunning}
                filters={filters}
                showSatellites={true}
                autoFit={true}
              />
              
              {/* Contrôles superposés */}
              <GraphControls
                isSimulationRunning={simulationRunning}
                hasData={hasData}
                stats={stats}
                currentLayout={currentLayout}
                layoutOptions={layoutOptions}
                onLayoutChange={handleLayoutChange}
                onSimulationToggle={handleSimulationToggle}
                onSimulationRestart={handleSimulationRestart}
                onFitView={handleFitView}
                onCenterSelected={handleCenterSelected}
                onExportSVG={handleExportSVG}
                onExportPNG={handleExportPNG}
                onOptimizeLayout={handleOptimizeLayout}
                onResetView={handleResetView}
                position="top-right"
                size="medium"
                showAdvancedControls={hasData}
              />
            </div>
          </div>
        </div>

        {/* Panel de filtres */}
        {showFilters && (
          <div className="col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-fit">
              <GraphFilters
                graphData={graphData}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                position="inline"
                showHeader={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* État vide */}
      {!loading && !error && !hasData && (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🕸️</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Aucune relation à afficher
            </h3>
            <p className="text-gray-600 mb-6">
              Ce dossier ne contient aucune entité avec des relations.
              <br />
              Ajoutez des entités et créez des relations pour voir le graphique.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => goToEntities(folderId)}
                icon="👥"
              >
                Aller aux entités
              </Button>
              <Button
                variant="secondary"
                onClick={fetchGraphData}
                icon="↻"
              >
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* État de chargement */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Chargement du graphique...
            </h3>
            <p className="text-gray-600">
              Analyse des relations entre les entités
            </p>
          </div>
        </div>
      )}
    </div>
  );
}