// frontend/src/components/ui/LoadingSpinner/LoadingSpinner.jsx
import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'blue', 
  message = null,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    gray: 'border-gray-500',
    white: 'border-white',
    green: 'border-green-500',
    red: 'border-red-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          border-2 border-t-transparent 
          ${colorClasses[color]} 
          border-solid rounded-full animate-spin
        `}
        role="status"
        aria-label="Chargement en cours"
      />
      {message && (
        <span className="text-sm text-gray-400">{message}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;