import React from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import { useTelegram } from './hooks/useTelegram';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import KnowledgeBase from './components/KnowledgeBase';
import NoteEdit from './components/NoteEdit';
import './App.css';

const AppInner: React.FC = () => {
  const { view, showTaskForm, editingNoteId } = useStore();
  const { isReady } = useTelegram();

  if (!isReady) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Загрузка...</p>
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
    </div>
  );
};

const App: React.FC = () => (
  <StoreProvider>
    <AppInner />
  </StoreProvider>
);

export default App;
