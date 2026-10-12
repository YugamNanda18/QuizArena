import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getSocket, joinQuizRoom } from '../services/socket';
import { Quiz, Participant } from '../types';
import { Users, Wifi, Clock, ShieldCheck, Sparkles, Bell, Radio } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface WaitingRoomProps {
  quizId: string;
  participantId: string;
  onTestStarted: (quiz: Quiz, participant: Participant) => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  quizId,
  participantId,
  onTestStarted,
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [connectedCount, setConnectedCount] = useState<number>(1);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      try {
        const res = await api.registration.getStatus(participantId);
        if (isMounted) {
          setQuiz(res.quiz);
          setParticipant(res.participant);

          if (res.quiz.status === 'LIVE') {
            onTestStarted(res.quiz, res.participant);
          }
        }
      } catch (err) {
        console.error('Failed to load waiting room status:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStatus();

    const socket = getSocket();
    setSocketConnected(socket.connected);

    const handleConnect = () => {
      setSocketConnected(true);
      joinQuizRoom(quizId, participantId, 'student');
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    joinQuizRoom(quizId, participantId, 'student');

    const handleCount = (data: { quizId: string; count: number }) => {
      if (data.quizId === quizId) {
        setConnectedCount(data.count);
      }
    };
    socket.on('participant:count', handleCount);

    const handleQuizStarted = (data: { quizId: string; startTime: string; deadline: string }) => {
      sounds.playFanfare();
      if (data.quizId === quizId) {
        api.registration
          .getStatus(participantId)
          .then((res) => {
            if (isMounted) {
              onTestStarted(
                {
                  ...res.quiz,
                  status: 'LIVE',
                  startTime: data.startTime,
                  deadline: data.deadline,
                },
                res.participant
              );
            }
          })
          .catch(() => {
            loadStatus();
          });
      }
    };
    socket.on('quiz:started', handleQuizStarted);

    const handleQuizStatus = (data: { status: string; quizId: string }) => {
      if (data.quizId === quizId && data.status === 'LIVE') {
        sounds.playFanfare();
        api.registration
          .getStatus(participantId)
          .then((res) => {
            if (isMounted) {
              onTestStarted({ ...res.quiz, status: 'LIVE' }, res.participant);
            }
          })
          .catch(() => {
            loadStatus();
          });
      }
    };
    socket.on('quiz:status', handleQuizStatus);

    return () => {
      isMounted = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('participant:count', handleCount);
      socket.off('quiz:started', handleQuizStarted);
      socket.off('quiz:status', handleQuizStatus);
    };
  }, [quizId, participantId]);

  if (loading || !quiz || !participant) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
          Entering waiting room...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
      <div
        className="rounded-3xl p-5 sm:p-8 md:p-12 border shadow-2xl text-center relative overflow-hidden backdrop-blur-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Top Radar Pulse Animation */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed opacity-40 animate-radar"
            style={{ borderColor: 'var(--accent-color)' }}
          />
          <div
            className="absolute inset-2 rounded-full opacity-20 animate-ping"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
          <div
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center shadow-xl glow-theme"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--accent-color)',
            }}
          >
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" style={{ color: 'var(--accent-color)' }} />
          </div>
        </div>

        {/* Live Server Connection Badge */}
        <div
          className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border mb-3 sm:mb-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              socketConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-rose-400'
            }`}
          />
          <Wifi className="w-3.5 h-3.5 opacity-70" />
          <span>{socketConnected ? 'Real-Time Server Connected' : 'Reconnecting to Server...'}</span>
        </div>

        <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
          Waiting for Proctor to Launch
        </h1>

        <p className="mt-2 sm:mt-3 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed opacity-75 font-medium px-2" style={{ color: 'var(--text-muted)' }}>
          The administrator will start the test from the control console. All candidates will begin at the exact same server-controlled time.
        </p>

        {/* Candidate & Assessment Info Cards */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left">
          <div
            className="p-3.5 sm:p-4 rounded-2xl border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Candidate Identity
            </span>
            <div className="mt-1 font-black text-sm sm:text-base truncate" style={{ color: 'var(--text-main)' }}>
              {participant.name}
            </div>
            <div className="text-xs opacity-75 truncate" style={{ color: 'var(--text-muted)' }}>
              {participant.email}
            </div>
            {participant.studentId && (
              <div className="text-[11px] font-mono mt-1 font-semibold" style={{ color: 'var(--accent-color)' }}>
                ID: {participant.studentId}
              </div>
            )}
          </div>

          <div
            className="p-3.5 sm:p-4 rounded-2xl border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
              Assessment Room
            </span>
            <div className="mt-1 font-black text-sm sm:text-base truncate" style={{ color: 'var(--text-main)' }}>
              {quiz.title}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs opacity-75" style={{ color: 'var(--text-muted)' }}>
              <span className="font-mono font-bold" style={{ color: 'var(--accent-color)' }}>Room: {quiz.roomCode}</span>
              <span>•</span>
              <span>{quiz.durationMinutes} Mins</span>
              <span>•</span>
              <span>{quiz.totalQuestions} Questions</span>
            </div>
          </div>
        </div>

        {/* Connected Candidates Counter */}
        <div
          className="mt-4 sm:mt-6 p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-center sm:justify-start">
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent-color)',
              }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] sm:text-[11px] opacity-60 block" style={{ color: 'var(--text-muted)' }}>
                Live Candidates in Room
              </span>
              <span className="text-xs sm:text-sm font-black" style={{ color: 'var(--text-main)' }}>
                {connectedCount} Connected Online
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Synchronized Start</span>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex items-center justify-center space-x-2 text-[11px] sm:text-xs opacity-60 text-center" style={{ color: 'var(--text-muted)' }}>
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Encrypted questions will decrypt automatically upon administrator launch.</span>
        </div>
      </div>
    </div>
  );
};
