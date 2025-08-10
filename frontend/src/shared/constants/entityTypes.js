// frontend/src/shared/constants/entityTypes.js - Version frontend synchronisée avec le backend

/**
 * Types d'entités OSINT - Version frontend synchronisée avec backend/shared/constants/entityTypes.js
 * Cette version est simplifiée pour l'usage frontend tout en gardant la compatibilité
 */

/**
 * Définition des types d'entités avec leur configuration visuelle
 */
export const ENTITY_TYPES = {
  // Personnes
  person: {
    name: 'Personne',
    plural: 'Personnes',
    icon: '👤',
    color: '#ef4444',
    category: 'people',
    description: 'Individu physique dans l\'enquête'
  },

  // Lieux
  place: {
    name: 'Lieu',
    plural: 'Lieux',
    icon: '📍',
    color: '#10b981',
    category: 'locations',
    description: 'Localisation géographique'
  },

  // Véhicules
  vehicle: {
    name: 'Véhicule',
    plural: 'Véhicules',
    icon: '🚗',
    color: '#f59e0b',
    category: 'objects',
    description: 'Véhicule impliqué dans l\'enquête'
  },

  // Organisations
  organization: {
    name: 'Organisation',
    plural: 'Organisations',
    icon: '🏢',
    color: '#6366f1',
    category: 'entities',
    description: 'Entreprise, association ou organisation'
  },

  // Sites web
  website: {
    name: 'Site Web',
    plural: 'Sites Web',
    icon: '🌐',
    color: '#06b6d4',
    category: 'digital',
    description: 'Site web ou ressource en ligne'
  },

  // Comptes/Identifiants
  account: {
    name: 'Compte',
    plural: 'Comptes',
    icon: '💳',
    color: '#8b5cf6',
    category: 'digital',
    description: 'Compte en ligne ou identifiant numérique'
  },

  // Événements
  event: {
    name: 'Événement',
    plural: 'Événements',
    icon: '📅',
    color: '#ec4899',
    category: 'temporal',
    description: 'Événement ou incident dans la timeline'
  },

  // Documents/Médias
  document: {
    name: 'Document',
    plural: 'Documents',
    icon: '📄',
    color: '#64748b',
    category: 'evidence',
    description: 'Document ou fichier de preuve'
  },

  // Types supplémentaires pour la visualisation
  phone: {
    name: 'Téléphone',
    plural: 'Téléphones',
    icon: '📱',
    color: '#06b6d4',
    category: 'digital',
    description: 'Numéro de téléphone'
  },

  email: {
    name: 'Email',
    plural: 'Emails',
    icon: '📧',
    color: '#84cc16',
    category: 'digital',
    description: 'Adresse email'
  }
};

/**
 * Configuration des catégories d'entités
 */
export const ENTITY_CATEGORIES = {
  people: {
    name: 'Personnes',
    icon: '👥',
    color: '#ef4444',
    description: 'Individus physiques'
  },
  locations: {
    name: 'Lieux',
    icon: '🗺️',
    color: '#10b981',
    description: 'Localisations géographiques'
  },
  objects: {
    name: 'Objets',
    icon: '📦',
    color: '#f59e0b',
    description: 'Objets physiques et véhicules'
  },
  entities: {
    name: 'Entités',
    icon: '🏢',
    color: '#6366f1',
    description: 'Organisations et entreprises'
  },
  digital: {
    name: 'Numérique',
    icon: '💻',
    color: '#06b6d4',
    description: 'Ressources et comptes numériques'
  },
  temporal: {
    name: 'Temporel',
    icon: '⏰',
    color: '#ec4899',
    description: 'Événements et chronologie'
  },
  evidence: {
    name: 'Preuves',
    icon: '🛡️',
    color: '#64748b',
    description: 'Documents et éléments de preuve'
  }
};

/**
 * Palette de couleurs pour les entités
 */
export const ENTITY_COLORS = {
  primary: '#ef4444',   // Rouge
  secondary: '#10b981', // Vert
  accent: '#f59e0b',    // Orange
  info: '#06b6d4',      // Cyan
  success: '#22c55e',   // Vert clair
  warning: '#f59e0b',   // Orange
  error: '#ef4444',     // Rouge
  neutral: '#64748b'    // Gris
};

/**
 * Fonctions utilitaires pour les types d'entités
 */

/**
 * Obtenir la configuration d'un type d'entité
 * @param {string} type - Type d'entité
 * @returns {Object|null} Configuration du type
 */
export function getEntityType(type) {
  return ENTITY_TYPES[type] || null;
}

/**
 * Obtenir tous les types d'entités
 * @returns {Object} Tous les types d'entités
 */
export function getAllEntityTypes() {
  return ENTITY_TYPES;
}

/**
 * Obtenir les types d'entités par catégorie
 * @param {string} category - Catégorie
 * @returns {Object} Types d'entités de la catégorie
 */
export function getEntityTypesByCategory(category) {
  return Object.fromEntries(
    Object.entries(ENTITY_TYPES).filter(([, config]) => config.category === category)
  );
}

/**
 * Obtenir la couleur d'un type d'entité
 * @param {string} type - Type d'entité
 * @returns {string} Couleur hexadécimale
 */
export function getEntityTypeColor(type) {
  const entityType = getEntityType(type);
  return entityType ? entityType.color : ENTITY_COLORS.neutral;
}

/**
 * Obtenir l'icône d'un type d'entité
 * @param {string} type - Type d'entité
 * @returns {string} Icône
 */
export function getEntityTypeIcon(type) {
  const entityType = getEntityType(type);
  return entityType ? entityType.icon : '❓';
}

/**
 * Grouper les types d'entités par catégorie
 * @returns {Object} Types groupés par catégorie
 */
export function getEntitiesGroupedByCategory() {
  const grouped = {};
  
  Object.entries(ENTITY_TYPES).forEach(([type, config]) => {
    const category = config.category || 'unknown';
    if (!grouped[category]) {
      grouped[category] = {
        category: ENTITY_CATEGORIES[category] || {
          name: 'Autres',
          icon: '📂',
          color: '#9ca3af'
        },
        types: []
      };
    }
    grouped[category].types.push({ type, ...config });
  });
  
  return grouped;
}

/**
 * Obtenir une liste plate de tous les types avec leurs métadonnées
 * @returns {Array} Liste des types avec métadonnées
 */
export function getEntityTypesList() {
  return Object.entries(ENTITY_TYPES).map(([type, config]) => ({
    key: type,
    type,
    ...config,
    categoryInfo: ENTITY_CATEGORIES[config.category]
  }));
}

/**
 * Vérifier si un type d'entité existe
 * @param {string} type - Type à vérifier
 * @returns {boolean} True si le type existe
 */
export function isValidEntityType(type) {
  return type in ENTITY_TYPES;
}

/**
 * Obtenir les types d'entités les plus couramment utilisés
 * @returns {Array} Types d'entités de base
 */
export function getCommonEntityTypes() {
  return ['person', 'place', 'organization', 'vehicle', 'account', 'event'];
}

/**
 * Obtenir les suggestions de types selon une catégorie
 * @param {string} category - Catégorie
 * @returns {Array} Types suggérés
 */
export function getSuggestedEntityTypes(category) {
  const suggestions = {
    people: ['person'],
    locations: ['place'],
    objects: ['vehicle', 'document'],
    entities: ['organization'],
    digital: ['website', 'account', 'phone', 'email'],
    temporal: ['event'],
    evidence: ['document']
  };
  
  return suggestions[category] || [];
}

// Export par défaut pour compatibilité
const entityTypesModule = {
  ENTITY_TYPES,
  ENTITY_CATEGORIES,
  ENTITY_COLORS,
  getEntityType,
  getAllEntityTypes,
  getEntityTypesByCategory,
  getEntityTypeColor,
  getEntityTypeIcon,
  getEntitiesGroupedByCategory,
  getEntityTypesList,
  isValidEntityType,
  getCommonEntityTypes,
  getSuggestedEntityTypes
};

export default entityTypesModule;