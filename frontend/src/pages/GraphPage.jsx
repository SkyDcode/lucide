// frontend/src/pages/GraphPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/ui/Button/Button';
import { useAppStore } from '../shared/store/appStore';
import { useNotifications } from '../shared/hooks/useNotifications';
import NetworkGraph from '../modules/graph/components/NetworkGraph';
import GraphControls from '../modules/graph/components/GraphControls';
import GraphFilters from '../modules/graph/components/GraphFilters';

export default function GraphPage() {
  const { folderId: folderIdStr } = useParams();
  const folderId = Number(folderIdStr);
  const { setCurrentFolderId } = useAppStore();
  const { notify } = useNotifications();

  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setCurrentFolderId(folderId); }, [folderId, setCurrentFolderId]);

  const fetchGraph = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/relationships/graph?folderId=${folderId}`);
      const json = await res.json();
      setGraph({ nodes: json.nodes || [], links: json.links || [] });
    } catch (e) {
      setError(e); notify({ type: 'error', message: 'Erreur chargement graphe' });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (folderId) fetchGraph(); }, [folderId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={fetchGraph} disabled={loading}>Actualiser</Button>
      </div>
      {error && <div className="text-red-600">Erreur: {String(error.message || error)}</div>}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-9 min-h-[600px] border rounded bg-white">
          <NetworkGraph data={graph} />
        </div>
        <div className="col-span-3 space-y-3">
          <GraphControls />
          <GraphFilters />
        </div>
      </div>
    </div>
  );
}