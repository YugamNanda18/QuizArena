import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { StudentResultResponse, LeaderboardEntry } from '../types';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { Trophy, Award, Clock, CheckCircle, XCircle, Download, FileText, ArrowLeft, HelpCircle, Sparkles, Zap, Flame, ShieldCheck } from 'lucide-react';

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

  useEffect(() => {
    let isMounted = true;

    const loadResult = async () => {
      try {
        const [resData, lbData] = await Promise.all([
          api.leaderboard.getResult(quizId, participantId),
          api.leaderboard.get(quizId),
        ]);

        if (isMounted) {
          setResult(resData);
          setLeaderboard(lbData.leaderboard);

          // Confetti cannons
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        }
      } catch (err) {
        console.error('Failed to load results:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadResult();

    return () => {
      isMounted = false;
    };
  }, [quizId, participantId]);

  if (loading || !result) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
          Compiling certified assessment transcript...
        </p>
      </div>
    );
  }

  const { participant, quiz, breakdown } = result;

  const downloadPDF = () => {
    const url = api.export.studentPDFUrl(quizId, participantId);
    window.open(url, '_blank');
  };

  // Determine achievement badges
  const achievements = [];
  if ((participant.accuracy ?? 0) >= 80) achievements.push({ label: 'Sniper Precision', desc: 'Accuracy ≥ 80%', icon: Zap, color: '#3b82f6' });
  if (participant.cumulativeResponseTimeMs && participant.cumulativeResponseTimeMs / 1000 < ((quiz.durationMinutes || 10) * 60) / 2) {
    achievements.push({ label: 'Speed Demon', desc: 'Finished in under 50% time', icon: Flame, color: '#f59e0b' });
  }
  if ((participant.rank ?? 0) === 1) achievements.push({ label: 'Podium Leader', desc: 'Rank #1 in assessment', icon: Trophy, color: '#10b981' });


  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <div>
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-1.5 text-xs font-bold opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-main)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Candidate Portal</span>
        </button>
      </div>

      {/* Hero Performance Card */}
      <div
        className="rounded-3xl p-8 sm:p-10 border shadow-2xl text-center relative overflow-hidden backdrop-blur-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-400 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-xl shadow-amber-500/10">
          <Trophy className="w-8 h-8 fill-current" />
        </div>

        <span className="text-xs font-black uppercase tracking-widest block mb-1" style={{ color: 'var(--accent-color)' }}>
          Assessment Concluded
        </span>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
          {quiz.title}
        </h1>
        <p className="text-xs sm:text-sm opacity-70 mt-1" style={{ color: 'var(--text-muted)' }}>
          Official certified score report for <strong>{participant.name}</strong> ({participant.email})
        </p>

        {/* 4 Score Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8">
          <div
            className="p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Final Rank
            </span>
            <span className="text-3xl font-black text-amber-400 font-mono">
              #{participant.rank || 1}
            </span>
          </div>

          <div
            className="p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Total Score
            </span>
            <div className="flex items-baseline justify-center space-x-1">
              <span className="text-3xl font-black text-emerald-400 font-mono">{participant.totalScore}</span>
              <span className="text-xs opacity-60 font-semibold" style={{ color: 'var(--text-muted)' }}>/ {quiz.maxScore}</span>
            </div>
          </div>

          <div
            className="p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Accuracy
            </span>
            <span className="text-3xl font-black text-sky-400 font-mono">
              {participant.accuracy}%
            </span>
          </div>

          <div
            className="p-4 rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Response Time
            </span>
            <span className="text-3xl font-black text-indigo-400 font-mono">
              {((participant.cumulativeResponseTimeMs || 0) / 1000).toFixed(1)}s
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
        <div className="mt-8 flex justify-center">
          <button
            onClick={downloadPDF}
            className="px-6 py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center space-x-2 transition-transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
              boxShadow: 'var(--glow-shadow)',
            }}
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF Certificate</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'summary' ? 'border-b-2' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
          style={{
            borderColor: activeTab === 'summary' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'summary' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <Award className="w-4 h-4" />
          <span>Performance Appraisal</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'review' ? 'border-b-2' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
          style={{
            borderColor: activeTab === 'review' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'review' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <FileText className="w-4 h-4" />
          <span>Question Review ({breakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'leaderboard' ? 'border-b-2' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
          style={{
            borderColor: activeTab === 'leaderboard' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'leaderboard' ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard ({leaderboard.length})</span>
        </button>
      </div>

      {/* Tab 1: Summary */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="font-bold text-xs uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Accuracy Overview
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center space-x-2 text-emerald-400 font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Correct Items</span>
                </span>
                <span className="font-black font-mono" style={{ color: 'var(--text-main)' }}>{participant.correctCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center space-x-2 text-rose-400 font-semibold">
                  <XCircle className="w-4 h-4" />
                  <span>Incorrect Items</span>
                </span>
                <span className="font-black font-mono" style={{ color: 'var(--text-main)' }}>{participant.incorrectCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center space-x-2 opacity-60 font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <HelpCircle className="w-4 h-4" />
                  <span>Unanswered Items</span>
                </span>
                <span className="font-black font-mono" style={{ color: 'var(--text-main)' }}>{participant.unansweredCount}</span>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="font-bold text-xs uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Score Composition
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80" style={{ color: 'var(--text-main)' }}>Base Item Points</span>
                <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>{participant.baseScore ?? participant.totalScore} pts</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-400 font-semibold">Speed Bonus</span>
                <span className="font-bold text-amber-400 font-mono">+{participant.bonusScore ?? 0} pts</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center text-sm font-black" style={{ borderColor: 'var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-main)' }}>Net Confirmed Score</span>
                <span className="text-emerald-400 font-mono">{participant.totalScore} pts</span>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="font-bold text-xs uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Speed Analytics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80" style={{ color: 'var(--text-main)' }}>Total Time Elapsed</span>
                <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                  {((participant.cumulativeResponseTimeMs || 0) / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80" style={{ color: 'var(--text-main)' }}>Average per Question</span>
                <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                  {breakdown.length > 0
                    ? ((participant.cumulativeResponseTimeMs || 0) / 1000 / breakdown.length).toFixed(1)
                    : 0}
                  s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Question Review */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {breakdown.map((item) => (
            <div
              key={item.questionNumber}
              className="p-6 rounded-2xl border transition-colors space-y-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: item.isCorrect ? 'var(--border-subtle)' : 'rgba(244, 63, 94, 0.3)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
                    Item {item.questionNumber}
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
                  Time: {(item.responseTimeMs / 1000).toFixed(1)}s
                </span>
              </div>

              <p className="font-bold text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                {item.questionText}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {item.options.map((opt, oIdx) => {
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
                  <strong style={{ color: 'var(--text-main)' }}>Solution Explanation:</strong> {item.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <LeaderboardTable entries={leaderboard} highlightParticipantId={participantId} />
      )}
    </div>
  );
};
