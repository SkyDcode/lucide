// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/layout/Navigation/Navigation';
import { AppProvider } from './shared/store/appStore';
import { NotificationsProvider } from './shared/store/notificationStore';

import FoldersPage from './pages/FoldersPage';
import EntitiesPage from './pages/EntitiesPage';
import GraphPage from './pages/GraphPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <NotificationsProvider>
          <Navigation>
            <Routes>
              <Route path="/" element={<Navigate to="/folders" replace />} />
              <Route path="/folders" element={<FoldersPage />} />
              <Route path="/folders/:folderId/entities" element={<EntitiesPage />} />
              <Route path="/folders/:folderId/graph" element={<GraphPage />} />
              <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
            </Routes>
          </Navigation>
        </NotificationsProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

