// frontend/src/components/ui/Form/Input.jsx
import React from 'react';

export default function Input({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-200">
          {label}{required && <span className="text-red-400"> *</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
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