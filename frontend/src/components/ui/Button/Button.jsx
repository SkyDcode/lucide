// frontend/src/components/ui/Button/Button.jsx - Composant Button réutilisable
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './Button.css';

/**
 * Composant Button réutilisable avec différents styles et états
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  /**
   * Construire les classes CSS
   */
  const getButtonClasses = () => {
    const classes = [
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      fullWidth && 'btn--full-width',
      loading && 'btn--loading',
      disabled && 'btn--disabled',
      icon && !children && 'btn--icon-only',
      className
    ].filter(Boolean);

    return classes.join(' ');
  };

  /**
   * Gérer le clic
   */
  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    
    if (onClick) {
      onClick(event);
    }
  };

  /**
   * Rendre l'icône
   */
  const renderIcon = () => {
    if (!icon) return null;

    const iconElement = typeof icon === 'string' ? (
      <i className={`icon ${icon}`} aria-hidden="true" />
    ) : (
      <span className="btn__icon" aria-hidden="true">
        {icon}
      </span>
    );

    return iconElement;
  };

  /**
   * Rendre le spinner de chargement
   */
  const renderLoadingSpinner = () => {
    return (
      <span className="btn__spinner" aria-hidden="true">
        <svg
          className="btn__spinner-svg"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="btn__spinner-circle"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
    );
  };

  /**
   * Rendre le contenu du bouton
   */
  const renderContent = () => {
    const iconElement = renderIcon();
    const hasText = children && React.Children.count(children) > 0;

    if (loading) {
      return (
        <>
          {renderLoadingSpinner()}
          {hasText && <span className="btn__text">{children}</span>}
        </>
      );
    }

    if (!hasText && iconElement) {
      // Bouton avec icône uniquement
      return iconElement;
    }

    if (iconPosition === 'left') {
      return (
        <>
          {iconElement}
          {hasText && <span className="btn__text">{children}</span>}
        </>
      );
    } else {
      return (
        <>
          {hasText && <span className="btn__text">{children}</span>}
          {iconElement}
        </>
      );
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      className={getButtonClasses()}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {renderContent()}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  /** Contenu du bouton */
  children: PropTypes.node,
  
  /** Variante de style */
  variant: PropTypes.oneOf([
    'primary',
    'secondary', 
    'success',
    'warning',
    'danger',
    'info',
    'ghost',
    'outline'
  ]),
  
  /** Taille du bouton */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  /** État désactivé */
  disabled: PropTypes.bool,
  
  /** État de chargement */
  loading: PropTypes.bool,
  
  /** Icône (string de classe CSS ou élément React) */
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  
  /** Position de l'icône */
  iconPosition: PropTypes.oneOf(['left', 'right']),
  
  /** Largeur complète */
  fullWidth: PropTypes.bool,
  
  /** Classes CSS supplémentaires */
  className: PropTypes.string,
  
  /** Gestionnaire de clic */
  onClick: PropTypes.func,
  
  /** Type de bouton HTML */
  type: PropTypes.oneOf(['button', 'submit', 'reset'])
};

export default Button;