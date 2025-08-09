// frontend/src/modules/graph/components/GraphCanvas.jsx
import React, { useEffect } from 'react';
import useD3 from '../hooks/useD3';

export default function GraphCanvas({ className = '', onReady }) {
  const { ref, api } = useD3({ background: 'transparent' });

  useEffect(() => { if (api && onReady) onReady(api); }, [api, onReady]);

  return (
    <div ref={ref} className={`w-full h-[70vh] md:h-[75vh] rounded-xl border border-gray-800 bg-gray-900/60 ${className}`} />
  );
}