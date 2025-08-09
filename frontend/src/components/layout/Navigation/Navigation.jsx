// frontend/src/components/layout/Navigation/Navigation.jsx
import React from 'react';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import NotificationToast from '../../ui/NotificationToast';

export default function Navigation({ children }) {
  return (
    <div className="h-screen w-screen flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          {children}
        </main>
      </div>
      <NotificationToast />
    </div>
  );
}