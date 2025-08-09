// frontend/src/components/ui/Form/Select.jsx
import React from 'react';

export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner…',
  required = false,
  disabled = false,
  error,
  helperText,
  multiple = false,
  className = '',
}) {
  const handleChange = (e) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
      onChange?.(selected);
    } else {
      onChange?.(e.target.value);
    }
  };

  const isSelected = (val) => {
    if (!multiple) return value === val;
    return Array.isArray(value) ? value.includes(val) : false;
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-200">
          {label}{required && <span className="text-red-400"> *</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={multiple ? undefined : (value ?? '')}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        multiple={multiple}
        className={`w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : ''}`}
      >
        {!multiple && (
          <option value="" disabled hidden>{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value} selected={isSelected(opt.value)}>
            {opt.label ?? String(opt.value)}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <span className="text-xs text-gray-400">{helperText}</span>
      )}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}