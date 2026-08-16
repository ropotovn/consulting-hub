import React, { Suspense, lazy } from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { WorkspaceProvider } from './hooks/useWorkspaces';
import { useTelegram } from './hooks/useTelegram';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import KnowledgeBase from './components/KnowledgeBase';
import NoteEdit from './components/NoteEdit';
import MobileNav from './components/MobileNav';
import AuthScreen from './components/AuthScreen';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import './App.css';

const Board = lazy(() => import('./components/Board'));

const AppInner: React.FC = () => {
  const { view, showTaskForm, editingNoteId } = useStore();
  const { isReady } = useTelegram();
  const { theme, setTheme, themes } = useTheme();
  const { configured, loading: authLoading, user } = useAuth();

  if (!isReady || (configured && authLoading)) {
    return (
      <div className="loading-screen">
        stabs
      </div>
    );
  }

  if (configured && !user) {
    return <AuthScreen />;
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {/* Mobile workspace switcher */}
        <div className="mobile-topbar">
          <WorkspaceSwitcher />
        </div>
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
      <MobileNav />
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <WorkspaceProvider>
        <StoreProvider>
          <AppInner />
        </StoreProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
