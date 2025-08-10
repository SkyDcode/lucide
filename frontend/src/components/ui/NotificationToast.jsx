// frontend/src/components/ui/NotificationToast.jsx
import React from 'react';
import { useNotificationStore } from '../../shared/store/notificationStore';
import Button from './Button/Button';

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

const COLORS = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};

export default function NotificationToast() {
  const { items, remove } = useNotificationStore();

  if (!items?.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {items.map((notification) => (
        <div
          key={notification.id}
          className={`
            flex items-center gap-3 p-4 rounded-lg border shadow-lg
            transition-all duration-300 ease-in-out
            ${COLORS[notification.type] || COLORS.info}
          `}
        >
          <div className="flex-shrink-0 text-lg">
            {ICONS[notification.type] || ICONS.info}
          </div>
          
          <div className="flex-1 text-sm font-medium">
            {notification.message}
          </div>
          
          <Button
            variant="ghost"
            size="small"
            icon="×"
            onClick={() => remove(notification.id)}
            className="flex-shrink-0"
            aria-label="Fermer la notification"
          />
        </div>
      ))}
    </div>
  );
}