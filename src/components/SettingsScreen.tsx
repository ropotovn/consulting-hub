import { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import '../cloud.css';

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { user, profile, updateProfile, updateUsername, updatePassword, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveName = async () => {
    setBusy(true); setError(''); setNotice('');
    const r = await updateProfile({ full_name: name });
    setBusy(false);
    if (r.error) setError(r.error); else setNotice('Saved');
  };

  const saveUsername = async () => {
    setBusy(true); setError(''); setNotice('');
    const r = await updateUsername(username);
    setBusy(false);
    if (r.error) setError(r.error); else setNotice('Username saved');
  };

  const saveBio = async () => {
    setBusy(true); setError(''); setNotice('');
    const r = await updateProfile({ bio });
    setBusy(false);
    if (r.error) setError(r.error); else setNotice('Bio saved');
  };

  const changePw = async () => {
    if (pw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setBusy(true); setError(''); setNotice('');
    const r = await updatePassword(pw);
    setBusy(false);
    if (r.error) setError(r.error); else { setPw(''); setNotice('Password updated'); }
  };

  const onFile = async (f: File | undefined) => {
    if (!f || !user) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const jpegBlob = await toJpeg(f);
      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, jpegBlob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (upErr) { setBusy(false); setError(upErr.message); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const r = await updateProfile({ avatar_url: data.publicUrl });
      setBusy(false);
      if (r.error) setError(r.error); else setNotice('Photo updated');
    } catch {
      setBusy(false);
      setError('Could not read image — use JPG or PNG.');
    }
  };

  return (
    <div className="cloud-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span>Settings</span>
          <button className="settings-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="settings-section">
          <div className="settings-avatar" onClick={() => fileRef.current?.click()}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{initials(name || profile?.email)}</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} />
          <label>Full name</label>
          <input className="auth-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          <button className="auth-btn auth-btn-sm" onClick={saveName} disabled={busy}>Save name</button>

          <label>Username (@handle)</label>
          <input className="auth-input" value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase())} placeholder="username" />
          <button className="auth-btn auth-btn-sm" onClick={saveUsername} disabled={busy}>Save username</button>

          <label>Bio</label>
          <textarea className="auth-input" rows={2} value={bio} onChange={e => setBio(e.target.value)} placeholder="About you / role / contacts" />
          <button className="auth-btn auth-btn-sm" onClick={saveBio} disabled={busy}>Save bio</button>
        </div>

        <div className="settings-section">
          <label>Email</label>
          <div className="settings-email">{user?.email}</div>
        </div>

        <div className="settings-section">
          <label>Change password</label>
          <input className="auth-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" />
          <button className="auth-btn auth-btn-sm" onClick={changePw} disabled={busy}>Update password</button>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}

        <div className="settings-footer">
          <button className="auth-btn auth-btn-danger" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

function initials(s?: string | null): string {
  if (!s) return '?';
  return s.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// Normalize any image (HEIC/JPG/PNG/WebP) to a downscaled JPEG so browsers render it.
async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  try {
    const MAX = 1280;
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) throw new Error('encode failed');
    return blob;
  } finally {
    bmp.close();
  }
}
export { initials };
