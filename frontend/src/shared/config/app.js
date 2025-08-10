// frontend/src/shared/config/app.js - Configuration de l'application MISE À JOUR
export const config = {
  // Configuration API
  api: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
    timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 10000
  },

  // Configuration de l'application
  app: {
    name: 'LUCIDE',
    version: '1.0.0',
    description: 'Application OSINT pour Police Judiciaire'
  },

  // Configuration des fonctionnalités
  features: {
    enableRealtime: process.env.REACT_APP_ENABLE_REALTIME === 'true',
    enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    debugMode: process.env.NODE_ENV === 'development'
  },

  // Configuration de la recherche (NOUVEAU)
  search: {
    debounceDelay: parseInt(process.env.REACT_APP_SEARCH_DEBOUNCE) || 300,
    suggestionsDelay: parseInt(process.env.REACT_APP_SUGGESTIONS_DEBOUNCE) || 150,
    maxSuggestions: parseInt(process.env.REACT_APP_MAX_SUGGESTIONS) || 8,
    maxHistoryItems: parseInt(process.env.REACT_APP_MAX_SEARCH_HISTORY) || 10,
    defaultLimit: parseInt(process.env.REACT_APP_SEARCH_DEFAULT_LIMIT) || 20,
    maxLimit: parseInt(process.env.REACT_APP_SEARCH_MAX_LIMIT) || 200,
    minQueryLength: parseInt(process.env.REACT_APP_SEARCH_MIN_LENGTH) || 2,
    enableFuzzySearch: process.env.REACT_APP_ENABLE_FUZZY_SEARCH !== 'false',
    enableSuggestions: process.env.REACT_APP_ENABLE_SUGGESTIONS !== 'false',
    enableHistory: process.env.REACT_APP_ENABLE_SEARCH_HISTORY !== 'false'
  }
};