import React from 'react';
import { useStore } from '../hooks/useStore';

const Sidebar: React.FC = () => {
  const { view, setView, notes } = useStore();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        shtab
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === 'tasks' ? 'active' : ''}`}
          onClick={() => setView('tasks')}
        >
          Tasks
        </button>
        <button
          className={`nav-item ${view === 'kb' ? 'active' : ''}`}
          onClick={() => setView('kb')}
        >
          Knowledge
          <span className="nav-count">{notes.length}</span>
        </button>
      </nav>

      <div className="sidebar-footer">v0.2</div>
    </aside>
  );
};

export default Sidebar;
