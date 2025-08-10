// frontend/src/components/layout/Navigation/Navigation.jsx
import React from 'react';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import NotificationToast from '../../ui/NotificationToast';

export default function Navigation({ children }) {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header fixe en haut */}
      <Header />
      
      {/* Contenu principal avec sidebar et contenu */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Zone de contenu principal */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6 max-w-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Toast notifications (overlay) */}
      <NotificationToast />
    </div>
  );
}