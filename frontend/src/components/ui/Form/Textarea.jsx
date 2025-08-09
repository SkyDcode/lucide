// frontend/src/components/ui/Form/Textarea.jsx
import React from 'react';

export default function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error,
  helperText,
  rows = 4,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-200">
          {label}{required && <span className="text-red-400"> *</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : ''}`}
      />
      {helperText && !error && (
        <span className="text-xs text-gray-400">{helperText}</span>
      )}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}