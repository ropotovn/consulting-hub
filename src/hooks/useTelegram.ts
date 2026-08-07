import { useEffect, useState } from 'react';
import type { Assignee } from '../types';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

const ID_MAP: Record<number, Assignee> = {
  476641608: 'nikita',
  357499890: 'sanya',
};

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      setIsReady(true);
      return;
    }

    tg.ready();
    tg.expand();

    setUser(tg.initDataUnsafe?.user || null);
    setIsReady(true);
  }, []);

  // Auto-detect who's using the app based on Telegram ID
  const currentUser: Assignee | null = user ? (ID_MAP[user.id] || null) : null;
  const currentUserName = currentUser === 'nikita' ? 'Никита' : currentUser === 'sanya' ? 'Саня' : null;

  const showConfirm = (message: string): Promise<boolean> => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return Promise.resolve(window.confirm(message));
    return new Promise((resolve) => {
      tg.showConfirm(message, resolve);
    });
  };

  const showAlert = (message: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      alert(message);
      return;
    }
    tg.showAlert(message);
  };

  const haptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(type);
    }
  };

  return { user, currentUser, currentUserName, isReady, showConfirm, showAlert, haptic };
}
