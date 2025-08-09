// frontend/src/modules/export/components/ExportModal.jsx
import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import Button from '../../../components/ui/Button/Button';
import useExport from '../hooks/useExport';

export default function ExportModal({ open, onClose, folderId, entityId }) {
  const { loading, error, exportEntityPdf, exportFolderPdf, exportEntityJson, exportFolderJson } = useExport();
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'json'
  const mode = entityId ? 'entity' : 'folder';

  const doExport = async () => {
    if (mode === 'entity') {
      if (format === 'pdf') await exportEntityPdf(entityId);
      else await exportEntityJson(entityId);
    } else {
      if (format === 'pdf') await exportFolderPdf(folderId);
      else await exportFolderJson(folderId);
    }
    onClose && onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Exporter">
      <div className="space-y-4">
        <div>
          <div className="text-sm mb-2">Cible</div>
          <div className="text-xs text-gray-600">{mode === 'entity' ? `Entité #${entityId}` : `Dossier #${folderId}`}</div>
        </div>
        <div>
          <div className="text-sm mb-2">Format</div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2">
              <input type="radio" name="fmt" checked={format === 'pdf'} onChange={() => setFormat('pdf')} /> PDF
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="fmt" checked={format === 'json'} onChange={() => setFormat('json')} /> JSON
            </label>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">Erreur: {String(error.message || error)}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={doExport} disabled={loading}>{loading ? 'Export…' : 'Exporter'}</Button>
        </div>
      </div>
    </Modal>
  );
}