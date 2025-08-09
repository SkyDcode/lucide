// frontend/src/modules/entities/components/EntityTypeSelector.jsx
import React, { useMemo } from 'react';
import useEntityTypes from '../../entities/hooks/useEntityTypes';
import Select from '../../../components/ui/Form/Select';

export default function EntityTypeSelector({ value, onChange, required = true, className = '' }) {
  const { types, loading } = useEntityTypes();

  const options = useMemo(() => types.map(t => ({ value: t.key, label: t.label || t.key })), [types]);

  return (
    <Select
      label="Type d'entité"
      name="type"
      value={value}
      onChange={onChange}
      options={options}
      placeholder={loading ? 'Chargement…' : 'Choisir un type'}
      required={required}
      disabled={loading}
      className={className}
    />
  );
}