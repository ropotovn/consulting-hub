import { useState } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import ProfileCard from './ProfileCard';

// Clickable user reference (avatar + name) that opens the profile card.
export default function UserChip({ userId, label }: { userId: string; label: string }) {
  const { members } = useWorkspaces();
  const [open, setOpen] = useState(false);
  const p = members.find(x => x.user_id === userId)?.profile;

  return (
    <>
      <button
        type="button"
        className="user-chip"
        onClick={e => { e.stopPropagation(); setOpen(true); }}
      >
        {p?.avatar_url
          ? <img className="user-chip-avatar" src={p.avatar_url} alt="" />
          : <span className="user-chip-avatar user-chip-avatar-fb">{label.charAt(0).toUpperCase()}</span>}
        <span className="user-chip-label">{label}</span>
      </button>
      {open && <ProfileCard userId={userId} onClose={() => setOpen(false)} />}
    </>
  );
}
