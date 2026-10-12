import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Quiz, Participant, Question } from '../types';
import { getSocket, joinQuizRoom } from '../services/socket';
import { Clock, CheckCircle2, AlertTriangle, Trophy, ChevronLeft, ChevronRight, Send, Award, Wifi, Flame, Zap, ShieldAlert, Check, AlertCircle, XCircle } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface ExamInterfaceProps {
  quiz: Quiz;
  participant: Participant;
  onCompleted: () => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  quiz,
  participant,
  onCompleted,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, { selectedIndex: number; pointsAwarded: number; isCorrect?: boolean }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(participant.totalScore || 0);
  const [currentRank, setCurrentRank] = useState<number>(participant.rank || 1);
  const [activeDeadline, setActiveDeadline] = useState<string | null>(quiz.deadline || null);
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(quiz.durationMinutes * 60);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showMobileNavigator, setShowMobileNavigator] = useState<boolean>(false);
  const [scoreToast, setScoreToast] = useState<{ points: number; isCorrect?: boolean } | null>(null);

  // 1. Load exam questions & submitted answers
  useEffect(() => {
    let isMounted = true;

    const loadExamData = async () => {
      try {
        const quizId = (quiz.id || quiz._id) as string;
        const participantId = (participant.id || participant._id) as string;

        const [qRes, ansRes] = await Promise.all([
          api.question.list(quizId),
          api.answer.getSubmitted(quizId, participantId),
        ]);

        if (isMounted) {
          setQuestions(qRes.questions);

          const ansMap: Record<string, any> = {};
          let scoreAcc = 0;
          ansRes.answers.forEach((ans: any) => {
            ansMap[ans.questionId] = {
              selectedIndex: ans.selectedOptionIndex,
              pointsAwarded: ans.pointsAwarded,
              isCorrect: ans.isCorrect,
            };
            scoreAcc += ans.pointsAwarded;
          });

          setAnswers(ansMap);
          setCurrentScore(scoreAcc);
        }
      } catch (err) {
        console.error('Failed to load exam questions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadExamData();

    return () => {
      isMounted = false;
    };
  }, [quiz.id, quiz._id, participant.id, participant._id]);

  // 2. Authoritative Real-Time Countdown Timer with drift offset correction
  useEffect(() => {
    let targetTime: number;

    if (activeDeadline) {
      targetTime = new Date(activeDeadline).getTime();
    } else if (quiz.startTime) {
      targetTime = new Date(quiz.startTime).getTime() + (quiz.durationMinutes || 10) * 60 * 1000;
    } else {
      targetTime = Date.now() + (quiz.durationMinutes || 10) * 60 * 1000;
    }

    const calcRemaining = () => {
      const now = Date.now() + serverOffset;
      return Math.max(0, Math.floor((targetTime - now) / 1000));
    };

    setRemainingSeconds(calcRemaining());

    const timerInterval = setInterval(() => {
      if (isPaused) return; // Freeze timer if proctor pauses

      const left = calcRemaining();
      setRemainingSeconds(left);

      if (left <= 10 && left > 0) {
        sounds.playTick();
      }

      if (left <= 0) {
        clearInterval(timerInterval);
        sounds.playFanfare();
        onCompleted();
      }
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [activeDeadline, isPaused, serverOffset, quiz.startTime, quiz.durationMinutes]);

  // 3. Socket real-time event updates & auto-reconnection
  useEffect(() => {
    const quizId = (quiz.id || quiz._id) as string;
    const participantId = (participant.id || participant._id) as string;
    const socket = getSocket();

    // Join quiz room immediately and on reconnect
    joinQuizRoom(quizId, participantId, 'student');

    const handleConnect = () => {
      joinQuizRoom(quizId, participantId, 'student');
    };
    socket.on('connect', handleConnect);

    socket.on('server:time', (data: { timestamp: number }) => {
      setServerOffset(data.timestamp - Date.now());
    });

    socket.on('quiz:paused', () => {
      setIsPaused(true);
    });

    socket.on('quiz:resumed', (data: { deadline: string }) => {
      setIsPaused(false);
      if (data.deadline) {
        setActiveDeadline(data.deadline);
      }
    });

    socket.on('quiz:ended', () => {
      sounds.playFanfare();
      onCompleted();
    });

    const handleLeaderboard = (data: { leaderboard: any[] }) => {
      if (!Array.isArray(data?.leaderboard)) return;
      const myId = (participant.id || participant._id) as string;
      const myRow = data.leaderboard.find((r: any) => r.id === myId || r.participantId === myId);
      if (myRow) {
        if (typeof myRow.rank === 'number') {
          setCurrentRank(myRow.rank);
        }
        const scoreVal = typeof myRow.totalScore === 'number' ? myRow.totalScore : myRow.score;
        if (typeof scoreVal === 'number') {
          setCurrentScore(scoreVal);
        }
      }
    };
    socket.on('leaderboard:updated', handleLeaderboard);

    // Silent periodic rank & score sync fallback
    const pollInterval = setInterval(() => {
      api.leaderboard.get(quizId)
        .then((res) => {
          if (Array.isArray(res?.leaderboard)) {
            handleLeaderboard({ leaderboard: res.leaderboard });
          }
        })
        .catch(() => {});
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      socket.off('connect', handleConnect);
      socket.off('server:time');
      socket.off('quiz:paused');
      socket.off('quiz:resumed');
      socket.off('quiz:ended');
      socket.off('leaderboard:updated', handleLeaderboard);
    };
  }, [quiz.id, quiz._id, participant.id, participant._id]);

  const currentQ = questions[currentIndex];
  const isCurrentAnswered = currentQ ? !!answers[currentQ._id] : false;
  const currentAnswer = currentQ ? answers[currentQ._id] : undefined;

  // 4. Keyboard Shortcuts: Press A, B, C, D to answer, Arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || submitting) return;

      // Don't trigger if inside input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key) && currentQ && !isCurrentAnswered) {
        const optIdx = key.charCodeAt(0) - 65;
        if (optIdx < currentQ.options.length) {
          handleSelectOption(optIdx);
        }
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, isCurrentAnswered, isPaused, submitting, questions.length]);

  // 5. Answer selection submission
  const handleSelectOption = async (optionIndex: number) => {
    if (!currentQ || isCurrentAnswered || submitting || isPaused) return;

    sounds.playSelect();
    setSubmitting(true);
    const quizId = (quiz.id || quiz._id) as string;
    const participantId = (participant.id || participant._id) as string;

    try {
      const res = await api.answer.submit({
        quizId,
        participantId,
        questionId: currentQ._id,
        selectedOptionIndex: optionIndex,
      });

      if (res.isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playIncorrect();
      }

      setAnswers((prev) => ({
        ...prev,
        [currentQ._id]: {
          selectedIndex: optionIndex,
          pointsAwarded: res.pointsAwarded,
          isCorrect: res.isCorrect,
        },
      }));

      setCurrentScore(res.currentScore);
      if (res.currentRank) {
        setCurrentRank(res.currentRank);
      }

      // Show instant point feedback toast
      setScoreToast({ points: res.pointsAwarded, isCorrect: res.isCorrect });
      setTimeout(() => setScoreToast(null), 3000);

      const answeredCount = Object.keys(answers).length + 1;
      if (answeredCount >= questions.length) {
        setShowSubmitModal(true);
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting answer');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading || !currentQ) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
          Loading assessment interface...
        </p>
      </div>
    );
  }

  const isAllCompulsoryGlobal = !!quiz.scoringSettings?.allQuestionsCompulsory;

  // Filter compulsory questions vs optional questions based on admin configuration
  const compulsoryQuestions = questions.filter(
    (q) => isAllCompulsoryGlobal || q.isRequired !== false
  );
  const optionalQuestions = questions.filter(
    (q) => !isAllCompulsoryGlobal && q.isRequired === false
  );

  const answeredCount = Object.keys(answers).length;
  const unansweredCompulsory = compulsoryQuestions.filter((q) => !answers[q._id]);
  const unansweredOptional = optionalQuestions.filter((q) => !answers[q._id]);
  const isSubmissionAllowed = unansweredCompulsory.length === 0;
  const firstUnansweredCompulsoryIndex = questions.findIndex(
    (q) => (isAllCompulsoryGlobal || q.isRequired !== false) && !answers[q._id]
  );
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const isCurrentCompulsory = isAllCompulsoryGlobal || currentQ.isRequired !== false;

  // Determine points tier badge
  const getTierBadge = (pts: number) => {
    if (pts >= 400) return { label: 'Elite Boss', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
    if (pts >= 200) return { label: 'Advanced', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    if (pts >= 50) return { label: 'Core Challenge', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
    return { label: 'Warmup', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
  };

  const tier = getTierBadge(currentQ.points);

  return (
    <div className="max-w-6xl mx-auto px-2.5 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toast Notification on Answer evaluation */}
      {scoreToast && (
        <div
          className="fixed top-16 sm:top-20 right-3 sm:right-6 z-50 p-3 sm:p-4 rounded-2xl shadow-2xl border flex items-center space-x-3 animate-in fade-in slide-in-from-right-4 duration-200 max-w-[calc(100vw-1.5rem)]"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: scoreToast.isCorrect !== false ? '#10b981' : '#f43f5e',
            boxShadow: 'var(--glow-shadow)',
          }}
        >
          {scoreToast.isCorrect !== false ? (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
              +{scoreToast.points}
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
              {scoreToast.points}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-extrabold text-xs sm:text-sm truncate" style={{ color: 'var(--text-main)' }}>
              {scoreToast.isCorrect !== false ? 'Confirmed Correct!' : 'Answer Evaluated'}
            </div>
            <div className="text-[11px] opacity-75 font-mono truncate" style={{ color: 'var(--text-muted)' }}>
              Total: {currentScore} pts • Live Rank #{currentRank}
            </div>
          </div>
        </div>
      )}

      {/* Paused Banner */}
      {isPaused && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm flex items-center justify-center space-x-2 font-bold animate-pulse text-center">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span>Proctor has temporarily paused the assessment. Timer and input are suspended.</span>
        </div>
      )}

      {/* Top HUD Card */}
      <div
        className="rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between sm:block">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold opacity-60 block truncate max-w-[200px] sm:max-w-xs" style={{ color: 'var(--text-muted)' }}>
              {quiz.title}
            </span>
            <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5">
              <span className="text-base sm:text-lg font-black" style={{ color: 'var(--text-main)' }}>
                Question {currentIndex + 1}
              </span>
              <span className="text-xs opacity-60 font-mono">of {questions.length}</span>
            </div>
          </div>

          <div className="sm:hidden text-right">
            <span className="text-[10px] font-mono opacity-60 block">{answeredCount}/{questions.length} answered</span>
            <span className="text-xs font-bold text-emerald-400">{Math.round(progressPercent)}% complete</span>
          </div>
        </div>

        {/* Progress Bar (desktop) */}
        <div className="hidden md:flex flex-col flex-1 max-w-xs mx-4">
          <div className="flex justify-between text-xs opacity-75 mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
            <span>Progress</span>
            <span>{answeredCount} / {questions.length} answered</span>
          </div>
          <div
            className="w-full h-2.5 rounded-full overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--accent-color), #10b981)',
              }}
            />
          </div>
        </div>

        {/* Score, Rank, and Countdown HUD: 3-col grid on mobile, flex on desktop */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:space-x-3 w-full sm:w-auto">
          <div
            className="p-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Score
            </span>
            <span className="font-black text-emerald-400 text-xs sm:text-base font-mono">
              {currentScore}p
            </span>
          </div>

          <div
            className="p-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border text-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Rank
            </span>
            <div className="flex items-center justify-center space-x-1 font-black text-amber-400 text-xs sm:text-base font-mono">
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>#{currentRank}</span>
            </div>
          </div>

          {/* Countdown Clock */}
          <div
            className={`p-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border text-center flex items-center justify-center space-x-1 sm:space-x-2.5 ${
              remainingSeconds <= 120 ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse' : ''
            }`}
            style={{
              backgroundColor: remainingSeconds > 120 ? 'var(--bg-surface)' : undefined,
              borderColor: remainingSeconds > 120 ? 'var(--border-subtle)' : undefined,
            }}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-400 flex-shrink-0" />
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold opacity-60 block -mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Time
              </span>
              <span className="font-mono font-black text-xs sm:text-base" style={{ color: 'var(--text-main)' }}>
                {formatTime(remainingSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Main Question Card */}
        <div
          className="lg:col-span-8 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border shadow-2xl space-y-4 sm:space-y-6 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border font-mono"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              Item {currentIndex + 1} of {questions.length}
            </span>

            {/* Compulsory vs Optional Badge */}
            {isCurrentCompulsory ? (
              <span
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider border flex items-center space-x-1 sm:space-x-1.5 shadow-sm"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                }}
              >
                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 animate-pulse" />
                <span>* Compulsory</span>
              </span>
            ) : (
              <span
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border flex items-center space-x-1 sm:space-x-1.5"
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>Optional</span>
              </span>
            )}

            {/* Tier & Points Badges */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span
                className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border flex items-center space-x-1 sm:space-x-1.5"
                style={{
                  backgroundColor: tier.bg,
                  borderColor: tier.color,
                  color: tier.color,
                }}
              >
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{tier.label} • {currentQ.points}p</span>
              </span>

              {currentQ.negativeMarks > 0 && (
                <span className="px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  -{currentQ.negativeMarks} Penalty
                </span>
              )}
            </div>
          </div>

          {/* Question Text */}
          <h2 className="text-xl sm:text-2xl font-black leading-relaxed" style={{ color: 'var(--text-main)' }}>
            {currentQ.text}
          </h2>

          {/* Options Grid with High-Contrast Button Selection */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((optText, optIdx) => {
              const optionLetter = String.fromCharCode(65 + optIdx);
              const isSelected = currentAnswer?.selectedIndex === optIdx;
              const isEvaluatedCorrect = isCurrentAnswered && isSelected && currentAnswer?.isCorrect !== false;
              const isEvaluatedIncorrect = isCurrentAnswered && isSelected && currentAnswer?.isCorrect === false;

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={isCurrentAnswered || submitting || isPaused}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`group w-full p-4 sm:p-4.5 rounded-2xl border text-left flex items-center space-x-4 transition-all duration-200 ${
                    isSelected
                      ? 'shadow-xl scale-[1.01]'
                      : isCurrentAnswered
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:scale-[1.008] hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: isEvaluatedCorrect
                      ? 'rgba(16, 185, 129, 0.12)'
                      : isEvaluatedIncorrect
                      ? 'rgba(244, 63, 94, 0.12)'
                      : isSelected
                      ? 'var(--accent-tint)'
                      : 'var(--bg-surface)',
                    borderColor: isEvaluatedCorrect
                      ? '#10b981'
                      : isEvaluatedIncorrect
                      ? '#f43f5e'
                      : isSelected
                      ? 'var(--accent-color)'
                      : 'var(--border-subtle)',
                    borderWidth: isSelected ? '2px' : '1px',
                    boxShadow: isSelected
                      ? '0 0 0 1px var(--accent-color), 0 4px 20px rgba(37, 99, 235, 0.18)'
                      : 'none',
                  }}
                >
                  {/* Option Key Badge */}
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-transform ${
                      isSelected ? 'scale-110 shadow-md' : 'opacity-85'
                    }`}
                    style={{
                      backgroundColor: isEvaluatedCorrect
                        ? '#10b981'
                        : isEvaluatedIncorrect
                        ? '#f43f5e'
                        : isSelected
                        ? 'var(--accent-color)'
                        : 'var(--bg-card)',
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    {optionLetter}
                  </span>

                  {/* Option Text */}
                  <span
                    className={`text-sm sm:text-base leading-snug flex-1 transition-colors ${
                      isSelected ? 'font-black' : 'font-semibold'
                    }`}
                    style={{ color: 'var(--text-main)' }}
                  >
                    {optText}
                  </span>

                  {/* Right Selection / Evaluation Status Pill */}
                  {isSelected ? (
                    isEvaluatedCorrect ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-black text-white bg-emerald-600 shadow-sm animate-in fade-in flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Correct (+{currentAnswer?.pointsAwarded ?? currentQ.points})</span>
                      </div>
                    ) : isEvaluatedIncorrect ? (
                      <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-black text-white bg-rose-600 shadow-sm animate-in fade-in flex-shrink-0">
                        <XCircle className="w-4 h-4" />
                        <span>Evaluated ({currentAnswer?.pointsAwarded ?? 0})</span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-black text-white shadow-md animate-in fade-in flex-shrink-0"
                        style={{ backgroundColor: 'var(--accent-color)' }}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Selected</span>
                      </div>
                    )
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all opacity-30 group-hover:opacity-70 flex-shrink-0"
                      style={{ borderColor: 'var(--text-muted)' }}
                    >
                      <span className="text-[10px] font-mono opacity-0 group-hover:opacity-60">{optionLetter}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Answer Confirmation State */}
          {isCurrentAnswered && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>Answer Accepted:</strong> Confirmed by server. Points awarded: +{currentAnswer?.pointsAwarded ?? 0}
                </span>
              </div>
              <span className="text-[10px] opacity-60 font-mono">Immutable</span>
            </div>
          )}

          {/* Prev / Next Controls */}
          <div className="flex items-center justify-between pt-4 border-t gap-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 sm:space-x-1.5 disabled:opacity-30 transition-all hover:opacity-90 flex-1 sm:flex-initial"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center space-x-1 sm:space-x-1.5 shadow-lg transition-transform hover:scale-105 flex-1 sm:flex-initial"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
                  boxShadow: 'var(--glow-shadow)',
                }}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1 sm:space-x-1.5 shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105 flex-1 sm:flex-initial"
              >
                <span>Review & Finish</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Question Navigator Toggle */}
        <div className="lg:hidden w-full">
          <button
            type="button"
            onClick={() => setShowMobileNavigator(!showMobileNavigator)}
            className="w-full py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-md transition-all"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <div className="flex items-center space-x-2">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-[10px] opacity-75 font-mono text-emerald-400">({answeredCount} answered)</span>
            </div>
            <span className="text-xs font-black" style={{ color: 'var(--accent-color)' }}>
              {showMobileNavigator ? '▲ Close Navigator' : '▼ View All Questions'}
            </span>
          </button>
        </div>

        {/* Right Sidebar Navigator */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-2xl space-y-4 sm:space-y-5 backdrop-blur-xl ${
            showMobileNavigator ? 'block' : 'hidden lg:block'
          } lg:col-span-4`}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Question Navigator
            </h3>
            <p className="text-xs opacity-60 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Jump directly between exam questions.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAns = !!answers[q._id];
              const isCurr = currentIndex === idx;
              const isQCompulsory = isAllCompulsoryGlobal || q.isRequired !== false;

              return (
                <button
                  key={q._id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-11 rounded-xl font-bold text-xs flex flex-col items-center justify-center relative transition-all ${
                    isCurr
                      ? 'border-2 shadow-md'
                      : isAns
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : isQCompulsory
                      ? 'border border-rose-500/30 opacity-90 hover:opacity-100'
                      : 'border opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isCurr ? 'var(--bg-surface)' : isAns ? undefined : 'var(--bg-surface)',
                    borderColor: isCurr ? 'var(--accent-color)' : isAns ? undefined : isQCompulsory ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)',
                    color: isCurr ? 'var(--text-main)' : undefined,
                  }}
                  title={`Question ${idx + 1} (${q.points} pts) - ${isAns ? 'Answered' : isQCompulsory ? 'Compulsory Pending' : 'Optional'}`}
                >
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold">{idx + 1}</span>
                    {isAns ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                    ) : isQCompulsory ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Compulsory to answer" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70" title="Optional" />
                    )}
                  </div>
                  <span className="text-[9px] opacity-60 -mt-0.5">{q.points}p</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t space-y-2 text-xs opacity-75" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-[8px] text-emerald-400 font-bold">✓</span>
              <span>Answered & Confirmed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded border flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </span>
              <span>Compulsory (* Must Answer)</span>
            </div>
            {optionalQuestions.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded border flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                </span>
                <span>Optional (Can Skip)</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <span className="text-[11px] opacity-60 block mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
              Keyboard: [A-D] Answer • [← / →] Navigate
            </span>
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: isSubmissionAllowed ? 'var(--accent-color)' : 'var(--bg-surface)',
                borderColor: isSubmissionAllowed ? 'var(--accent-color)' : 'var(--border-subtle)',
                color: isSubmissionAllowed ? '#ffffff' : 'var(--text-main)',
                boxShadow: isSubmissionAllowed ? 'var(--glow-shadow)' : 'none',
              }}
            >
              {isSubmissionAllowed ? 'Submit Assessment' : `Review Answers (${answeredCount}/${questions.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div
            className="rounded-3xl max-w-md w-full p-6 text-center border shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                isSubmissionAllowed
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              {isSubmissionAllowed ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>

            <h3 className="text-xl font-black" style={{ color: 'var(--text-main)' }}>
              {isSubmissionAllowed ? 'Finalize & Submit Assessment?' : 'Compulsory Questions Incomplete'}
            </h3>

            {isSubmissionAllowed ? (
              <div className="space-y-2 text-left p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                <p className="text-xs opacity-90 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                  {unansweredOptional.length === 0 ? (
                    <>
                      You have answered all <strong>{questions.length}</strong> questions in this assessment.
                    </>
                  ) : (
                    <>
                      All <strong>{compulsoryQuestions.length} compulsory</strong> question(s) have been answered!
                      You have skipped <strong>{unansweredOptional.length} optional</strong> question(s).
                    </>
                  )}
                </p>
                <div className="text-[11px] opacity-75 font-mono" style={{ color: 'var(--text-muted)' }}>
                  Confirmed score: {currentScore} pts • Live Rank #{currentRank}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2.5">
                <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Admin requires all compulsory questions to be answered!</span>
                </div>
                <p className="text-xs opacity-80 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                  You have completed <strong>{answeredCount} of {questions.length}</strong> questions.
                  Please answer the remaining <strong>{unansweredCompulsory.length} compulsory</strong> question(s) before you can submit.
                </p>
                {firstUnansweredCompulsoryIndex !== -1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentIndex(firstUnansweredCompulsoryIndex);
                      setShowSubmitModal(false);
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all hover:scale-105"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      boxShadow: 'var(--glow-shadow)',
                    }}
                  >
                    Jump to Compulsory Question #{firstUnansweredCompulsoryIndex + 1}
                  </button>
                )}
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-colors hover:opacity-90"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                Return to Test
              </button>
              <button
                type="button"
                disabled={!isSubmissionAllowed || submitting}
                onClick={async () => {
                  try {
                    sounds.playFanfare();
                    setShowSubmitModal(false);
                    const quizId = (quiz.id || quiz._id) as string;
                    const participantId = (participant.id || participant._id) as string;

                    // Authoritatively complete quiz on server
                    await api.registration.complete({ quizId, participantId });

                    // Mark local session as COMPLETED
                    const saved = localStorage.getItem('qa_student_session');
                    if (saved) {
                      try {
                        const parsed = JSON.parse(saved);
                        localStorage.setItem('qa_student_session', JSON.stringify({ ...parsed, status: 'COMPLETED' }));
                      } catch {
                        // ignore
                      }
                    }
                  } catch (err) {
                    console.error('Error completing test:', err);
                  } finally {
                    onCompleted();
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-transform ${
                  isSubmissionAllowed
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed bg-slate-500 text-slate-200'
                }`}
              >
                {isSubmissionAllowed ? 'Confirm Submission' : `Answer Compulsory (${unansweredCompulsory.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
