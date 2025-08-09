// backend/shared/constants/errorCodes.js - Codes d'erreur standardisés pour LUCIDE
// Système centralisé de gestion des codes d'erreur pour l'application OSINT

/**
 * Codes d'erreur par catégorie avec messages et actions suggérées
 */
const ERROR_CODES = {
  // =============================================
  // ERREURS GÉNÉRALES (1000-1999)
  // =============================================
  GENERAL: {
    UNKNOWN_ERROR: {
      code: 1000,
      message: 'Erreur inconnue',
      description: 'Une erreur inattendue s\'est produite',
      httpStatus: 500,
      category: 'general',
      severity: 'high',
      action: 'Contactez l\'administrateur système'
    },
    
    INVALID_REQUEST: {
      code: 1001,
      message: 'Requête invalide',
      description: 'La requête envoyée est malformée ou incomplète',
      httpStatus: 400,
      category: 'general',
      severity: 'medium',
      action: 'Vérifiez le format de votre requête'
    },
    
    MISSING_PARAMETER: {
      code: 1002,
      message: 'Paramètre manquant',
      description: 'Un paramètre requis est manquant dans la requête',
      httpStatus: 400,
      category: 'general',
      severity: 'medium',
      action: 'Vérifiez les paramètres requis'
    },
    
    INVALID_PARAMETER: {
      code: 1003,
      message: 'Paramètre invalide',
      description: 'Un paramètre fourni a une valeur invalide',
      httpStatus: 400,
      category: 'general',
      severity: 'medium',
      action: 'Vérifiez la valeur des paramètres'
    },
    
    METHOD_NOT_ALLOWED: {
      code: 1004,
      message: 'Méthode non autorisée',
      description: 'La méthode HTTP utilisée n\'est pas supportée',
      httpStatus: 405,
      category: 'general',
      severity: 'medium',
      action: 'Utilisez la méthode HTTP correcte'
    },
    
    RATE_LIMIT_EXCEEDED: {
      code: 1005,
      message: 'Limite de taux dépassée',
      description: 'Trop de requêtes envoyées dans un délai court',
      httpStatus: 429,
      category: 'general',
      severity: 'low',
      action: 'Attendez avant de renvoyer une requête'
    }
  },

  // =============================================
  // ERREURS D'AUTHENTIFICATION (2000-2999)
  // =============================================
  AUTH: {
    UNAUTHORIZED: {
      code: 2001,
      message: 'Non autorisé',
      description: 'Accès non autorisé à cette ressource',
      httpStatus: 401,
      category: 'auth',
      severity: 'high',
      action: 'Authentifiez-vous avant d\'accéder à cette ressource'
    },
    
    FORBIDDEN: {
      code: 2002,
      message: 'Accès interdit',
      description: 'Vous n\'avez pas les permissions pour cette action',
      httpStatus: 403,
      category: 'auth',
      severity: 'high',
      action: 'Contactez l\'administrateur pour obtenir les permissions'
    },
    
    INVALID_TOKEN: {
      code: 2003,
      message: 'Token invalide',
      description: 'Le token d\'authentification est invalide ou expiré',
      httpStatus: 401,
      category: 'auth',
      severity: 'medium',
      action: 'Reconnectez-vous pour obtenir un nouveau token'
    },
    
    SESSION_EXPIRED: {
      code: 2004,
      message: 'Session expirée',
      description: 'Votre session a expiré',
      httpStatus: 401,
      category: 'auth',
      severity: 'medium',
      action: 'Reconnectez-vous'
    }
  },

  // =============================================
  // ERREURS DE VALIDATION (3000-3999)
  // =============================================
  VALIDATION: {
    INVALID_FORMAT: {
      code: 3001,
      message: 'Format invalide',
      description: 'Le format des données fournies est incorrect',
      httpStatus: 400,
      category: 'validation',
      severity: 'medium',
      action: 'Vérifiez le format des données'
    },
    
    REQUIRED_FIELD_MISSING: {
      code: 3002,
      message: 'Champ obligatoire manquant',
      description: 'Un champ obligatoire n\'a pas été renseigné',
      httpStatus: 400,
      category: 'validation',
      severity: 'medium',
      action: 'Remplissez tous les champs obligatoires'
    },
    
    INVALID_EMAIL: {
      code: 3003,
      message: 'Email invalide',
      description: 'L\'adresse email fournie n\'est pas valide',
      httpStatus: 400,
      category: 'validation',
      severity: 'low',
      action: 'Vérifiez le format de l\'adresse email'
    },
    
    INVALID_PHONE: {
      code: 3004,
      message: 'Numéro de téléphone invalide',
      description: 'Le numéro de téléphone fourni n\'est pas valide',
      httpStatus: 400,
      category: 'validation',
      severity: 'low',
      action: 'Vérifiez le format du numéro de téléphone'
    },
    
    INVALID_URL: {
      code: 3005,
      message: 'URL invalide',
      description: 'L\'URL fournie n\'est pas valide',
      httpStatus: 400,
      category: 'validation',
      severity: 'low',
      action: 'Vérifiez le format de l\'URL'
    },
    
    INVALID_DATE: {
      code: 3006,
      message: 'Date invalide',
      description: 'La date fournie n\'est pas valide',
      httpStatus: 400,
      category: 'validation',
      severity: 'low',
      action: 'Vérifiez le format de la date'
    },
    
    VALUE_TOO_LONG: {
      code: 3007,
      message: 'Valeur trop longue',
      description: 'La valeur dépasse la longueur maximale autorisée',
      httpStatus: 400,
      category: 'validation',
      severity: 'low',
      action: 'Raccourcissez la valeur'
    },
    
    VALUE_TOO_SHORT: {
      code: 3008,
      message: 'Valeur trop courte',
      description: 'La valeur est inférieure à la longueur minimale requise',
      httpStatus: 400,
      category: 'validation',
      severity: 'low',
      action: 'Allongez la valeur'
    },
    
    INVALID_ENTITY_TYPE: {
      code: 3009,
      message: 'Type d\'entité invalide',
      description: 'Le type d\'entité spécifié n\'est pas supporté',
      httpStatus: 400,
      category: 'validation',
      severity: 'medium',
      action: 'Utilisez un type d\'entité valide'
    },
    
    INVALID_RELATIONSHIP_TYPE: {
      code: 3010,
      message: 'Type de relation invalide',
      description: 'Le type de relation spécifié n\'est pas supporté',
      httpStatus: 400,
      category: 'validation',
      severity: 'medium',
      action: 'Utilisez un type de relation valide'
    }
  },

  // =============================================
  // ERREURS DE BASE DE DONNÉES (4000-4999)
  // =============================================
  DATABASE: {
    CONNECTION_FAILED: {
      code: 4001,
      message: 'Connexion à la base de données échouée',
      description: 'Impossible de se connecter à la base de données',
      httpStatus: 503,
      category: 'database',
      severity: 'critical',
      action: 'Vérifiez la connexion à la base de données'
    },
    
    QUERY_FAILED: {
      code: 4002,
      message: 'Requête échouée',
      description: 'L\'exécution de la requête a échoué',
      httpStatus: 500,
      category: 'database',
      severity: 'high',
      action: 'Contactez l\'administrateur système'
    },
    
    CONSTRAINT_VIOLATION: {
      code: 4003,
      message: 'Violation de contrainte',
      description: 'L\'opération viole une contrainte de base de données',
      httpStatus: 409,
      category: 'database',
      severity: 'medium',
      action: 'Vérifiez l\'unicité et l\'intégrité des données'
    },
    
    FOREIGN_KEY_VIOLATION: {
      code: 4004,
      message: 'Violation de clé étrangère',
      description: 'Référence vers une ressource inexistante',
      httpStatus: 400,
      category: 'database',
      severity: 'medium',
      action: 'Vérifiez que les ressources référencées existent'
    },
    
    UNIQUE_CONSTRAINT_VIOLATION: {
      code: 4005,
      message: 'Violation d\'unicité',
      description: 'Une ressource avec ces caractéristiques existe déjà',
      httpStatus: 409,
      category: 'database',
      severity: 'medium',
      action: 'Modifiez les données pour les rendre uniques'
    },
    
    DATABASE_LOCKED: {
      code: 4006,
      message: 'Base de données verrouillée',
      description: 'La base de données est temporairement verrouillée',
      httpStatus: 503,
      category: 'database',
      severity: 'medium',
      action: 'Réessayez dans quelques instants'
    },
    
    TRANSACTION_FAILED: {
      code: 4007,
      message: 'Transaction échouée',
      description: 'La transaction de base de données a échoué',
      httpStatus: 500,
      category: 'database',
      severity: 'high',
      action: 'L\'opération a été annulée, réessayez'
    }
  },

  // =============================================
  // ERREURS DE RESSOURCES (5000-5999)
  // =============================================
  RESOURCE: {
    NOT_FOUND: {
      code: 5001,
      message: 'Ressource non trouvée',
      description: 'La ressource demandée n\'existe pas',
      httpStatus: 404,
      category: 'resource',
      severity: 'medium',
      action: 'Vérifiez l\'ID de la ressource'
    },
    
    FOLDER_NOT_FOUND: {
      code: 5002,
      message: 'Dossier non trouvé',
      description: 'Le dossier spécifié n\'existe pas',
      httpStatus: 404,
      category: 'resource',
      severity: 'medium',
      action: 'Vérifiez l\'ID du dossier'
    },
    
    ENTITY_NOT_FOUND: {
      code: 5003,
      message: 'Entité non trouvée',
      description: 'L\'entité spécifiée n\'existe pas',
      httpStatus: 404,
      category: 'resource',
      severity: 'medium',
      action: 'Vérifiez l\'ID de l\'entité'
    },
    
    RELATIONSHIP_NOT_FOUND: {
      code: 5004,
      message: 'Relation non trouvée',
      description: 'La relation spécifiée n\'existe pas',
      httpStatus: 404,
      category: 'resource',
      severity: 'medium',
      action: 'Vérifiez l\'ID de la relation'
    },
    
    FILE_NOT_FOUND: {
      code: 5005,
      message: 'Fichier non trouvé',
      description: 'Le fichier spécifié n\'existe pas',
      httpStatus: 404,
      category: 'resource',
      severity: 'medium',
      action: 'Vérifiez le chemin du fichier'
    },
    
    RESOURCE_ALREADY_EXISTS: {
      code: 5006,
      message: 'Ressource existante',
      description: 'Une ressource avec ces caractéristiques existe déjà',
      httpStatus: 409,
      category: 'resource',
      severity: 'medium',
      action: 'Utilisez un nom différent ou modifiez la ressource existante'
    },
    
    CANNOT_DELETE_NON_EMPTY: {
      code: 5007,
      message: 'Suppression impossible',
      description: 'Impossible de supprimer une ressource qui contient des éléments',
      httpStatus: 409,
      category: 'resource',
      severity: 'medium',
      action: 'Supprimez d\'abord les éléments contenus'
    }
  },

  // =============================================
  // ERREURS DE FICHIERS (6000-6999)
  // =============================================
  FILE: {
    UPLOAD_FAILED: {
      code: 6001,
      message: 'Échec de l\'upload',
      description: 'L\'upload du fichier a échoué',
      httpStatus: 500,
      category: 'file',
      severity: 'medium',
      action: 'Réessayez l\'upload du fichier'
    },
    
    FILE_TOO_LARGE: {
      code: 6002,
      message: 'Fichier trop volumineux',
      description: 'Le fichier dépasse la taille maximale autorisée',
      httpStatus: 413,
      category: 'file',
      severity: 'low',
      action: 'Réduisez la taille du fichier'
    },
    
    INVALID_FILE_TYPE: {
      code: 6003,
      message: 'Type de fichier invalide',
      description: 'Le type de fichier n\'est pas autorisé',
      httpStatus: 400,
      category: 'file',
      severity: 'low',
      action: 'Utilisez un type de fichier autorisé'
    },
    
    FILE_CORRUPTED: {
      code: 6004,
      message: 'Fichier corrompu',
      description: 'Le fichier est corrompu ou illisible',
      httpStatus: 400,
      category: 'file',
      severity: 'medium',
      action: 'Vérifiez l\'intégrité du fichier'
    },
    
    INSUFFICIENT_STORAGE: {
      code: 6005,
      message: 'Espace de stockage insuffisant',
      description: 'Pas assez d\'espace pour stocker le fichier',
      httpStatus: 507,
      category: 'file',
      severity: 'high',
      action: 'Libérez de l\'espace de stockage'
    },
    
    ACCESS_DENIED: {
      code: 6006,
      message: 'Accès au fichier refusé',
      description: 'Permissions insuffisantes pour accéder au fichier',
      httpStatus: 403,
      category: 'file',
      severity: 'medium',
      action: 'Vérifiez les permissions du fichier'
    }
  },

  // =============================================
  // ERREURS MÉTIER OSINT (7000-7999)
  // =============================================
  OSINT: {
    INVALID_INVESTIGATION: {
      code: 7001,
      message: 'Enquête invalide',
      description: 'Les paramètres de l\'enquête sont invalides',
      httpStatus: 400,
      category: 'osint',
      severity: 'medium',
      action: 'Vérifiez les paramètres de l\'enquête'
    },
    
    CIRCULAR_RELATIONSHIP: {
      code: 7002,
      message: 'Relation circulaire détectée',
      description: 'Tentative de création d\'une relation circulaire',
      httpStatus: 400,
      category: 'osint',
      severity: 'medium',
      action: 'Évitez les relations circulaires'
    },
    
    SELF_RELATIONSHIP: {
      code: 7003,
      message: 'Auto-relation interdite',
      description: 'Une entité ne peut pas être en relation avec elle-même',
      httpStatus: 400,
      category: 'osint',
      severity: 'low',
      action: 'Choisissez une entité différente'
    },
    
    INCOMPATIBLE_ENTITY_TYPES: {
      code: 7004,
      message: 'Types d\'entités incompatibles',
      description: 'Ces types d\'entités ne peuvent pas être liés',
      httpStatus: 400,
      category: 'osint',
      severity: 'medium',
      action: 'Utilisez des types d\'entités compatibles'
    },
    
    MERGE_CONFLICT: {
      code: 7005,
      message: 'Conflit de fusion',
      description: 'Les entités ne peuvent pas être fusionnées',
      httpStatus: 409,
      category: 'osint',
      severity: 'medium',
      action: 'Résolvez les conflits avant la fusion'
    },
    
    GRAPH_ANALYSIS_FAILED: {
      code: 7006,
      message: 'Analyse du graphe échouée',
      description: 'L\'analyse du réseau a échoué',
      httpStatus: 500,
      category: 'osint',
      severity: 'medium',
      action: 'Réessayez l\'analyse du graphe'
    }
  }
};

/**
 * Niveaux de sévérité avec leurs propriétés
 */
const SEVERITY_LEVELS = {
  low: {
    name: 'Faible',
    priority: 1,
    color: '#10b981', // Vert
    icon: 'info',
    description: 'Erreur mineure, n\'affecte pas le fonctionnement'
  },
  medium: {
    name: 'Moyenne',
    priority: 2,
    color: '#f59e0b', // Orange
    icon: 'alert-triangle',
    description: 'Erreur modérée, peut affecter certaines fonctionnalités'
  },
  high: {
    name: 'Élevée',
    priority: 3,
    color: '#ef4444', // Rouge
    icon: 'alert-circle',
    description: 'Erreur importante, affecte le fonctionnement'
  },
  critical: {
    name: 'Critique',
    priority: 4,
    color: '#dc2626', // Rouge foncé
    icon: 'x-circle',
    description: 'Erreur critique, système inutilisable'
  }
};

/**
 * Catégories d'erreurs avec leurs propriétés
 */
const ERROR_CATEGORIES = {
  general: {
    name: 'Général',
    description: 'Erreurs générales du système',
    color: '#6b7280'
  },
  auth: {
    name: 'Authentification',
    description: 'Erreurs d\'authentification et d\'autorisation',
    color: '#dc2626'
  },
  validation: {
    name: 'Validation',
    description: 'Erreurs de validation des données',
    color: '#f59e0b'
  },
  database: {
    name: 'Base de données',
    description: 'Erreurs liées à la base de données',
    color: '#8b5cf6'
  },
  resource: {
    name: 'Ressources',
    description: 'Erreurs liées aux ressources',
    color: '#06b6d4'
  },
  file: {
    name: 'Fichiers',
    description: 'Erreurs de gestion des fichiers',
    color: '#10b981'
  },
  osint: {
    name: 'OSINT',
    description: 'Erreurs métier spécifiques à l\'OSINT',
    color: '#ec4899'
  }
};

/**
 * Fonctions utilitaires pour les codes d'erreur
 */

/**
 * Obtenir une erreur par son code numérique
 * @param {number} code - Code numérique de l'erreur
 * @returns {Object|null} Configuration de l'erreur
 */
function getErrorByCode(code) {
  for (const category of Object.values(ERROR_CODES)) {
    for (const error of Object.values(category)) {
      if (error.code === code) {
        return error;
      }
    }
  }
  return null;
}

/**
 * Obtenir une erreur par son nom
 * @param {string} categoryName - Nom de la catégorie
 * @param {string} errorName - Nom de l'erreur
 * @returns {Object|null} Configuration de l'erreur
 */
function getError(categoryName, errorName) {
  const category = ERROR_CODES[categoryName.toUpperCase()];
  if (!category) return null;
  
  return category[errorName.toUpperCase()] || null;
}

/**
 * Créer une réponse d'erreur standardisée
 * @param {string} categoryName - Catégorie de l'erreur
 * @param {string} errorName - Nom de l'erreur
 * @param {Object} context - Contexte supplémentaire
 * @returns {Object} Réponse d'erreur formatée
 */
function createErrorResponse(categoryName, errorName, context = {}) {
  const error = getError(categoryName, errorName);
  if (!error) {
    return createErrorResponse('GENERAL', 'UNKNOWN_ERROR', { 
      originalError: `${categoryName}.${errorName}` 
    });
  }

  return {
    success: false,
    error: {
      code: error.code,
      name: `${categoryName}.${errorName}`,
      message: error.message,
      description: error.description,
      category: error.category,
      severity: error.severity,
      action: error.action,
      timestamp: new Date().toISOString(),
      context
    },
    httpStatus: error.httpStatus
  };
}

/**
 * Formater une erreur pour les logs
 * @param {Object} error - Erreur à formater
 * @param {Object} context - Contexte supplémentaire
 * @returns {Object} Erreur formatée pour logs
 */
function formatErrorForLog(error, context = {}) {
  const severity = SEVERITY_LEVELS[error.severity] || SEVERITY_LEVELS.medium;
  
  return {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    severity: severity.name,
    priority: severity.priority,
    code: error.code,
    category: error.category,
    message: error.message,
    description: error.description,
    context,
    stack: context.stack || null
  };
}

/**
 * Obtenir toutes les erreurs d'une catégorie
 * @param {string} categoryName - Nom de la catégorie
 * @returns {Object} Erreurs de la catégorie
 */
function getErrorsByCategory(categoryName) {
  return ERROR_CODES[categoryName.toUpperCase()] || {};
}

/**
 * Obtenir les statistiques des erreurs par sévérité
 * @param {Array} errors - Liste des erreurs
 * @returns {Object} Statistiques par sévérité
 */
function getErrorStatsBySeverity(errors) {
  const stats = {};
  
  // Initialiser les statistiques
  Object.keys(SEVERITY_LEVELS).forEach(severity => {
    stats[severity] = {
      count: 0,
      percentage: 0,
      ...SEVERITY_LEVELS[severity]
    };
  });

  // Compter les erreurs
  errors.forEach(error => {
    const severity = error.severity || 'medium';
    if (stats[severity]) {
      stats[severity].count++;
    }
  });

  // Calculer les pourcentages
  const total = errors.length;
  if (total > 0) {
    Object.keys(stats).forEach(severity => {
      stats[severity].percentage = Math.round((stats[severity].count / total) * 100);
    });
  }

  return stats;
}

/**
 * Valider un code d'erreur
 * @param {number} code - Code à valider
 * @returns {boolean} True si le code est valide
 */
function isValidErrorCode(code) {
  return getErrorByCode(code) !== null;
}

/**
 * Obtenir la couleur d'une erreur selon sa sévérité
 * @param {string} severity - Niveau de sévérité
 * @returns {string} Code couleur hexadecimal
 */
function getErrorColor(severity) {
  const level = SEVERITY_LEVELS[severity];
  return level ? level.color : SEVERITY_LEVELS.medium.color;
}

/**
 * Filtrer les erreurs par critères
 * @param {Array} errors - Erreurs à filtrer
 * @param {Object} filters - Critères de filtrage
 * @returns {Array} Erreurs filtrées
 */
function filterErrors(errors, filters = {}) {
  const { categories = [], severities = [], codes = [] } = filters;

  return errors.filter(error => {
    // Filtrer par catégorie
    if (categories.length > 0 && !categories.includes(error.category)) {
      return false;
    }

    // Filtrer par sévérité
    if (severities.length > 0 && !severities.includes(error.severity)) {
      return false;
    }

    // Filtrer par code
    if (codes.length > 0 && !codes.includes(error.code)) {
      return false;
    }

    return true;
  });
}

/**
 * Créer un rapport d'erreurs
 * @param {Array} errors - Liste des erreurs
 * @param {Object} options - Options du rapport
 * @returns {Object} Rapport formaté
 */
function createErrorReport(errors, options = {}) {
  const { 
    groupBy = 'category',
    includeStats = true,
    includeSuggestions = true 
  } = options;

  const report = {
    summary: {
      total: errors.length,
      period: options.period || 'N/A',
      generatedAt: new Date().toISOString()
    }
  };

  // Statistiques par sévérité
  if (includeStats) {
    report.severityStats = getErrorStatsBySeverity(errors);
  }

  // Grouper les erreurs
  if (groupBy === 'category') {
    report.byCategory = {};
    Object.keys(ERROR_CATEGORIES).forEach(category => {
      const categoryErrors = errors.filter(e => e.category === category);
      if (categoryErrors.length > 0) {
        report.byCategory[category] = {
          count: categoryErrors.length,
          errors: categoryErrors,
          ...ERROR_CATEGORIES[category]
        };
      }
    });
  }

  // Suggestions d'amélioration
  if (includeSuggestions) {
    report.suggestions = generateErrorSuggestions(errors);
  }

  return report;
}

/**
 * Générer des suggestions basées sur les erreurs
 * @param {Array} errors - Liste des erreurs
 * @returns {Array} Suggestions d'amélioration
 */
function generateErrorSuggestions(errors) {
  const suggestions = [];
  const errorCounts = {};

  // Compter les occurrences par type
  errors.forEach(error => {
    const key = `${error.category}.${error.code}`;
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  });

  // Suggestions basées sur la fréquence
  Object.entries(errorCounts).forEach(([errorKey, count]) => {
    if (count > 10) {
      suggestions.push({
        type: 'frequent_error',
        priority: 'high',
        message: `Erreur fréquente détectée: ${errorKey} (${count} occurrences)`,
        action: 'Investiguer la cause racine de cette erreur récurrente'
      });
    }
  });

  // Suggestions par catégorie
  const validationErrors = errors.filter(e => e.category === 'validation');
  if (validationErrors.length > errors.length * 0.3) {
    suggestions.push({
      type: 'validation_improvement',
      priority: 'medium',
      message: 'Beaucoup d\'erreurs de validation détectées',
      action: 'Améliorer la validation côté client pour réduire ces erreurs'
    });
  }

  const databaseErrors = errors.filter(e => e.category === 'database');
  if (databaseErrors.length > 5) {
    suggestions.push({
      type: 'database_optimization',
      priority: 'high',
      message: 'Erreurs de base de données fréquentes',
      action: 'Vérifier la performance et la stabilité de la base de données'
    });
  }

  return suggestions;
}

/**
 * Convertir une erreur système en erreur LUCIDE
 * @param {Error} systemError - Erreur système
 * @returns {Object} Erreur LUCIDE formatée
 */
function convertSystemError(systemError) {
  // Détection du type d'erreur système
  if (systemError.code?.startsWith('SQLITE_')) {
    return createErrorResponse('DATABASE', 'QUERY_FAILED', {
      originalError: systemError.message,
      sqliteCode: systemError.code
    });
  }

  if (systemError.code === 'ENOENT') {
    return createErrorResponse('FILE', 'FILE_NOT_FOUND', {
      path: systemError.path
    });
  }

  if (systemError.code === 'EACCES') {
    return createErrorResponse('FILE', 'ACCESS_DENIED', {
      path: systemError.path
    });
  }

  if (systemError.name === 'ValidationError') {
    return createErrorResponse('VALIDATION', 'INVALID_FORMAT', {
      details: systemError.details
    });
  }

  // Erreur générique par défaut
  return createErrorResponse('GENERAL', 'UNKNOWN_ERROR', {
    originalError: systemError.message,
    name: systemError.name,
    stack: systemError.stack
  });
}

module.exports = {
  // Constantes principales
  ERROR_CODES,
  SEVERITY_LEVELS,
  ERROR_CATEGORIES,
  
  // Fonctions utilitaires
  getErrorByCode,
  getError,
  createErrorResponse,
  formatErrorForLog,
  getErrorsByCategory,
  getErrorStatsBySeverity,
  isValidErrorCode,
  getErrorColor,
  filterErrors,
  createErrorReport,
  generateErrorSuggestions,
  convertSystemError
};