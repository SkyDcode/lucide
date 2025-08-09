// frontend/src/modules/graph/hooks/useGraph.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../shared/services/api';
import { normalizeGraph, computeDegrees, nodeSizeByDegree } from '../utils/graphCalculations';
import { createSimulation, updateSimulation, stopSimulation } from '../algorithms/forceLayout';

/**
 * Charge un graphe depuis l'API backend et prépare la simulation D3.
 * @param {{ mode:'folder'|'entity', folderId?:number, entityId?:number, depth?:number, types?:string[]|string, includeIsolated?:boolean }} params
 */
export default function useGraph(params) {
  const [raw, setRaw] = useState({ nodes: [], edges: [], stats: null });
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const simRef = useRef(null);

  const typesParam = useMemo(() => {
    const t = params?.types;
    if (!t) return undefined;
    if (Array.isArray(t)) return t.join(',');
    return String(t);
  }, [params?.types]);

  const fetchGraph = useCallback(async () => {
    if (!params) return;
    setLoading(true); setError(null);
    try {
      let url = '';
      const q = new URLSearchParams();
      if (typesParam) q.set('types', typesParam);
      if (params.includeIsolated === false) q.set('include_isolated', 'false');
      if (params.mode === 'folder') {
        url = `/relationships/graph/folder/${params.folderId}?${q.toString()}`;
      } else {
        if (params.depth) q.set('depth', String(params.depth));
        url = `/relationships/graph/entity/${params.entityId}?${q.toString()}`;
      }
      const resp = await api.get(url);
      const d = resp?.data?.data ?? resp?.data ?? { nodes: [], edges: [] };
      setRaw({ nodes: d.nodes ?? [], edges: d.edges ?? [], stats: d.stats ?? null });
    } catch (e) {
      setError(e);
    } finally { setLoading(false); }
  }, [params, typesParam]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  // Normalisation et (re)lancement simulation
  useEffect(() => {
    const { nodes, links } = normalizeGraph(raw.nodes, raw.edges);
    setGraph({ nodes, links });
    // (Re)lancer la simulation
    if (simRef.current) stopSimulation(simRef.current);
    simRef.current = createSimulation(nodes, links, { onTick: () => setGraph({ nodes: [...nodes], links: [...links] }) });
    // cleanup
    return () => stopSimulation(simRef.current);
  }, [raw]);

  const degrees = useMemo(() => computeDegrees(graph.nodes, graph.links), [graph]);
  const sizeFn = useMemo(() => nodeSizeByDegree(degrees, { min: 6, max: 20 }), [degrees]);

  const setForces = useCallback((opts) => {
    if (!simRef.current) return;
    // Simple reconfiguration: on redémarre en douceur
    updateSimulation(simRef.current, { nodes: graph.nodes, links: graph.links });
    if (typeof opts?.alpha === 'number') simRef.current.alpha(opts.alpha);
    simRef.current.restart();
  }, [graph]);

  return { raw, graph, loading, error, degrees, sizeFn, refetch: fetchGraph, setForces };
}