// backend/shared/constants/entityTypes.js - Types d'entités pour application OSINT
// Configuration centralisée des types d'entités supportés par LUCIDE

/**
 * Définition des types d'entités OSINT avec leurs attributs et configuration
 */
const ENTITY_TYPES = {
  // =============================================
  // PERSONNES
  // =============================================
  person: {
    name: 'Personne',
    plural: 'Personnes',
    icon: 'user',
    color: '#ef4444', // Rouge
    category: 'people',
    description: 'Individu physique dans l\'enquête',
    attributes: {
      // Identité civile
      firstName: { type: 'string', label: 'Prénom', required: false },
      lastName: { type: 'string', label: 'Nom', required: false },
      birthDate: { type: 'date', label: 'Date de naissance', required: false },
      birthPlace: { type: 'string', label: 'Lieu de naissance', required: false },
      nationality: { type: 'string', label: 'Nationalité', required: false },
      gender: { type: 'select', label: 'Genre', options: ['M', 'F', 'Autre'], required: false },
      
      // Contact
      email: { type: 'email', label: 'Email', required: false },
      phone: { type: 'tel', label: 'Téléphone', required: false },
      address: { type: 'textarea', label: 'Adresse', required: false },
      
      // Réseaux sociaux
      facebook: { type: 'url', label: 'Facebook', required: false },
      instagram: { type: 'url', label: 'Instagram', required: false },
      twitter: { type: 'url', label: 'Twitter/X', required: false },
      linkedin: { type: 'url', label: 'LinkedIn', required: false },
      tiktok: { type: 'url', label: 'TikTok', required: false },
      snapchat: { type: 'string', label: 'Snapchat', required: false },
      
      // Professionnel
      occupation: { type: 'string', label: 'Profession', required: false },
      employer: { type: 'string', label: 'Employeur', required: false },
      workAddress: { type: 'textarea', label: 'Adresse professionnelle', required: false },
      
      // Physique
      height: { type: 'number', label: 'Taille (cm)', required: false },
      weight: { type: 'number', label: 'Poids (kg)', required: false },
      eyeColor: { type: 'select', label: 'Couleur yeux', options: ['Bleus', 'Verts', 'Marrons', 'Noirs', 'Gris'], required: false },
      hairColor: { type: 'select', label: 'Couleur cheveux', options: ['Blonds', 'Bruns', 'Noirs', 'Roux', 'Gris', 'Chauves'], required: false },
      
      // Identification
      idCard: { type: 'string', label: 'Numéro carte d\'identité', required: false },
      passport: { type: 'string', label: 'Numéro passeport', required: false },
      socialSecurity: { type: 'string', label: 'Numéro sécurité sociale', required: false },
      
      // Enquête
      role: { type: 'select', label: 'Rôle', options: ['Suspect', 'Témoin', 'Victime', 'Contact', 'Autre'], required: false },
      alias: { type: 'textarea', label: 'Alias/Pseudonymes', required: false },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  },

  // =============================================
  // LIEUX
  // =============================================
  place: {
    name: 'Lieu',
    plural: 'Lieux',
    icon: 'map-pin',
    color: '#10b981', // Vert
    category: 'locations',
    description: 'Localisation géographique',
    attributes: {
      // Localisation
      address: { type: 'textarea', label: 'Adresse complète', required: true },
      latitude: { type: 'number', label: 'Latitude', required: false },
      longitude: { type: 'number', label: 'Longitude', required: false },
      postalCode: { type: 'string', label: 'Code postal', required: false },
      city: { type: 'string', label: 'Ville', required: false },
      country: { type: 'string', label: 'Pays', required: false },
      
      // Type de lieu
      category: { type: 'select', label: 'Catégorie', 
        options: ['Domicile', 'Bureau', 'Commerce', 'École', 'Hôpital', 'Lieu public', 'Lieu crime', 'Autre'], 
        required: false 
      },
      
      // Détails
      description: { type: 'textarea', label: 'Description', required: false },
      accessInfo: { type: 'textarea', label: 'Informations d\'accès', required: false },
      openingHours: { type: 'string', label: 'Horaires', required: false },
      
      // Contacts
      phone: { type: 'tel', label: 'Téléphone', required: false },
      website: { type: 'url', label: 'Site web', required: false },
      
      // Enquête
      significance: { type: 'select', label: 'Importance', 
        options: ['Critique', 'Importante', 'Moyenne', 'Faible'], 
        required: false 
      },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  },

  // =============================================
  // VÉHICULES
  // =============================================
  vehicle: {
    name: 'Véhicule',
    plural: 'Véhicules',
    icon: 'car',
    color: '#f59e0b', // Orange
    category: 'objects',
    description: 'Véhicule impliqué dans l\'enquête',
    attributes: {
      // Identification
      licensePlate: { type: 'string', label: 'Plaque d\'immatriculation', required: true },
      vin: { type: 'string', label: 'Numéro VIN', required: false },
      
      // Caractéristiques
      make: { type: 'string', label: 'Marque', required: false },
      model: { type: 'string', label: 'Modèle', required: false },
      year: { type: 'number', label: 'Année', required: false },
      color: { type: 'string', label: 'Couleur', required: false },
      type: { type: 'select', label: 'Type', 
        options: ['Voiture', 'Moto', 'Camion', 'Van', 'Bus', 'Autre'], 
        required: false 
      },
      
      // Propriétaire
      owner: { type: 'string', label: 'Propriétaire', required: false },
      insurance: { type: 'string', label: 'Assurance', required: false },
      
      // État
      condition: { type: 'select', label: 'État', 
        options: ['Excellent', 'Bon', 'Moyen', 'Mauvais', 'Épave'], 
        required: false 
      },
      damages: { type: 'textarea', label: 'Dommages visibles', required: false },
      
      // Enquête
      lastSeen: { type: 'datetime-local', label: 'Dernière observation', required: false },
      location: { type: 'string', label: 'Dernière localisation', required: false },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  },

  // =============================================
  // ORGANISATIONS
  // =============================================
  organization: {
    name: 'Organisation',
    plural: 'Organisations',
    icon: 'building',
    color: '#6366f1', // Indigo
    category: 'entities',
    description: 'Entreprise, association ou organisation',
    attributes: {
      // Identification
      legalName: { type: 'string', label: 'Dénomination sociale', required: true },
      tradeName: { type: 'string', label: 'Nom commercial', required: false },
      siret: { type: 'string', label: 'Numéro SIRET', required: false },
      siren: { type: 'string', label: 'Numéro SIREN', required: false },
      vat: { type: 'string', label: 'Numéro TVA', required: false },
      
      // Type
      type: { type: 'select', label: 'Type', 
        options: ['Entreprise', 'Association', 'Administration', 'ONG', 'Syndicat', 'Parti politique', 'Autre'], 
        required: false 
      },
      sector: { type: 'string', label: 'Secteur d\'activité', required: false },
      
      // Contact
      address: { type: 'textarea', label: 'Adresse siège social', required: false },
      phone: { type: 'tel', label: 'Téléphone', required: false },
      email: { type: 'email', label: 'Email', required: false },
      website: { type: 'url', label: 'Site web', required: false },
      
      // Direction
      ceo: { type: 'string', label: 'Dirigeant principal', required: false },
      employees: { type: 'number', label: 'Nombre d\'employés', required: false },
      
      // Financier
      revenue: { type: 'string', label: 'Chiffre d\'affaires', required: false },
      founded: { type: 'date', label: 'Date de création', required: false },
      
      // Enquête
      involvement: { type: 'textarea', label: 'Implication dans l\'enquête', required: false },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  },

  // =============================================
  // SITES WEB
  // =============================================
  website: {
    name: 'Site Web',
    plural: 'Sites Web',
    icon: 'globe',
    color: '#06b6d4', // Cyan
    category: 'digital',
    description: 'Site web ou ressource en ligne',
    attributes: {
      // URL
      url: { type: 'url', label: 'URL', required: true },
      title: { type: 'string', label: 'Titre de la page', required: false },
      description: { type: 'textarea', label: 'Description', required: false },
      
      // Techniques
      ipAddress: { type: 'string', label: 'Adresse IP', required: false },
      hosting: { type: 'string', label: 'Hébergeur', required: false },
      registrar: { type: 'string', label: 'Registraire', required: false },
      creationDate: { type: 'date', label: 'Date création domaine', required: false },
      expirationDate: { type: 'date', label: 'Date expiration', required: false },
      
      // Contenu
      language: { type: 'string', label: 'Langue', required: false },
      technology: { type: 'string', label: 'Technologies utilisées', required: false },
      
      // Propriété
      owner: { type: 'string', label: 'Propriétaire', required: false },
      contact: { type: 'email', label: 'Contact', required: false },
      
      // Social
      facebook: { type: 'url', label: 'Page Facebook', required: false },
      twitter: { type: 'url', label: 'Compte Twitter', required: false },
      
      // Enquête
      relevance: { type: 'select', label: 'Pertinence', 
        options: ['Critique', 'Importante', 'Moyenne', 'Faible'], 
        required: false 
      },
      lastChecked: { type: 'datetime-local', label: 'Dernière vérification', required: false },
      status: { type: 'select', label: 'Statut', 
        options: ['Actif', 'Inactif', 'Suspendu', 'Supprimé'], 
        required: false 
      },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  },

  // =============================================
  // COMPTES/IDENTIFIANTS
  // =============================================
  account: {
    name: 'Compte',
    plural: 'Comptes',
    icon: 'user-circle',
    color: '#8b5cf6', // Violet
    category: 'digital',
    description: 'Compte en ligne ou identifiant numérique',
    attributes: {
      // Identification
      platform: { type: 'string', label: 'Plateforme/Service', required: true },
      username: { type: 'string', label: 'Nom d\'utilisateur', required: false },
      email: { type: 'email', label: 'Email associé', required: false },
      userId: { type: 'string', label: 'ID utilisateur', required: false },
      profileUrl: { type: 'url', label: 'URL du profil', required: false },
      
      // Profil
      displayName: { type: 'string', label: 'Nom affiché', required: false },
      bio: { type: 'textarea', label: 'Biographie/Description', required: false },
      followers: { type: 'number', label: 'Nombre d\'abonnés', required: false },
      following: { type: 'number', label: 'Nombre d\'abonnements', required: false },
      
      // Activité
      creationDate: { type: 'date', label: 'Date de création', required: false },
      lastActivity: { type: 'datetime-local', label: 'Dernière activité', required: false },
      verified: { type: 'boolean', label: 'Compte vérifié', required: false },
      
      // Confidentialité
      privacy: { type: 'select', label: 'Confidentialité', 
        options: ['Public', 'Privé', 'Protégé', 'Inconnu'], 
        required: false 
      },
      
      // Enquête
      owner: { type: 'string', label: 'Propriétaire présumé', required: false },
      significance: { type: 'select', label: 'Importance', 
        options: ['Critique', 'Importante', 'Moyenne', 'Faible'], 
        required: false 
      },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  },

  // =============================================
  // ÉVÉNEMENTS
  // =============================================
  event: {
    name: 'Événement',
    plural: 'Événements',
    icon: 'calendar',
    color: '#ec4899', // Rose
    category: 'temporal',
    description: 'Événement ou incident dans la timeline',
    attributes: {
      // Temporel
      startDate: { type: 'datetime-local', label: 'Date/heure début', required: true },
      endDate: { type: 'datetime-local', label: 'Date/heure fin', required: false },
      duration: { type: 'string', label: 'Durée estimée', required: false },
      
      // Localisation
      location: { type: 'string', label: 'Lieu', required: false },
      address: { type: 'textarea', label: 'Adresse', required: false },
      
      // Type
      category: { type: 'select', label: 'Catégorie', 
        options: ['Crime', 'Accident', 'Rencontre', 'Communication', 'Transaction', 'Voyage', 'Autre'], 
        required: false 
      },
      severity: { type: 'select', label: 'Gravité', 
        options: ['Critique', 'Importante', 'Moyenne', 'Faible'], 
        required: false 
      },
      
      // Participants
      participants: { type: 'textarea', label: 'Participants', required: false },
      witnesses: { type: 'textarea', label: 'Témoins', required: false },
      
      // Description
      summary: { type: 'string', label: 'Résumé', required: false },
      description: { type: 'textarea', label: 'Description détaillée', required: false },
      outcome: { type: 'textarea', label: 'Résultat/Conséquences', required: false },
      
      // Sources
      source: { type: 'string', label: 'Source d\'information', required: false },
      reliability: { type: 'select', label: 'Fiabilité', 
        options: ['Confirmé', 'Probable', 'Possible', 'Non vérifié'], 
        required: false 
      },
      
      // Enquête
      caseNumber: { type: 'string', label: 'Numéro de dossier', required: false },
      evidence: { type: 'textarea', label: 'Preuves associées', required: false },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  },

  // =============================================
  // DOCUMENTS/MÉDIAS
  // =============================================
  document: {
    name: 'Document',
    plural: 'Documents',
    icon: 'file-text',
    color: '#64748b', // Gris
    category: 'evidence',
    description: 'Document ou fichier de preuve',
    attributes: {
      // Identification
      title: { type: 'string', label: 'Titre', required: true },
      type: { type: 'select', label: 'Type', 
        options: ['Photo', 'Vidéo', 'Audio', 'PDF', 'Document Word', 'Email', 'SMS', 'Autre'], 
        required: false 
      },
      
      // Métadonnées
      fileSize: { type: 'string', label: 'Taille du fichier', required: false },
      format: { type: 'string', label: 'Format', required: false },
      hash: { type: 'string', label: 'Hash (intégrité)', required: false },
      
      // Origine
      source: { type: 'string', label: 'Source', required: false },
      dateCreated: { type: 'datetime-local', label: 'Date création', required: false },
      dateObtained: { type: 'datetime-local', label: 'Date obtention', required: false },
      obtainedBy: { type: 'string', label: 'Obtenu par', required: false },
      
      // Contenu
      description: { type: 'textarea', label: 'Description du contenu', required: false },
      keywords: { type: 'string', label: 'Mots-clés', required: false },
      
      // Juridique
      evidenceNumber: { type: 'string', label: 'Numéro de pièce', required: false },
      chainOfCustody: { type: 'textarea', label: 'Chaîne de possession', required: false },
      admissible: { type: 'boolean', label: 'Recevable en justice', required: false },
      
      // Classification
      classification: { type: 'select', label: 'Classification', 
        options: ['Public', 'Confidentiel', 'Secret', 'Très secret'], 
        required: false 
      },
      sensitivity: { type: 'select', label: 'Sensibilité', 
        options: ['Normale', 'Sensible', 'Très sensible'], 
        required: false 
      },
      
      // Analyse
      analyzed: { type: 'boolean', label: 'Analysé', required: false },
      findings: { type: 'textarea', label: 'Conclusions de l\'analyse', required: false },
      notes: { type: 'textarea', label: 'Notes', required: false }
    }
  }
};

/**
 * Configuration des catégories d'entités
 */
const ENTITY_CATEGORIES = {
  people: {
    name: 'Personnes',
    icon: 'users',
    color: '#ef4444',
    description: 'Individus physiques'
  },
  locations: {
    name: 'Lieux',
    icon: 'map',
    color: '#10b981',
    description: 'Localisations géographiques'
  },
  objects: {
    name: 'Objets',
    icon: 'package',
    color: '#f59e0b',
    description: 'Objets physiques et véhicules'
  },
  entities: {
    name: 'Entités',
    icon: 'building',
    color: '#6366f1',
    description: 'Organisations et entreprises'
  },
  digital: {
    name: 'Numérique',
    icon: 'monitor',
    color: '#06b6d4',
    description: 'Ressources et comptes numériques'
  },
  temporal: {
    name: 'Temporel',
    icon: 'clock',
    color: '#ec4899',
    description: 'Événements et chronologie'
  },
  evidence: {
    name: 'Preuves',
    icon: 'shield',
    color: '#64748b',
    description: 'Documents et éléments de preuve'
  }
};

/**
 * Types d'attributs supportés avec leur configuration
 */
const ATTRIBUTE_TYPES = {
  string: {
    component: 'input',
    inputType: 'text',
    validation: { maxLength: 255 }
  },
  textarea: {
    component: 'textarea',
    validation: { maxLength: 2000 }
  },
  number: {
    component: 'input',
    inputType: 'number',
    validation: { min: 0 }
  },
  email: {
    component: 'input',
    inputType: 'email',
    validation: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
  },
  tel: {
    component: 'input',
    inputType: 'tel',
    validation: { pattern: /^[\d\s\-\+\(\)\.]+$/ }
  },
  url: {
    component: 'input',
    inputType: 'url',
    validation: { pattern: /^https?:\/\/.+/ }
  },
  date: {
    component: 'input',
    inputType: 'date'
  },
  'datetime-local': {
    component: 'input',
    inputType: 'datetime-local'
  },
  boolean: {
    component: 'checkbox',
    defaultValue: false
  },
  select: {
    component: 'select',
    validation: { required: false }
  }
};

/**
 * Configuration des icônes par type d'entité
 */
const ENTITY_ICONS = {
  person: 'user',
  place: 'map-pin',
  vehicle: 'car',
  organization: 'building',
  website: 'globe',
  account: 'user-circle',
  event: 'calendar',
  document: 'file-text'
};

/**
 * Palette de couleurs pour les entités
 */
const ENTITY_COLORS = {
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
 * Configuration des relations possibles entre types d'entités
 */
const ENTITY_RELATIONS = {
  person: {
    person: ['family', 'friend', 'colleague', 'enemy', 'accomplice', 'knows'],
    place: ['lives_at', 'works_at', 'visits', 'owns'],
    vehicle: ['owns', 'drives', 'passenger'],
    organization: ['works_for', 'member_of', 'owns', 'associated_with'],
    website: ['owns', 'manages', 'uses'],
    account: ['owns', 'uses', 'manages'],
    event: ['participates', 'organizes', 'witnesses'],
    document: ['owns', 'creates', 'appears_in']
  },
  place: {
    person: ['residence_of', 'workplace_of', 'visited_by'],
    place: ['near', 'inside', 'connected_to'],
    vehicle: ['parking_of', 'garage_of'],
    organization: ['headquarters_of', 'branch_of'],
    event: ['location_of'],
    document: ['photographed_in', 'mentioned_in']
  },
  vehicle: {
    person: ['owned_by', 'driven_by'],
    place: ['parked_at', 'seen_at'],
    vehicle: ['collides_with', 'follows'],
    organization: ['owned_by', 'used_by'],
    event: ['involved_in'],
    document: ['appears_in', 'photographed']
  },
  organization: {
    person: ['employs', 'member', 'client'],
    place: ['located_at', 'owns'],
    vehicle: ['owns', 'uses'],
    organization: ['partner', 'subsidiary', 'competitor'],
    website: ['owns', 'operates'],
    account: ['operates', 'manages'],
    event: ['organizes', 'sponsors'],
    document: ['issues', 'owns']
  },
  website: {
    person: ['owned_by', 'managed_by'],
    organization: ['owned_by', 'operated_by'],
    account: ['linked_to', 'hosted_on'],
    document: ['hosts', 'references']
  },
  account: {
    person: ['owned_by', 'used_by'],
    organization: ['managed_by'],
    website: ['hosted_on', 'linked_to'],
    account: ['connected_to', 'friends_with'],
    document: ['contains', 'shares']
  },
  event: {
    person: ['involves', 'organized_by'],
    place: ['occurs_at'],
    vehicle: ['involves'],
    organization: ['organized_by', 'sponsored_by'],
    event: ['before', 'after', 'during'],
    document: ['documented_by', 'evidenced_by']
  },
  document: {
    person: ['about', 'created_by', 'owned_by'],
    place: ['shows', 'references'],
    vehicle: ['shows', 'references'],
    organization: ['issued_by', 'about'],
    website: ['hosted_on', 'references'],
    account: ['from', 'about'],
    event: ['documents', 'evidence_of']
  }
};

/**
 * Fonctions utilitaires pour les types d'entités
 */

/**
 * Obtenir la configuration d'un type d'entité
 * @param {string} type - Type d'entité
 * @returns {Object|null} Configuration du type
 */
function getEntityType(type) {
  return ENTITY_TYPES[type] || null;
}

/**
 * Obtenir tous les types d'entités
 * @returns {Object} Tous les types d'entités
 */
function getAllEntityTypes() {
  return ENTITY_TYPES;
}

/**
 * Obtenir les types d'entités par catégorie
 * @param {string} category - Catégorie
 * @returns {Object} Types d'entités de la catégorie
 */
function getEntityTypesByCategory(category) {
  return Object.fromEntries(
    Object.entries(ENTITY_TYPES).filter(([, config]) => config.category === category)
  );
}

/**
 * Valider les attributs d'une entité selon son type
 * @param {string} type - Type d'entité
 * @param {Object} attributes - Attributs à valider
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateEntityAttributes(type, attributes = {}) {
  const entityType = getEntityType(type);
  if (!entityType) {
    return { valid: false, errors: [`Type d'entité invalide: ${type}`] };
  }

  const errors = [];
  const typeAttributes = entityType.attributes || {};

  // Vérifier les champs requis
  Object.entries(typeAttributes).forEach(([attrName, attrConfig]) => {
    if (attrConfig.required && (!attributes[attrName] || attributes[attrName] === '')) {
      errors.push(`Le champ '${attrConfig.label || attrName}' est obligatoire`);
    }

    // Validation par type
    const value = attributes[attrName];
    if (value && attrConfig.type) {
      const validationResult = validateAttributeValue(attrConfig, value);
      if (!validationResult.valid) {
        errors.push(`${attrConfig.label || attrName}: ${validationResult.error}`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Valider une valeur d'attribut selon sa configuration
 * @param {Object} attrConfig - Configuration de l'attribut
 * @param {any} value - Valeur à valider
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateAttributeValue(attrConfig, value) {
  const attrType = ATTRIBUTE_TYPES[attrConfig.type];
  if (!attrType) {
    return { valid: true }; // Type inconnu, on laisse passer
  }

  const validation = attrType.validation || {};

  // Validation pattern (regex)
  if (validation.pattern && !validation.pattern.test(value)) {
    return { valid: false, error: 'Format invalide' };
  }

  // Validation longueur maximum
  if (validation.maxLength && value.length > validation.maxLength) {
    return { valid: false, error: `Maximum ${validation.maxLength} caractères` };
  }

  // Validation valeur minimum
  if (validation.min !== undefined && parseFloat(value) < validation.min) {
    return { valid: false, error: `Valeur minimum: ${validation.min}` };
  }

  // Validation options (select)
  if (attrConfig.options && !attrConfig.options.includes(value)) {
    return { valid: false, error: 'Valeur non autorisée' };
  }

  return { valid: true };
}

/**
 * Obtenir les relations possibles entre deux types d'entités
 * @param {string} fromType - Type source
 * @param {string} toType - Type destination
 * @returns {Array} Relations possibles
 */
function getAvailableRelations(fromType, toType) {
  if (!ENTITY_RELATIONS[fromType] || !ENTITY_RELATIONS[fromType][toType]) {
    return ['connected']; // Relation générique par défaut
  }
  return ENTITY_RELATIONS[fromType][toType];
}

/**
 * Obtenir la liste des champs par défaut pour un type d'entité
 * @param {string} type - Type d'entité
 * @returns {Object} Attributs par défaut
 */
function getDefaultAttributes(type) {
  const entityType = getEntityType(type);
  if (!entityType) return {};

  const defaults = {};
  Object.entries(entityType.attributes || {}).forEach(([attrName, attrConfig]) => {
    const attrType = ATTRIBUTE_TYPES[attrConfig.type];
    if (attrType && attrType.defaultValue !== undefined) {
      defaults[attrName] = attrType.defaultValue;
    }
  });

  return defaults;
}

/**
 * Formater les attributs pour l'affichage
 * @param {string} type - Type d'entité
 * @param {Object} attributes - Attributs de l'entité
 * @returns {Object} Attributs formatés avec labels
 */
function formatAttributesForDisplay(type, attributes = {}) {
  const entityType = getEntityType(type);
  if (!entityType) return attributes;

  const formatted = {};
  Object.entries(attributes).forEach(([attrName, value]) => {
    const attrConfig = entityType.attributes[attrName];
    if (attrConfig && value !== null && value !== undefined && value !== '') {
      formatted[attrConfig.label || attrName] = value;
    }
  });

  return formatted;
}

module.exports = {
  // Constantes principales
  ENTITY_TYPES,
  ENTITY_CATEGORIES,
  ATTRIBUTE_TYPES,
  ENTITY_ICONS,
  ENTITY_COLORS,
  ENTITY_RELATIONS,
  
  // Fonctions utilitaires
  getEntityType,
  getAllEntityTypes,
  getEntityTypesByCategory,
  validateEntityAttributes,
  validateAttributeValue,
  getAvailableRelations,
  getDefaultAttributes,
  formatAttributesForDisplay
};