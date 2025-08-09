// frontend/src/modules/graph/components/GraphFilters.jsx
import React, { useMemo } from 'react';

/**
 * Affiche des cases à cocher pour filtrer par type de lien (edge.type).
 * Props:
 * - edgeTypeCounts: { [type:string]: number }
 * - selected: string[]
 * - onChange(nextSelected: string[])
 */
export default function GraphFilters({ edgeTypeCounts = {}, selected = [], onChange }) {
  const types = useMemo(() => Object.keys(edgeTypeCounts).sort(), [edgeTypeCounts]);
  const toggle = (t) => {
    const set = new Set(selected);
    if (set.has(t)) set.delete(t); else set.add(t);
    onChange?.(Array.from(set));
  };

  if (!types.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => (
        <label key={t} className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-3 py-1 text-sm text-gray-200">
          <input type="checkbox" checked={selected.includes(t)} onChange={() => toggle(t)} className="accent-blue-600" />
          <span>{t} <span className="text-xs text-gray-400">({edgeTypeCounts[t]})</span></span>
        </label>
      ))}
    </div>
  );
}