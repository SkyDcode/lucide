// frontend/src/modules/graph/hooks/useGraphInteraction.js
import { useCallback, useMemo, useRef, useState } from 'react';

function buildAdjacency(links) {
  const adj = new Map();
  for (const e of links) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source).add(e.target);
    adj.get(e.target).add(e.source);
  }
  return adj;
}

export default function useGraphInteraction(graph) {
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [satVisible, setSatVisible] = useState(false);

  const overlayRef = useRef(null); // groupe D3 pour satellites
  const d3ApiRef = useRef(null);

  const nodesById = useMemo(() => new Map(graph.nodes.map(n => [n.id, n])), [graph.nodes]);
  const adjacency = useMemo(() => buildAdjacency(graph.links), [graph.links]);

  const neighborsOf = useCallback((id) => adjacency.get(id) || new Set(), [adjacency]);

  const activeContext = useMemo(() => {
    // Priorité à la sélection ; sinon survol
    const focus = selectedId ?? hoveredId;
    const nodeSet = new Set();
    const linkSet = new Set();

    if (focus != null) {
      nodeSet.add(focus);
      const neigh = neighborsOf(focus);
      for (const n of neigh) nodeSet.add(n);
      for (const e of graph.links) {
        const touchesFocus =
          (e.source === focus && nodeSet.has(e.target)) ||
          (e.target === focus && nodeSet.has(e.source));
        if (touchesFocus) {
          linkSet.add(e.id ?? `${e.source}-${e.target}-${e.type ?? ''}`);
        }
      }
    }
    return { focus, nodeSet, linkSet };
  }, [selectedId, hoveredId, neighborsOf, graph.links]);

  const isActiveNode = useCallback(
    (id) => (activeContext.nodeSet.size ? activeContext.nodeSet.has(id) : true),
    [activeContext]
  );

  const isActiveLink = useCallback(
    (e) => {
      if (!activeContext.nodeSet.size) return true;
      const id = e.id ?? `${e.source}-${e.target}-${e.type ?? ''}`;
      return activeContext.linkSet.has(id);
    },
    [activeContext]
  );

  const onClickNode = useCallback((node) => {
    setSelectedId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onHoverNode = useCallback((node) => {
    setHoveredId(node?.id ?? null);
  }, []);

  const clearHover = useCallback(() => setHoveredId(null), []);

  const centerSelected = useCallback(() => {
    const api = d3ApiRef.current;
    if (!api || selectedId == null) return;
    const n = nodesById.get(selectedId);
    if (!n) return;
    api.fitView([n], 200);
  }, [selectedId, nodesById]);

  // Satellites: crée des nœuds virtuels autour du nœud sélectionné (attributs primitifs de data)
  const renderSatellites = useCallback(() => {
    const api = d3ApiRef.current;
    if (!api) return;

    if (!satVisible || selectedId == null) {
      // cleanup
      api.gRoot.select('g.overlay-sat').remove();
      overlayRef.current = null;
      return;
    }

    const center = nodesById.get(selectedId);
    if (!center) return;

    let g = overlayRef.current;
    if (!g) {
      g = api.gRoot.append('g').attr('class', 'overlay-sat');
      overlayRef.current = g;
    }
    g.selectAll('*').remove();

    const data = center.data || {};
    const entries = Object.entries(data)
      .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
      .slice(0, 12);

    const R = 90; // rayon des satellites
    const cx = center.x || 0;
    const cy = center.y || 0;

    entries.forEach(([k, v], i) => {
      const angle = (i / Math.max(1, entries.length)) * Math.PI * 2;
      const x = cx + R * Math.cos(angle);
      const y = cy + R * Math.sin(angle);

      // lien
      g.append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);

      // nœud
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 5)
        .attr('fill', '#94a3b8')
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1);

      // label
      g.append('text')
        .attr('x', x)
        .attr('y', y - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', '#e5e7eb')
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 0.25)
        .text(`${k}: ${String(v)}`);
    });
  }, [satVisible, selectedId, nodesById]);

  const attachD3Api = useCallback((api) => {
    d3ApiRef.current = api;
  }, []);

  const toggleSatellites = useCallback(() => setSatVisible((v) => !v), []);

  return {
    // state
    selectedId,
    hoveredId,
    satVisible,
    selected: selectedId != null ? nodesById.get(selectedId) : null,

    // derived sets for styling
    isActiveNode,
    isActiveLink,

    // actions
    onClickNode,
    onHoverNode,
    clearHover,
    setSelectedId,
    centerSelected,
    toggleSatellites,
    attachD3Api,
    renderSatellites,
  };
}
