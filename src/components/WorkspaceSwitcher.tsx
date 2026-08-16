import { useEffect, useRef, useState } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useAuth } from '../hooks/useAuth';
import SettingsScreen, { initials } from './SettingsScreen';

export default function WorkspaceSwitcher() {
  const {
    workspaces, invitations, currentWorkspaceId, setCurrentWorkspaceId,
    createWorkspace, invite, acceptInvitation, deleteWorkspace,
  } = useWorkspaces();
  const { profile, user } = useAuth();

  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newWs, setNewWs] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = workspaces.find(w => w.id === currentWorkspaceId) ?? null;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const doCreate = async () => {
    if (!newWs.trim()) return;
    setBusy(true); setErr('');
    const r = await createWorkspace(newWs.trim());
    setBusy(false);
    if (r.error) setErr(r.error);
    else { setNewWs(''); setOpen(false); }
  };

  const doInvite = async () => {
    if (!inviteEmail.trim() || !currentWorkspaceId) return;
    setBusy(true); setErr('');
    const r = await invite(currentWorkspaceId, inviteEmail.trim());
    setBusy(false);
    if (r.error) setErr(r.error);
    else setInviteEmail('');
  };

  const doAccept = async (token: string) => {
    setBusy(true); setErr('');
    const r = await acceptInvitation(token);
    setBusy(false);
    if (r.error) setErr(r.error);
  };

  const doDelete = async () => {
    if (!currentWorkspaceId) return;
    const ok = window.confirm(
      `Delete "${current?.name ?? 'this workspace'}"?\n\nIt will be hidden immediately and permanently deleted after 15 days.`,
    );
    if (!ok) return;
    setBusy(true); setErr('');
    const r = await deleteWorkspace(currentWorkspaceId);
    setBusy(false);
    if (r.error) setErr(r.error);
    else setOpen(false);
  };

  return (
    <div className="ws-switcher" ref={ref}>
      <button className="ws-trigger" onClick={() => setOpen(o => !o)} title={current?.name ?? 'Workspace'}>
        <span className="ws-dot" />
        <span className="ws-name">{current?.name ?? 'No workspace'}</span>
        <svg className="ws-caret" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="ws-dropdown">
          <div className="ws-dropdown-label">Workspaces</div>
          {workspaces.map(w => (
            <button
              key={w.id}
              className={`ws-item ${w.id === currentWorkspaceId ? 'active' : ''}`}
              onClick={() => { setCurrentWorkspaceId(w.id); setOpen(false); }}
            >
              <span className="ws-dot" />
              <span className="ws-item-name" title={w.name}>{w.name}</span>
              {w.id === currentWorkspaceId && <span className="ws-check">✓</span>}
            </button>
          ))}

          <div className="ws-create-row">
            <input
              className="auth-input ws-inline"
              placeholder="New workspace"
              value={newWs}
              onChange={e => setNewWs(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }}
            />
            <button className="auth-btn auth-btn-sm" onClick={doCreate} disabled={busy}>Create</button>
          </div>

          {invitations.length > 0 && (
            <>
              <div className="ws-dropdown-label ws-divider-top">Invitations</div>
              {invitations.map(inv => (
                <div key={inv.id} className="ws-invite-row">
                  <span className="ws-item-name">{inv.workspace?.name ?? 'Workspace'}</span>
                  <button className="auth-btn auth-btn-sm" onClick={() => void doAccept(inv.token)} disabled={busy}>Accept</button>
                </div>
              ))}
            </>
          )}

          {currentWorkspaceId && (
            <div className="ws-create-row ws-divider-top">
              <input
                className="auth-input ws-inline"
                placeholder="Invite by email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void doInvite(); }}
              />
              <button className="auth-btn auth-btn-sm" onClick={doInvite} disabled={busy}>Invite</button>
            </div>
          )}

          {err && <div className="auth-error ws-err">{err}</div>}

          {current?.role === 'owner' && (
            <div className="ws-divider-top">
              <button className="ws-item ws-item-danger" onClick={() => void doDelete()} disabled={busy}>
                <span className="ws-item-name">Delete workspace</span>
              </button>
            </div>
          )}

          <div className="ws-divider-top">
            <button className="ws-item" onClick={() => { setOpen(false); setShowSettings(true); }}>
              <span className="ws-item-name">Account settings</span>
            </button>
            <div className="ws-account">
              <div className="settings-avatar settings-avatar-sm">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{initials(profile?.full_name || user?.email)}</span>}
              </div>
              <div className="ws-account-meta">
                <div className="ws-account-name">{profile?.full_name || 'User'}</div>
                <div className="ws-account-email">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
    </div>
  );
}
