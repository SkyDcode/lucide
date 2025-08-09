// frontend/src/modules/search/hooks/useSearch.js
import { useCallback, useState } from 'react';
import { searchEntities } from '../services/searchService';

export default function useSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const run = useCallback(async ({ q, folderId, type, limit, offset }) => {
    setLoading(true); setError(null);
    try {
      const r = await searchEntities({ q, folderId, type, limit, offset });
      setResults(r);
      return r;
    } catch (e) { setError(e); return []; }
    finally { setLoading(false); }
  }, []);

  return { loading, error, results, search: run };
}