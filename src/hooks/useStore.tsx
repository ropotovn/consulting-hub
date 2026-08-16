import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Task, Note, NoteComment, View, TaskStatus, Priority, Notification } from '../types';
import { sampleTasks, sampleNotes } from '../data/sampleData';
import { loadRemoteNotes, loadRemoteTasks, loadRemoteDeleted, syncToRemote } from '../githubSync';
import { loadTasks, loadNotes, upsertTask, deleteTaskRow, upsertNote, deleteNoteRow, loadNotifications, createNotification, markNotificationRead, markAllNotificationsRead } from '../supabaseData';
import { parseMentions } from '../mentions';
import { useAuth } from './useAuth';
import { useWorkspaces } from './useWorkspaces';

const STORAGE_KEY_TASKS = 'consulting_hub_tasks';
const STORAGE_KEY_NOTES = 'consulting_hub_notes';
const STORAGE_KEY_DELETED = 'consulting_hub_deleted';

interface Store {
  tasks: Task[]; notes: Note[]; view: View;
  notifications: Notification[]; unreadCount: number;
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
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
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
  try { const r = localStorage.getItem(k); return r ? fixMojibake(JSON.parse(r)) : fb; } catch { return fb; }
}
function sv(k: string, d: any) { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} }

// Detect and fix mojibake (legacy GitHub-JSON path only)
function fixMojibake(obj: any): any {
  if (typeof obj === 'string') {
    let s = obj;
    const hasCyrillic = /[\u0400-\u04FF]/.test(s);
    if (!hasCyrillic) {
      for (let i = 0; i < 5; i++) {
        try {
          const fixed = new TextDecoder().decode(Uint8Array.from(s, (c: string) => c.charCodeAt(0)));
          if (fixed === s) break;
          s = fixed;
        } catch { break; }
      }
    }
    if (/[@A-Z\[\]\\^_]{2,}/.test(s)) {
      try {
        const bytes = Uint8Array.from(s, c => {
          const o = c.charCodeAt(0);
          return (o >= 0x40 && o <= 0x5F) ? (o | 0x80) : o;
        });
        const koi = new TextDecoder('koi8-r').decode(bytes);
        const cyrBefore = (s.match(/[\u0400-\u04FF]/g) || []).length;
        const cyrAfter = (koi.match(/[\u0400-\u04FF]/g) || []).length;
        if (cyrAfter > cyrBefore + 2) s = koi;
      } catch {}
    }
    return s;
  }
  if (Array.isArray(obj)) return obj.map(fixMojibake);
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = fixMojibake(obj[k]);
    return out;
  }
  return obj;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { configured, user, currentUserRef } = useAuth();
  const { currentWorkspaceId, memberRefs } = useWorkspaces();
  const cloud = configured && !!currentWorkspaceId;

  const [tasks, setTasks] = useState<Task[]>(() => (configured ? [] : ld(STORAGE_KEY_TASKS, sampleTasks)));
  const [notes, setNotes] = useState<Note[]>(() => (configured ? [] : ld(STORAGE_KEY_NOTES, sampleNotes)));
  const [view, setView] = useState<View>('tasks');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback(async (recipientId: string, type: Notification['type'], opts: { entityType?: 'task' | 'note'; entityId?: string; entityTitle?: string; message?: string }) => {
    if (!cloud || !currentWorkspaceId || !user || !currentUserRef) return;
    if (recipientId === user.id) return; // never notify self
    try {
      await createNotification({
        workspace_id: currentWorkspaceId,
        user_id: recipientId,
        type,
        entity_type: opts.entityType ?? null,
        entity_id: opts.entityId ?? null,
        entity_title: opts.entityTitle ?? null,
        actor_id: user.id,
        actor_name: currentUserRef.name,
        message: opts.message ?? null,
      });
    } catch {}
  }, [cloud, currentWorkspaceId, user, currentUserRef]);

  const markNotifRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (cloud && user) void markNotificationRead(id, user.id);
  }, [cloud, user]);
  const markAllNotifsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (cloud && currentWorkspaceId && user) void markAllNotificationsRead(currentWorkspaceId, user.id);
  }, [cloud, currentWorkspaceId, user]);

  // ---- Cloud load: pull tasks/notes for the current workspace ----
  useEffect(() => {
    if (!cloud) return;
    let cancelled = false;
    setTasks([]);
    setNotes([]);
    setSelectedNoteId(null);
    setEditingNoteId(null);
    setEditingTask(null);
    (async () => {
      try {
        const [t, n] = await Promise.all([loadTasks(currentWorkspaceId!), loadNotes(currentWorkspaceId!)]);
        if (!cancelled) { setTasks(t); setNotes(n); }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [cloud, currentWorkspaceId]);

  // ---- Cloud notifications (per-user) ----
  useEffect(() => {
    if (!cloud || !currentWorkspaceId || !user) { setNotifications([]); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const n = await loadNotifications(currentWorkspaceId, user.id);
        if (!cancelled) setNotifications(n);
      } catch {}
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [cloud, currentWorkspaceId, user]);

  // ---- Legacy sync (GitHub JSON) — only when not in cloud mode ----
  const syncFromRemote = useCallback(async () => {
    try {
      const [nd, td, deld] = await Promise.all([loadRemoteNotes(), loadRemoteTasks(), loadRemoteDeleted()]);
      const remoteTasks: Task[] = fixMojibake(td);
      const remoteNotes: Note[] = fixMojibake(nd);
      const serverDeleted: string[] = Array.isArray(deld) ? deld : [];
      const localDeleted: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED) || '[]');
      const dl: string[] = [...new Set([...localDeleted, ...serverDeleted])];
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(dl));

      setTasks(prev => {
        const remoteMap = new Map<string, Task>(remoteTasks.filter(t => !dl.includes(t.id)).map(t => [t.id, t]));
        const localMap = new Map<string, Task>(prev.map(t => [t.id, t]));
        const merged: Task[] = prev.map(t => {
          const remote = remoteMap.get(t.id);
          if (remote) {
            const remoteCommentIds = new Set((remote.comments || []).map(c => c.id));
            const mergedComments = [...(remote.comments || []), ...(t.comments || []).filter(c => !remoteCommentIds.has(c.id))];
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
            const mergedComments = [...(remote.comments || []), ...(n.comments || []).filter(c => !remoteCommentIds.has(c.id))];
            return { ...remote, comments: mergedComments, pinned: n.pinned ?? remote.pinned };
          }
          return n;
        });
        for (const [id, n] of remoteMap) { if (!localMap.has(id)) merged.push(n); }
        return merged;
      });
    } catch {}
  }, []);

  // Legacy: initial sync, visibility, polling
  useEffect(() => {
    if (cloud) return;
    syncFromRemote();
    const onVisible = () => { if (document.visibilityState === 'visible') syncFromRemote(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(syncFromRemote, 30_000);
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(id); };
  }, [cloud, syncFromRemote]);

  // Persist local state (legacy mode persists tasks/notes; notifications always)
  useEffect(() => { if (!cloud) sv(STORAGE_KEY_TASKS, tasks); }, [cloud, tasks]);
  useEffect(() => { if (!cloud) sv(STORAGE_KEY_NOTES, notes); }, [cloud, notes]);

  const at = useCallback((t: Task) => {
    if (t.assignee && t.assignee.id !== user?.id) {
      void notify(t.assignee.id, 'assign', { entityType: 'task', entityId: t.id, entityTitle: t.title, message: 'assigned you' });
    }
    setTasks(p => {
      const n = [t, ...p];
      if (cloud && currentWorkspaceId) void upsertTask(currentWorkspaceId, t);
      else if (!cloud) syncToRemote('tasks.json', n);
      return n;
    });
  }, [cloud, currentWorkspaceId, user, notify]);

  const ut = useCallback((id: string, u: Partial<Task>) => setTasks(p => {
    const oldTask = p.find(t => t.id === id);
    const n = p.map(t => t.id === id ? { ...t, ...u } : t);
    const updated = n.find(t => t.id === id);
    if (cloud && currentWorkspaceId && updated) void upsertTask(currentWorkspaceId, updated);
    else if (!cloud) syncToRemote('tasks.json', n);
    if (oldTask && updated) {
      if (u.assignee && updated.assignee && updated.assignee.id !== (oldTask.assignee?.id ?? '') && updated.assignee.id !== user?.id) {
        void notify(updated.assignee.id, 'assign', { entityType: 'task', entityId: id, entityTitle: updated.title, message: 'assigned you' });
      }
      if (u.status && u.status !== oldTask.status && updated.assignee && updated.assignee.id !== user?.id) {
        void notify(updated.assignee.id, 'status', { entityType: 'task', entityId: id, entityTitle: updated.title, message: `${oldTask.status} → ${u.status}` });
      }
      if (u.comments && u.comments.length > (oldTask.comments || []).length) {
        const newComment = u.comments[u.comments.length - 1];
        if (updated.assignee && updated.assignee.id !== user?.id) {
          void notify(updated.assignee.id, 'comment', { entityType: 'task', entityId: id, entityTitle: updated.title, message: newComment.text.slice(0, 80) });
        }
        for (const uname of parseMentions(newComment.text)) {
          const mentioned = memberRefs.find(m => m.username === uname);
          if (mentioned && mentioned.id !== user?.id) {
            void notify(mentioned.id, 'mention', { entityType: 'task', entityId: id, entityTitle: updated.title, message: newComment.text.slice(0, 80) });
          }
        }
      }
    }
    return n;
  }), [cloud, currentWorkspaceId, user, notify, memberRefs]);

  const dt = useCallback((id: string) => setTasks(p => {
    const n = p.filter(t => t.id !== id);
    if (cloud && currentWorkspaceId) void deleteTaskRow(currentWorkspaceId, id);
    else if (!cloud) syncToRemote('tasks.json', n);
    return n;
  }), [cloud, currentWorkspaceId]);

  const an = useCallback((n: Note) => setNotes(p => {
    const nx = [n, ...p];
    if (cloud && currentWorkspaceId) void upsertNote(currentWorkspaceId, n);
    else if (!cloud) syncToRemote('notes.json', nx);
    return nx;
  }), [cloud, currentWorkspaceId]);

  const un = useCallback((id: string, u: Partial<Note>) => setNotes(p => {
    const nx = p.map(n => n.id === id ? { ...n, ...u } : n);
    const updated = nx.find(n => n.id === id);
    if (cloud && currentWorkspaceId && updated) void upsertNote(currentWorkspaceId, updated);
    else if (!cloud) syncToRemote('notes.json', nx);
    return nx;
  }), [cloud, currentWorkspaceId]);

  const dn = useCallback((id: string) => {
    try {
      const dl: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED) || '[]');
      if (!dl.includes(id)) { dl.push(id); localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(dl)); }
    } catch {}
    setNotes(p => {
      const nx = p.filter(n => n.id !== id);
      if (cloud && currentWorkspaceId) void deleteNoteRow(currentWorkspaceId, id);
      else if (!cloud) syncToRemote('notes.json', nx);
      return nx;
    });
  }, [cloud, currentWorkspaceId]);

  const anc = useCallback((nid: string, c: NoteComment) => {
    for (const uname of parseMentions(c.text)) {
      const mentioned = memberRefs.find(m => m.username === uname);
      if (mentioned && mentioned.id !== user?.id) {
        void notify(mentioned.id, 'mention', { entityType: 'note', entityId: nid, entityTitle: '', message: c.text.slice(0, 80) });
      }
    }
    setNotes(p => {
      const nx = p.map(n => n.id === nid ? { ...n, comments: [...(n.comments || []), c] } : n);
      const updated = nx.find(n => n.id === nid);
      if (cloud && currentWorkspaceId && updated) void upsertNote(currentWorkspaceId, updated);
      else if (!cloud) syncToRemote('notes.json', nx);
      return nx;
    });
  }, [cloud, currentWorkspaceId, user, notify, memberRefs]);

  const unc = useCallback((nid: string, cid: string, txt: string) => setNotes(p => {
    const nx = p.map(n => n.id === nid ? { ...n, comments: (n.comments || []).map(c => c.id === cid ? { ...c, text: txt, editedAt: new Date().toISOString() } : c) } : n);
    const updated = nx.find(n => n.id === nid);
    if (cloud && currentWorkspaceId && updated) void upsertNote(currentWorkspaceId, updated);
    else if (!cloud) syncToRemote('notes.json', nx);
    return nx;
  }), [cloud, currentWorkspaceId]);

  const dnc = useCallback((nid: string, cid: string) => setNotes(p => {
    const nx = p.map(n => n.id === nid ? { ...n, comments: (n.comments || []).filter(c => c.id !== cid) } : n);
    const updated = nx.find(n => n.id === nid);
    if (cloud && currentWorkspaceId && updated) void upsertNote(currentWorkspaceId, updated);
    else if (!cloud) syncToRemote('notes.json', nx);
    return nx;
  }), [cloud, currentWorkspaceId]);

  const tpn = useCallback((id: string) => setNotes(p => {
    const nx = p.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n);
    const updated = nx.find(n => n.id === id);
    if (cloud && currentWorkspaceId && updated) void upsertNote(currentWorkspaceId, updated);
    else if (!cloud) syncToRemote('notes.json', nx);
    return nx;
  }), [cloud, currentWorkspaceId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return React.createElement(StoreContext.Provider, { value: { tasks, notes, view, notifications, unreadCount, setView, addTask: at, updateTask: ut, deleteTask: dt, addNote: an, updateNote: un, deleteNote: dn, addNoteComment: anc, updateNoteComment: unc, deleteNoteComment: dnc, togglePinNote: tpn, markNotifRead, markAllNotifsRead, filterStatus, setFilterStatus, filterPriority, setFilterPriority, filterAssignee, setFilterAssignee, selectedNoteId, setSelectedNoteId, editingNoteId, setEditingNoteId, showTaskForm, setShowTaskForm, editingTask, setEditingTask }}, children);
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore');
  return ctx;
}
