// frontend/src/shared/services/api.js - Client HTTP pour l'API LUCIDE
import { config } from '../config/app';

/**
 * Configuration par défaut pour les requêtes HTTP
 */
const DEFAULT_CONFIG = {
  baseURL: config.api.baseURL,
  timeout: config.api.timeout || 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * Classe client HTTP pour l'API LUCIDE
 */
class ApiClient {
  constructor(baseConfig = DEFAULT_CONFIG) {
    this.baseURL = baseConfig.baseURL;
    this.timeout = baseConfig.timeout;
    this.defaultHeaders = { ...baseConfig.headers };
    this.interceptors = {
      request: [],
      response: []
    };
  }

  /**
   * Ajouter un intercepteur de requête
   * @param {Function} interceptor - Fonction d'interception
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  /**
   * Ajouter un intercepteur de réponse
   * @param {Function} interceptor - Fonction d'interception
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
  }

  /**
   * Construire l'URL complète
   * @param {string} endpoint - Endpoint de l'API
   * @returns {string} URL complète
   */
  buildURL(endpoint) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseURL}${cleanEndpoint}`;
  }

  /**
   * Exécuter les intercepteurs de requête
   * @param {Object} config - Configuration de la requête
   * @returns {Object} Configuration modifiée
   */
  async executeRequestInterceptors(config) {
    let modifiedConfig = { ...config };
    
    for (const interceptor of this.interceptors.request) {
      try {
        modifiedConfig = await interceptor(modifiedConfig);
      } catch (error) {
        console.warn('Request interceptor failed:', error);
      }
    }
    
    return modifiedConfig;
  }

  /**
   * Exécuter les intercepteurs de réponse
   * @param {Response} response - Réponse HTTP
   * @returns {Response} Réponse modifiée
   */
  async executeResponseInterceptors(response) {
    let modifiedResponse = response;
    
    for (const interceptor of this.interceptors.response) {
      try {
        modifiedResponse = await interceptor(modifiedResponse);
      } catch (error) {
        console.warn('Response interceptor failed:', error);
      }
    }
    
    return modifiedResponse;
  }

  /**
   * Effectuer une requête HTTP
   * @param {string} method - Méthode HTTP
   * @param {string} endpoint - Endpoint de l'API
   * @param {Object} options - Options de la requête
   * @returns {Promise<Object>} Réponse de l'API
   */
  async request(method, endpoint, options = {}) {
    const {
      data = null,
      params = {},
      headers = {},
      timeout = this.timeout,
      signal = null
    } = options;

    try {
      // Construire l'URL avec les paramètres de requête
      const url = new URL(this.buildURL(endpoint));
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });

      // Préparer la configuration de la requête
      let requestConfig = {
        method: method.toUpperCase(),
        headers: {
          ...this.defaultHeaders,
          ...headers
        },
        signal
      };

      // Ajouter le body pour les méthodes POST, PUT, PATCH
      if (data && ['POST', 'PUT', 'PATCH'].includes(requestConfig.method)) {
        if (data instanceof FormData) {
          // Pour FormData, laisser le navigateur gérer le Content-Type
          delete requestConfig.headers['Content-Type'];
          requestConfig.body = data;
        } else {
          requestConfig.body = JSON.stringify(data);
        }
      }

      // Exécuter les intercepteurs de requête
      requestConfig = await this.executeRequestInterceptors(requestConfig);

      // Gérer le timeout avec AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      if (!signal) {
        requestConfig.signal = controller.signal;
      }

      // Effectuer la requête
      const response = await fetch(url.toString(), requestConfig);
      clearTimeout(timeoutId);

      // Exécuter les intercepteurs de réponse
      const interceptedResponse = await this.executeResponseInterceptors(response);

      // Gérer les erreurs HTTP
      if (!interceptedResponse.ok) {
        const errorData = await this.parseResponse(interceptedResponse);
        throw new ApiError(
          errorData.error?.message || `HTTP ${interceptedResponse.status}`,
          interceptedResponse.status,
          errorData
        );
      }

      // Parser et retourner la réponse
      return await this.parseResponse(interceptedResponse);

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }

      // Erreur réseau ou autre
      throw new ApiError(
        'Network error or request failed',
        0,
        { originalError: error.message }
      );
    }
  }

  /**
   * Parser la réponse en fonction du Content-Type
   * @param {Response} response - Réponse HTTP
   * @returns {Promise<any>} Données parsées
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    
    if (contentType.includes('text/')) {
      return await response.text();
    }
    
    if (contentType.includes('application/octet-stream') || 
        contentType.includes('application/pdf')) {
      return await response.blob();
    }
    
    // Par défaut, essayer JSON
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  }

  // Méthodes de raccourci pour les verbes HTTP
  
  /**
   * Requête GET
   * @param {string} endpoint - Endpoint de l'API
   * @param {Object} options - Options de la requête
   * @returns {Promise<Object>} Réponse de l'API
   */
  get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }

  /**
   * Requête POST
   * @param {string} endpoint - Endpoint de l'API
   * @param {any} data - Données à envoyer
   * @param {Object} options - Options de la requête
   * @returns {Promise<Object>} Réponse de l'API
   */
  post(endpoint, data = null, options = {}) {
    return this.request('POST', endpoint, { ...options, data });
  }

  /**
   * Requête PUT
   * @param {string} endpoint - Endpoint de l'API
   * @param {any} data - Données à envoyer
   * @param {Object} options - Options de la requête
   * @returns {Promise<Object>} Réponse de l'API
   */
  put(endpoint, data = null, options = {}) {
    return this.request('PUT', endpoint, { ...options, data });
  }

  /**
   * Requête PATCH
   * @param {string} endpoint - Endpoint de l'API
   * @param {any} data - Données à envoyer
   * @param {Object} options - Options de la requête
   * @returns {Promise<Object>} Réponse de l'API
   */
  patch(endpoint, data = null, options = {}) {
    return this.request('PATCH', endpoint, { ...options, data });
  }

  /**
   * Requête DELETE
   * @param {string} endpoint - Endpoint de l'API
   * @param {Object} options - Options de la requête
   * @returns {Promise<Object>} Réponse de l'API
   */
  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }

  /**
   * Requête HEAD
   * @param {string} endpoint - Endpoint de l'API
   * @param {Object} options - Options de la requête
   * @returns {Promise<Response>} Réponse HTTP brute
   */
  async head(endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    const response = await fetch(url, {
      method: 'HEAD',
      headers: this.defaultHeaders,
      ...options
    });
    return response;
  }
}

/**
 * Classe d'erreur personnalisée pour l'API
 */
class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Vérifier si l'erreur est liée au réseau
   * @returns {boolean} True si erreur réseau
   */
  isNetworkError() {
    return this.status === 0;
  }

  /**
   * Vérifier si l'erreur est une erreur client (4xx)
   * @returns {boolean} True si erreur client
   */
  isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Vérifier si l'erreur est une erreur serveur (5xx)
   * @returns {boolean} True si erreur serveur
   */
  isServerError() {
    return this.status >= 500 && this.status < 600;
  }

  /**
   * Obtenir un message d'erreur user-friendly
   * @returns {string} Message d'erreur
   */
  getUserFriendlyMessage() {
    if (this.isNetworkError()) {
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    }
    
    if (this.status === 401) {
      return 'Vous devez vous connecter pour accéder à cette ressource.';
    }
    
    if (this.status === 403) {
      return 'Vous n\'avez pas les permissions pour effectuer cette action.';
    }
    
    if (this.status === 404) {
      return 'La ressource demandée n\'a pas été trouvée.';
    }
    
    if (this.status === 409) {
      return 'Cette action entre en conflit avec des données existantes.';
    }
    
    if (this.status === 422) {
      return 'Les données fournies ne sont pas valides.';
    }
    
    if (this.isServerError()) {
      return 'Erreur du serveur. Veuillez réessayer plus tard.';
    }
    
    return this.message || 'Une erreur inattendue s\'est produite.';
  }
}

// (Suppressed duplicate config declaration; using imported config from '../config/app')

// Instance par défaut du client API
const apiClient = new ApiClient();

// Ajouter des intercepteurs par défaut

// Intercepteur de requête pour le logging en développement
if (process.env.NODE_ENV === 'development') {
  apiClient.addRequestInterceptor((config) => {
    console.log(`🚀 API Request: ${config.method} ${config.url || 'URL'}`, config);
    return config;
  });

  apiClient.addResponseInterceptor((response) => {
    console.log(`✅ API Response: ${response.status}`, response);
    return response;
  });
}

// Intercepteur pour ajouter un request ID
apiClient.addRequestInterceptor((config) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  config.headers['X-Request-ID'] = requestId;
  return config;
});

/**
 * Utilitaires pour les requêtes communes
 */
const apiUtils = {
  /**
   * Créer un contrôleur d'annulation pour les requêtes
   * @returns {AbortController} Contrôleur d'annulation
   */
  createAbortController() {
    return new AbortController();
  },

  /**
   * Construire des paramètres de requête
   * @param {Object} params - Paramètres
   * @returns {URLSearchParams} Paramètres formatés
   */
  buildQueryParams(params = {}) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, value);
        }
      }
    });
    
    return searchParams;
  },

  /**
   * Créer un FormData pour l'upload de fichiers
   * @param {Object} data - Données à envoyer
   * @param {FileList|File[]} files - Fichiers à uploader
   * @returns {FormData} FormData préparé
   */
  createFormData(data = {}, files = []) {
    const formData = new FormData();
    
    // Ajouter les données
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });
    
    // Ajouter les fichiers
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    fileArray.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });
    
    return formData;
  },

  /**
   * Retry d'une requête avec backoff exponentiel
   * @param {Function} requestFn - Fonction de requête
   * @param {number} maxRetries - Nombre maximum de tentatives
   * @param {number} baseDelay - Délai de base en ms
   * @returns {Promise<any>} Résultat de la requête
   */
  async retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  },

  /**
   * Vérifier si une erreur peut être retryée
   * @param {ApiError} error - Erreur à vérifier
   * @returns {boolean} True si peut être retryée
   */
  isRetryableError(error) {
    // Retry pour les erreurs réseau et 5xx
    return error.isNetworkError() || error.isServerError() || error.status === 408;
  },

  /**
   * Sleep utilitaire
   * @param {number} ms - Délai en millisecondes
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Formater une erreur pour l'affichage
   * @param {ApiError} error - Erreur à formater
   * @returns {Object} Erreur formatée
   */
  formatError(error) {
    return {
      message: error.getUserFriendlyMessage(),
      technical: error.message,
      status: error.status,
      timestamp: error.timestamp,
      data: error.data
    };
  }
};

export {
  ApiClient,
  ApiError,
  apiClient as default,
  apiUtils,
  config
};