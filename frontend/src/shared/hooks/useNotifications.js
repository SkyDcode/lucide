// frontend/src/shared/hooks/useNotifications.js
import { useNotificationStore } from '../store/notificationStore';

export function useNotifications() {
  const { notify, remove, items } = useNotificationStore();
  return { notify, remove, items };
}