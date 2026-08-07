import React from 'react';
import { useStore } from '../hooks/useStore';

const Sidebar: React.FC = () => {
  const { view, setView, notes } = useStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⛰️</div>
        <span className="logo-text">Штаб</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === 'tasks' ? 'active' : ''}`}
          onClick={() => setView('tasks')}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Задачи</span>
        </button>
        <button
          className={`nav-item ${view === 'kb' ? 'active' : ''}`}
          onClick={() => setView('kb')}
        >
          <span className="nav-icon">📚</span>
          <span className="nav-label">База знаний</span>
          <span className="nav-badge">{notes.length}</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-hint">Telegram Mini App</div>
      </div>
    </aside>
  );
};

export default Sidebar;
