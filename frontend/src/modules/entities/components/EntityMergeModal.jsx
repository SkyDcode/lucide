// frontend/src/modules/entities/components/EntityMergeModal.jsx
import React, { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import Button from '../../../components/ui/Button/Button';
import useEntityMerge from '../hooks/useEntityMerge';

export default function EntityMergeModal({ folderId, open, onClose, onMerged }) {
  const { loading, error, findDuplicates, mergeEntities } = useEntityMerge();
  const [groups, setGroups] = useState([]);
  // selection: { [groupIndex]: { targetId: number|null, sourceIds: number[] } }
  const [selection, setSelection] = useState({});

  useEffect(() => {
    if (!open || !folderId) return;
    (async () => {
      const g = await findDuplicates(folderId, 60);
      setGroups(g);
      setSelection({});
    })();
  }, [open, folderId, findDuplicates]);

  const handleChooseTarget = (gi, id) => {
    setSelection((s) => ({
      ...s,
      [gi]: {
        targetId: id,
        sourceIds: (s[gi]?.sourceIds || []).filter((x) => x !== id),
      },
    }));
  };

  const handleToggleSource = (gi, id) => {
    setSelection((s) => {
      const prev = s[gi] || { targetId: null, sourceIds: [] };
      const exists = prev.sourceIds.includes(id);
      const next = exists ? prev.sourceIds.filter((x) => x !== id) : [...prev.sourceIds, id];
      return {
        ...s,
        [gi]: { ...prev, sourceIds: next.filter((x) => x !== prev.targetId) },
      };
    });
  };

  const canMerge = (gi) => {
    const sel = selection[gi];
    return !!(sel && sel.targetId && sel.sourceIds && sel.sourceIds.length > 0);
  };

  const doMerge = async (gi) => {
    const sel = selection[gi];
    if (!sel || !sel.targetId || !sel.sourceIds?.length) return;
    const merged = await mergeEntities({ targetId: sel.targetId, sourceIds: sel.sourceIds });
    onMerged && onMerged(merged);
    // retire le groupe fusionné de l'affichage
    setGroups((g) => g.filter((_, idx) => idx !== gi));
    setSelection((s) => {
      const { [gi]: _drop, ...rest } = s;
      return rest;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Fusion d'entités (doublons)">
      {loading && <div>Chargement…</div>}
      {error && <div className="text-red-600">Erreur: {String(error.message || error)}</div>}
      {!loading && groups.length === 0 && <div>Aucun doublon probable trouvé.</div>}

      <div className="space-y-4">
        {groups.map((g, gi) => {
          const sel = selection[gi] || { targetId: null, sourceIds: [] };
          return (
            <div key={gi} className="border rounded p-3 bg-white">
              <div className="font-semibold mb-2">
                Groupe #{gi + 1} — score moyen {g.score}
              </div>

              <div className="grid gap-2">
                {g.candidates.map((c) => {
                  const isTarget = sel.targetId === c.id;
                  const isSource = sel.sourceIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between border rounded px-2 py-1"
                    >
                      <div className="truncate">
                        <div className="text-sm font-medium">
                          [{c.type}] {c.name || '(sans nom)'} — #{c.id}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isTarget ? 'primary' : 'secondary'}
                          onClick={() => handleChooseTarget(gi, c.id)}
                          disabled={loading}
                        >
                          {isTarget ? 'Cible ✓' : 'Choisir cible'}
                        </Button>
                        <Button
                          variant={isSource ? 'danger' : 'secondary'}
                          disabled={sel.targetId === c.id || loading}
                          onClick={() => handleToggleSource(gi, c.id)}
                        >
                          {isSource ? 'Retirer' : 'Fusionner'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button disabled={!canMerge(gi) || loading} onClick={() => doMerge(gi)}>
                  {loading ? 'Fusion…' : 'Fusionner le groupe'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
