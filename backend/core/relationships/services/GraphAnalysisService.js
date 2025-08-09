// backend/core/relationships/services/GraphAnalysisService.js
const db = require('../../../shared/utils/database');

function parseJSON(val) {
  if (!val) return null;
  try { return JSON.parse(val); } catch (_) { return null; }
}

function normalizeTypesParam(types) {
  if (!types) return null;
  if (Array.isArray(types)) return types.map(String).map((s) => s.trim()).filter(Boolean);
  return String(types).split(',').map((s) => s.trim()).filter(Boolean);
}

function buildInClause(values, prefix) {
  const ids = Array.from(new Set(values.map(Number).filter((n) => Number.isFinite(n))));
  const placeholders = ids.map((_, i) => `:${prefix}${i}`).join(',');
  const params = {};
  ids.forEach((v, i) => { params[`${prefix}${i}`] = v; });
  return { sql: placeholders || 'NULL', params, ids };
}

function computeDegrees(nodes, edges) {
  const deg = new Map();
  for (const n of nodes) deg.set(n.id, 0);
  for (const e of edges) {
    if (deg.has(e.source)) deg.set(e.source, deg.get(e.source) + 1);
    if (deg.has(e.target)) deg.set(e.target, deg.get(e.target) + 1);
  }
  return deg;
}

function computeStats(nodes, edges) {
  const degrees = computeDegrees(nodes, edges);
  const list = nodes.map((n) => ({ id: n.id, name: n.name, degree: degrees.get(n.id) || 0, type: n.type }));
  list.sort((a, b) => b.degree - a.degree);

  const edgeTypeCounts = edges.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    topHubs: list.slice(0, 10),
    edgeTypeCounts,
  };
}

async function fetchEntitiesByFolder(folderId) {
  const rows = await db.query(
    `SELECT id, name, type, x, y, data, created_at, updated_at FROM entities WHERE folder_id = :folderId`,
    { folderId: Number(folderId) }
  );
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, x: r.x ?? null, y: r.y ?? null, data: parseJSON(r.data) }));
}

async function fetchEntitiesByIds(ids) {
  if (!ids.length) return [];
  const { sql, params } = buildInClause(ids, 'e');
  const rows = await db.query(
    `SELECT id, name, type, x, y, data, created_at, updated_at FROM entities WHERE id IN (${sql})`,
    params
  );
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, x: r.x ?? null, y: r.y ?? null, data: parseJSON(r.data) }));
}

async function fetchEdgesForNodeSet(nodeIds, { types = null } = {}) {
  if (!nodeIds.length) return [];
  const inNodes = buildInClause(nodeIds, 'n');
  let where = `from_entity IN (${inNodes.sql}) AND to_entity IN (${inNodes.sql})`;
  const params = { ...inNodes.params, ...Object.fromEntries(Object.entries(inNodes.params).map(([k, v]) => [`_${k}`, v])) };
  // Remap second IN with distinct keys (SQLite named params must be unique)
  where = where.replace(`(${inNodes.sql}) AND to_entity IN (${inNodes.sql})`, `(${inNodes.sql}) AND to_entity IN (${Object.keys(inNodes.params).map((k) => `:_${k}`).join(',')})`);

  if (types && types.length) {
    const tIn = buildInClause(types, 't');
    where += ` AND type IN (${tIn.sql})`;
    Object.assign(params, tIn.params);
  }

  const rows = await db.query(
    `SELECT id, from_entity, to_entity, type, data, created_at FROM relationships WHERE ${where}`,
    params
  );
  return rows.map((r) => ({ id: r.id, source: r.from_entity, target: r.to_entity, type: r.type, data: parseJSON(r.data), created_at: r.created_at }));
}

async function fetchEdgesTouching(nodeIds, { types = null } = {}) {
  if (!nodeIds.length) return [];
  const inNodes = buildInClause(nodeIds, 'n');
  let where = `(from_entity IN (${inNodes.sql}) OR to_entity IN (${inNodes.sql}))`;
  const params = { ...inNodes.params };
  if (types && types.length) {
    const tIn = buildInClause(types, 't');
    where += ` AND type IN (${tIn.sql})`;
    Object.assign(params, tIn.params);
  }
  const rows = await db.query(
    `SELECT id, from_entity, to_entity, type, data, created_at FROM relationships WHERE ${where}`,
    params
  );
  return rows.map((r) => ({ id: r.id, source: r.from_entity, target: r.to_entity, type: r.type, data: parseJSON(r.data), created_at: r.created_at }));
}

function filterIsolated(nodes, edges) {
  const connected = new Set();
  for (const e of edges) { connected.add(e.source); connected.add(e.target); }
  return nodes.filter((n) => connected.has(n.id));
}

async function getGraphByFolder(folderId, { types = null, includeIsolated = true } = {}) {
  const t = normalizeTypesParam(types);
  const nodes = await fetchEntitiesByFolder(folderId);
  const nodeIds = nodes.map((n) => n.id);
  const edges = await fetchEdgesForNodeSet(nodeIds, { types: t });
  const finalNodes = includeIsolated ? nodes : filterIsolated(nodes, edges);
  const stats = computeStats(finalNodes, edges);
  return { nodes: finalNodes, edges, stats };
}

async function getNeighborhood(entityId, { depth = 1, types = null, limitNodes = 1000 } = {}) {
  const t = normalizeTypesParam(types);
  const startId = Number(entityId);
  let frontier = new Set([startId]);
  const visited = new Set([startId]);
  let allEdges = [];

  for (let d = 0; d < Math.max(1, depth); d++) {
    const layerIds = Array.from(frontier);
    const layerEdges = await fetchEdgesTouching(layerIds, { types: t });
    allEdges.push(...layerEdges);
    const next = new Set();
    for (const e of layerEdges) {
      if (!visited.has(e.source)) next.add(e.source);
      if (!visited.has(e.target)) next.add(e.target);
    }
    for (const id of next) visited.add(id);
    frontier = next;
    if (visited.size >= limitNodes) break;
  }

  const nodes = await fetchEntitiesByIds(Array.from(visited));
  // Garder seulement les edges dont les noeuds sont présents
  const nodeSet = new Set(nodes.map((n) => n.id));
  const edges = allEdges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target));
  const stats = computeStats(nodes, edges);
  return { nodes, edges, stats };
}

async function getStatsByFolder(folderId, { types = null } = {}) {
  const t = normalizeTypesParam(types);
  const nodes = await fetchEntitiesByFolder(folderId);
  const nodeIds = nodes.map((n) => n.id);
  const edges = await fetchEdgesForNodeSet(nodeIds, { types: t });
  return computeStats(nodes, edges);
}

module.exports = {
  getGraphByFolder,
  getNeighborhood,
  getStatsByFolder,
};