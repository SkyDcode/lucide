// frontend/src/modules/entities/hooks/useEntityTypes.js
import { useEffect, useMemo, useState } from 'react';
import EntityService from '../services/entityService';

export default function useEntityTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    EntityService.listTypes()
      .then((list) => { if (mounted) setTypes(Array.isArray(list) ? list : []); })
      .catch((e) => { if (mounted) setError(e); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const byKey = useMemo(() => {
    const map = new Map();
    for (const t of types) {
      if (t?.key) map.set(t.key, t);
    }
    return map;
  }, [types]);

  return { types, byKey, loading, error };
}