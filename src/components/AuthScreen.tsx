import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../cloud.css';

type Mode = 'email' | 'otp' | 'password' | 'signup';

export default function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'otp') {
      setBusy(true);
      const r = await auth.verifyOtp(email, code);
      setBusy(false);
      if (r.error) setError(r.error);
      return;
    }

    if (mode === 'password') {
      setBusy(true);
      const r = await auth.signInWithPassword(email, password);
      setBusy(false);
      if (r.error) setError(r.error);
      return;
    }

    if (mode === 'signup') {
      setBusy(true);
      const r = await auth.signUp(email, password, name, username);
      setBusy(false);
      if (r.error) setError(r.error);
      else if (r.needsConfirm) setNotice('Check your email to confirm your account.');
      return;
    }

    // default 'email' → send a one-time code
    setBusy(true);
    const r = await auth.signInWithOtp(email);
    setBusy(false);
    if (r.error) setError(r.error);
    else {
      setNotice('We emailed you a 6-digit code.');
      setMode('otp');
    }
  };

  const google = async () => {
    setError('');
    setBusy(true);
    const r = await auth.signInWithGoogle();
    setBusy(false);
    if (r.error) setError(r.error);
  };

  const title =
    mode === 'otp' ? 'Enter the code'
      : mode === 'signup' ? 'Create account'
        : 'Sign in';

  const subtitle =
    mode === 'otp'
      ? `A 6-digit code was sent to ${email}`
      : 'Your workspaces, tasks and knowledge base.';

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">stabs</div>
        <div className="auth-title">{title}</div>
        <div className="auth-subtitle">{subtitle}</div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <input
                className="auth-input"
                type="text"
                placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
              <input
                className="auth-input"
                type="text"
                placeholder="Username (@handle)"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase())}
              />
            </>
          )}

          {mode !== 'otp' && (
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus={mode === 'email'}
            />
          )}

          {mode === 'otp' && (
            <input
              className="auth-input auth-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
          )}

          {(mode === 'password' || mode === 'signup') && (
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          )}

          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}

          <button className="auth-btn" type="submit" disabled={busy}>
            {busy
              ? '…'
              : mode === 'otp' ? 'Verify'
                : mode === 'signup' ? 'Create account'
                  : mode === 'password' ? 'Sign in'
                    : 'Continue with email'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button className="auth-btn auth-btn-google" type="button" onClick={google} disabled={busy}>
          Continue with Google
        </button>

        <div className="auth-links">
          {mode === 'email' && (
            <>
              <button type="button" className="auth-link" onClick={() => setMode('password')}>Sign in with password</button>
              <button type="button" className="auth-link" onClick={() => setMode('signup')}>Create account</button>
            </>
          )}
          {mode === 'otp' && (
            <>
              <button type="button" className="auth-link" onClick={() => setMode('email')}>← Back</button>
              <button
                type="button"
                className="auth-link"
                onClick={() => { setError(''); auth.signInWithOtp(email); }}
              >
                Resend code
              </button>
            </>
          )}
          {(mode === 'password' || mode === 'signup') && (
            <button type="button" className="auth-link" onClick={() => setMode('email')}>← Back to email sign-in</button>
          )}
        </div>
      </div>
    </div>
  );
}
