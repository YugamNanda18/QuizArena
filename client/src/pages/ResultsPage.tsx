import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { StudentResultResponse, LeaderboardEntry } from '../types';
import { LeaderboardTable } from '../components/LeaderboardTable';
import {
  Trophy,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
} from 'lucide-react';

interface ResultsPageProps {
  quizId: string;
  participantId: string;
  onBackToHome: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  quizId,
  participantId,
  onBackToHome,
}) => {
  const [result, setResult] = useState<StudentResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'review' | 'leaderboard'>('summary');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadResult = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [resData, lbData] = await Promise.all([
        api.leaderboard.getResult(quizId, participantId),
        api.leaderboard.get(quizId),
      ]);

      // Normalize server response (supports both { result: ... } and direct object)
      const actualResult: StudentResultResponse = (resData as any)?.result || resData;
      setResult(actualResult);
      setLeaderboard(lbData?.leaderboard || []);

      // Trigger party poppers celebration
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback if confetti isn't supported in current environment
      }
    } catch (err: any) {
      console.error('Failed to load results:', err);
      setLoadError(err?.message || 'Unable to retrieve assessment transcript.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResult();
  }, [quizId, participantId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-75" style={{ color: 'var(--text-muted)' }}>
          Compiling certified assessment transcript & calculating final standings...
        </p>
      </div>
    );
  }

  if (loadError || !result) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black" style={{ color: 'var(--text-main)' }}>
          Transcript Retrieval Notice
        </h3>
        <p className="text-xs sm:text-sm opacity-70 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {loadError || 'The assessment submission is being synchronized with the database.'}
        </p>
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={loadResult}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Loading</span>
          </button>
          <button
            onClick={onBackToHome}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            Candidate Portal
          </button>
        </div>
      </div>
    );
  }

  // Safe destructuring with fallback defaults
  const rawResult = (result as any)?.result || result;
  const participant = rawResult?.participant || {};
  const quiz = rawResult?.quiz || {};
  const breakdown = rawResult?.breakdown || [];

  const correctCount = participant.correctCount || 0;
  const incorrectCount = participant.incorrectCount || 0;
  const submittedCount = correctCount + incorrectCount;
  const totalQuestions = quiz.totalQuestions || (breakdown.length > 0 ? breakdown.length : submittedCount);
  const unsubmittedCount = Math.max(0, totalQuestions - submittedCount);
  const accuracy = typeof participant.accuracy === 'number'
    ? participant.accuracy
    : submittedCount > 0
    ? Math.round((correctCount / submittedCount) * 100)
    : 0;

  const downloadPDF = () => {
    const url = api.export.studentPDFUrl(quizId, participantId);
    window.open(url, '_blank');
  };

  // Determine achievement badges
  const achievements = [];
  if (accuracy >= 80) achievements.push({ label: 'Sniper Precision', desc: 'Accuracy ≥ 80%', icon: Zap, color: '#3b82f6' });
  if (participant.cumulativeResponseTimeMs && participant.cumulativeResponseTimeMs / 1000 < ((quiz.durationMinutes || 10) * 60) / 2) {
    achievements.push({ label: 'Speed Demon', desc: 'Finished in under 50% time', icon: Flame, color: '#f59e0b' });
  }
  if ((participant.rank ?? 0) === 1) achievements.push({ label: 'Podium Leader', desc: 'Rank #1 in assessment', icon: Trophy, color: '#10b981' });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-1.5 text-xs font-bold opacity-75 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-main)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Candidate Portal</span>
        </button>
      </div>

      {/* Prominent Submission Confirmation Badge */}
      <div
        className="p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.4)',
        }}
      >
        <div className="flex items-center space-x-3.5 text-left">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 shadow-lg">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Submission Verified & Authenticated</span>
            </div>
            <h2 className="text-base sm:text-lg font-black mt-0.5" style={{ color: 'var(--text-main)' }}>
              Assessment Successfully Submitted!
            </h2>
            <p className="text-xs opacity-75 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Candidate: <strong>{participant.name || 'Student'}</strong> ({participant.email})
            </p>
          </div>
        </div>

        {/* Quick Submission Counts Badge */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            ✓ {submittedCount} Submitted
          </span>
          {unsubmittedCount > 0 ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              ⊘ {unsubmittedCount} Unsubmitted
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
              100% Complete
            </span>
          )}
        </div>
      </div>

      {/* Hero Performance Card */}
      <div
        className="rounded-3xl p-6 sm:p-10 border shadow-2xl text-center relative overflow-hidden backdrop-blur-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-400 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-xl shadow-amber-500/10">
          <Trophy className="w-8 h-8 fill-current" />
        </div>

        <span className="text-[11px] font-black uppercase tracking-widest block mb-1" style={{ color: 'var(--accent-color)' }}>
          Certified Result Transcript
        </span>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
          {quiz.title || 'Assessment'}
        </h1>
        <p className="text-xs sm:text-sm opacity-70 mt-1" style={{ color: 'var(--text-muted)' }}>
          Room Code: <span className="font-mono font-bold text-amber-400">{quiz.roomCode}</span> • Official score record for <strong>{participant.name}</strong>
        </p>

        {/* Submission Breakdown Metrics: Submitted vs Unsubmitted + Score + Rank */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
          {/* Total Submitted */}
          <div
            className="p-3.5 sm:p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Questions Submitted
            </span>
            <div className="flex items-baseline justify-center space-x-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {submittedCount}
              </span>
              <span className="text-xs opacity-60 font-semibold" style={{ color: 'var(--text-muted)' }}>
                / {totalQuestions}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">
              {totalQuestions > 0 ? Math.round((submittedCount / totalQuestions) * 100) : 0}% Answered
            </span>
          </div>

          {/* Total Unsubmitted / Skipped */}
          <div
            className="p-3.5 sm:p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Unsubmitted / Skipped
            </span>
            <div className="flex items-baseline justify-center space-x-1 mt-0.5">
              <span className={`text-2xl sm:text-3xl font-black font-mono ${unsubmittedCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {unsubmittedCount}
              </span>
              <span className="text-xs opacity-60 font-semibold" style={{ color: 'var(--text-muted)' }}>
                items
              </span>
            </div>
            <span className="text-[10px] opacity-60 font-semibold mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
              {unsubmittedCount === 0 ? 'None Skipped' : 'Optional Skipped'}
            </span>
          </div>

          {/* Net Score */}
          <div
            className="p-3.5 sm:p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Confirmed Score
            </span>
            <div className="flex items-baseline justify-center space-x-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-brand-400 font-mono">
                {participant.totalScore ?? 0}
              </span>
              <span className="text-xs opacity-60 font-semibold" style={{ color: 'var(--text-muted)' }}>
                / {quiz.maxScore ?? 0}
              </span>
            </div>
            <span className="text-[10px] text-brand-400 font-semibold mt-0.5 block">
              Accuracy: {accuracy}%
            </span>
          </div>

          {/* Final Live Rank */}
          <div
            className="p-3.5 sm:p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Live Standings Rank
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono block mt-0.5">
              #{participant.rank || 1}
            </span>
            <span className="text-[10px] text-amber-400 font-semibold mt-0.5 block">
              Response: {((participant.cumulativeResponseTimeMs || 0) / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Achievement Badges */}
        {achievements.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {achievements.map((a, i) => (
              <div
                key={i}
                className="px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 shadow-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: a.color,
                  color: a.color,
                }}
              >
                <a.icon className="w-3.5 h-3.5" />
                <span>{a.label} ({a.desc})</span>
              </div>
            ))}
          </div>
        )}

        {/* Download Certificate PDF button */}
        <div className="mt-6 sm:mt-8 flex justify-center">
          <button
            onClick={downloadPDF}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center space-x-2 transition-transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
              boxShadow: 'var(--glow-shadow)',
            }}
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF Transcript</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-4 sm:space-x-6 overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-colors border-b-2 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
            activeTab === 'summary' ? 'border-b-2' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
          style={{
            borderColor: activeTab === 'summary' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'summary' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <Award className="w-4 h-4" />
          <span>Performance Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-colors border-b-2 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
            activeTab === 'review' ? 'border-b-2' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
          style={{
            borderColor: activeTab === 'review' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'review' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <FileText className="w-4 h-4" />
          <span>Item Review ({breakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-colors border-b-2 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
            activeTab === 'leaderboard' ? 'border-b-2' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
          style={{
            borderColor: activeTab === 'leaderboard' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'leaderboard' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <Trophy className="w-4 h-4" />
          <span>Live Leaderboard ({leaderboard.length})</span>
        </button>
      </div>

      {/* Tab 1: Summary */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div
            className="p-5 sm:p-6 rounded-3xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="font-bold text-xs uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Accuracy & Completion
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="flex items-center space-x-2 text-emerald-400 font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Correct Items</span>
                </span>
                <span className="font-black font-mono" style={{ color: 'var(--text-main)' }}>{correctCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="flex items-center space-x-2 text-rose-400 font-semibold">
                  <XCircle className="w-4 h-4" />
                  <span>Incorrect Items</span>
                </span>
                <span className="font-black font-mono" style={{ color: 'var(--text-main)' }}>{incorrectCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="flex items-center space-x-2 opacity-60 font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <HelpCircle className="w-4 h-4" />
                  <span>Unsubmitted / Skipped</span>
                </span>
                <span className="font-black font-mono" style={{ color: 'var(--text-main)' }}>{unsubmittedCount}</span>
              </div>
            </div>
          </div>

          <div
            className="p-5 sm:p-6 rounded-3xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="font-bold text-xs uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Score Composition
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="opacity-80" style={{ color: 'var(--text-main)' }}>Base Item Points</span>
                <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>{participant.baseScore ?? participant.totalScore ?? 0} pts</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-amber-400 font-semibold">Speed Bonus</span>
                <span className="font-bold text-amber-400 font-mono">+{participant.bonusScore ?? 0} pts</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center text-xs sm:text-sm font-black" style={{ borderColor: 'var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-main)' }}>Net Confirmed Score</span>
                <span className="text-emerald-400 font-mono">{participant.totalScore ?? 0} pts</span>
              </div>
            </div>
          </div>

          <div
            className="p-5 sm:p-6 rounded-3xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="font-bold text-xs uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Response Speed Analytics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="opacity-80" style={{ color: 'var(--text-main)' }}>Total Time Elapsed</span>
                <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                  {((participant.cumulativeResponseTimeMs || 0) / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="opacity-80" style={{ color: 'var(--text-main)' }}>Average per Question</span>
                <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                  {submittedCount > 0
                    ? ((participant.cumulativeResponseTimeMs || 0) / 1000 / submittedCount).toFixed(1)
                    : 0}s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Question Review */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {breakdown.length === 0 ? (
            <div
              className="p-8 rounded-3xl border text-center space-y-2"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <p className="text-xs sm:text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                Question-by-question review will be released once all candidates have completed testing.
              </p>
            </div>
          ) : (
            breakdown.map((item: any) => (
              <div
                key={item.questionNumber}
                className="p-5 sm:p-6 rounded-2xl border transition-colors space-y-3"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: item.isCorrect ? 'var(--border-subtle)' : 'rgba(244, 63, 94, 0.3)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
                      Question #{item.questionNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {item.isCorrect ? `Correct (+${item.pointsAwarded} pts)` : 'Incorrect (0 pts)'}
                    </span>
                  </div>
                  <span className="text-xs font-mono opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Time: {((item.responseTimeMs || 0) / 1000).toFixed(1)}s
                  </span>
                </div>

                <p className="font-bold text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                  {item.questionText}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {item.options?.map((opt: string, oIdx: number) => {
                    const isSelected = item.selectedOptionIndex === oIdx;
                    const isAnswerKey = item.correctOptionIndex === oIdx;

                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border flex items-center justify-between font-medium ${
                          isAnswerKey
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : isSelected && !item.isCorrect
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                            : 'opacity-75'
                        }`}
                        style={{
                          backgroundColor: !isAnswerKey && !(isSelected && !item.isCorrect) ? 'var(--bg-surface)' : undefined,
                          borderColor: !isAnswerKey && !(isSelected && !item.isCorrect) ? 'var(--border-subtle)' : undefined,
                          color: !isAnswerKey && !(isSelected && !item.isCorrect) ? 'var(--text-main)' : undefined,
                        }}
                      >
                        <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-white">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {item.explanation && (
                  <div
                    className="mt-3 p-3 rounded-xl border text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <strong style={{ color: 'var(--text-main)' }}>Explanation:</strong> {item.explanation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <LeaderboardTable entries={leaderboard} highlightParticipantId={participantId} />
      )}
    </div>
  );
};
