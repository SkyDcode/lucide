// frontend/src/shared/store/notificationStore.js
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const NotificationContext = createContext(null);

/**
 * Provider pour la gestion des notifications toast
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const sequenceRef = useRef(1);

  /**
   * Supprimer une notification par ID
   */
  const removeNotification = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  /**
   * Supprimer toutes les notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Ajouter une nouvelle notification
   */
  const addNotification = useCallback(({
    type = 'info',
    message = '',
    title = null,
    duration = 4000,
    persistent = false,
    action = null,
    position = 'top-right',
    showCloseButton = true,
    icon = null
  }) => {
    const id = sequenceRef.current++;
    
    const notification = {
      id,
      type,
      message,
      title,
      duration,
      persistent,
      action,
      position,
      showCloseButton,
      icon,
      createdAt: new Date(),
      isVisible: true
    };

    // Ajouter la notification
    setNotifications((current) => [...current, notification]);

    // Programmer la suppression automatique si non persistante
    if (!persistent && duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  /**
   * Raccourcis pour les types de notifications communes
   */
  const notify = useCallback((options) => {
    if (typeof options === 'string') {
      // Si c'est juste un string, créer une notification info
      return addNotification({ message: options, type: 'info' });
    }
    return addNotification(options);
  }, [addNotification]);

  const success = useCallback((message, options = {}) => {
    return addNotification({ 
      ...options, 
      message, 
      type: 'success',
      icon: options.icon || '✅'
    });
  }, [addNotification]);

  const error = useCallback((message, options = {}) => {
    return addNotification({ 
      ...options, 
      message, 
      type: 'error',
      duration: options.duration || 6000, // Erreurs restent plus longtemps
      icon: options.icon || '❌'
    });
  }, [addNotification]);

  const warning = useCallback((message, options = {}) => {
    return addNotification({ 
      ...options, 
      message, 
      type: 'warning',
      icon: options.icon || '⚠️'
    });
  }, [addNotification]);

  const info = useCallback((message, options = {}) => {
    return addNotification({ 
      ...options, 
      message, 
      type: 'info',
      icon: options.icon || 'ℹ️'
    });
  }, [addNotification]);

  const loading = useCallback((message, options = {}) => {
    return addNotification({ 
      ...options, 
      message, 
      type: 'loading',
      persistent: true, // Les notifications de chargement sont persistantes par défaut
      showCloseButton: false,
      icon: options.icon || '⏳'
    });
  }, [addNotification]);

  /**
   * Mettre à jour une notification existante
   */
  const updateNotification = useCallback((id, updates) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, ...updates }
          : notification
      )
    );
  }, []);

  /**
   * Marquer une notification comme lue
   */
  const markAsRead = useCallback((id) => {
    updateNotification(id, { isRead: true });
  }, [updateNotification]);

  /**
   * Grouper les notifications par position
   */
  const notificationsByPosition = useMemo(() => {
    const grouped = notifications.reduce((acc, notification) => {
      const position = notification.position || 'top-right';
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(notification);
      return acc;
    }, {});

    // Trier chaque groupe par date de création (plus récent en premier pour top, plus ancien en premier pour bottom)
    Object.keys(grouped).forEach(position => {
      if (position.includes('top')) {
        // Pour les positions du haut, les plus récentes en premier
        grouped[position].sort((a, b) => b.createdAt - a.createdAt);
      } else {
        // Pour les positions du bas, les plus anciennes en premier
        grouped[position].sort((a, b) => a.createdAt - b.createdAt);
      }
    });

    return grouped;
  }, [notifications]);

  /**
   * Statistiques des notifications
   */
  const stats = useMemo(() => {
    const total = notifications.length;
    const byType = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {});
    
    const unread = notifications.filter(n => !n.isRead).length;
    const persistent = notifications.filter(n => n.persistent).length;

    return {
      total,
      unread,
      persistent,
      byType
    };
  }, [notifications]);

  // Valeur du contexte
  const contextValue = useMemo(() => ({
    // État
    notifications,
    notificationsByPosition,
    stats,

    // Actions de base
    notify,
    addNotification,
    removeNotification,
    updateNotification,
    clearAllNotifications,
    markAsRead,

    // Raccourcis par type
    success,
    error,
    warning,
    info,
    loading,

    // Utilitaires
    hasNotifications: notifications.length > 0,
    hasUnreadNotifications: stats.unread > 0
  }), [
    notifications,
    notificationsByPosition,
    stats,
    notify,
    addNotification,
    removeNotification,
    updateNotification,
    clearAllNotifications,
    markAsRead,
    success,
    error,
    warning,
    info,
    loading
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook pour utiliser le store de notifications
 */
export function useNotificationStore() {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotificationStore must be used within a NotificationsProvider');
  }
  
  return context;
}

/**
 * Hook pour les actions rapides de notification
 */
export function useQuickNotifications() {
  const { success, error, warning, info, loading } = useNotificationStore();
  
  return {
    success,
    error,
    warning,
    info,
    loading
  };
}

/**
 * HOC pour injecter les notifications dans un composant
 */
export function withNotifications(Component) {
  return function NotificationWrappedComponent(props) {
    const notifications = useNotificationStore();
    return <Component {...props} notifications={notifications} />;
  };
}

/**
 * Utilitaires pour créer des notifications complexes
 */
export const NotificationUtils = {
  /**
   * Notification de confirmation d'action
   */
  confirmAction: (notificationStore, message, onConfirm, onCancel) => {
    return notificationStore.addNotification({
      type: 'warning',
      message,
      persistent: true,
      action: {
        label: 'Confirmer',
        onClick: () => {
          onConfirm?.();
          notificationStore.removeNotification();
        }
      },
      showCloseButton: true
    });
  },

  /**
   * Notification de progression
   */
  progress: (notificationStore, message, progress = 0) => {
    return notificationStore.addNotification({
      type: 'loading',
      message: `${message} (${Math.round(progress)}%)`,
      persistent: true,
      showCloseButton: false,
      progress
    });
  },

  /**
   * Notification de résultat d'opération
   */
  operationResult: (notificationStore, success, successMessage, errorMessage) => {
    if (success) {
      return notificationStore.success(successMessage);
    } else {
      return notificationStore.error(errorMessage);
    }
  },

  /**
   * Notification avec action personnalisée
   */
  withAction: (notificationStore, message, actionLabel, actionCallback, type = 'info') => {
    return notificationStore.addNotification({
      type,
      message,
      persistent: true,
      action: {
        label: actionLabel,
        onClick: actionCallback
      }
    });
  }
};