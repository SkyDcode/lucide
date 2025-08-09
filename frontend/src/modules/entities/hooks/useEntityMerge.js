// frontend/src/modules/entities/hooks/useEntityMerge.js
import { useCallback, useState } from 'react';
import api from '../../folders/services/../..//shared/services/api';
// NOTE: le chemin ci-dessus suppose votre arborescence "shared/services/api.js".
// Ajustez si nécessaire: import api from '../../../shared/services/api';

export default function useEntityMerge() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const findDuplicates = useCallback(async (folderId, minScore = 60) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/api/entities/duplicates', { params: { folderId, minScore } });
      return data.groups || [];
    } catch (e) { setError(e); return []; }
    finally { setLoading(false); }
  }, []);

  const mergeEntities = useCallback(async ({ targetId, sourceIds, prefer = 'target' }) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post('/api/entities/merge', { targetId, sourceIds, prefer });
      return data.entity;
    } catch (e) { setError(e); throw e; }
    finally { setLoading(false); }
  }, []);

  return { loading, error, findDuplicates, mergeEntities };
}