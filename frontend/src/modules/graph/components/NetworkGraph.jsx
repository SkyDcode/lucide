// frontend/src/modules/graph/components/NetworkGraph.jsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import GraphCanvas from './GraphCanvas';
import useGraph from '../hooks/useGraph';
import { nodeColor } from '../utils/nodeHelpers';
import { createSimulation } from '../algorithms/forceLayout';
import useGraphInteraction from '../hooks/useGraphInteraction';
import NodeDetails from './NodeDetails';
import GraphLegend from './GraphLegend';

export default function NetworkGraph({
  mode = 'folder',
  folderId,
  entityId,
  depth = 1,
  types,
  includeIsolated = true,
}) {
  const { raw, graph, loading, error, sizeFn, refetch, degrees } = useGraph({ mode, folderId, entityId, depth, types, includeIsolated });
  const d3ApiRef = useRef(null);
  const simRef = useRef(null);

  const {
    selected, selectedId, isActiveNode, isActiveLink,
    onClickNode, onHoverNode, clearHover,
    centerSelected, toggleSatellites, satVisible,
    attachD3Api, renderSatellites,
  } = useGraphInteraction(graph);

  const onReady = useCallback((api) => { d3ApiRef.current = api; attachD3Api(api); }, [attachD3Api]);

  const typeColors = useMemo(() => ({
    person: '#f97316',
    place: '#22c55e',
    organization: '#06b6d4',
    website: '#a855f7',
  }), []);

  // (Re)rendu lorsque le graph change
  React.useEffect(() => {
    const api = d3ApiRef.current; if (!api) return;
    const { nodes, links } = graph; if (!nodes.length) { api.gRoot.select('g.overlay-sat').remove(); return; }

    const nodesById = new Map(nodes.map(n => [n.id, n]));
    const linksBound = links.map(l => ({ ...l, source: nodesById.get(l.source), target: nodesById.get(l.target) }));

    if (simRef.current) simRef.current.stop();
    simRef.current = createSimulation(nodes, linksBound, {
      onTick: () => {
        const linkSel = api.renderLinks(linksBound);
        linkSel.attr('opacity', (d) => isActiveLink(d) ? 0.95 : 0.15);

        const nodeSel = api.renderNodes(nodes, {
          r: (d) => sizeFn(d.id) + (selectedId === d.id ? 4 : 0),
          fill: (d) => nodeColor(d, typeColors),
          onClick: onClickNode,
          onHover: onHoverNode,
        });
        nodeSel.attr('opacity', (d) => isActiveNode(d.id) ? 1 : 0.25)
               .on('mouseleave', clearHover);

        api.renderLabels(nodes, { text: (d) => d.name ?? d.id });
        // Satellites overlay (si actif)
        renderSatellites();
      }
    });

    // Fit initial
    api.fitView(nodes);

    return () => { simRef.current?.stop?.(); };
  }, [graph, sizeFn, selectedId, isActiveLink, isActiveNode, onClickNode, onHoverNode, clearHover, renderSatellites, typeColors]);

  const handleFit = () => { d3ApiRef.current?.fitView?.(graph.nodes); };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-400">
          {loading ? 'Chargement du graphe…' : error ? `Erreur: ${String(error.message || error)}` : `${graph.nodes.length} nœuds • ${graph.links.length} liens`}
        </div>
        <div className="flex gap-2">
          <button onClick={handleFit} className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200">Ajuster</button>
          <button onClick={refetch} className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200">Rafraîchir</button>
        </div>
      </div>

      <GraphCanvas onReady={onReady} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <GraphLegend nodes={graph.nodes} />
        </div>
        <div className="md:col-span-1">
          <NodeDetails
            node={selected}
            degree={selected ? (degrees.get(selected.id) || 0) : 0}
            onCenter={centerSelected}
            onClose={() => undefined}
            onToggleSatellites={toggleSatellites}
            satVisible={satVisible}
          />
        </div>
      </div>
    </div>
  );
}