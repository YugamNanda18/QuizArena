import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getSocket, joinQuizRoom } from '../services/socket';
import { Quiz, Participant, LeaderboardEntry } from '../types';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { ShareRoomModal } from '../components/ShareRoomModal';
import { Radio, Play, Pause, Square, Users, Clock, ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck, Share2, Check, Sparkles, RotateCcw } from 'lucide-react';

interface LiveControlRoomProps {
  quizId: string;
  onBack: () => void;
}

export const LiveControlRoom: React.FC<LiveControlRoomProps> = ({ quizId, onBack }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connectedCount, setConnectedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const fetchRoomState = async () => {
    try {
      const [quizRes, partRes, lbRes] = await Promise.all([
        api.quiz.get(quizId),
        api.registration.listForQuiz(quizId),
        api.leaderboard.get(quizId),
      ]);
      setQuiz(quizRes.quiz);
      setParticipants(partRes.participants);
      setLeaderboard(lbRes.leaderboard);
    } catch (err) {
      console.error('Failed to load live control room:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomState();

    const socket = getSocket();

    // 1. Join room immediately on mount
    joinQuizRoom(quizId, undefined, 'admin');

    // 2. Re-join on reconnect
    const handleConnect = () => {
      joinQuizRoom(quizId, undefined, 'admin');
      fetchRoomState();
    };
    socket.on('connect', handleConnect);

    socket.on('participant:count', (data: { count: number }) => {
      setConnectedCount(data.count);
    });

    socket.on('participant:joined', () => {
      fetchRoomState();
    });

    const handleLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      if (Array.isArray(data?.leaderboard)) {
        setLeaderboard(data.leaderboard);
      }
    };
    socket.on('leaderboard:updated', handleLeaderboard);

    socket.on('quiz:started', () => {
      fetchRoomState();
    });

    socket.on('quiz:ended', () => {
      fetchRoomState();
    });

    socket.on('quiz:status', () => {
      fetchRoomState();
    });

    // 3. Silent auto-sync fallback every 3.5s to ensure realtime standings even if websocket packets drop
    const pollInterval = setInterval(() => {
      api.leaderboard.get(quizId)
        .then((res) => {
          if (Array.isArray(res?.leaderboard)) {
            setLeaderboard(res.leaderboard);
          }
        })
        .catch(() => {});
    }, 3500);

    return () => {
      clearInterval(pollInterval);
      socket.off('connect', handleConnect);
      socket.off('participant:count');
      socket.off('participant:joined');
      socket.off('leaderboard:updated', handleLeaderboard);
      socket.off('quiz:started');
      socket.off('quiz:ended');
      socket.off('quiz:status');
    };
  }, [quizId]);

  const handleUpdateStatus = async (status: string) => {
    setActionLoading(true);
    try {
      const res = await api.quiz.updateStatus(quizId, status);
      setQuiz(res.quiz);
      await fetchRoomState();
    } catch (err: any) {
      alert(err.message || `Failed to transition status to ${status}`);
    } finally {
      setActionLoading(false);
    }
  };

  const copyInvite = () => {
    if (!quiz) return;
    const text = `Join QuizArena Assessment: ${quiz.title}\nRoom Code: ${quiz.roomCode}\nURL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
          Initializing Proctor Command Station...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border opacity-70 hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                Live Proctor Control Room
              </h1>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <p className="text-xs opacity-75 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {quiz.title} • Room Code: <strong className="font-mono font-bold" style={{ color: 'var(--accent-color)' }}>{quiz.roomCode}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all hover:scale-105"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'rgba(245, 158, 11, 0.4)',
              color: 'var(--text-main)',
            }}
          >
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Real-Time Share & QR</span>
          </button>

          <button
            onClick={copyInvite}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Invitation Link'}</span>
          </button>

          <button
            onClick={fetchRoomState}
            className="p-2 rounded-xl border opacity-70 hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            title="Refresh State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Proctor Command Control Bar */}
      <div
        className="p-6 sm:p-8 rounded-3xl border-2 shadow-2xl flex flex-wrap items-center justify-between gap-6 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center space-x-4">
          <div
            className="w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--accent-color)',
            }}
          >
            <Radio className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Assessment State Machine
            </span>
            <div className="flex items-center space-x-2.5 mt-0.5">
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  quiz.status === 'LIVE'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : quiz.status === 'WAITING'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : quiz.status === 'PAUSED'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {quiz.status}
              </span>
              <span className="text-xs font-mono font-bold opacity-75" style={{ color: 'var(--text-muted)' }}>
                {connectedCount > 0 ? `${connectedCount} Connected Online` : `${participants.length} Registered Candidates`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {quiz.status === 'DRAFT' || quiz.status === 'PUBLISHED' ? (
            <button
              disabled={actionLoading}
              onClick={() => handleUpdateStatus('WAITING')}
              className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-transform hover:scale-105"
            >
              <Users className="w-4 h-4" />
              <span>Open Waiting Room</span>
            </button>
          ) : null}

          {quiz.status === 'WAITING' ? (
            <button
              disabled={actionLoading}
              onClick={() => handleUpdateStatus('LIVE')}
              className="px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/30 flex items-center space-x-2 transition-transform hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Test (Synchronized Launch)</span>
            </button>
          ) : null}

          {quiz.status === 'LIVE' ? (
            <>
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('PAUSED')}
                className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center space-x-1.5 transition-colors"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Test</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => {
                  if (confirm('End and finalize this assessment for all candidates?')) {
                    handleUpdateStatus('COMPLETED');
                  }
                }}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center space-x-1.5 transition-colors"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>End Assessment</span>
              </button>
            </>
          ) : null}

          {quiz.status === 'PAUSED' ? (
            <button
              disabled={actionLoading}
              onClick={() => handleUpdateStatus('RESUMED')}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center space-x-1.5 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Resume Test</span>
            </button>
          ) : null}

          {quiz.status === 'COMPLETED' ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                disabled={actionLoading}
                onClick={async () => {
                  if (confirm(`Reopen assessment? This will restore the exam to LIVE with ${quiz.durationMinutes} minutes, allowing candidates to resume answering.`)) {
                    setActionLoading(true);
                    try {
                      const res = await api.quiz.restart(quizId, { mode: 'reopen', extraMinutes: quiz.durationMinutes });
                      setQuiz(res.quiz);
                      await fetchRoomState();
                    } catch (err: any) {
                      alert(err.message || 'Failed to reopen quiz');
                    } finally {
                      setActionLoading(false);
                    }
                  }
                }}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center space-x-1.5 transition-transform hover:scale-105"
                title="Undo accidental completion and resume LIVE test"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reopen Exam (Resume LIVE)</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={async () => {
                  if (confirm('Reset assessment to Waiting Room? Candidates will re-enter the waiting room before proctor relaunch.')) {
                    setActionLoading(true);
                    try {
                      const res = await api.quiz.restart(quizId, { mode: 'waiting' });
                      setQuiz(res.quiz);
                      await fetchRoomState();
                    } catch (err: any) {
                      alert(err.message || 'Failed to reset quiz');
                    } finally {
                      setActionLoading(false);
                    }
                  }
                }}
                className="px-4 py-2.5 rounded-2xl border text-amber-400 font-bold text-xs uppercase tracking-wider shadow-md flex items-center space-x-1.5 transition-colors hover:bg-amber-500/10"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                }}
              >
                <Users className="w-4 h-4" />
                <span>Reset to Waiting Room</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={async () => {
                  if (confirm('Full Clean Reset? WARNING: This will clear all previous candidate scores & answers and send the quiz back to the waiting room for a fresh re-take!')) {
                    setActionLoading(true);
                    try {
                      const res = await api.quiz.restart(quizId, { mode: 'clean-restart', resetAnswers: true });
                      setQuiz(res.quiz);
                      await fetchRoomState();
                    } catch (err: any) {
                      alert(err.message || 'Failed to reset quiz');
                    } finally {
                      setActionLoading(false);
                    }
                  }
                }}
                className="px-3.5 py-2.5 rounded-2xl border text-rose-400 font-bold text-xs uppercase tracking-wider shadow-md flex items-center space-x-1.5 transition-colors hover:bg-rose-500/10"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'rgba(244, 63, 94, 0.4)',
                }}
                title="Wipe previous scores and restart from scratch"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Full Clean Reset</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Real-Time Leaderboard */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              Authoritative Live Leaderboard
            </h3>
            <p className="text-xs opacity-60 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Continuously updating via Socket.IO immediately after every accepted submission.
            </p>
          </div>
          <span className="text-xs font-mono font-bold opacity-75" style={{ color: 'var(--text-muted)' }}>
            {leaderboard.length} candidates ranked
          </span>
        </div>

        <LeaderboardTable entries={leaderboard} />
      </div>

      {quiz && (
        <ShareRoomModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          quizId={quizId}
          roomCode={quiz.roomCode}
          title={quiz.title}
        />
      )}
    </div>
  );
};
