import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { useTheme } from '../hooks/useTheme';

const Sidebar: React.FC = () => {
  const { view, setView, notes } = useStore();
  const { theme, setTheme, themes } = useTheme();
  const [kbAuto, setKbAuto] = useState(() => localStorage.getItem('shtab_kb_auto') !== 'false');

  const toggleKb = () => {
    const next = !kbAuto;
    setKbAuto(next);
    localStorage.setItem('shtab_kb_auto', String(next));
  };

  const cycleDayNight = () => {
    const current = theme.id;
    if (current === 'light') setTheme('dark');
    else if (current === 'dark') setTheme('ink');
    else setTheme('light');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">shtab</div>

      <nav className="sidebar-nav">
        <button className={`nav-item ${view === 'tasks' ? 'active' : ''}`} onClick={() => setView('tasks')}>
          Tasks
        </button>
        <button className={`nav-item ${view === 'kb' ? 'active' : ''}`} onClick={() => setView('kb')}>
          Knowledge
          <span className="nav-count">{notes.length}</span>
        </button>
        <button className={`nav-item ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
          Board
        </button>
      </nav>

      <div className="theme-picker">
        <div className="theme-picker-label">Settings</div>
        <div className="settings-row" style={{ padding: '4px 0', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            KB auto
          </span>
          <button
            className={`toggle ${kbAuto ? 'on' : ''}`}
            onClick={toggleKb}
            title={kbAuto ? 'Auto articles ON' : 'Auto articles OFF'}
          />
        </div>
        <div className="theme-picker-label" style={{ marginTop: 8 }}>Theme</div>
        <button className="theme-toggle" onClick={cycleDayNight}>
          {theme.id === 'light' ? 'Dark mode' : theme.id === 'dark' ? 'Ink mode' : 'Light mode'}
        </button>
        <div className="theme-grid">
          {themes.map(t => (
            <div
              key={t.id}
              className={`theme-dot ${theme.id === t.id ? 'active' : ''}`}
              style={{ background: t.bg, borderColor: t.border }}
              onClick={() => setTheme(t.id)}
              title={t.name}
            />
          ))}
        </div>
      </div>

      <div className="sidebar-footer">v0.3</div>
    </aside>
  );
};

export default Sidebar;
