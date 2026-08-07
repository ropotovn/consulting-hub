import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Task, Note, View, TaskStatus, Priority } from '../types';
import { sampleTasks, sampleNotes } from '../data/sampleData';

const STORAGE_KEY_TASKS = 'consulting_hub_tasks';
const STORAGE_KEY_NOTES = 'consulting_hub_notes';

interface Store {
  tasks: Task[];
  notes: Note[];
  view: View;
  setView: (v: View) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  // filters
  filterStatus: TaskStatus | 'all';
  setFilterStatus: (s: TaskStatus | 'all') => void;
  filterPriority: Priority | 'all';
  setFilterPriority: (p: Priority | 'all') => void;
  filterAssignee: string;
  setFilterAssignee: (a: string) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  showTaskForm: boolean;
  setShowTaskForm: (s: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
}

const StoreContext = createContext<Store | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage(STORAGE_KEY_TASKS, sampleTasks));
  const [notes, setNotes] = useState<Note[]>(() => loadFromStorage(STORAGE_KEY_NOTES, sampleNotes));
  const [view, setView] = useState<View>('tasks');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => { saveToStorage(STORAGE_KEY_TASKS, tasks); }, [tasks]);
  useEffect(() => { saveToStorage(STORAGE_KEY_NOTES, notes); }, [notes]);

  const addTask = useCallback((task: Task) => setTasks(prev => [task, ...prev]), []);
  const updateTask = useCallback((id: string, updates: Partial<Task>) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)), []);
  const deleteTask = useCallback((id: string) =>
    setTasks(prev => prev.filter(t => t.id !== id)), []);

  const addNote = useCallback((note: Note) => setNotes(prev => [note, ...prev]), []);
  const updateNote = useCallback((id: string, updates: Partial<Note>) =>
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n)), []);
  const deleteNote = useCallback((id: string) =>
    setNotes(prev => prev.filter(n => n.id !== id)), []);

  return (
    <StoreContext.Provider value={{
      tasks, notes, view, setView,
      addTask, updateTask, deleteTask,
      addNote, updateNote, deleteNote,
      filterStatus, setFilterStatus,
      filterPriority, setFilterPriority,
      filterAssignee, setFilterAssignee,
      selectedNoteId, setSelectedNoteId,
      editingNoteId, setEditingNoteId,
      showTaskForm, setShowTaskForm,
      editingTask, setEditingTask,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}
