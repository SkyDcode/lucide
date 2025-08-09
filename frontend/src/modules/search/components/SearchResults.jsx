// frontend/src/modules/search/components/SearchResults.jsx
import React from 'react';

export default function SearchResults({ results = [], onOpenEntity }) {
  if (!results.length) return <div className="text-sm text-gray-500">Aucun résultat</div>;
  return (
    <div className="divide-y border rounded">
      {results.map((e) => (
        <div key={e.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
          <div className="truncate">
            <div className="text-sm font-semibold">[{e.type}] {e.name || '(sans nom)'}</div>
            <div className="text-xs text-gray-500">ID: {e.id} — Dossier: {e.folder_id}</div>
          </div>
          {onOpenEntity && (
            <button className="text-blue-600 underline" onClick={() => onOpenEntity(e)}>Ouvrir</button>
          )}
        </div>
      ))}
    </div>
  );
}