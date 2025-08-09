// frontend/src/modules/graph/utils/nodeHelpers.js

export function nodeId(n) { return n.id; }
export function nodeLabel(n) { return n.name ?? String(n.id); }

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function colorFromString(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // HSL plus doux (70% saturation, 50% luminosité)
  const hue = h % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function nodeColor(n, typeColors = {}) {
  if (n.color) return n.color;
  if (n.type && typeColors[n.type]) return typeColors[n.type];
  if (n.type) return colorFromString(n.type);
  return colorFromString(n.id);
}

export function mergeNodeData(a, b) { return { ...a, ...b }; }