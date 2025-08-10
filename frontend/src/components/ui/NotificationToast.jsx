// frontend/src/components/ui/NotificationToast.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button/Button';
import { useNotificationStore } from '../../shared/store/notificationStore';

/**
 * Configuration des icônes par type
 */
const NOTIFICATION_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳'
};

/**
 * Configuration des couleurs par type
 */
const NOTIFICATION_STYLES = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600',
    progress: 'bg-green-500'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600',
    progress: 'bg-red-500'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
    progress: 'bg-yellow-500'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600',
    progress: 'bg-blue-500'
  },
  loading: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: 'text-gray-600',
    progress: 'bg-gray-500'
  }
};

/**
 * Composant individuel de notification
 */
const NotificationItem = ({ 
  notification, 
  onRemove, 
  onAction,
  position = 'top-right' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const styles = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.info;

  // Animation d'entrée
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Gestion de la fermeture avec animation
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300); // Durée de l'animation de sortie
  };

  // Classes d'animation selon la position
  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out transform';
    
    if (isExiting) {
      if (position.includes('right')) {
        return `${baseClasses} translate-x-full opacity-0`;
      } else {
        return `${baseClasses} -translate-x-full opacity-0`;
      }
    }
    
    if (!isVisible) {
      if (position.includes('right')) {
        return `${baseClasses} translate-x-full opacity-0`;
      } else {
        return `${baseClasses} -translate-x-full opacity-0`;
      }
    }
    
    return `${baseClasses} translate-x-0 opacity-100`;
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
        max-w-sm w-full
        ${styles.bg} ${styles.border} ${styles.text}
        ${getAnimationClasses()}
      `}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
    >
      {/* Icône */}
      <div className={`flex-shrink-0 text-lg ${styles.icon}`}>
        {notification.icon || NOTIFICATION_ICONS[notification.type]}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        {/* Titre */}
        {notification.title && (
          <div className="font-semibold text-sm mb-1">
            {notification.title}
          </div>
        )}

        {/* Message */}
        <div className="text-sm break-words">
          {notification.message}
        </div>

        {/* Barre de progression */}
        {notification.progress !== undefined && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${styles.progress}`}
                style={{ width: `${Math.max(0, Math.min(100, notification.progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {(notification.action || notification.secondaryAction) && (
          <div className="flex gap-2 mt-3">
            {notification.action && (
              <Button
                size="small"
                variant="primary"
                onClick={() => {
                  notification.action.onClick?.();
                  onAction?.(notification.id, 'primary');
                }}
              >
                {notification.action.label}
              </Button>
            )}
            {notification.secondaryAction && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => {
                  notification.secondaryAction.onClick?.();
                  onAction?.(notification.id, 'secondary');
                }}
              >
                {notification.secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bouton de fermeture */}
      {notification.showCloseButton !== false && (
        <Button
          variant="ghost"
          size="small"
          icon="×"
          onClick={handleClose}
          className={`flex-shrink-0 ${styles.icon} hover:bg-black hover:bg-opacity-10`}
          aria-label="Fermer la notification"
        />
      )}
    </div>
  );
};

/**
 * Container de notifications pour une position donnée
 */
const NotificationContainer = ({ 
  notifications, 
  position, 
  onRemove, 
  onAction 
}) => {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  // Classes de positionnement
  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50 flex flex-col gap-3 pointer-events-none';
    
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-center':
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  return (
    <div className={getPositionClasses()}>
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem
            notification={notification}
            onRemove={onRemove}
            onAction={onAction}
            position={position}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Composant principal NotificationToast
 */
export default function NotificationToast() {
  const { 
    notificationsByPosition, 
    removeNotification, 
    markAsRead,
    hasNotifications 
  } = useNotificationStore();

  // Gestion des actions de notification
  const handleAction = (notificationId, actionType) => {
    // Marquer comme lue quand une action est effectuée
    markAsRead(notificationId);
    
    // Supprimer après action si ce n'est pas persistant
    const notification = Object.values(notificationsByPosition)
      .flat()
      .find(n => n.id === notificationId);
      
    if (notification && !notification.persistent) {
      setTimeout(() => {
        removeNotification(notificationId);
      }, 500);
    }
  };

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Escape pour fermer toutes les notifications
      if (e.key === 'Escape' && hasNotifications) {
        const allNotifications = Object.values(notificationsByPosition).flat();
        allNotifications.forEach(notification => {
          if (notification.showCloseButton !== false) {
            removeNotification(notification.id);
          }
        });
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [hasNotifications, notificationsByPosition, removeNotification]);

  // Ne rien rendre si aucune notification
  if (!hasNotifications) {
    return null;
  }

  // Rendre les containers pour chaque position
  return createPortal(
    <>
      {Object.entries(notificationsByPosition).map(([position, notifications]) => (
        <NotificationContainer
          key={position}
          position={position}
          notifications={notifications}
          onRemove={removeNotification}
          onAction={handleAction}
        />
      ))}

      {/* Overlay pour les notifications en mode plein écran sur mobile */}
      {hasNotifications && (
        <style jsx global>{`
          @media (max-width: 640px) {
            .notification-mobile-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.1);
              pointer-events: none;
              z-index: 49;
            }
          }
        `}</style>
      )}
    </>,
    document.body
  );
}

/**
 * Hook pour notifications avec gestion automatique des erreurs React
 */
export function useNotificationErrorBoundary() {
  const { error } = useNotificationStore();

  return {
    onError: (errorObj, errorInfo) => {
      console.error('Erreur React capturée:', errorObj, errorInfo);
      
      // Créer un message d'erreur informatif
      const errorMessage = errorObj?.message || 'Une erreur inattendue s\'est produite';
      const componentStack = errorInfo?.componentStack || '';
      
      // Notification d'erreur avec détails pour le développement
      error(errorMessage, {
        title: 'Erreur de l\'application',
        persistent: true,
        action: {
          label: 'Voir les détails',
          onClick: () => {
            console.group('Détails de l\'erreur');
            console.error('Erreur:', errorObj);
            console.error('Stack des composants:', componentStack);
            console.groupEnd();
            
            // Optionnel: Ouvrir les outils de développement
            if (process.env.NODE_ENV === 'development') {
              console.warn('Ouvrez les outils de développement pour plus de détails');
            }
          }
        },
        secondaryAction: {
          label: 'Recharger la page',
          onClick: () => {
            window.location.reload();
          }
        }
      });
    },
    
    // Méthode pour capturer les erreurs de promesses non gérées
    capturePromiseRejection: (reason, promise) => {
      console.error('Promesse rejetée non gérée:', reason, promise);
      
      error('Erreur de connexion ou de traitement', {
        title: 'Erreur réseau',
        action: {
          label: 'Réessayer',
          onClick: () => {
            // L'appelant peut définir une logique de retry
            console.log('Retry demandé pour:', reason);
          }
        }
      });
    }
  };
}

/**
 * Hook pour simplifier l'utilisation des notifications dans les composants
 */
export function useToast() {
  const { success, error, warning, info, loading, removeNotification } = useNotificationStore();

  const toast = {
    success: (message, options) => success(message, options),
    error: (message, options) => error(message, options),
    warning: (message, options) => warning(message, options),
    info: (message, options) => info(message, options),
    loading: (message, options) => loading(message, options),
    dismiss: (id) => removeNotification(id)
  };

  return toast;
}

/**
 * Composant Error Boundary avec notifications automatiques
 */
export class NotificationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const { onError } = this.props;
    
    if (onError) {
      onError(error, errorInfo);
    } else {
      // Fallback si pas de handler fourni
      console.error('Error Boundary a capturé une erreur:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Interface de fallback personnalisable
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-64 p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Une erreur s'est produite</h2>
            <p className="text-gray-600 mb-4">
              L'application a rencontré une erreur inattendue.
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
            >
              Recharger la page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}