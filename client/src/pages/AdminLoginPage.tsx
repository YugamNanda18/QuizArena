import React, { useState } from 'react';
import { api } from '../services/api';
import { Shield, KeyRound, Mail, ArrowRight } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem('qa_admin_token', res.token);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div
        className="max-w-md w-full rounded-3xl p-8 border shadow-2xl space-y-6 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--accent-color)',
              color: 'var(--accent-color)',
              boxShadow: 'var(--glow-shadow)',
            }}
          >
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
            Administrator Portal
          </h2>
          <p className="text-xs opacity-75 mt-1" style={{ color: 'var(--text-muted)' }}>
            Authenticate to access live assessment controls and analytics.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 opacity-40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourorganization.com"
                className="w-full text-xs sm:text-sm rounded-xl py-2.5 pl-10 pr-3 border focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 opacity-40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full text-xs sm:text-sm rounded-xl py-2.5 pl-10 pr-3 border focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all hover:scale-105 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
              boxShadow: 'var(--glow-shadow)',
            }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
