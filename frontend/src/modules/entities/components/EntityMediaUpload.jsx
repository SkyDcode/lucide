// frontend/src/modules/entities/components/EntityMediaUpload.jsx
import React, { useState } from 'react';
import FileUpload from '../../../components/ui/Form/FileUpload';
import useEntityMedia from '../hooks/useEntityMedia';

export default function EntityMediaUpload({ entityId, folderId }) {
  const { items, loading, error, uploadFiles, deleteMedia, downloadUrl } = useEntityMedia({ entityId, folderId });
  const [progressMap, setProgressMap] = useState({});

  const onFiles = async (files) => {
    const next = { ...progressMap };
    files.forEach(f => { next[f.name] = 0; });
    setProgressMap(next);

    await uploadFiles(files, {
      onProgress: ({ file, progress }) => {
        setProgressMap((pm) => ({ ...pm, [file.name]: progress }));
      }
    });
    setProgressMap({});
  };

  return (
    <div className="flex flex-col gap-3">
      <FileUpload onFiles={onFiles} multiple />

      {loading && <div className="text-gray-300 text-sm">Chargement…</div>}
      {error && <div className="text-red-400 text-sm">Erreur: {String(error.message || error)}</div>}

      {/* Upload en cours */}
      {Object.keys(progressMap).length > 0 && (
        <div className="flex flex-col gap-1">
          {Object.entries(progressMap).map(([name, pct]) => (
            <div key={name} className="text-xs text-gray-300">
              {name} — {pct}%
            </div>
          ))}
        </div>
      )}

      {/* Liste fichiers */}
      <div className="flex flex-col divide-y divide-gray-800 border border-gray-800 rounded-lg overflow-hidden">
        {items.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-900">
            <div className="min-w-0">
              <div className="text-sm text-gray-100 truncate">{m.original_name}</div>
              <div className="text-xs text-gray-400">{m.mime_type} • {(m.size / 1024).toFixed(1)} KB • {new Date(m.created_at || m.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <a href={downloadUrl(m.id)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-md bg-gray-700 text-gray-100 hover:bg-gray-600 text-sm">Télécharger</a>
              <button onClick={() => deleteMedia(m.id)} className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 text-sm">Supprimer</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400 bg-gray-900">Aucun fichier</div>
        )}
      </div>
    </div>
  );
}