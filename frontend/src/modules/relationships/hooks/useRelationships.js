// frontend/src/modules/relationships/hooks/useRelationships.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import RelationshipService from '../services/relationshipService';

export default function useRelationships(initial = {}) {
  const [entityId, setEntityId] = useState(initial.entityId ?? null);
  const [type, setType] = useState(initial.type ?? '');
  const [page, setPage] = useState(initial.page ?? 1);
  const [limit, setLimit] = useState(initial.limit ?? 50);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, metadata } = await RelationshipService.list({ entityId, type, page, limit });
      setItems(Array.isArray(data) ? data : []);
      setTotal(metadata?.resultsCount ?? data.length ?? 0);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [entityId, type, page, limit]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const refresh = useCallback(() => fetchList(), [fetchList]);

  const createRel = useCallback(async (payload) => {
    const res = await RelationshipService.create(payload);
    await fetchList();
    return res;
  }, [fetchList]);

  const updateRel = useCallback(async (id, payload) => {
    const res = await RelationshipService.update(id, payload);
    await fetchList();
    return res;
  }, [fetchList]);

  const deleteRel = useCallback(async (id) => {
    await RelationshipService.remove(id);
    await fetchList();
  }, [fetchList]);

  const pagination = useMemo(() => ({ page, limit, total }), [page, limit, total]);

  return {
    items, loading, error, pagination,
    entityId, setEntityId,
    type, setType,
    page, setPage,
    limit, setLimit,
    refresh, createRel, updateRel, deleteRel,
  };
}