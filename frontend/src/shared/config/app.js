// frontend/src/shared/config/app.js - Configuration de l'application
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
  }
};