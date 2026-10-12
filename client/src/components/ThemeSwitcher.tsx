import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES } from '../context/ThemeContext';
import { Palette, Check, Sparkles } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, currentThemeConfig } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          sounds.playSelect();
          setOpen((prev) => !prev);
        }}
        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 border transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
          boxShadow: 'var(--glow-shadow)',
        }}
        title={`Current Theme: ${currentThemeConfig.name} (${THEMES.length} themes available)`}
      >
        <span
          className="w-3 h-3 rounded-full border border-white/20 shadow-sm transition-transform"
          style={{ backgroundColor: currentThemeConfig.accentHex }}
        />
        <Palette className="w-3.5 h-3.5 opacity-80" />
        <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider">
          {currentThemeConfig.badge}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl p-2.5 shadow-2xl z-50 border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--glow-shadow)',
          }}
        >
          <div className="px-2.5 py-1.5 mb-1.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Interface Themes
              </span>
            </div>
            <span className="text-[10px] opacity-60 font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border-subtle)' }}>
              {THEMES.length} Presets
            </span>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    sounds.playSelect();
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`w-full p-2 rounded-xl text-left flex items-start space-x-3 transition-all ${
                    isSelected
                      ? 'shadow-sm font-semibold'
                      : 'hover:opacity-95 opacity-75'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                    outline: isSelected ? `2px solid ${t.accentHex}` : 'none',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border mt-0.5"
                    style={{
                      backgroundColor: t.previewBg,
                      borderColor: t.accentHex,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: t.accentHex }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold leading-tight" style={{ color: 'var(--text-main)' }}>
                          {t.name}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            color: t.accentHex,
                          }}
                        >
                          {t.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.accentHex }} />
                      )}
                    </div>
                    <p className="text-[10px] leading-tight mt-0.5 truncate opacity-70" style={{ color: 'var(--text-muted)' }}>
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
