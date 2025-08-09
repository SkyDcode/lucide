// frontend/src/modules/graph/hooks/useD3.js
import { useEffect, useRef, useState } from 'react';
import { initSvg } from '../services/d3Service';

export default function useD3({ background = 'transparent' } = {}) {
  const ref = useRef(null);
  const [api, setApi] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    const A = initSvg(ref.current, { background });
    setApi(A);
    return () => { A?.destroy?.(); };
  }, [background]);

  return { ref, api };
}