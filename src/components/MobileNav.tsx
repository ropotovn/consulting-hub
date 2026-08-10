import React from 'react';
import { useStore } from '../hooks/useStore';
import { useTelegram } from '../hooks/useTelegram';

const MobileNav: React.FC = () => {
  const { view, setView, unreadCount } = useStore();
  const { haptic } = useTelegram();

  const go = (v: typeof view) => {
    haptic('light');
    setView(v);
  };

  const openNotifs = () => {
    haptic('light');
    // Open first unread notification's task, or just toggle
    setView('tasks');
  };

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        <button className={`mobile-nav-btn ${view === 'tasks' ? 'active' : ''}`} onClick={() => go('tasks')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="7" height="7" rx="1" />
            <rect x="11" y="2" width="7" height="7" rx="1" />
            <rect x="2" y="11" width="7" height="7" rx="1" />
            <rect x="11" y="11" width="7" height="7" rx="1" />
          </svg>
          <span className="mobile-nav-label">Tasks</span>
        </button>
        <button className={`mobile-nav-btn ${view === 'kb' ? 'active' : ''}`} onClick={() => go('kb')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h12v3H4zM4 9h12v7H4z" />
            <line x1="8" y1="4" x2="8" y2="16" />
          </svg>
          <span className="mobile-nav-label">KB</span>
        </button>
        <button className={`mobile-nav-btn ${view === 'board' ? 'active' : ''}`} onClick={() => go('board')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="16" height="16" rx="2" />
            <line x1="10" y1="2" x2="10" y2="18" />
            <line x1="2" y1="10" x2="18" y2="10" />
          </svg>
          <span className="mobile-nav-label">Board</span>
        </button>
        <button className="mobile-nav-btn" onClick={openNotifs} style={{ position: 'relative' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3C8 3 7 4.5 7 7v2.5C5.5 10 4 11.5 4 13c0 .5.5 1 1 1h10c.5 0 1-.5 1-1 0-1.5-1.5-3-3-3.5V7c0-2.5-1-4-3-4z" />
            <path d="M8 16c0 1 1.5 2 2 2s2-1 2-2" />
          </svg>
          {unreadCount > 0 && <span className="mobile-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          <span className="mobile-nav-label">Alerts</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;
