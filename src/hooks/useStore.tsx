import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Task, Note, NoteComment, View, TaskStatus, Priority } from '../types';
import { sampleTasks, sampleNotes } from '../data/sampleData';
import { loadRemoteNotes, loadRemoteTasks, syncToRemote } from '../githubSync';

const STORAGE_KEY_TASKS = 'consulting_hub_tasks';
const STORAGE_KEY_NOTES = 'consulting_hub_notes';
const STORAGE_KEY_DELETED = 'consulting_hub_deleted';

interface Store {
  tasks: Task[]; notes: Note[]; view: View;
  setView: (v: View) => void;
  addTask: (t: Task) => void;
  updateTask: (id: string, u: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addNote: (n: Note) => void;
  updateNote: (id: string, u: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addNoteComment: (noteId: string, c: NoteComment) => void;
  updateNoteComment: (noteId: string, cid: string, text: string) => void;
  deleteNoteComment: (noteId: string, cid: string) => void;
  togglePinNote: (id: string) => void;
  filterStatus: TaskStatus | 'all'; setFilterStatus: (s: TaskStatus | 'all') => void;
  filterPriority: Priority | 'all'; setFilterPriority: (p: Priority | 'all') => void;
  filterAssignee: string; setFilterAssignee: (a: string) => void;
  selectedNoteId: string | null; setSelectedNoteId: (id: string | null) => void;
  editingNoteId: string | null; setEditingNoteId: (id: string | null) => void;
  showTaskForm: boolean; setShowTaskForm: (s: boolean) => void;
  editingTask: Task | null; setEditingTask: (t: Task | null) => void;
}

const StoreContext = createContext<Store | null>(null);
function ld<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function sv(k: string, d: any) { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} }

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => ld(STORAGE_KEY_TASKS, sampleTasks));
  const [notes, setNotes] = useState<Note[]>(() => ld(STORAGE_KEY_NOTES, sampleNotes));
  const [view, setView] = useState<View>('tasks');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Sync function — pulls remote data and merges with local
  const syncFromRemote = useCallback(async () => {
    try {
      const [nd, td] = await Promise.all([loadRemoteNotes(), loadRemoteTasks()]);
      const remoteTasks: Task[] = td;
      const remoteNotes: Note[] = nd;
      const dl: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED) || '[]');
      
      setTasks(prev => {
        const remoteMap = new Map<string, Task>(remoteTasks.filter(t => !dl.includes(t.id)).map(t => [t.id, t]));
        const localMap = new Map<string, Task>(prev.map(t => [t.id, t]));
        const merged: Task[] = prev.map(t => {
          const remote = remoteMap.get(t.id);
          if (remote) {
            const remoteCommentIds = new Set((remote.comments || []).map(c => c.id));
            const mergedComments = [
              ...(remote.comments || []),
              ...(t.comments || []).filter(c => !remoteCommentIds.has(c.id))
            ];
            return { ...remote, comments: mergedComments };
          }
          return t;
        });
        for (const [id, t] of remoteMap) { if (!localMap.has(id)) merged.push(t); }
        return merged;
      });
      
      setNotes(prev => {
        const remoteMap = new Map<string, Note>(remoteNotes.filter(n => !dl.includes(n.id)).map(n => [n.id, n]));
        const localMap = new Map<string, Note>(prev.map(n => [n.id, n]));
        const merged: Note[] = prev.map(n => {
          const remote = remoteMap.get(n.id);
          if (remote) {
            const remoteCommentIds = new Set((remote.comments || []).map(c => c.id));
            const mergedComments = [
              ...(remote.comments || []),
              ...(n.comments || []).filter(c => !remoteCommentIds.has(c.id))
            ];
            return { ...remote, comments: mergedComments, pinned: n.pinned ?? remote.pinned };
          }
          return n;
        });
        for (const [id, n] of remoteMap) { if (!localMap.has(id)) merged.push(n); }
        return merged;
      });
    } catch {}
  }, []);

  // Initial sync on mount
  useEffect(() => { syncFromRemote(); }, [syncFromRemote]);

  // Sync when user switches back to this tab
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') syncFromRemote(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [syncFromRemote]);

  // Background polling every 30 seconds
  useEffect(() => {
    const id = setInterval(syncFromRemote, 30_000);
    return () => clearInterval(id);
  }, [syncFromRemote]);

  useEffect(() => { sv(STORAGE_KEY_TASKS, tasks); }, [tasks]);
  useEffect(() => { sv(STORAGE_KEY_NOTES, notes); }, [notes]);

  const at = useCallback((t: Task) => setTasks(p => { const n = [t, ...p]; syncToRemote('tasks.json', n); return n; }), []);
  const ut = useCallback((id: string, u: Partial<Task>) => setTasks(p => { const n = p.map(t => t.id === id ? { ...t, ...u } : t); syncToRemote('tasks.json', n); return n; }), []);
  const dt = useCallback((id: string) => setTasks(p => { const n = p.filter(t => t.id !== id); syncToRemote('tasks.json', n); return n; }), []);
  const an = useCallback((n: Note) => setNotes(p => { const nx = [n, ...p]; syncToRemote('notes.json', nx); return nx; }), []);
  const un = useCallback((id: string, u: Partial<Note>) => setNotes(p => { const nx = p.map(n => n.id === id ? { ...n, ...u } : n); syncToRemote('notes.json', nx); return nx; }), []);
  const dn = useCallback((id: string) => {
    try { const dl: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED) || '[]'); if (!dl.includes(id)) { dl.push(id); localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(dl)); } } catch {}
    setNotes(p => { const nx = p.filter(n => n.id !== id); syncToRemote('notes.json', nx); return nx; });
  }, []);
  const anc = useCallback((nid: string, c: NoteComment) => setNotes(p => { const nx = p.map(n => n.id === nid ? { ...n, comments: [...(n.comments || []), c] } : n); syncToRemote('notes.json', nx); return nx; }), []);
  const unc = useCallback((nid: string, cid: string, txt: string) => setNotes(p => { const nx = p.map(n => n.id === nid ? { ...n, comments: (n.comments || []).map(c => c.id === cid ? { ...c, text: txt, editedAt: new Date().toISOString() } : c) } : n); syncToRemote('notes.json', nx); return nx; }), []);
  const dnc = useCallback((nid: string, cid: string) => setNotes(p => { const nx = p.map(n => n.id === nid ? { ...n, comments: (n.comments || []).filter(c => c.id !== cid) } : n); syncToRemote('notes.json', nx); return nx; }), []);
  const tpn = useCallback((id: string) => setNotes(p => { const nx = p.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n); syncToRemote('notes.json', nx); return nx; }), []);

  return React.createElement(StoreContext.Provider, { value: { tasks, notes, view, setView, addTask: at, updateTask: ut, deleteTask: dt, addNote: an, updateNote: un, deleteNote: dn, addNoteComment: anc, updateNoteComment: unc, deleteNoteComment: dnc, togglePinNote: tpn, filterStatus, setFilterStatus, filterPriority, setFilterPriority, filterAssignee, setFilterAssignee, selectedNoteId, setSelectedNoteId, editingNoteId, setEditingNoteId, showTaskForm, setShowTaskForm, editingTask, setEditingTask }}, children);
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore');
  return ctx;
}
