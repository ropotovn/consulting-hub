import { useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramTheme {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [theme, setTheme] = useState<TelegramTheme | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      // Running outside Telegram — use defaults
      setIsReady(true);
      return;
    }

    tg.ready();
    tg.expand();

    setUser(tg.initDataUnsafe?.user || null);
    setTheme({
      bg_color: tg.themeParams.bg_color || '#1a1b2e',
      text_color: tg.themeParams.text_color || '#e4e4e7',
      hint_color: tg.themeParams.hint_color || '#71717a',
      link_color: tg.themeParams.link_color || '#a78bfa',
      button_color: tg.themeParams.button_color || '#7c3aed',
      button_text_color: tg.themeParams.button_text_color || '#ffffff',
      secondary_bg_color: tg.themeParams.secondary_bg_color || '#252640',
    });

    setIsReady(true);
  }, []);

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

  return { user, theme, isReady, showConfirm, showAlert, haptic };
}
