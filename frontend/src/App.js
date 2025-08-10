// frontend/src/App.js - MISE À JOUR avec routing complet
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/layout/Navigation/Navigation';
import { AppProvider } from './shared/store/appStore';
import { NotificationsProvider } from './shared/store/notificationStore';

// Import des pages principales
import FoldersPage from './pages/FoldersPage';
import EntitiesPage from './pages/EntitiesPage';
import GraphPage from './pages/GraphPage';

// Import des styles globaux
import './index.css';
import './App.css';

/**
 * Composant racine de l'application LUCIDE
 * Gère le routage et les providers globaux
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <NotificationsProvider>
          <Navigation>
            <Routes>
              {/* Route racine - redirige vers les dossiers */}
              <Route 
                path="/" 
                element={<Navigate to="/folders" replace />} 
              />
              
              {/* Page des dossiers */}
              <Route 
                path="/folders" 
                element={<FoldersPage />} 
              />
              
              {/* Page des entités d'un dossier */}
              <Route 
                path="/folders/:folderId/entities" 
                element={<EntitiesPage />} 
              />
              
              {/* Page du graphique d'un dossier */}
              <Route 
                path="/folders/:folderId/graph" 
                element={<GraphPage />} 
              />
              
              {/* Routes futures (préparées pour l'extension) */}
              <Route 
                path="/folders/:folderId/entities/:entityId" 
                element={
                  <div className="p-6">
                    <h1 className="text-2xl font-bold mb-4">Détail de l'entité</h1>
                    <p className="text-gray-600">Cette page sera implémentée dans une future version.</p>
                  </div>
                } 
              />
              
              <Route 
                path="/search" 
                element={
                  <div className="p-6">
                    <h1 className="text-2xl font-bold mb-4">Recherche globale</h1>
                    <p className="text-gray-600">Cette page sera implémentée dans une future version.</p>
                  </div>
                } 
              />
              
              <Route 
                path="/reports" 
                element={
                  <div className="p-6">
                    <h1 className="text-2xl font-bold mb-4">Rapports</h1>
                    <p className="text-gray-600">Cette page sera implémentée dans une future version.</p>
                  </div>
                } 
              />
              
              <Route 
                path="/settings" 
                element={
                  <div className="p-6">
                    <h1 className="text-2xl font-bold mb-4">Paramètres</h1>
                    <p className="text-gray-600">Cette page sera implémentée dans une future version.</p>
                  </div>
                } 
              />
              
              {/* Page 404 - route non trouvée */}
              <Route 
                path="*" 
                element={
                  <div className="p-6 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Page non trouvée</h1>
                    <p className="text-gray-600 mb-6">
                      La page que vous recherchez n'existe pas ou a été déplacée.
                    </p>
                    <Navigate to="/folders" replace />
                  </div>
                } 
              />
            </Routes>
          </Navigation>
        </NotificationsProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

/**
 * Configuration pour le développement
 */
if (process.env.NODE_ENV === 'development') {
  // Ajouter le mode développement au body pour les styles CSS conditionnels
  document.body.setAttribute('data-env', 'development');
  
  // Log des informations de démarrage
  console.log('🚀 LUCIDE Frontend - Mode développement');
  console.log('📡 API Backend:', process.env.REACT_APP_API_URL || 'http://localhost:3001/api');
  console.log('🔧 Version React:', React.version);
  
  // Ajouter des raccourcis clavier pour le développement
  window.addEventListener('keydown', (e) => {
    // Ctrl+Shift+D pour ouvrir les outils de développement React
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      console.log('🔧 LUCIDE Dev Tools');
      console.log('App Store:', window.__LUCIDE_APP_STORE__);
      console.log('Notifications:', window.__LUCIDE_NOTIFICATIONS__);
    }
  });
  
  // Exposer les stores pour le débogage
  window.__LUCIDE_VERSION__ = '1.0.0';
}