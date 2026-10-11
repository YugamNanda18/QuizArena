import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Quiz } from '../types';
import { Plus, Radio, Edit3, Copy, BarChart2, Trash2, Clock, HelpCircle, Award, Users, CheckCircle2, Share2, Check, Search, Sparkles } from 'lucide-react';
import { ShareRoomModal } from '../components/ShareRoomModal';

interface AdminDashboardProps {
  onCreateQuiz: () => void;
  onEditQuiz: (quizId: string) => void;
  onOpenControlRoom: (quizId: string) => void;
  onOpenAnalytics: (quizId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onCreateQuiz,
  onEditQuiz,
  onOpenControlRoom,
  onOpenAnalytics,
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shareModalQuiz, setShareModalQuiz] = useState<Quiz | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [quizRes, statRes] = await Promise.all([
        api.quiz.list(),
        api.analytics.getOverview(),
      ]);
      setQuizzes(quizRes.quizzes);
      setStats(statRes.stats);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDuplicate = async (quizId: string) => {
    try {
      await api.quiz.duplicate(quizId);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate quiz');
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this assessment? All associated questions and student records will be removed.')) return;
    try {
      await api.quiz.delete(quizId);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete quiz');
    }
  };

  const copyRoomLink = (roomCode: string) => {
    const shareUrl = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedCode(roomCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredQuizzes = quizzes.filter(
    (q) =>
      (q.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (q.roomCode || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
          Loading management console...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
            Assessment Management Console
          </h1>
          <p className="text-xs sm:text-sm opacity-75 mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
            Proctor real-time exams, configure dynamic points per question, and monitor live waiting rooms.
          </p>
        </div>

        <button
          onClick={onCreateQuiz}
          className="px-5 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-xl flex items-center justify-center space-x-2 transition-transform hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
            boxShadow: 'var(--glow-shadow)',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Create New Assessment</span>
        </button>
      </div>

      {/* 4 Overview Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="p-5 rounded-3xl border shadow-xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Total Assessments
            </span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>{stats.totalQuizzes}</span>
              <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>Created</span>
            </div>
          </div>

          <div
            className="p-5 rounded-3xl border shadow-xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
              Active Assessments
            </span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-amber-400">{stats.activeQuizzes}</span>
              <span className="text-xs text-amber-300 font-medium">In Waiting / Live</span>
            </div>
          </div>

          <div
            className="p-5 rounded-3xl border shadow-xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
              Total Candidates
            </span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-sky-400">{stats.totalParticipants}</span>
              <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>Registered</span>
            </div>
          </div>

          <div
            className="p-5 rounded-3xl border shadow-xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
              Mean Score
            </span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-400">{stats.averageScore}</span>
              <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>pts avg</span>
            </div>
          </div>
        </div>
      )}

      {/* Quizzes Table Container */}
      <div
        className="rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h3 className="font-black text-base" style={{ color: 'var(--text-main)' }}>
              All Assessments ({quizzes.length})
            </h3>
            <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>
              Manage exam states, room codes, and question banks
            </span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-50" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assessment or room code..."
              className="w-full text-xs rounded-xl py-1.5 pl-8 pr-3 border focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                className="border-b font-semibold text-xs uppercase tracking-wider opacity-70"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                <th className="py-3.5 px-5">Assessment</th>
                <th className="py-3.5 px-4">Room Code</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Duration</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-right">Max Score</th>
                <th className="py-3.5 px-5 text-right">Proctor Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredQuizzes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center" style={{ color: 'var(--text-muted)' }}>
                    <div className="max-w-sm mx-auto space-y-3">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                        {searchQuery ? 'No assessments match your search.' : 'No assessments created yet.'}
                      </p>
                      <p className="text-xs opacity-70">
                        {searchQuery
                          ? 'Try clearing the search query to view all assessment records.'
                          : 'Create your first real assessment to generate a custom room code, dynamic questions, and start proctoring.'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={onCreateQuiz}
                          className="px-4 py-2 rounded-xl text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-md transition-transform hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
                            boxShadow: 'var(--glow-shadow)',
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create New Assessment</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuizzes.map((quiz) => {
                  const qId = (quiz._id || quiz.id) as string;

                  return (
                    <tr key={qId} className="hover:opacity-90 transition-opacity">
                      <td className="py-4 px-5">
                        <div className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-main)' }}>
                          {quiz.title}
                        </div>
                        <div className="text-xs opacity-60 truncate max-w-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {quiz.description}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5 font-mono text-xs">
                          <span
                            className="font-bold px-2 py-0.5 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--accent-color)',
                            }}
                          >
                            {quiz.roomCode}
                          </span>
                          <button
                            onClick={() => setShareModalQuiz(quiz)}
                            title="Real-Time Share & QR Code"
                            className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <Share2 className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            quiz.status === 'LIVE'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                              : quiz.status === 'WAITING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : quiz.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'border opacity-60'
                          }`}
                          style={{
                            borderColor: quiz.status === 'DRAFT' || quiz.status === 'PUBLISHED' ? 'var(--border-subtle)' : undefined,
                            color: quiz.status === 'DRAFT' || quiz.status === 'PUBLISHED' ? 'var(--text-muted)' : undefined,
                          }}
                        >
                          {quiz.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                          <span>{quiz.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-xs opacity-80" style={{ color: 'var(--text-muted)' }}>
                        {quiz.durationMinutes}m
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-xs opacity-80" style={{ color: 'var(--text-muted)' }}>
                        {quiz.totalQuestions}
                      </td>

                      <td className="py-4 px-4 text-right font-black text-amber-400 font-mono text-sm">
                        {quiz.maxScore} pts
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onOpenControlRoom(qId)}
                            title="Open Live Proctor Control Room"
                            className="px-3 py-1.5 rounded-xl border text-amber-400 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-colors hover:bg-amber-500/15"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'rgba(245, 158, 11, 0.4)',
                            }}
                          >
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                            <span>Live Control</span>
                          </button>

                          <button
                            onClick={() => onEditQuiz(qId)}
                            title="Edit Questions & Dynamic Points"
                            className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 transition-opacity"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-main)',
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenAnalytics(qId)}
                            title="Analytics & Report Exports"
                            className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 transition-opacity"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--accent-color)',
                            }}
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(qId)}
                            title="Duplicate Assessment"
                            className="p-1.5 rounded-xl border opacity-70 hover:opacity-100 transition-opacity"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(qId)}
                            title="Delete Assessment"
                            className="p-1.5 rounded-xl border hover:bg-rose-500/15 hover:border-rose-500/40 text-rose-400 transition-colors opacity-70 hover:opacity-100"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {shareModalQuiz && (
        <ShareRoomModal
          isOpen={!!shareModalQuiz}
          onClose={() => setShareModalQuiz(null)}
          quizId={(shareModalQuiz._id || shareModalQuiz.id) as string}
          roomCode={shareModalQuiz.roomCode}
          title={shareModalQuiz.title}
        />
      )}
    </div>
  );
};
