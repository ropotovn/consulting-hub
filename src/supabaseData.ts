import { supabase } from './lib/supabase';
import type { Task, Note, Notification } from './types';

// Per-workspace data layer. Rows are keyed by (workspace_id, id) — the `id`
// here is the app's own task/note id, which is unique within a workspace.

export async function loadTasks(workspaceId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('data')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data || []).map((r) => r.data as Task);
}

export async function upsertTask(workspaceId: string, task: Task): Promise<void> {
  await supabase
    .from('tasks')
    .upsert({ workspace_id: workspaceId, id: task.id, data: task }, { onConflict: 'workspace_id,id' });
}

export async function deleteTaskRow(workspaceId: string, id: string): Promise<void> {
  await supabase.from('tasks').delete().eq('workspace_id', workspaceId).eq('id', id);
}

export async function loadNotes(workspaceId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('data')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data || []).map((r) => r.data as Note);
}

export async function upsertNote(workspaceId: string, note: Note): Promise<void> {
  await supabase
    .from('notes')
    .upsert({ workspace_id: workspaceId, id: note.id, data: note }, { onConflict: 'workspace_id,id' });
}

export async function deleteNoteRow(workspaceId: string, id: string): Promise<void> {
  await supabase.from('notes').delete().eq('workspace_id', workspaceId).eq('id', id);
}

// ---- notifications ----

export async function loadNotifications(workspaceId: string, userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as Notification[];
}

export async function createNotification(p: {
  workspace_id: string;
  user_id: string;
  type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_title?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  message?: string | null;
}): Promise<void> {
  await supabase.rpc('create_notification', {
    p_workspace_id: p.workspace_id,
    p_user_id: p.user_id,
    p_type: p.type,
    p_entity_type: p.entity_type ?? null,
    p_entity_id: p.entity_id ?? null,
    p_entity_title: p.entity_title ?? null,
    p_actor_id: p.actor_id ?? null,
    p_actor_name: p.actor_name ?? null,
    p_message: p.message ?? null,
  });
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId);
}

export async function markAllNotificationsRead(workspaceId: string, userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true })
    .eq('workspace_id', workspaceId).eq('user_id', userId).eq('read', false);
}
