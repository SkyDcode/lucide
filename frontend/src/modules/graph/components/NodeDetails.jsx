// frontend/src/modules/graph/components/NodeDetails.jsx
import React from 'react';

export default function NodeDetails({ node, degree = 0, onCenter, onClose, onToggleSatellites, satVisible }) {
  if (!node) return null;
  const entries = Object.entries(node.data || {});

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">{node.type || 'node'}</div>
          <div className="text-lg font-semibold text-gray-100">{node.name || `#${node.id}`}</div>
          <div className="text-xs text-gray-400">ID: {node.id} • Degré: {degree}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCenter} className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200">Centrer</button>
          <button onClick={onToggleSatellites} className={`px-3 py-1.5 rounded-md ${satVisible ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>Satellites</button>
          <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200">Fermer</button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 bg-gray-800/60 rounded-md px-3 py-2">
              <div className="text-gray-400">{k}</div>
              <div className="text-gray-100 text-right break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-gray-400">Aucun attribut.</div>
      )}
    </div>
  );
}