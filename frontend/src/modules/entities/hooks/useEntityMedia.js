// frontend/src/modules/entities/hooks/useEntityMedia.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../shared/services/api';

export default function useEntityMedia({ entityId, folderId } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const params = useMemo(() => ({
    entity_id: entityId ?? undefined,
    folder_id: folderId ?? undefined,
    page: 1,
    limit: 50,
  }), [entityId, folderId]);

  const fetchList = useCallback(async () => {
    if (!entityId && !folderId) { setItems([]); return; }
    setLoading(true); setError(null);
    try {
      const resp = await api.get('/media', { params });
      setItems(resp?.data?.data ?? resp?.data ?? []);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [params, entityId, folderId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const uploadFiles = useCallback(async (files, { onProgress } = {}) => {
    const results = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      if (entityId) form.append('entity_id', String(entityId));
      if (folderId) form.append('folder_id', String(folderId));

      const resp = await api.post('/media', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!onProgress || !evt.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress({ file, progress: pct });
        }
      });
      results.push(resp?.data?.data ?? resp?.data);
    }
    await fetchList();
    return results;
  }, [entityId, folderId, fetchList]);

  const deleteMedia = useCallback(async (id) => {
    await api.delete(`/media/${id}`);
    await fetchList();
  }, [fetchList]);

  const downloadUrl = useCallback((id) => `/api/media/${id}/download`, []);

  return { items, loading, error, refresh: fetchList, uploadFiles, deleteMedia, downloadUrl };
}