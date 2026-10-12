import React, { useState } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import {
  Shield,
  Zap,
  UserCheck,
  LayoutDashboard,
  Radio,
  BarChart3,
  LogOut,
  Volume2,
  VolumeX,
  Keyboard,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { sounds } from '../utils/soundEffects';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  adminLoggedIn: boolean;
  onAdminLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  adminLoggedIn,
  onAdminLogout,
}) => {
  const { soundEnabled, toggleSound } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleSoundToggle = () => {
    const next = toggleSound();
    sounds.setEnabled(next);
    if (next) sounds.playSelect();
  };

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => {
            sounds.playSelect();
            setCurrentView('student-landing');
          }}
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group select-none min-w-0"
        >
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
              boxShadow: 'var(--glow-shadow)',
            }}
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight truncate" style={{ color: 'var(--text-main)' }}>
                QuizArena
              </span>
              <span
                className="hidden sm:inline px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--accent-color)',
                }}
              >
                Enterprise
              </span>
            </div>
            <p className="hidden md:block text-[11px] opacity-70 -mt-0.5 font-medium truncate" style={{ color: 'var(--text-muted)' }}>
              Real-Time Synchronized Assessment Platform
            </p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
          {/* Main Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5">
            <button
              onClick={() => {
                sounds.playSelect();
                setCurrentView('student-landing');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1 sm:space-x-1.5 ${
                currentView.startsWith('student')
                  ? 'shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: currentView.startsWith('student') ? 'var(--bg-card)' : 'transparent',
                color: 'var(--text-main)',
                border: currentView.startsWith('student') ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}
            >
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span className="hidden sm:inline">Candidate Portal</span>
              <span className="sm:hidden text-xs">Student</span>
            </button>

            {adminLoggedIn ? (
              <>
                <button
                  onClick={() => {
                    sounds.playSelect();
                    setCurrentView('admin-dashboard');
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1 sm:space-x-1.5 ${
                    currentView === 'admin-dashboard' || currentView === 'quiz-editor'
                      ? 'shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor:
                      currentView === 'admin-dashboard' || currentView === 'quiz-editor'
                        ? 'var(--bg-card)'
                        : 'transparent',
                    color: 'var(--text-main)',
                    border:
                      currentView === 'admin-dashboard' || currentView === 'quiz-editor'
                        ? '1px solid var(--border-subtle)'
                        : '1px solid transparent',
                  }}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-400" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playSelect();
                    setCurrentView('admin-control-room');
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1 sm:space-x-1.5 ${
                    currentView === 'admin-control-room'
                      ? 'shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor:
                      currentView === 'admin-control-room' ? 'var(--bg-card)' : 'transparent',
                    color: 'var(--text-main)',
                    border:
                      currentView === 'admin-control-room'
                        ? '1px solid var(--border-subtle)'
                        : '1px solid transparent',
                  }}
                >
                  <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 animate-pulse" />
                  <span className="hidden sm:inline">Control Room</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playSelect();
                    setCurrentView('admin-analytics');
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1 sm:space-x-1.5 ${
                    currentView === 'admin-analytics'
                      ? 'shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor:
                      currentView === 'admin-analytics' ? 'var(--bg-card)' : 'transparent',
                    color: 'var(--text-main)',
                    border:
                      currentView === 'admin-analytics'
                        ? '1px solid var(--border-subtle)'
                        : '1px solid transparent',
                  }}
                >
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Analytics</span>
                </button>

                <button
                  onClick={onAdminLogout}
                  title="Logout Administrator"
                  className="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  sounds.playSelect();
                  setCurrentView('admin-login');
                }}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center space-x-1 sm:space-x-1.5 hover:opacity-90"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="hidden sm:inline">Admin Login</span>
                <span className="sm:hidden text-xs">Admin</span>
              </button>
            )}
          </nav>

          {/* Quick Utility Tools */}
          <div className="flex items-center space-x-1 pl-1 border-l" style={{ borderColor: 'var(--border-subtle)' }}>
            {/* Keyboard Shortcuts Trigger (Hidden on touch devices) */}
            <button
              onClick={() => setShowShortcuts(true)}
              title="Keyboard Shortcuts Cheat Sheet"
              className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-xs opacity-75 hover:opacity-100 border transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>

            {/* Sound Effects Toggle */}
            <button
              onClick={handleSoundToggle}
              title={soundEnabled ? 'Mute Interface Sound Effects' : 'Enable Interface Sound Effects'}
              className="p-1.5 sm:p-2 rounded-xl text-xs opacity-75 hover:opacity-100 border transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: soundEnabled ? 'var(--accent-color)' : 'var(--text-muted)',
              }}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-50" />}
            </button>
          </div>

          {/* Theme Switcher */}
          <div className="pl-1 border-l" style={{ borderColor: 'var(--border-subtle)' }}>
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl relative space-y-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--glow-shadow)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center space-x-2">
                <Keyboard className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
                <h3 className="font-black text-base" style={{ color: 'var(--text-main)' }}>
                  Candidate Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded-xl opacity-70 hover:opacity-100"
                style={{ color: 'var(--text-main)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs" style={{ color: 'var(--text-main)' }}>
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <span className="font-medium">Select Option A, B, C, D</span>
                <span className="flex space-x-1">
                  <kbd className="px-2 py-1 rounded bg-black/30 font-mono font-bold border border-white/10">A</kbd>
                  <kbd className="px-2 py-1 rounded bg-black/30 font-mono font-bold border border-white/10">B</kbd>
                  <kbd className="px-2 py-1 rounded bg-black/30 font-mono font-bold border border-white/10">C</kbd>
                  <kbd className="px-2 py-1 rounded bg-black/30 font-mono font-bold border border-white/10">D</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <span className="font-medium">Confirm & Submit Answer</span>
                <kbd className="px-2.5 py-1 rounded bg-black/30 font-mono font-bold border border-white/10">Enter</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <span className="font-medium">Navigate Previous / Next Question</span>
                <span className="flex space-x-1">
                  <kbd className="px-2 py-1 rounded bg-black/30 font-mono font-bold border border-white/10">←</kbd>
                  <kbd className="px-2 py-1 rounded bg-black/30 font-mono font-bold border border-white/10">→</kbd>
                </span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white"
                style={{
                  backgroundColor: 'var(--accent-color)',
                  boxShadow: 'var(--glow-shadow)',
                }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
