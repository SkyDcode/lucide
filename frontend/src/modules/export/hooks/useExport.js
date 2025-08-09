// frontend/src/modules/export/hooks/useExport.js
import { useCallback, useState } from 'react';
import { downloadEntityPDF, downloadFolderPDF, fetchEntityJSON, fetchFolderJSON } from '../services/exportService';

function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  window.URL.revokeObjectURL(url);
}

export default function useExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exportEntityPdf = useCallback(async (entityId) => {
    setLoading(true); setError(null);
    try { const blob = await downloadEntityPDF(entityId); saveBlob(blob, `entity-${entityId}.pdf`); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }, []);

  const exportFolderPdf = useCallback(async (folderId) => {
    setLoading(true); setError(null);
    try { const blob = await downloadFolderPDF(folderId); saveBlob(blob, `folder-${folderId}.pdf`); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }, []);

  const exportEntityJson = useCallback(async (entityId) => {
    setLoading(true); setError(null);
    try {
      const data = await fetchEntityJSON(entityId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      saveBlob(blob, `entity-${entityId}.json`);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, []);

  const exportFolderJson = useCallback(async (folderId) => {
    setLoading(true); setError(null);
    try {
      const data = await fetchFolderJSON(folderId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      saveBlob(blob, `folder-${folderId}.json`);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, []);

  return { loading, error, exportEntityPdf, exportFolderPdf, exportEntityJson, exportFolderJson };
}