import { useWorkspaces } from '../hooks/useWorkspaces';

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' };

export default function ProfileCard({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { members } = useWorkspaces();
  const m = members.find(x => x.user_id === userId);
  const p = m?.profile;
  const name = p?.full_name || p?.email || '—';

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-card" onClick={e => e.stopPropagation()}>
        <div className="profile-card-avatar">
          {p?.avatar_url ? <img src={p.avatar_url} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="profile-card-name">{name}</div>
        {p?.username && <div className="profile-card-handle">@{p.username}</div>}
        {m && <div className="profile-card-role">{ROLE_LABELS[m.role] || m.role}</div>}
        {p?.bio && <div className="profile-card-bio">{p.bio}</div>}
        {m && <div className="profile-card-meta">in workspace since {new Date(m.joined_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
        <button className="btn-ghost btn-xs" onClick={onClose} style={{ marginTop: 8 }}>Close</button>
      </div>
    </div>
  );
}
