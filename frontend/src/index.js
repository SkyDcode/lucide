// frontend/src/index.js - Point d'entrée React pour LUCIDE
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Configuration de l'environnement
const isDevelopment = process.env.NODE_ENV === 'development';

// Configuration pour le développement
if (isDevelopment) {
  console.log('🚀 LUCIDE Frontend - Mode développement');
  console.log('📡 API Backend:', process.env.REACT_APP_API_URL || 'http://localhost:3001/api');
}

// Point de montage React
const container = document.getElementById('root');
const root = createRoot(container);

// Rendu de l'application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Supprimer le spinner de chargement
const loadingSpinner = document.getElementById('loading-spinner');
if (loadingSpinner) {
  loadingSpinner.remove();
}

// Web Vitals en développement
if (isDevelopment) {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}