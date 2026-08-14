import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { useTheme } from '../hooks/useTheme';
import { changelog } from '../changelog';
import NotificationBell from './NotificationBell';
import type { View } from '../types';

const TasksIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="7" height="7" rx="1" />
    <rect x="11" y="2" width="7" height="7" rx="1" />
    <rect x="2" y="11" width="7" height="7" rx="1" />
    <rect x="11" y="11" width="7" height="7" rx="1" />
  </svg>
);

const KbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h12v3H4zM4 9h12v7H4z" />
    <line x1="8" y1="4" x2="8" y2="16" />
  </svg>
);

const BoardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="16" height="16" rx="2" />
    <line x1="10" y1="2" x2="10" y2="18" />
    <line x1="2" y1="10" x2="18" y2="10" />
  </svg>
);

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3 L5 8 L10 13" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3 L11 8 L6 13" />
  </svg>
);

const Sidebar: React.FC = () => {
  const { view, setView, notes } = useStore();
  const { theme, setTheme, themes } = useTheme();
  const [kbAuto, setKbAuto] = useState(() => localStorage.getItem('shtab_kb_auto') !== 'false');
  const [showChangelog, setShowChangelog] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('shtab_sidebar_collapsed') === 'true');

  const toggleCollapse = () => {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('shtab_sidebar_collapsed', String(next));
      return next;
    });
  };

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

  const navItems: { id: View; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
    { id: 'kb', label: 'Knowledge', icon: <KbIcon />, count: notes.length },
    { id: 'board', label: 'Board', icon: <BoardIcon /> },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {collapsed ? (
        <>
          <div className="sidebar-logo collapsed-logo"><span className="logo-mark">s</span></div>
          <div className="collapsed-bell"><NotificationBell /></div>
        </>
      ) : (
        <div className="sidebar-logo">
          <span>shtab</span>
          <div className="sidebar-logo-actions">
            <NotificationBell />
            <button className="collapse-btn" onClick={toggleCollapse} title="Свернуть"><ChevronLeft /></button>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)} title={collapsed ? item.label : undefined}>
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
            {!collapsed && item.count != null && <span className="nav-count">{item.count}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && (
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
      )}

      {!collapsed && (
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
      )}

      {collapsed && (
        <button className="collapse-btn collapsed-expand" onClick={toggleCollapse} title="Развернуть"><ChevronRight /></button>
      )}

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
