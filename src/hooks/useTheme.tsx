import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ThemeColors } from '../themes';
import { getTheme, themes } from '../themes';

const THEME_STORAGE_KEY = 'shtab_theme';

interface ThemeContextType {
  theme: ThemeColors;
  setTheme: (id: string) => void;
  themes: ThemeColors[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[0],
  setTheme: () => {},
  themes,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  });

  const theme = getTheme(themeId);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--bg-secondary', theme.bgSecondary);
    root.style.setProperty('--bg-hover', theme.bgHover);
    root.style.setProperty('--bg-active', theme.bgActive);
    root.style.setProperty('--border', theme.border);
    root.style.setProperty('--border-light', theme.borderLight);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--text-muted', theme.textMuted);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-dim', theme.accentDim);
    root.style.setProperty('--danger', theme.danger);
    root.style.setProperty('--success', theme.success);
    root.style.setProperty('--warning', theme.warning);
    root.style.setProperty('--radius', theme.radius);
    root.style.setProperty('--radius-sm', theme.radiusSm);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
