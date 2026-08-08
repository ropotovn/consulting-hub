import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { useTheme } from '../hooks/useTheme';
import { changelog } from '../changelog';

const Sidebar: React.FC = () => {
  const { view, setView, notes } = useStore();
  const { theme, setTheme, themes } = useTheme();
  const [kbAuto, setKbAuto] = useState(() => localStorage.getItem('shtab_kb_auto') !== 'false');
  const [showChangelog, setShowChangelog] = useState(false);

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

  const latest = changelog[0];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">shtab</div>

      <nav className="sidebar-nav">
        <button className={`nav-item ${view === 'tasks' ? 'active' : ''}`} onClick={() => setView('tasks')}>Tasks</button>
        <button className={`nav-item ${view === 'kb' ? 'active' : ''}`} onClick={() => setView('kb')}>
          Knowledge <span className="nav-count">{notes.length}</span>
        </button>
        <button className={`nav-item ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>Board</button>
      </nav>

      <div className="theme-picker">
        <div className="theme-picker-label">Settings</div>
        <div className="settings-row" style={{ padding: '4px 0', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>KB auto</span>
          <button className={`toggle ${kbAuto ? 'on' : ''}`} onClick={toggleKb} title={kbAuto ? 'Auto articles ON' : 'Auto articles OFF'} />
        </div>
        <div className="theme-picker-label" style={{ marginTop: 8 }}>Theme</div>
        <button className="theme-toggle" onClick={cycleDayNight}>
          {theme.id === 'light' ? 'Dark mode' : theme.id === 'dark' ? 'Ink mode' : 'Light mode'}
        </button>
        <div className="theme-grid">
          {themes.map(t => (
            <div key={t.id} className={`theme-dot ${theme.id === t.id ? 'active' : ''}`}
              style={{ background: t.bg, borderColor: t.border }}
              onClick={() => setTheme(t.id)} title={t.name} />
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="version-btn" onClick={() => {
          const data = {
            notes: JSON.parse(localStorage.getItem('consulting_hub_notes') || '[]'),
            tasks: JSON.parse(localStorage.getItem('consulting_hub_tasks') || '[]'),
            deleted: JSON.parse(localStorage.getItem('consulting_hub_deleted') || '[]'),
            boards: JSON.parse(localStorage.getItem('shtab_boards_list') || '["main"]'),
            exportedAt: new Date().toISOString(),
          };
          navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          alert('Data copied! Send to @ropotov_bot to sync.');
        }} title="Export all data">
          Export
        </button>
        <button className="version-btn" onClick={() => setShowChangelog(true)}>
          v{latest.version}
        </button>
      </div>

      {/* Changelog modal */}
      {showChangelog && (
        <div className="modal-overlay" onClick={() => setShowChangelog(false)}>
          <div className="changelog-modal" onClick={e => e.stopPropagation()}>
            <div className="form-header">
              <h3>Patch notes</h3>
              <button className="btn-close" onClick={() => setShowChangelog(false)}>x</button>
            </div>
            <div className="changelog-body">
              {changelog.map(entry => (
                <div key={entry.version} className="changelog-entry">
                  <div className="changelog-version">
                    v{entry.version}
                    <span className="changelog-date">{entry.date}</span>
                  </div>
                  <ul className="changelog-list">
                    {entry.changes.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
