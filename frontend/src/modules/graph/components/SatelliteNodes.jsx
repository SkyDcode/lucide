// frontend/src/modules/graph/components/SatelliteNodes.jsx
import React from 'react';

/**
 * Simple interrupteur pour afficher/masquer les nœuds satellites (générés automatiquement à partir des attributs primitifs du nœud sélectionné).
 */
export default function SatelliteNodes({ visible, onToggle }) {
  return (
    <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-3 py-1 text-sm text-gray-200">
      <input id="sat-toggle" type="checkbox" className="accent-blue-600" checked={!!visible} onChange={onToggle} />
      <label htmlFor="sat-toggle">Nœuds satellites</label>
    </div>
  );
}