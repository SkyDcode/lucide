// frontend/src/modules/entities/components/EntityForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Input from '../../../components/ui/Form/Input';
import Textarea from '../../../components/ui/Form/Textarea';
import EntityTypeSelector from './EntityTypeSelector';
import DynamicAttributeForm from './DynamicAttributeForm';
import useEntityTypes from '../hooks/useEntityTypes';

export default function EntityForm({
  initial = {},
  folderId,
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [type, setType] = useState(initial.type ?? '');
  const [attributes, setAttributes] = useState(() => ({ ...(initial.attributes || {}) }));
  const [errors, setErrors] = useState({});

  const { byKey } = useEntityTypes();

  const dynamicAttrs = useMemo(() => byKey.get(type)?.attributes ?? [], [byKey, type]);

  useEffect(() => {
    // Si le type change, on conserve les champs communs et on reset les attributs non définis
    const next = {};
    for (const a of dynamicAttrs) {
      const k = a.name;
      if (k in attributes) next[k] = attributes[k];
      else {
        // valeur par défaut simple selon type
        switch ((a.type || 'text').toLowerCase()) {
          case 'boolean': next[k] = false; break;
          case 'multiselect': next[k] = []; break;
          default: next[k] = '';
        }
      }
    }
    setAttributes(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleAttrChange = (key, val) => {
    setAttributes((prev) => ({ ...prev, [key]: val }));
  };

  const validate = () => {
    const e = {};
    if (!name?.trim()) e.name = 'Nom requis';
    if (!type) e.type = 'Type requis';
    for (const a of dynamicAttrs) {
      if (a.required) {
        const v = attributes[a.name];
        const isEmpty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        if (isEmpty) e[a.name] = 'Champ requis';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    onSubmit?.({
      id: initial.id,
      name: name.trim(),
      description: description?.trim?.() || '',
      type,
      folder_id: folderId ?? initial.folder_id ?? null,
      attributes,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label="Nom"
        name="name"
        value={name}
        onChange={setName}
        required
        error={errors.name}
      />

      <Textarea
        label="Description"
        name="description"
        value={description}
        onChange={setDescription}
        rows={4}
      />

      <EntityTypeSelector
        value={type}
        onChange={setType}
        required
      />
      {errors.type && <span className="text-xs text-red-400 -mt-2">{errors.type}</span>}

      <DynamicAttributeForm
        attributes={dynamicAttrs}
        values={attributes}
        onChange={handleAttrChange}
        errors={errors}
      />

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-700 text-gray-100">
            Annuler
          </button>
        )}
        <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}