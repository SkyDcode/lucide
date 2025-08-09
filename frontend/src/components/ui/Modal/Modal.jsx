// frontend/src/components/ui/Modal/Modal.jsx - Composant Modal réutilisable
import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Button from '../Button/Button';
import './Modal.css';

/**
 * Composant Modal réutilisable avec gestion de l'accessibilité
 */
const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'medium',
  closable = true,
  showHeader = true,
  showFooter = false,
  footerActions = [],
  overlayClosable = true,
  className = '',
  zIndex = 1000,
  closeOnEscape = true,
  focusTrap = true,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const isFirstRender = useRef(true);

  /**
   * Fermer la modal
   */
  const handleClose = useCallback(() => {
    if (closable && onClose) {
      onClose();
    }
  }, [closable, onClose]);

  /**
   * Gérer les clics sur l'overlay
   */
  const handleOverlayClick = useCallback((event) => {
    if (overlayClosable && event.target === event.currentTarget) {
      handleClose();
    }
  }, [overlayClosable, handleClose]);

  /**
   * Gérer les touches du clavier
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && closeOnEscape) {
      handleClose();
    }

    // Piège de focus (focus trap)
    if (focusTrap && event.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    }
  }, [closeOnEscape, focusTrap, handleClose]);

  /**
   * Gérer l'ouverture de la modal
   */
  useEffect(() => {
    if (isOpen) {
      // Sauvegarder l'élément actif avant l'ouverture
      previousFocusRef.current = document.activeElement;

      // Ajouter les écouteurs d'événements
      document.addEventListener('keydown', handleKeyDown);
      
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';
      
      // Focus sur la modal après le premier rendu
      setTimeout(() => {
        const modal = modalRef.current;
        if (modal) {
          const firstFocusable = modal.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modal.focus();
          }
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  /**
   * Restaurer le focus lors de la fermeture
   */
  useEffect(() => {
    if (!isOpen && !isFirstRender.current) {
      // Restaurer le focus sur l'élément précédent
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
    isFirstRender.current = false;
  }, [isOpen]);

  /**
   * Construire les classes CSS
   */
  const getModalClasses = () => {
    return [
      'modal',
      `modal--${size}`,
      className
    ].filter(Boolean).join(' ');
  };

  /**
   * Rendre l'en-tête de la modal
   */
  const renderHeader = () => {
    if (!showHeader && !title) return null;

    return (
      <div className="modal__header">
        {title && (
          <h2 className="modal__title" id="modal-title">
            {title}
          </h2>
        )}
        {closable && (
          <Button
            variant="ghost"
            size="small"
            icon="×"
            onClick={handleClose}
            className="modal__close"
            aria-label="Fermer la modal"
          />
        )}
      </div>
    );
  };

  /**
   * Rendre le pied de page de la modal
   */
  const renderFooter = () => {
    if (!showFooter && footerActions.length === 0) return null;

    return (
      <div className="modal__footer">
        <div className="modal__actions">
          {footerActions.map((action, index) => (
            <Button
              key={action.key || index}
              variant={action.variant || 'secondary'}
              size={action.size || 'medium'}
              disabled={action.disabled}
              loading={action.loading}
              onClick={action.onClick}
              className={action.className}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Rendre le contenu de la modal
   */
  const renderModalContent = () => {
    return (
      <div
        className="modal__overlay"
        style={{ zIndex }}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby="modal-content"
      >
        <div
          ref={modalRef}
          className={getModalClasses()}
          tabIndex={-1}
          {...props}
        >
          {renderHeader()}
          
          <div className="modal__content" id="modal-content">
            {children}
          </div>
          
          {renderFooter()}
        </div>
      </div>
    );
  };

  // Ne pas rendre si la modal n'est pas ouverte
  if (!isOpen) return null;

  // Utiliser un portail pour rendre la modal au niveau racine
  return createPortal(
    renderModalContent(),
    document.body
  );
};

Modal.propTypes = {
  /** État d'ouverture de la modal */
  isOpen: PropTypes.bool,
  
  /** Fonction appelée lors de la fermeture */
  onClose: PropTypes.func,
  
  /** Titre de la modal */
  title: PropTypes.string,
  
  /** Contenu de la modal */
  children: PropTypes.node,
  
  /** Taille de la modal */
  size: PropTypes.oneOf(['small', 'medium', 'large', 'extra-large']),
  
  /** La modal peut-elle être fermée */
  closable: PropTypes.bool,
  
  /** Afficher l'en-tête */
  showHeader: PropTypes.bool,
  
  /** Afficher le pied de page */
  showFooter: PropTypes.bool,
  
  /** Actions du pied de page */
  footerActions: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string.isRequired,
    variant: PropTypes.string,
    size: PropTypes.string,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    onClick: PropTypes.func,
    className: PropTypes.string
  })),
  
  /** Fermeture en cliquant sur l'overlay */
  overlayClosable: PropTypes.bool,
  
  /** Classes CSS supplémentaires */
  className: PropTypes.string,
  
  /** Index Z pour le positionnement */
  zIndex: PropTypes.number,
  
  /** Fermeture avec la touche Escape */
  closeOnEscape: PropTypes.bool,
  
  /** Piège de focus */
  focusTrap: PropTypes.bool
};

export default Modal;