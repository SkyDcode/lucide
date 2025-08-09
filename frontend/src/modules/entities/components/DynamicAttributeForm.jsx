// frontend/src/modules/entities/components/DynamicAttributeForm.jsx
import React from 'react';
import Input from '../../../components/ui/Form/Input';
import Select from '../../../components/ui/Form/Select';
import Textarea from '../../../components/ui/Form/Textarea';

// Supporte: text, textarea, number, date, boolean, select, multiselect
export default function DynamicAttributeForm({ attributes = [], values = {}, onChange, errors = {} }) {
  const handleChange = (name, val) => {
    onChange?.(name, val);
  };

  const renderField = (attr) => {
    const { name, label, type, required, options = [], helperText, placeholder } = attr;
    const val = values?.[name];
    const error = errors?.[name];

    switch ((type || 'text').toLowerCase()) {
      case 'textarea':
        return (
          <Textarea
            key={name}
            label={label || name}
            name={name}
            value={val}
            onChange={(v) => handleChange(name, v)}
            required={!!required}
            placeholder={placeholder}
            helperText={helperText}
            error={error}
          />
        );
      case 'number':
        return (
          <Input
            key={name}
            type="number"
            label={label || name}
            name={name}
            value={val}
            onChange={(v) => handleChange(name, v === '' ? '' : Number(v))}
            required={!!required}
            placeholder={placeholder}
            helperText={helperText}
            error={error}
          />
        );
      case 'date':
        return (
          <Input
            key={name}
            type="date"
            label={label || name}
            name={name}
            value={val}
            onChange={(v) => handleChange(name, v)}
            required={!!required}
            placeholder={placeholder}
            helperText={helperText}
            error={error}
          />
        );
      case 'boolean':
        return (
          <div key={name} className="flex items-center gap-2 py-2">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={!!val}
              onChange={(e) => handleChange(name, e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={name} className="text-sm text-gray-200">
              {label || name} {required && <span className="text-red-400">*</span>}
            </label>
            {helperText && <span className="ml-2 text-xs text-gray-400">{helperText}</span>}
            {error && <span className="ml-2 text-xs text-red-400">{error}</span>}
          </div>
        );
      case 'select':
        return (
          <Select
            key={name}
            label={label || name}
            name={name}
            value={val ?? ''}
            onChange={(v) => handleChange(name, v)}
            options={options}
            required={!!required}
            helperText={helperText}
            error={error}
          />
        );
      case 'multiselect':
        return (
          <Select
            key={name}
            label={label || name}
            name={name}
            value={Array.isArray(val) ? val : []}
            onChange={(v) => handleChange(name, Array.isArray(v) ? v : [])}
            options={options}
            required={!!required}
            multiple
            helperText={helperText}
            error={error}
          />
        );
      case 'text':
      default:
        return (
          <Input
            key={name}
            type="text"
            label={label || name}
            name={name}
            value={val}
            onChange={(v) => handleChange(name, v)}
            required={!!required}
            placeholder={placeholder}
            helperText={helperText}
            error={error}
          />
        );
    }
  };

  if (!attributes?.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {attributes.map(renderField)}
    </div>
  );
}