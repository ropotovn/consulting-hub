import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types/cloud';
import type { UserRef } from '../types';

type Result = { error?: string };

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  currentUserRef: UserRef | null;
  signInWithOtp: (email: string) => Promise<Result>;
  verifyOtp: (email: string, token: string) => Promise<Result>;
  signInWithPassword: (email: string, password: string) => Promise<Result>;
  signUp: (email: string, password: string, fullName?: string, username?: string) => Promise<Result & { needsConfirm?: boolean }>;
  signInWithGoogle: () => Promise<Result>;
  signOut: () => Promise<void>;
  updateProfile: (u: { full_name?: string; avatar_url?: string; bio?: string }) => Promise<Result>;
  updateUsername: (username: string) => Promise<Result>;
  updatePassword: (pw: string) => Promise<Result>;
  refreshProfile: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) void refreshProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) void refreshProfile(s.user.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [configured, refreshProfile]);

  const signInWithOtp = useCallback(async (email: string): Promise<Result> => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? { error: error.message } : {};
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string): Promise<Result> => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    return error ? { error: error.message } : {};
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<Result> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string, username?: string): Promise<Result & { needsConfirm?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || null, username: username || null } },
    });
    if (error) return { error: error.message };
    return { needsConfirm: !data.session };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<Result> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (u: { full_name?: string; avatar_url?: string; bio?: string }): Promise<Result> => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...u, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) await refreshProfile(user.id);
    return error ? { error: error.message } : {};
  }, [user, refreshProfile]);

  const updateUsername = useCallback(async (username: string): Promise<Result> => {
    if (!user) return { error: 'Not authenticated' };
    const uname = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (uname.length < 3) return { error: 'Username must be at least 3 characters' };
    const { error } = await supabase
      .from('profiles')
      .update({ username: uname, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) await refreshProfile(user.id);
    return error ? { error: error.code === '23505' ? 'Username is taken' : error.message } : {};
  }, [user, refreshProfile]);

  const updatePassword = useCallback(async (pw: string): Promise<Result> => {
    const { error } = await supabase.auth.updateUser({ password: pw });
    return error ? { error: error.message } : {};
  }, []);

  const currentUserRef: UserRef | null = user
    ? { id: user.id, name: profile?.full_name || user.email || '', username: profile?.username || '' }
    : null;

  const value: AuthContextValue = {
    configured, loading, session, user, profile, currentUserRef,
    signInWithOtp, verifyOtp, signInWithPassword, signUp, signInWithGoogle,
    signOut, updateProfile, updateUsername, updatePassword, refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
