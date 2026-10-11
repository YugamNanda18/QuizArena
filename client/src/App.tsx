import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StudentLandingPage } from './pages/StudentLandingPage';
import { WaitingRoom } from './pages/WaitingRoom';
import { ExamInterface } from './pages/ExamInterface';
import { ResultsPage } from './pages/ResultsPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { QuizEditorPage } from './pages/QuizEditorPage';
import { LiveControlRoom } from './pages/LiveControlRoom';
import { QuizAnalyticsPage } from './pages/QuizAnalyticsPage';
import { Quiz, Participant } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('student-landing');
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('qa_admin_token'));

  // Active student session
  const [activeQuizId, setActiveQuizId] = useState<string>('');
  const [activeParticipantId, setActiveParticipantId] = useState<string>('');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(null);

  // Active quiz for admin editing/control
  const [selectedAdminQuizId, setSelectedAdminQuizId] = useState<string>('');

  // Extract initial room code and view from URL query params
  const [urlRoomCode, setUrlRoomCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || params.get('code') || '';
    } catch {
      return '';
    }
  });

  // Check and restore student session or handle URL view param on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reqView = params.get('view');
      if (reqView === 'admin') {
        setCurrentView(adminToken ? 'admin-dashboard' : 'admin-login');
        return;
      }
    } catch {
      // ignore
    }

    const saved = localStorage.getItem('qa_student_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.quizId && parsed.participantId) {
          setActiveQuizId(parsed.quizId);
          setActiveParticipantId(parsed.participantId);

          api.registration
            .getStatus(parsed.participantId)
            .then((res) => {
              setActiveQuiz(res.quiz);
              setActiveParticipant(res.participant);

              if (res.quiz.status === 'LIVE' || res.participant.status === 'IN_PROGRESS') {
                setCurrentView('student-exam');
              } else if (res.quiz.status === 'WAITING' || res.quiz.status === 'PUBLISHED') {
                setCurrentView('student-waiting');
              } else if (res.quiz.status === 'COMPLETED' || res.participant.status === 'COMPLETED') {
                setCurrentView('student-results');
              }
            })
            .catch(() => {
              // Stale or invalid session - keep on landing
              localStorage.removeItem('qa_student_session');
            });
        }
      } catch (e) {
        // ignore
      }
    }
  }, [adminToken]);

  const handleAdminLogout = useCallback(() => {
    localStorage.removeItem('qa_admin_token');
    setAdminToken(null);
    setCurrentView('student-landing');
  }, []);

  const handleStudentRegistered = useCallback((quizId: string, participantId: string) => {
    setActiveQuizId(quizId);
    setActiveParticipantId(participantId);
    setCurrentView('student-waiting');
  }, []);

  const handleTestStarted = useCallback((quiz: Quiz, participant: Participant) => {
    setActiveQuiz(quiz);
    setActiveParticipant(participant);
    setCurrentView('student-exam');
  }, []);

  const handleExamCompleted = useCallback(() => {
    setCurrentView('student-results');
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-main)',
      }}
    >
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        adminLoggedIn={!!adminToken}
        onAdminLogout={handleAdminLogout}
      />

      <main className="flex-1 pb-16">
        {/* Student Views */}
        {currentView === 'student-landing' && (
          <StudentLandingPage
            initialRoomCode={urlRoomCode}
            onRegistered={handleStudentRegistered}
          />
        )}

        {currentView === 'student-waiting' && (
          activeQuizId && activeParticipantId ? (
            <WaitingRoom
              quizId={activeQuizId}
              participantId={activeParticipantId}
              onTestStarted={handleTestStarted}
            />
          ) : (
            <StudentLandingPage
              initialRoomCode={urlRoomCode}
              onRegistered={handleStudentRegistered}
            />
          )
        )}

        {currentView === 'student-exam' && (
          activeQuiz && activeParticipant ? (
            <ExamInterface
              quiz={activeQuiz}
              participant={activeParticipant}
              onCompleted={handleExamCompleted}
            />
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold opacity-75" style={{ color: 'var(--text-muted)' }}>
                Preparing Assessment Session...
              </p>
            </div>
          )
        )}

        {currentView === 'student-results' && (
          activeQuizId && activeParticipantId ? (
            <ResultsPage
              quizId={activeQuizId}
              participantId={activeParticipantId}
              onBackToHome={() => setCurrentView('student-landing')}
            />
          ) : (
            <StudentLandingPage
              initialRoomCode={urlRoomCode}
              onRegistered={handleStudentRegistered}
            />
          )
        )}

        {/* Administrator Views */}
        {currentView === 'admin-login' && (
          <AdminLoginPage
            onLoginSuccess={() => {
              setAdminToken(localStorage.getItem('qa_admin_token'));
              setCurrentView('admin-dashboard');
            }}
          />
        )}

        {(currentView === 'admin-dashboard' ||
          (currentView === 'admin-control-room' && !selectedAdminQuizId) ||
          (currentView === 'admin-analytics' && !selectedAdminQuizId)) && (
          <AdminDashboard
            onCreateQuiz={() => {
              setSelectedAdminQuizId('');
              setCurrentView('quiz-editor');
            }}
            onEditQuiz={(id) => {
              setSelectedAdminQuizId(id);
              setCurrentView('quiz-editor');
            }}
            onOpenControlRoom={(id) => {
              setSelectedAdminQuizId(id);
              setCurrentView('admin-control-room');
            }}
            onOpenAnalytics={(id) => {
              setSelectedAdminQuizId(id);
              setCurrentView('admin-analytics');
            }}
          />
        )}

        {currentView === 'quiz-editor' && (
          <QuizEditorPage
            quizId={selectedAdminQuizId || undefined}
            onBack={() => setCurrentView('admin-dashboard')}
            onSaved={(id) => {
              setSelectedAdminQuizId(id);
              setCurrentView('admin-dashboard');
            }}
          />
        )}

        {currentView === 'admin-control-room' && selectedAdminQuizId && (
          <LiveControlRoom
            quizId={selectedAdminQuizId}
            onBack={() => setCurrentView('admin-dashboard')}
          />
        )}

        {currentView === 'admin-analytics' && selectedAdminQuizId && (
          <QuizAnalyticsPage
            quizId={selectedAdminQuizId}
            onBack={() => setCurrentView('admin-dashboard')}
          />
        )}
      </main>

      {/* Enterprise Footer */}
      <footer
        className="border-t py-6 text-center text-xs transition-colors duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium">QuizArena Enterprise™ • Real-Time Assessment & Live Leaderboard Engine</span>
          <div className="flex items-center space-x-4">
            <span style={{ color: 'var(--text-main)' }}>Node.js + MongoDB + Socket.IO + React + Vitest</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-semibold text-emerald-400">High-Availability Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
