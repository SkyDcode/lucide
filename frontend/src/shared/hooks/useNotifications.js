// frontend/src/shared/hooks/useNotifications.js
import { useCallback } from 'react';
import { useNotificationStore } from '../store/notificationStore';

/**
 * Hook principal pour utiliser le système de notifications
 * Fournit une interface simplifiée pour les composants
 */
export function useNotifications() {
  const {
    notify,
    success,
    error,
    warning,
    info,
    loading,
    addNotification,
    removeNotification,
    updateNotification,
    clearAllNotifications,
    markAsRead,
    notifications,
    stats,
    hasNotifications,
    hasUnreadNotifications
  } = useNotificationStore();

  /**
   * Notification avec gestion d'erreur automatique
   */
  const notifyAsync = useCallback(async (asyncFn, {
    loadingMessage = 'Traitement en cours...',
    successMessage = 'Opération réussie',
    errorMessage = 'Une erreur est survenue'
  } = {}) => {
    const loadingId = loading(loadingMessage);
    
    try {
      const result = await asyncFn();
      removeNotification(loadingId);
      success(successMessage);
      return result;
    } catch (err) {
      removeNotification(loadingId);
      error(typeof errorMessage === 'function' ? errorMessage(err) : errorMessage);
      throw err;
    }
  }, [loading, success, error, removeNotification]);

  /**
   * Notification de confirmation avec promesse
   */
  const confirm = useCallback((message, {
    title = 'Confirmation',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    type = 'warning'
  } = {}) => {
    return new Promise((resolve) => {
      const notificationId = addNotification({
        type,
        title,
        message,
        persistent: true,
        showCloseButton: false,
        action: {
          label: confirmLabel,
          onClick: () => {
            removeNotification(notificationId);
            resolve(true);
          }
        },
        secondaryAction: {
          label: cancelLabel,
          onClick: () => {
            removeNotification(notificationId);
            resolve(false);
          }
        }
      });
    });
  }, [addNotification, removeNotification]);

  /**
   * Notification avec progression mise à jour
   */
  const withProgress = useCallback((message, initialProgress = 0) => {
    const notificationId = addNotification({
      type: 'loading',
      message: `${message} (${Math.round(initialProgress)}%)`,
      persistent: true,
      showCloseButton: false,
      progress: initialProgress
    });

    const updateProgress = (progress, newMessage = null) => {
      updateNotification(notificationId, {
        message: `${newMessage || message} (${Math.round(progress)}%)`,
        progress
      });
    };

    const complete = (successMessage = null) => {
      removeNotification(notificationId);
      if (successMessage) {
        success(successMessage);
      }
    };

    const fail = (errorMessage = null) => {
      removeNotification(notificationId);
      if (errorMessage) {
        error(errorMessage);
      }
    };

    return {
      updateProgress,
      complete,
      fail,
      id: notificationId
    };
  }, [addNotification, updateNotification, removeNotification, success, error]);

  /**
   * Notification temporaire avec auto-suppression personnalisée
   */
  const temporary = useCallback((message, duration = 3000, type = 'info') => {
    return addNotification({
      type,
      message,
      duration,
      persistent: false
    });
  }, [addNotification]);

  /**
   * Notification persistante qui reste jusqu'à fermeture manuelle
   */
  const persistent = useCallback((message, type = 'info', action = null) => {
    return addNotification({
      type,
      message,
      persistent: true,
      action
    });
  }, [addNotification]);

  /**
   * Notification de résultat API avec gestion d'erreur standard
   */
  const apiResult = useCallback((promise, {
    loadingMessage = 'Chargement...',
    successMessage = 'Opération réussie',
    getErrorMessage = (err) => err.message || 'Erreur inconnue'
  } = {}) => {
    const loadingId = loading(loadingMessage);

    return promise
      .then((result) => {
        removeNotification(loadingId);
        success(successMessage);
        return result;
      })
      .catch((err) => {
        removeNotification(loadingId);
        error(getErrorMessage(err));
        throw err;
      });
  }, [loading, success, error, removeNotification]);

  /**
   * Notification groupée pour plusieurs opérations
   */
  const batch = useCallback((operations, {
    batchMessage = 'Traitement par lot en cours...',
    successMessage = 'Toutes les opérations ont réussi',
    partialSuccessMessage = (completed, total) => `${completed}/${total} opérations réussies`,
    errorMessage = 'Certaines opérations ont échoué'
  } = {}) => {
    const batchId = loading(batchMessage);
    let completed = 0;
    let errors = 0;

    const updateBatchProgress = () => {
      const progress = (completed + errors) / operations.length * 100;
      updateNotification(batchId, {
        message: `${batchMessage} (${completed + errors}/${operations.length})`,
        progress
      });
    };

    return Promise.allSettled(operations)
      .then((results) => {
        removeNotification(batchId);
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed === 0) {
          success(successMessage);
        } else if (successful > 0) {
          warning(partialSuccessMessage(successful, operations.length));
        } else {
          error(errorMessage);
        }

        return results;
      });
  }, [loading, updateNotification, removeNotification, success, warning, error]);

  /**
   * Notification avec retry automatique
   */
  const withRetry = useCallback((asyncFn, {
    maxRetries = 3,
    retryDelay = 1000,
    loadingMessage = 'Tentative en cours...',
    retryMessage = (attempt, max) => `Nouvel essai ${attempt}/${max}`,
    successMessage = 'Opération réussie',
    errorMessage = 'Toutes les tentatives ont échoué'
  } = {}) => {
    const attempt = async (retryCount = 0) => {
      const currentMessage = retryCount === 0 ? loadingMessage : retryMessage(retryCount + 1, maxRetries);
      const loadingId = loading(currentMessage);

      try {
        const result = await asyncFn();
        removeNotification(loadingId);
        success(successMessage);
        return result;
      } catch (err) {
        removeNotification(loadingId);
        
        if (retryCount < maxRetries) {
          warning(`Échec de la tentative ${retryCount + 1}, nouvel essai dans ${retryDelay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attempt(retryCount + 1);
        } else {
          error(errorMessage);
          throw err;
        }
      }
    };

    return attempt();
  }, [loading, removeNotification, success, warning, error]);

  /**
   * Utilitaires pour les opérations CRUD
   */
  const crud = {
    create: useCallback((promise, entityName = 'élément') => {
      return apiResult(promise, {
        loadingMessage: `Création en cours...`,
        successMessage: `${entityName} créé avec succès`,
        getErrorMessage: (err) => `Erreur lors de la création : ${err.message}`
      });
    }, [apiResult]),

    update: useCallback((promise, entityName = 'élément') => {
      return apiResult(promise, {
        loadingMessage: `Mise à jour en cours...`,
        successMessage: `${entityName} mis à jour avec succès`,
        getErrorMessage: (err) => `Erreur lors de la mise à jour : ${err.message}`
      });
    }, [apiResult]),

    delete: useCallback((promise, entityName = 'élément') => {
      return apiResult(promise, {
        loadingMessage: `Suppression en cours...`,
        successMessage: `${entityName} supprimé avec succès`,
        getErrorMessage: (err) => `Erreur lors de la suppression : ${err.message}`
      });
    }, [apiResult])
  };

  return {
    // Méthodes de base
    notify,
    success,
    error,
    warning,
    info,
    loading,

    // Méthodes avancées
    notifyAsync,
    confirm,
    withProgress,
    temporary,
    persistent,
    apiResult,
    batch,
    withRetry,

    // Utilitaires CRUD
    crud,

    // Gestion des notifications
    remove: removeNotification,
    update: updateNotification,
    clear: clearAllNotifications,
    markAsRead,

    // État
    notifications,
    stats,
    hasNotifications,
    hasUnreadNotifications
  };
}