// frontend/src/modules/entities/hooks/useEntities.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import EntityService from '../services/entityService';

export default function useEntities(initial = {}) {
  const [folderId, setFolderId] = useState(initial.folderId ?? null);
  const [type, setType] = useState(initial.type ?? '');
  const [search, setSearch] = useState(initial.search ?? '');
  const [page, setPage] = useState(initial.page ?? 1);
  const [limit, setLimit] = useState(initial.limit ?? 20);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, metadata } = await EntityService.list({ folderId, search, type, page, limit });
      setItems(Array.isArray(data) ? data : []);
      setTotal(metadata?.resultsCount ?? 0);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [folderId, search, type, page, limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const refresh = useCallback(() => fetchList(), [fetchList]);

  const createEntity = useCallback(async (payload) => {
    const created = await EntityService.create(payload);
    await fetchList();
    return created;
  }, [fetchList]);

  const updateEntity = useCallback(async (id, payload) => {
    const updated = await EntityService.update(id, payload);
    await fetchList();
    return updated;
  }, [fetchList]);

  const deleteEntity = useCallback(async (id) => {
    await EntityService.remove(id);
    await fetchList();
  }, [fetchList]);

  const pagination = useMemo(() => ({ page, limit, total }), [page, limit, total]);

  return {
    // data
    items,
    total,
    loading,
    error,
    pagination,

    // filters
    folderId, setFolderId,
    type, setType,
    search, setSearch,
    page, setPage,
    limit, setLimit,

    // actions
    refresh,
    createEntity,
    updateEntity,
    deleteEntity,
  };
}