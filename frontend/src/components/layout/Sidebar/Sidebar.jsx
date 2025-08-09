// frontend/src/components/layout/Sidebar/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../../shared/store/appStore';

function NavItem({ to, disabled, children }) {
  if (disabled) {
    return <div className="px-3 py-2 text-gray-400 cursor-not-allowed">{children}</div>;
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-semibold' : ''}`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Sidebar() {
  const { sidebarOpen, currentFolderId } = useAppStore();
  return (
    <aside
      className={`border-r bg-white transition-all duration-200 ${sidebarOpen ? 'w-60' : 'w-0'} overflow-hidden`}
      aria-hidden={!sidebarOpen}
    >
      <nav className="p-3 space-y-1">
        <div className="px-3 text-xs uppercase text-gray-500 mb-1">Navigation</div>
        <NavItem to="/folders">Dossiers</NavItem>
        <NavItem to={currentFolderId ? `/folders/${currentFolderId}/entities` : '#'} disabled={!currentFolderId}>Entités</NavItem>
        <NavItem to={currentFolderId ? `/folders/${currentFolderId}/graph` : '#'} disabled={!currentFolderId}>Graphique</NavItem>
      </nav>
    </aside>
  );
}