// frontend/src/components/ui/Form/FileUpload.jsx
import React, { useCallback, useRef, useState } from 'react';

export default function FileUpload({
  label = 'Ajouter des fichiers',
  accept = '*/*',
  multiple = true,
  onFiles,
  disabled = false,
  className = '',
}) {
  const inputRef = useRef(null);
  const [isDragging, setDragging] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = useCallback((fileList) => {
    if (!fileList || !fileList.length) return;
    const arr = Array.from(fileList);
    onFiles?.(arr);
  }, [onFiles]);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer?.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <div className="text-sm font-medium text-gray-200">{label}</div>}

      <div
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer select-none
          ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-800/60'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-500'}
        `}
        role="button"
      >
        <div className="text-gray-200">Glissez-déposez vos fichiers ici</div>
        <div className="text-xs text-gray-400">ou cliquez pour sélectionner</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}