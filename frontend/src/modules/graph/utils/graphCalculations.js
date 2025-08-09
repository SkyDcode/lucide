// frontend/src/modules/graph/utils/graphCalculations.js
// Fonctions pures pour calculer des métriques, tailles, clés, etc.

export function edgeKey(e) {
  return e.id ?? `${e.source}-${e.target}-${e.type ?? ''}`;
}

export function computeDegrees(nodes, links) {
  const deg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of links) {
    if (deg.has(e.source?.id ?? e.source)) deg.set(e.source?.id ?? e.source, deg.get(e.source?.id ?? e.source) + 1);
    if (deg.has(e.target?.id ?? e.target)) deg.set(e.target?.id ?? e.target, deg.get(e.target?.id ?? e.target) + 1);
  }
  return deg;
}

export function nodeSizeByDegree(deg, { min = 6, max = 18 } = {}) {
  const vals = Array.from(deg.values());
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 1);
  const span = Math.max(1, hi - lo);
  return (nodeId) => {
    const d = deg.get(nodeId) ?? 0;
    return min + ((d - lo) / span) * (max - min);
  };
}

export function normalizeGraph(rawNodes, rawLinks) {
  // Assure que links utilisent des IDs (pas d'objets) et que nodes ont des coords
  const idSet = new Set(rawNodes.map((n) => n.id));
  const nodes = rawNodes.map((n) => ({ ...n, x: Number.isFinite(n.x) ? n.x : Math.random() * 100, y: Number.isFinite(n.y) ? n.y : Math.random() * 100 }));
  const links = rawLinks
    .filter((e) => idSet.has(e.source) && idSet.has(e.target))
    .map((e) => ({ id: e.id ?? `${e.source}-${e.target}-${e.type ?? ''}`, source: e.source, target: e.target, type: e.type, data: e.data }));
  return { nodes, links };
}

export function buildAdjacency(links) {
  const adj = new Map();
  for (const e of links) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source).add(e.target);
    adj.get(e.target).add(e.source);
  }
  return adj;
}

export function topHubs(degrees, k = 10) {
  return Array.from(degrees.entries())
    .map(([id, d]) => ({ id, degree: d }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, k);
}