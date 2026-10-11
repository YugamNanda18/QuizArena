import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId =
  | 'light'
  | 'midnight'
  | 'cyberpunk'
  | 'emerald'
  | 'onyx'
  | 'crimson'
  | 'nordic'
  | 'sunset'
  | 'dracula';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  accentHex: string;
  previewBg: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'light',
    name: 'Titanium Light',
    badge: 'Default Clean',
    description: 'Ultra-crisp high-contrast executive daylight mode',
    accentHex: '#2563eb',
    previewBg: '#f1f5f9',
  },
  {
    id: 'midnight',
    name: 'Enterprise Midnight',
    badge: 'Standard',
    description: 'Deep oceanic navy with sapphire & indigo radiance',
    accentHex: '#3b82f6',
    previewBg: '#080d1a',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    badge: 'Dynamic',
    description: 'Synthwave violet, electric magenta & cyan glow',
    accentHex: '#d946ef',
    previewBg: '#090414',
  },
  {
    id: 'emerald',
    name: 'Emerald Executive',
    badge: 'Fintech',
    description: 'Obsidian forest with imperial jade & mint highlights',
    accentHex: '#10b981',
    previewBg: '#03140e',
  },
  {
    id: 'onyx',
    name: 'Obsidian Monolith',
    badge: 'Luxury',
    description: 'Deep pitch carbon with champagne gold accents',
    accentHex: '#f59e0b',
    previewBg: '#050505',
  },
  {
    id: 'crimson',
    name: 'Crimson Overdrive',
    badge: 'Apex Velocity',
    description: 'Formula 1 carbon matte with electric scarlet & ruby glow',
    accentHex: '#ef4444',
    previewBg: '#120607',
  },
  {
    id: 'nordic',
    name: 'Nordic Aurora',
    badge: 'Boreal',
    description: 'Deep arctic slate with luminous boreal cyan & teal',
    accentHex: '#06b6d4',
    previewBg: '#051017',
  },
  {
    id: 'sunset',
    name: 'Solar Flare',
    badge: 'Cosmic',
    description: 'Twilight purple with vivid tangerine amber & coral flare',
    accentHex: '#f97316',
    previewBg: '#100a1c',
  },
  {
    id: 'dracula',
    name: 'Dracula Synth',
    badge: 'Vampire',
    description: 'Gothic velvet with vivid neon violet & electric lavender',
    accentHex: '#a855f7',
    previewBg: '#0f0c1b',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentThemeConfig: ThemeConfig;
  soundEnabled: boolean;
  toggleSound: () => boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('qa_theme') as ThemeId;
    return THEMES.some((t) => t.id === saved) ? saved : 'light';
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('qa_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('qa_theme', newTheme);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    localStorage.setItem('qa_sound_enabled', String(next));
    return next;
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  const currentThemeConfig = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        currentThemeConfig,
        soundEnabled,
        toggleSound,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
