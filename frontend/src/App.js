import React, { useState } from 'react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('folders');

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔍 LUCIDE</h1>
        <nav>
          <button 
            className={currentView === 'folders' ? 'active' : ''}
            onClick={() => setCurrentView('folders')}
          >
            Dossiers
          </button>
          <button 
            className={currentView === 'entities' ? 'active' : ''}
            onClick={() => setCurrentView('entities')}
          >
            Entités
          </button>
          <button 
            className={currentView === 'graph' ? 'active' : ''}
            onClick={() => setCurrentView('graph')}
          >
            Graphique
          </button>
        </nav>
      </header>
      
      <main className="app-main">
        {currentView === 'folders' && <div>📁 Vue Dossiers</div>}
        {currentView === 'entities' && <div>👤 Vue Entités</div>}
        {currentView === 'graph' && <div>🌐 Vue Graphique</div>}
      </main>
    </div>
  );
}

export default App;
