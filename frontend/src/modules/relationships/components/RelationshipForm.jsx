// frontend/src/modules/relationships/components/RelationshipForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Input from '../../../components/ui/Form/Input';
import Select from '../../../components/ui/Form/Select';
import Textarea from '../../../components/ui/Form/Textarea';

/**
 * Props:
 * - initial: { id, from_entity, to_entity, type, data }
 * - entityOptions: [{ value, label }] (optionnel)
 * - defaultFrom: number (optionnel)
 * - defaultTo: number (optionnel)
 * - onSubmit(payload)
 * - onCancel()
 */
export default function RelationshipForm({ initial = {}, entityOptions = [], defaultFrom, defaultTo, onSubmit, onCancel, submitLabel = 'Enregistrer' }) {
  const [fromId, setFromId] = useState(initial.from_entity ?? defaultFrom ?? '');
  const [toId, setToId] = useState(initial.to_entity ?? defaultTo ?? '');
  const [type, setType] = useState(initial.type ?? '');
  const [dataText, setDataText] = useState(() => initial.data ? JSON.stringify(initial.data, null, 2) : '');
  const [errors, setErrors] = useState({});

  const hasEntityOptions = Array.isArray(entityOptions) && entityOptions.length > 0;

  useEffect(() => {
    if (defaultFrom && !fromId) setFromId(defaultFrom);
    if (defaultTo && !toId) setToId(defaultTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFrom, defaultTo]);

  const validate = () => {
    const e = {};
    const f = Number(fromId);
    const t = Number(toId);
    if (!f) e.from_entity = 'Depuis (from) requis';
    if (!t) e.to_entity = 'Vers (to) requis';
    if (f && t && f === t) e.to_entity = 'Doit relier deux entités différentes';
    if (!type?.trim()) e.type = 'Type requis';

    if (dataText?.trim()) {
      try { JSON.parse(dataText); } catch (_) { e.data = 'JSON invalide'; }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    const payload = {
      id: initial.id,
      from_entity: Number(fromId),
      to_entity: Number(toId),
      type: type.trim(),
      data: dataText?.trim() ? JSON.parse(dataText) : null,
    };
    onSubmit?.(payload);
  };

  const entitySelectOptions = useMemo(() => {
    if (!hasEntityOptions) return [];
    return entityOptions;
  }, [entityOptions, hasEntityOptions]);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {hasEntityOptions ? (
        <>
          <Select label="Entité source" value={fromId} onChange={setFromId} options={entitySelectOptions} required />
          {errors.from_entity && <span className="text-xs text-red-400 -mt-2">{errors.from_entity}</span>}

          <Select label="Entité cible" value={toId} onChange={setToId} options={entitySelectOptions} required />
          {errors.to_entity && <span className="text-xs text-red-400 -mt-2">{errors.to_entity}</span>}
        </>
      ) : (
        <>
          <Input label="Entité source (ID)" value={fromId} onChange={setFromId} type="number" required />
          {errors.from_entity && <span className="text-xs text-red-400 -mt-2">{errors.from_entity}</span>}
          <Input label="Entité cible (ID)" value={toId} onChange={setToId} type="number" required />
          {errors.to_entity && <span className="text-xs text-red-400 -mt-2">{errors.to_entity}</span>}
        </>
      )}

      <Input label="Type" value={type} onChange={setType} placeholder="ex: familial, professionnel, contact, ..." required error={errors.type} />

      <Textarea label="Données supplémentaires (JSON)" value={dataText} onChange={setDataText} rows={5} placeholder='{"confiance": "élevée"}' error={errors.data} />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-700 text-gray-100">Annuler</button>
        )}
        <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500">{submitLabel}</button>
      </div>
    </form>
  );
}