// frontend/src/modules/entities/components/EntityCard.jsx
import React, { useMemo } from 'react';

export default function EntityCard({ entity, typeMap, onEdit, onDelete }) {
  const typeLabel = useMemo(() => typeMap?.get?.(entity?.type)?.label ?? entity?.type ?? '—', [typeMap, entity]);
  const attrs = entity?.attributes || {};

  const attrChips = Object.entries(attrs).slice(0, 4);

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">{typeLabel}</div>
          <div className="text-lg font-semibold text-gray-100">{entity?.name}</div>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button onClick={() => onEdit(entity)} className="px-3 py-1.5 text-sm rounded-md bg-gray-700 text-gray-100 hover:bg-gray-600">Modifier</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(entity)} className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-500">Supprimer</button>
          )}
        </div>
      </div>

      {entity?.description && (
        <p className="text-sm text-gray-300 line-clamp-3">{entity.description}</p>
      )}

      {!!attrChips.length && (
        <div className="flex flex-wrap gap-2 pt-1">
          {attrChips.map(([k, v]) => (
            <span key={k} className="text-xs bg-gray-800 border border-gray-700 text-gray-200 px-2 py-1 rounded-full">
              <b className="text-gray-400 mr-1">{k}:</b> {Array.isArray(v) ? v.join(', ') : String(v)}
            </span>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 pt-2">
        ID: {entity?.id} · Créé: {entity?.createdAt ? new Date(entity.createdAt).toLocaleString() : '—'}
      </div>
    </div>
  );
}