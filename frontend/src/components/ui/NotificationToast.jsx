// frontend/src/components/ui/NotificationToast.jsx
import React from 'react';
import { useNotifications } from '../../shared/hooks/useNotifications';

const COLORS = {
  info: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-amber-600',
  error: 'bg-red-600',
};

export default function NotificationToast() {
  const { items, remove } = useNotifications();

  return (
    <div className="fixed top-3 right-3 z-50 space-y-2">
      {items.map((n) => (
        <div key={n.id} className={`text-white shadow rounded px-3 py-2 min-w-[260px] ${COLORS[n.type] || COLORS.info}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">{n.message}</div>
            <button onClick={() => remove(n.id)} className="text-white/80 hover:text-white">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}