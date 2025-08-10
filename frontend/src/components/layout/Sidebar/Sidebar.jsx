// frontend/src/components/layout/Sidebar/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../../shared/store/appStore';

function NavItem({ to, disabled, children, icon }) {
  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 text-gray-400 cursor-not-allowed">
        {icon && <span className="text-lg">{icon}</span>}
        <span>{children}</span>
      </div>
    );
  }
  
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors ${
          isActive ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600' : 'text-gray-700'
        }`
      }
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{children}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { sidebarOpen, currentFolderId } = useAppStore();
  
  return (
    <aside
      className={`
        border-r bg-white transition-all duration-200 ease-in-out flex-shrink-0
        ${sidebarOpen ? 'w-64' : 'w-0'} 
        overflow-hidden
      `}
      aria-hidden={!sidebarOpen}
    >
      <nav className="p-4 space-y-2 h-full">
        {/* Section Navigation */}
        <div className="mb-4">
          <div className="px-3 text-xs uppercase text-gray-500 font-semibold mb-2 tracking-wider">
            Navigation
          </div>
          
          <div className="space-y-1">
            <NavItem to="/folders" icon="📁">
              Dossiers
            </NavItem>
            
            <NavItem 
              to={currentFolderId ? `/folders/${currentFolderId}/entities` : '#'} 
              disabled={!currentFolderId}
              icon="👥"
            >
              Entités
            </NavItem>
            
            <NavItem 
              to={currentFolderId ? `/folders/${currentFolderId}/graph` : '#'} 
              disabled={!currentFolderId}
              icon="🕸️"
            >
              Graphique
            </NavItem>
          </div>
        </div>

        {/* Section Outils (future extension) */}
        <div className="mb-4">
          <div className="px-3 text-xs uppercase text-gray-500 font-semibold mb-2 tracking-wider">
            Outils
          </div>
          
          <div className="space-y-1">
            <NavItem 
              to="#" 
              disabled={true}
              icon="🔍"
            >
              Recherche avancée
            </NavItem>
            
            <NavItem 
              to="#" 
              disabled={true}
              icon="📊"
            >
              Rapports
            </NavItem>
            
            <NavItem 
              to="#" 
              disabled={true}
              icon="⚙️"
            >
              Paramètres
            </NavItem>
          </div>
        </div>

        {/* Informations sur le dossier actuel */}
        {currentFolderId && (
          <div className="mt-auto pt-4 border-t border-gray-200">
            <div className="px-3 py-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 font-semibold">Dossier actuel</div>
              <div className="text-sm font-medium text-gray-700">
                #{currentFolderId}
              </div>
            </div>
          </div>
        )}

        {/* Version info */}
        <div className="mt-auto pt-4">
          <div className="px-3 py-2 text-xs text-gray-400 text-center">
            LUCIDE v1.0.0
            <br />
            <span className="text-blue-500">Mode développement</span>
          </div>
        </div>
      </nav>
    </aside>
  );
}