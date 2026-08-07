import React from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import { ThemeProvider } from './hooks/useTheme';
import { useTelegram } from './hooks/useTelegram';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import KnowledgeBase from './components/KnowledgeBase';
import NoteEdit from './components/NoteEdit';
import './App.css';

const AppInner: React.FC = () => {
  const { view, showTaskForm, editingNoteId, setView } = useStore();
  const { isReady } = useTelegram();

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
        {view === 'tasks' ? <TaskBoard /> : <KnowledgeBase />}
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
