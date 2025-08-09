// frontend/src/modules/graph/components/GraphLegend.jsx
import React, { useMemo } from 'react';
import { nodeColor } from '../utils/nodeHelpers';

export default function GraphLegend({ nodes = [] }) {
  const types = useMemo(() => {
    const map = new Map();
    for (const n of nodes) map.set(n.type || '—', (map.get(n.type || '—') || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  if (!types.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {types.map(([t, count]) => (
        <div key={t} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-800 bg-gray-900 text-sm">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: nodeColor({ type: t }) }} />
          <span className="text-gray-200">{t}</span>
          <span className="text-xs text-gray-400">({count})</span>
        </div>
      ))}
    </div>
  );
}