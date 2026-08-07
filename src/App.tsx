import React, { Suspense, lazy } from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useTelegram } from './hooks/useTelegram';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import KnowledgeBase from './components/KnowledgeBase';
import NoteEdit from './components/NoteEdit';
import './App.css';

const Board = lazy(() => import('./components/Board'));

const AppInner: React.FC = () => {
  const { view, showTaskForm, editingNoteId, setView } = useStore();
  const { isReady } = useTelegram();
  const { theme, setTheme, themes } = useTheme();

  if (!isReady) {
    return (
      <div className="loading-screen">
        shtab
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {/* Mobile theme strip */}
        <div className="mobile-theme-strip">
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
        {view === 'tasks' ? <TaskBoard /> : view === 'kb' ? <KnowledgeBase /> : (
          <Suspense fallback={<div className="loading-screen">...</div>}>
            <Board />
          </Suspense>
        )}
      </main>
      {showTaskForm && <TaskForm />}
      {editingNoteId && <NoteEdit />}

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          <button
            className={`mobile-nav-btn ${view === 'tasks' ? 'active' : ''}`}
            onClick={() => setView('tasks')}
          >
            <span className="mobile-nav-btn-icon">=</span>
            Tasks
          </button>
          <button
            className={`mobile-nav-btn ${view === 'kb' ? 'active' : ''}`}
            onClick={() => setView('kb')}
          >
            <span className="mobile-nav-btn-icon">#</span>
            Knowledge
          </button>
          <button
            className={`mobile-nav-btn ${view === 'board' ? 'active' : ''}`}
            onClick={() => setView('board')}
          >
            <span className="mobile-nav-btn-icon">+</span>
            Board
          </button>
        </div>
      </nav>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  </ThemeProvider>
);

export default App;
