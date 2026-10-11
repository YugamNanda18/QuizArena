import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Quiz } from '../types';
import { Clock, HelpCircle, Award, ShieldAlert, ArrowRight, CheckCircle2, User, Mail, Hash, Sparkles, Zap, ShieldCheck, Radio, X } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface StudentLandingPageProps {
  onRegistered: (quizId: string, participantId: string) => void;
  initialRoomCode?: string;
}

export const StudentLandingPage: React.FC<StudentLandingPageProps> = ({
  onRegistered,
  initialRoomCode = '',
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcedRoom, setAnnouncedRoom] = useState<{ roomCode: string; title: string; quizId: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');

  const fetchQuizByCode = async (code: string, playSound = false) => {
    if (!code || code.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.quiz.getByRoomCode(code.trim().toUpperCase());
      setQuiz(res.quiz);
      if (playSound) sounds.playCorrect();
    } catch (err: any) {
      setQuiz(null);
      setError(err.message || 'Assessment not found with this room code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      fetchQuizByCode(initialRoomCode, false);
    }
  }, [initialRoomCode]);

  // Real-time socket listener for room announcements from proctor
  useEffect(() => {
    const socket = getSocket();
    const handleRoomAnnounced = (data: { roomCode: string; title: string; quizId: string }) => {
      setAnnouncedRoom(data);
      sounds.playSelect();
    };

    socket.on('room:announced', handleRoomAnnounced);
    return () => {
      socket.off('room:announced', handleRoomAnnounced);
    };
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;

    sounds.playSubmit();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.registration.register({
        quizId: quiz.id || quiz._id,
        name,
        email,
        studentId,
      });

      const participantId = (res.participant.id || res.participant._id) as string;
      const quizId = (quiz.id || quiz._id) as string;

      localStorage.setItem('qa_student_session', JSON.stringify({ quizId, participantId }));
      sounds.playSelect();
      onRegistered(quizId, participantId);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-10">
      {/* Real-Time Proctor Announcement Banner */}
      {announcedRoom && (
        <div
          className="p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-in fade-in slide-in-from-top-4"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
            borderColor: 'rgba(245, 158, 11, 0.4)',
          }}
        >
          <div className="flex items-center space-x-3.5 text-left">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center flex-shrink-0 shadow-md">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Live Proctor Announcement • Assessment Ready</span>
              </div>
              <div className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
                {announcedRoom.title} • Room Code: <span className="font-mono text-amber-300 font-black px-2 py-0.5 rounded border border-amber-400/40 bg-amber-500/10">{announcedRoom.roomCode}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setRoomCode(announcedRoom.roomCode);
                fetchQuizByCode(announcedRoom.roomCode, true);
                setAnnouncedRoom(null);
              }}
              className="px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-lg transition-transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #10b981 100%)',
                boxShadow: 'var(--glow-shadow)',
              }}
            >
              Auto-Join Assessment Now
            </button>
            <button
              onClick={() => setAnnouncedRoom(null)}
              className="p-2 rounded-xl opacity-60 hover:opacity-100 transition-opacity"
              title="Dismiss Announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="text-center space-y-4">
        <div
          className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest border shadow-sm animate-float"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent-color)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-Time Assessment Environment</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight" style={{ color: 'var(--text-main)' }}>
          Candidate Assessment Portal
        </h1>

        <p className="text-sm sm:text-base max-w-xl mx-auto opacity-75 font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Enter your room credentials to participate in live synchronized testing with instant scoring and real-time rank tracking.
        </p>

        {/* Room Code Search Bar with Quick Preset Badges */}
        <div className="max-w-md mx-auto space-y-3 pt-2">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3.5 flex items-center opacity-40 font-mono text-sm">#</span>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter Assessment Room Code"
                maxLength={10}
                className="w-full text-sm font-mono uppercase tracking-wider rounded-2xl py-3 pl-8 pr-4 border focus:outline-none transition-all shadow-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => fetchQuizByCode(roomCode, true)}
              disabled={loading || !roomCode.trim()}
              className="px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all shadow-lg hover:scale-105 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
                boxShadow: 'var(--glow-shadow)',
              }}
            >
              {loading ? 'Finding...' : 'Load Quiz'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center space-x-3 max-w-2xl mx-auto">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {quiz && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Assessment Overview Card */}
          <div
            className="md:col-span-7 rounded-3xl p-6 sm:p-8 border shadow-2xl space-y-6 backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border font-mono"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--accent-color)',
                  }}
                >
                  Room: {quiz.roomCode}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    quiz.status === 'LIVE'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : quiz.status === 'WAITING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  Status: {quiz.status}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black leading-snug" style={{ color: 'var(--text-main)' }}>
                {quiz.title}
              </h2>

              {quiz.description && (
                <p className="mt-2 text-sm leading-relaxed opacity-80" style={{ color: 'var(--text-muted)' }}>
                  {quiz.description}
                </p>
              )}
            </div>

            {/* Assessment Highlights Metric Grid */}
            <div className="grid grid-cols-3 gap-3 py-2 border-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="p-3.5 rounded-2xl border text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <Clock className="w-5 h-5 text-brand-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>Duration</span>
                <span className="font-extrabold text-sm sm:text-base" style={{ color: 'var(--text-main)' }}>{quiz.durationMinutes} mins</span>
              </div>

              <div className="p-3.5 rounded-2xl border text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <HelpCircle className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>Questions</span>
                <span className="font-extrabold text-sm sm:text-base" style={{ color: 'var(--text-main)' }}>{quiz.totalQuestions} Items</span>
              </div>

              <div className="p-3.5 rounded-2xl border text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <Award className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>Max Score</span>
                <span className="font-extrabold text-sm sm:text-base text-amber-400">{quiz.maxScore} pts</span>
              </div>
            </div>

            {/* Rules List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
                Evaluation Policy & Rules
              </h4>
              <ul className="text-xs space-y-2" style={{ color: 'var(--text-main)' }}>
                <li className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Configurable Dynamic Points:</strong> Each question carries individual assigned point values (10 to 500 points).
                  </span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Speed Tie-Breaker:</strong> Ties in score are broken by cumulative response time across correct answers.
                  </span>
                </li>
                {quiz.scoringSettings?.negativeMarkingEnabled && (
                  <li className="flex items-start space-x-2.5 text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Negative Marking Enabled:</strong> Incorrect answers deduct points from your total score.
                    </span>
                  </li>
                )}
                <li className="flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Synchronized Clock:</strong> All candidates begin at the server-authoritative timestamp.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Registration Form Card */}
          <div
            className="md:col-span-5 rounded-3xl p-6 sm:p-8 border shadow-2xl space-y-5 backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div>
              <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                Candidate Registration
              </h3>
              <p className="text-xs opacity-75 mt-1" style={{ color: 'var(--text-muted)' }}>
                Fill your credentials to enter the live proctored waiting room.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
                  Full Legal Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 opacity-40" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
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
                  Corporate / Student Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 opacity-40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex.morgan@enterprise.com"
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
                  Student / Employee ID {quiz.registrationSettings?.requireStudentId ? '*' : '(Optional)'}
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3.5 top-3 opacity-40" />
                  <input
                    type="text"
                    required={quiz.registrationSettings?.requireStudentId}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. ENG-8821"
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
                disabled={submitting}
                className="w-full mt-2 py-3.5 px-4 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
                  boxShadow: 'var(--glow-shadow)',
                }}
              >
                <span>{submitting ? 'Entering Room...' : 'Enter Waiting Room'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[11px] opacity-60 text-center" style={{ color: 'var(--text-muted)' }}>
              Re-registering with the same email resumes your active progress automatically.
            </p>
          </div>
        </div>
      )}

      {!quiz && !loading && (
        <div
          className="max-w-2xl mx-auto rounded-3xl p-8 sm:p-10 border shadow-xl text-center space-y-4 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--accent-color)',
              color: 'var(--accent-color)',
            }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>
            Awaiting Assessment Code
          </h3>
          <p className="text-xs sm:text-sm opacity-70 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Enter your assessment room code above to load the evaluation syllabus, view duration rules, and join the synchronized live waiting room.
          </p>
        </div>
      )}
    </div>
  );
};
