// backend/shared/constants/relationshipTypes.js - Types de relations entre entités OSINT
// Configuration centralisée des types de relations pour l'application LUCIDE

/**
 * Types de relations avec leurs propriétés et visualisation
 */
const RELATIONSHIP_TYPES = {
  // =============================================
  // RELATIONS PERSONNELLES
  // =============================================
  family: {
    name: 'Familial',
    category: 'personal',
    color: '#ef4444', // Rouge
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: true,
    description: 'Relation familiale (parent, enfant, conjoint, frère/sœur)',
    subtypes: [
      'parent', 'child', 'spouse', 'sibling', 'cousin', 
      'grandparent', 'grandchild', 'uncle', 'aunt', 'nephew', 'niece'
    ]
  },

  friend: {
    name: 'Ami',
    category: 'personal',
    color: '#22c55e', // Vert
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: true,
    description: 'Relation d\'amitié'
  },

  romantic: {
    name: 'Romantique',
    category: 'personal',
    color: '#ec4899', // Rose
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: true,
    description: 'Relation amoureuse (couple, ex-conjoint)',
    subtypes: ['dating', 'engaged', 'married', 'divorced', 'separated']
  },

  acquaintance: {
    name: 'Connaissance',
    category: 'personal',
    color: '#94a3b8', // Gris clair
    strokeStyle: 'dashed',
    strength: 'weak',
    bidirectional: true,
    description: 'Simple connaissance ou contact occasionnel'
  },

  enemy: {
    name: 'Ennemi',
    category: 'personal',
    color: '#dc2626', // Rouge foncé
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: true,
    description: 'Relation hostile ou conflictuelle'
  },

  // =============================================
  // RELATIONS PROFESSIONNELLES
  // =============================================
  colleague: {
    name: 'Collègue',
    category: 'professional',
    color: '#3b82f6', // Bleu
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: true,
    description: 'Collègue de travail'
  },

  supervisor: {
    name: 'Supérieur',
    category: 'professional',
    color: '#1d4ed8', // Bleu foncé
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Relation hiérarchique (chef/employé)',
    reverseType: 'subordinate'
  },

  subordinate: {
    name: 'Subordonné',
    category: 'professional',
    color: '#60a5fa', // Bleu clair
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Employé sous supervision',
    reverseType: 'supervisor'
  },

  business_partner: {
    name: 'Partenaire',
    category: 'professional',
    color: '#7c3aed', // Violet
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: true,
    description: 'Partenaire commercial ou d\'affaires'
  },

  client: {
    name: 'Client',
    category: 'professional',
    color: '#059669', // Vert foncé
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Relation client/fournisseur',
    reverseType: 'service_provider'
  },

  service_provider: {
    name: 'Fournisseur',
    category: 'professional',
    color: '#10b981', // Vert
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Fournit un service ou produit',
    reverseType: 'client'
  },

  // =============================================
  // RELATIONS CRIMINELLES
  // =============================================
  accomplice: {
    name: 'Complice',
    category: 'criminal',
    color: '#dc2626', // Rouge
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: true,
    description: 'Complice dans une activité criminelle'
  },

  victim: {
    name: 'Victime',
    category: 'criminal',
    color: '#f59e0b', // Orange
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Victime d\'un crime',
    reverseType: 'perpetrator'
  },

  perpetrator: {
    name: 'Auteur',
    category: 'criminal',
    color: '#b91c1c', // Rouge foncé
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Auteur d\'un crime',
    reverseType: 'victim'
  },

  witness: {
    name: 'Témoin',
    category: 'criminal',
    color: '#0ea5e9', // Bleu clair
    strokeStyle: 'dashed',
    strength: 'weak',
    bidirectional: false,
    description: 'Témoin d\'un événement ou crime'
  },

  informant: {
    name: 'Informateur',
    category: 'criminal',
    color: '#6366f1', // Indigo
    strokeStyle: 'dotted',
    strength: 'medium',
    bidirectional: false,
    description: 'Fournit des informations aux autorités'
  },

  // =============================================
  // RELATIONS ORGANISATIONNELLES
  // =============================================
  member_of: {
    name: 'Membre de',
    category: 'organizational',
    color: '#8b5cf6', // Violet
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Membre d\'une organisation'
  },

  employee_of: {
    name: 'Employé de',
    category: 'organizational',
    color: '#3b82f6', // Bleu
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Employé d\'une organisation'
  },

  owner_of: {
    name: 'Propriétaire de',
    category: 'organizational',
    color: '#059669', // Vert foncé
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: false,
    description: 'Propriétaire d\'un bien, entreprise ou compte'
  },

  director_of: {
    name: 'Dirigeant de',
    category: 'organizational',
    color: '#1d4ed8', // Bleu foncé
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: false,
    description: 'Dirigeant ou directeur d\'une organisation'
  },

  // =============================================
  // RELATIONS GÉOGRAPHIQUES
  // =============================================
  lives_at: {
    name: 'Habite à',
    category: 'geographical',
    color: '#10b981', // Vert
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: false,
    description: 'Lieu de résidence'
  },

  works_at: {
    name: 'Travaille à',
    category: 'geographical',
    color: '#3b82f6', // Bleu
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Lieu de travail'
  },

  visits: {
    name: 'Visite',
    category: 'geographical',
    color: '#06b6d4', // Cyan
    strokeStyle: 'dashed',
    strength: 'weak',
    bidirectional: false,
    description: 'Visite ou fréquente un lieu'
  },

  near: {
    name: 'Proche de',
    category: 'geographical',
    color: '#84cc16', // Lime
    strokeStyle: 'dotted',
    strength: 'weak',
    bidirectional: true,
    description: 'Proximité géographique'
  },

  // =============================================
  // RELATIONS NUMÉRIQUES
  // =============================================
  owns_account: {
    name: 'Possède compte',
    category: 'digital',
    color: '#8b5cf6', // Violet
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: false,
    description: 'Propriétaire d\'un compte en ligne'
  },

  manages_account: {
    name: 'Gère compte',
    category: 'digital',
    color: '#a855f7', // Violet clair
    strokeStyle: 'dashed',
    strength: 'medium',
    bidirectional: false,
    description: 'Gère un compte (administrateur)'
  },

  connected_online: {
    name: 'Connecté en ligne',
    category: 'digital',
    color: '#06b6d4', // Cyan
    strokeStyle: 'dotted',
    strength: 'weak',
    bidirectional: true,
    description: 'Connexion sur réseau social ou plateforme'
  },

  follows: {
    name: 'Suit',
    category: 'digital',
    color: '#0ea5e9', // Bleu clair
    strokeStyle: 'dashed',
    strength: 'weak',
    bidirectional: false,
    description: 'Suit sur réseau social',
    reverseType: 'followed_by'
  },

  followed_by: {
    name: 'Suivi par',
    category: 'digital',
    color: '#38bdf8', // Bleu très clair
    strokeStyle: 'dashed',
    strength: 'weak',
    bidirectional: false,
    description: 'Suivi sur réseau social',
    reverseType: 'follows'
  },

  // =============================================
  // RELATIONS TEMPORELLES
  // =============================================
  present_at: {
    name: 'Présent à',
    category: 'temporal',
    color: '#ec4899', // Rose
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: false,
    description: 'Présent lors d\'un événement'
  },

  organizes: {
    name: 'Organise',
    category: 'temporal',
    color: '#be185d', // Rose foncé
    strokeStyle: 'solid',
    strength: 'strong',
    bidirectional: false,
    description: 'Organise un événement'
  },

  before: {
    name: 'Avant',
    category: 'temporal',
    color: '#64748b', // Gris
    strokeStyle: 'solid',
    strength: 'weak',
    bidirectional: false,
    description: 'Événement antérieur',
    reverseType: 'after'
  },

  after: {
    name: 'Après',
    category: 'temporal',
    color: '#475569', // Gris foncé
    strokeStyle: 'solid',
    strength: 'weak',
    bidirectional: false,
    description: 'Événement postérieur',
    reverseType: 'before'
  },

  // =============================================
  // RELATIONS GÉNÉRIQUES
  // =============================================
  connected: {
    name: 'Connecté',
    category: 'generic',
    color: '#6b7280', // Gris
    strokeStyle: 'solid',
    strength: 'medium',
    bidirectional: true,
    description: 'Relation générique (non spécifiée)'
  },

  related: {
    name: 'Lié',
    category: 'generic',
    color: '#9ca3af', // Gris clair
    strokeStyle: 'dashed',
    strength: 'weak',
    bidirectional: true,
    description: 'Relation générale non définie'
  },

  suspicious: {
    name: 'Suspect',
    category: 'generic',
    color: '#f59e0b', // Orange
    strokeStyle: 'dotted',
    strength: 'medium',
    bidirectional: true,
    description: 'Relation suspecte à investiguer'
  }
};

/**
 * Catégories de relations avec leurs propriétés
 */
const RELATIONSHIP_CATEGORIES = {
  personal: {
    name: 'Personnel',
    color: '#ef4444',
    icon: 'heart',
    description: 'Relations personnelles et familiales'
  },
  professional: {
    name: 'Professionnel',
    color: '#3b82f6',
    icon: 'briefcase',
    description: 'Relations de travail et d\'affaires'
  },
  criminal: {
    name: 'Criminel',
    color: '#dc2626',
    icon: 'alert-triangle',
    description: 'Relations liées à des activités criminelles'
  },
  organizational: {
    name: 'Organisationnel',
    color: '#8b5cf6',
    icon: 'building',
    description: 'Relations avec des organisations'
  },
  geographical: {
    name: 'Géographique',
    color: '#10b981',
    icon: 'map-pin',
    description: 'Relations de localisation'
  },
  digital: {
    name: 'Numérique',
    color: '#06b6d4',
    icon: 'monitor',
    description: 'Relations numériques et en ligne'
  },
  temporal: {
    name: 'Temporel',
    color: '#ec4899',
    icon: 'clock',
    description: 'Relations temporelles et événementielles'
  },
  generic: {
    name: 'Générique',
    color: '#6b7280',
    icon: 'link',
    description: 'Relations générales non spécifiées'
  }
};

/**
 * Forces de relation avec leur visualisation
 */
const RELATIONSHIP_STRENGTHS = {
  weak: {
    name: 'Faible',
    value: 1,
    strokeWidth: 1,
    opacity: 0.6,
    description: 'Relation faible ou occasionnelle'
  },
  medium: {
    name: 'Moyenne',
    value: 2,
    strokeWidth: 2,
    opacity: 0.8,
    description: 'Relation régulière ou importante'
  },
  strong: {
    name: 'Forte',
    value: 3,
    strokeWidth: 3,
    opacity: 1.0,
    description: 'Relation forte ou cruciale'
  }
};

/**
 * Styles de traits pour les relations
 */
const STROKE_STYLES = {
  solid: {
    name: 'Solide',
    dashArray: null,
    description: 'Relation confirmée'
  },
  dashed: {
    name: 'Pointillé',
    dashArray: '5,5',
    description: 'Relation probable ou temporaire'
  },
  dotted: {
    name: 'Points',
    dashArray: '2,3',
    description: 'Relation possible ou à vérifier'
  }
};

/**
 * Fonctions utilitaires pour les relations
 */

/**
 * Obtenir la configuration d'un type de relation
 * @param {string} type - Type de relation
 * @returns {Object|null} Configuration du type
 */
function getRelationshipType(type) {
  return RELATIONSHIP_TYPES[type] || null;
}

/**
 * Obtenir tous les types de relations
 * @returns {Object} Tous les types de relations
 */
function getAllRelationshipTypes() {
  return RELATIONSHIP_TYPES;
}

/**
 * Obtenir les types de relations par catégorie
 * @param {string} category - Catégorie
 * @returns {Object} Types de relations de la catégorie
 */
function getRelationshipTypesByCategory(category) {
  return Object.fromEntries(
    Object.entries(RELATIONSHIP_TYPES).filter(([, config]) => config.category === category)
  );
}

/**
 * Obtenir le type de relation inverse (si applicable)
 * @param {string} type - Type de relation
 * @returns {string|null} Type inverse ou null
 */
function getReverseRelationshipType(type) {
  const relationConfig = getRelationshipType(type);
  return relationConfig?.reverseType || null;
}

/**
 * Valider si un type de relation est valide
 * @param {string} type - Type de relation à valider
 * @returns {boolean} True si valide
 */
function isValidRelationshipType(type) {
  return type in RELATIONSHIP_TYPES;
}

/**
 * Obtenir les relations suggérées entre deux types d'entités
 * @param {string} fromEntityType - Type entité source
 * @param {string} toEntityType - Type entité destination
 * @returns {Array} Types de relations suggérées
 */
function getSuggestedRelations(fromEntityType, toEntityType) {
  const suggestions = [];
  
  // Relations spécifiques selon les types d'entités
  const entityRelations = {
    person: {
      person: ['family', 'friend', 'colleague', 'acquaintance', 'enemy', 'accomplice'],
      place: ['lives_at', 'works_at', 'visits'],
      vehicle: ['owner_of'],
      organization: ['employee_of', 'member_of', 'owner_of'],
      account: ['owns_account', 'manages_account'],
      event: ['present_at', 'organizes'],
      document: ['owner_of']
    },
    organization: {
      person: ['employee_of', 'member_of', 'client'],
      place: ['located_at'],
      organization: ['business_partner'],
      account: ['owns_account'],
      event: ['organizes']
    },
    place: {
      person: ['lives_at', 'works_at'],
      organization: ['headquarters_of'],
      event: ['location_of']
    },
    event: {
      person: ['present_at'],
      place: ['occurs_at'],
      event: ['before', 'after']
    }
  };

  if (entityRelations[fromEntityType] && entityRelations[fromEntityType][toEntityType]) {
    suggestions.push(...entityRelations[fromEntityType][toEntityType]);
  }

  // Ajouter les relations génériques
  suggestions.push('connected', 'related');

  // Retourner les types de relations uniques
  return [...new Set(suggestions)];
}

/**
 * Formater une relation pour l'affichage
 * @param {string} type - Type de relation
 * @param {string} strength - Force de la relation
 * @param {string} direction - Direction (forward/reverse)
 * @returns {Object} Relation formatée
 */
function formatRelationshipForDisplay(type, strength = 'medium', direction = 'forward') {
  const relationConfig = getRelationshipType(type);
  if (!relationConfig) {
    return {
      name: type,
      color: '#6b7280',
      strength: strength
    };
  }

  let displayName = relationConfig.name;
  
  // Utiliser le type inverse si nécessaire
  if (direction === 'reverse' && relationConfig.reverseType) {
    const reverseConfig = getRelationshipType(relationConfig.reverseType);
    displayName = reverseConfig ? reverseConfig.name : relationConfig.name;
  }

  const strengthConfig = RELATIONSHIP_STRENGTHS[strength] || RELATIONSHIP_STRENGTHS.medium;

  return {
    name: displayName,
    color: relationConfig.color,
    strength: strengthConfig.name,
    strokeWidth: strengthConfig.strokeWidth,
    opacity: strengthConfig.opacity,
    strokeStyle: relationConfig.strokeStyle,
    category: relationConfig.category
  };
}

/**
 * Obtenir les statistiques des relations par catégorie
 * @param {Array} relationships - Liste des relations
 * @returns {Object} Statistiques par catégorie
 */
function getRelationshipStatsByCategory(relationships = []) {
  const stats = {};
  
  // Initialiser les catégories
  Object.keys(RELATIONSHIP_CATEGORIES).forEach(category => {
    stats[category] = {
      count: 0,
      types: {},
      percentage: 0
    };
  });

  // Compter les relations
  relationships.forEach(rel => {
    const relationConfig = getRelationshipType(rel.type);
    if (relationConfig) {
      const category = relationConfig.category;
      stats[category].count++;
      stats[category].types[rel.type] = (stats[category].types[rel.type] || 0) + 1;
    }
  });

  // Calculer les pourcentages
  const total = relationships.length;
  if (total > 0) {
    Object.keys(stats).forEach(category => {
      stats[category].percentage = Math.round((stats[category].count / total) * 100);
    });
  }

  return stats;
}

/**
 * Filtrer les relations par critères
 * @param {Array} relationships - Relations à filtrer
 * @param {Object} filters - Critères de filtrage
 * @returns {Array} Relations filtrées
 */
function filterRelationships(relationships, filters = {}) {
  const {
    categories = [],
    types = [],
    strengths = [],
    bidirectional = null
  } = filters;

  return relationships.filter(rel => {
    const relationConfig = getRelationshipType(rel.type);
    if (!relationConfig) return false;

    // Filtrer par catégorie
    if (categories.length > 0 && !categories.includes(relationConfig.category)) {
      return false;
    }

    // Filtrer par type
    if (types.length > 0 && !types.includes(rel.type)) {
      return false;
    }

    // Filtrer par force
    if (strengths.length > 0 && !strengths.includes(rel.strength || 'medium')) {
      return false;
    }

    // Filtrer par bidirectionnalité
    if (bidirectional !== null && relationConfig.bidirectional !== bidirectional) {
      return false;
    }

    return true;
  });
}

/**
 * Créer une relation avec validation
 * @param {string} fromEntity - ID entité source
 * @param {string} toEntity - ID entité destination
 * @param {string} type - Type de relation
 * @param {Object} options - Options additionnelles
 * @returns {Object} Relation créée ou erreur
 */
function createRelationship(fromEntity, toEntity, type, options = {}) {
  const {
    strength = 'medium',
    description = '',
    attributes = {}
  } = options;

  // Validation
  if (!fromEntity || !toEntity) {
    return { error: 'IDs des entités requis' };
  }

  if (fromEntity === toEntity) {
    return { error: 'Une entité ne peut pas être en relation avec elle-même' };
  }

  if (!isValidRelationshipType(type)) {
    return { error: `Type de relation invalide: ${type}` };
  }

  if (!Object.keys(RELATIONSHIP_STRENGTHS).includes(strength)) {
    return { error: `Force de relation invalide: ${strength}` };
  }

  return {
    from_entity: fromEntity,
    to_entity: toEntity,
    type,
    strength,
    description,
    attributes: JSON.stringify(attributes),
    created_at: new Date().toISOString()
  };
}

/**
 * Obtenir les couleurs par catégorie pour la légende
 * @returns {Object} Mapping catégorie -> couleur
 */
function getCategoryColors() {
  const colors = {};
  Object.entries(RELATIONSHIP_CATEGORIES).forEach(([key, config]) => {
    colors[key] = config.color;
  });
  return colors;
}

/**
 * Obtenir les relations les plus courantes
 * @param {Array} relationships - Liste des relations
 * @param {number} limit - Nombre max de résultats
 * @returns {Array} Relations triées par fréquence
 */
function getMostCommonRelationships(relationships, limit = 5) {
  const counts = {};
  
  relationships.forEach(rel => {
    counts[rel.type] = (counts[rel.type] || 0) + 1;
  });

  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([type, count]) => ({
      type,
      count,
      config: getRelationshipType(type),
      percentage: Math.round((count / relationships.length) * 100)
    }));
}

module.exports = {
  // Constantes principales
  RELATIONSHIP_TYPES,
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_STRENGTHS,
  STROKE_STYLES,
  
  // Fonctions utilitaires
  getRelationshipType,
  getAllRelationshipTypes,
  getRelationshipTypesByCategory,
  getReverseRelationshipType,
  isValidRelationshipType,
  getSuggestedRelations,
  formatRelationshipForDisplay,
  getRelationshipStatsByCategory,
  filterRelationships,
  createRelationship,
  getCategoryColors,
  getMostCommonRelationships
};