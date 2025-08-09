// frontend/src/shared/store/notificationStore.js
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(1);

  const remove = useCallback((id) => setItems((arr) => arr.filter((n) => n.id !== id)), []);

  const notify = useCallback(({ type = 'info', message = '', ttl = 4000 }) => {
    const id = seq.current++;
    setItems((arr) => [...arr, { id, type, message }]);
    if (ttl > 0) setTimeout(() => remove(id), ttl);
    return id;
  }, [remove]);

  const value = useMemo(() => ({ items, notify, remove }), [items, notify, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotificationStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotificationStore must be used within <NotificationsProvider>');
  return ctx;
}