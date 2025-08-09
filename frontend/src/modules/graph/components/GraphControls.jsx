// frontend/src/modules/graph/components/GraphControls.jsx
import React from 'react';

export default function GraphControls({
  onFit,
  onToggleLabels,
  onRefresh,
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onToggleLabels} className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200">Labels</button>
      <button onClick={onFit} className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200">Fit</button>
      <button onClick={onRefresh} className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-200">Refresh</button>
    </div>
  );
}