export interface ThemeColors {
  id: string;
  name: string;
  bg: string;
  bgSecondary: string;
  bgHover: string;
  bgActive: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  danger: string;
  success: string;
  warning: string;
  radius: string;
  radiusSm: string;
}

export const themes: ThemeColors[] = [
  {
    id: 'light', name: 'Light',
    bg: '#ffffff', bgSecondary: '#f8f8f8', bgHover: '#f0f0f0', bgActive: '#e8e8e8',
    border: '#e5e5e5', borderLight: '#f0f0f0',
    text: '#0d0d0d', textSecondary: '#555555', textMuted: '#999999',
    accent: '#0d0d0d', accentDim: '#f0f0f0',
    danger: '#e53e3e', success: '#22c55e', warning: '#f59e0b',
    radius: '6px', radiusSm: '4px',
  },
  {
    id: 'dark', name: 'Dark',
    bg: '#0d0d0d', bgSecondary: '#141414', bgHover: '#1f1f1f', bgActive: '#2a2a2a',
    border: '#2a2a2a', borderLight: '#1f1f1f',
    text: '#f0f0f0', textSecondary: '#999999', textMuted: '#666666',
    accent: '#f0f0f0', accentDim: '#1f1f1f',
    danger: '#f87171', success: '#4ade80', warning: '#fbbf24',
    radius: '6px', radiusSm: '4px',
  },
  {
    id: 'paper', name: 'Paper',
    bg: '#faf8f5', bgSecondary: '#f3efe8', bgHover: '#ebe5da', bgActive: '#e2dbce',
    border: '#d4cdc0', borderLight: '#e8e2d6',
    text: '#2c2416', textSecondary: '#6b5e45', textMuted: '#9e8f74',
    accent: '#2c2416', accentDim: '#e8e2d6',
    danger: '#c53030', success: '#2f855a', warning: '#c05621',
    radius: '6px', radiusSm: '4px',
  },
  {
    id: 'ink', name: 'Ink',
    bg: '#fcfcfc', bgSecondary: '#f5f5f5', bgHover: '#ebebeb', bgActive: '#e0e0e0',
    border: '#1a1a1a', borderLight: '#d4d4d4',
    text: '#111111', textSecondary: '#444444', textMuted: '#888888',
    accent: '#111111', accentDim: '#ebebeb',
    danger: '#dc2626', success: '#16a34a', warning: '#d97706',
    radius: '1px', radiusSm: '1px',
  },
  {
    id: 'slate', name: 'Slate',
    bg: '#f8f9fb', bgSecondary: '#eef0f3', bgHover: '#e2e5ea', bgActive: '#d5d9df',
    border: '#c8cdd5', borderLight: '#dfe2e7',
    text: '#1e2329', textSecondary: '#5a6270', textMuted: '#9099a6',
    accent: '#1e2329', accentDim: '#dfe2e7',
    danger: '#dc3545', success: '#198754', warning: '#e6a817',
    radius: '8px', radiusSm: '6px',
  },
  {
    id: 'pink', name: 'Pink',
    bg: '#fff5f7', bgSecondary: '#ffe4e9', bgHover: '#ffd0d9', bgActive: '#ffb8c6',
    border: '#f0b8c5', borderLight: '#ffdde5',
    text: '#2d1118', textSecondary: '#7a3d4e', textMuted: '#b87686',
    accent: '#2d1118', accentDim: '#ffdde5',
    danger: '#e11d48', success: '#059669', warning: '#d97706',
    radius: '12px', radiusSm: '6px',
  },
  {
    id: 'green', name: 'Green',
    bg: '#f5fff9', bgSecondary: '#e2fced', bgHover: '#c6f6d9', bgActive: '#9be8bf',
    border: '#86d9a8', borderLight: '#c6f6d9',
    text: '#0a2918', textSecondary: '#2d6b45', textMuted: '#5a9e72',
    accent: '#0a2918', accentDim: '#c6f6d9',
    danger: '#dc2626', success: '#16a34a', warning: '#ca8a04',
    radius: '8px', radiusSm: '4px',
  },
  {
    id: 'darkgreen', name: 'Dark Green',
    bg: '#0a1a10', bgSecondary: '#0f2418', bgHover: '#162e20', bgActive: '#1d3a28',
    border: '#1d3a28', borderLight: '#162e20',
    text: '#d4ede0', textSecondary: '#8ab89e', textMuted: '#5a8a6e',
    accent: '#d4ede0', accentDim: '#162e20',
    danger: '#f87171', success: '#4ade80', warning: '#fbbf24',
    radius: '6px', radiusSm: '4px',
  },
];

export function getTheme(id: string): ThemeColors {
  return themes.find(t => t.id === id) || themes[0];
}
