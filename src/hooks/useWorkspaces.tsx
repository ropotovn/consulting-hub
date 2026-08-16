import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Workspace, Invitation, WorkspaceRole, WorkspaceMember } from '../types/cloud';
import type { UserRef } from '../types';

const WS_KEY = 'stabs_workspace_id';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  invitations: Invitation[];
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;
  loading: boolean;
  members: WorkspaceMember[];
  memberRefs: UserRef[];
  createWorkspace: (name: string) => Promise<{ error?: string; id?: string }>;
  invite: (workspaceId: string, email: string) => Promise<{ error?: string }>;
  acceptInvitation: (token: string) => Promise<{ error?: string }>;
  deleteWorkspace: (workspaceId: string) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem(WS_KEY),
  );
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const refresh = useCallback(async () => {
    if (!configured || !user) {
      setWorkspaces([]);
      setInvitations([]);
      return;
    }
    setLoading(true);
    try {
      const [wsRes, invRes, memRes] = await Promise.all([
        supabase.from('workspaces').select('*').order('created_at'),
        supabase
          .from('invitations')
          .select('*, workspace:workspaces(*)')
          .eq('status', 'pending'),
        supabase.from('workspace_members').select('workspace_id, role').eq('user_id', user.id),
      ]);

      if (wsRes.data) {
        const roleMap = new Map<string, WorkspaceRole>(
          ((memRes.data || []) as Array<{ workspace_id: string; role: WorkspaceRole }>).map(
            (m) => [m.workspace_id, m.role],
          ),
        );
        setWorkspaces(
          (wsRes.data as unknown as Workspace[]).map((w) => ({ ...w, role: roleMap.get(w.id) })),
        );
      }

      if (invRes.data) {
        const mine = (invRes.data as unknown as Invitation[]).filter(
          (i) => (i.email || '').toLowerCase() === (user.email || '').toLowerCase(),
        );
        setInvitations(mine);
      }
    } finally {
      setLoading(false);
    }
  }, [configured, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // roster of the current workspace (assignee dropdown + @mentions)
  useEffect(() => {
    if (!configured || !user || !currentWorkspaceId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id, role, joined_at, profile:profiles(id, full_name, username, avatar_url)')
        .eq('workspace_id', currentWorkspaceId);
      if (!cancelled && data) setMembers(data as unknown as WorkspaceMember[]);
    })();
    return () => { cancelled = true; };
  }, [configured, user, currentWorkspaceId]);

  const setCurrentWorkspaceId = useCallback((id: string | null) => {
    setCurrentWorkspaceIdState(id);
    if (id) localStorage.setItem(WS_KEY, id);
    else localStorage.removeItem(WS_KEY);
  }, []);

  // keep the selection pointing at a workspace the user actually belongs to
  useEffect(() => {
    if (workspaces.length === 0) return;
    if (currentWorkspaceId && workspaces.some((w) => w.id === currentWorkspaceId)) return;
    const stored = localStorage.getItem(WS_KEY);
    if (stored && workspaces.some((w) => w.id === stored)) return;
    setCurrentWorkspaceId(workspaces[0].id);
  }, [workspaces, currentWorkspaceId, setCurrentWorkspaceId]);

  const createWorkspace = useCallback(async (name: string) => {
    if (!configured || !user) return { error: 'Not authenticated' };
    const { data, error } = await supabase.rpc('create_workspace', { ws_name: name });
    if (error) return { error: error.message };
    const id = data as string;
    await refresh();
    setCurrentWorkspaceId(id);
    return { id };
  }, [configured, user, refresh, setCurrentWorkspaceId]);

  const invite = useCallback(async (workspaceId: string, email: string) => {
    if (!configured || !user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('invitations')
      .insert({
        workspace_id: workspaceId,
        email: email.trim().toLowerCase(),
        role: 'member',
        invited_by: user.id,
      });
    if (error) return { error: error.message };
    await refresh();
    return {};
  }, [configured, user, refresh]);

  const acceptInvitation = useCallback(async (token: string) => {
    if (!configured || !user) return { error: 'Not authenticated' };
    const { error } = await supabase.rpc('accept_invitation', { invite_token: token });
    if (error) return { error: error.message };
    await refresh();
    return {};
  }, [configured, user, refresh]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (!configured || !user) return { error: 'Not authenticated' };
    const { error } = await supabase.rpc('delete_workspace', { ws_id: workspaceId });
    if (error) return { error: error.message };
    if (currentWorkspaceId === workspaceId) setCurrentWorkspaceId(null);
    await refresh();
    return {};
  }, [configured, user, currentWorkspaceId, setCurrentWorkspaceId, refresh]);

  const memberRefs: UserRef[] = members
    .filter((m) => m.profile)
    .map((m) => ({
      id: m.user_id,
      name: m.profile!.full_name || m.profile!.email || '',
      username: m.profile!.username || '',
    }));

  const value: WorkspaceContextValue = {
    workspaces,
    invitations,
    members,
    memberRefs,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    loading,
    createWorkspace,
    invite,
    acceptInvitation,
    deleteWorkspace,
    refresh,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaces(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaces must be used within WorkspaceProvider');
  return ctx;
}
