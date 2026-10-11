import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Quiz, Question } from '../types';
import { ArrowLeft, Save, Plus, Trash2, Edit2, CheckCircle2, ShieldAlert, Award, Sliders, Layers, HelpCircle, Sparkles, Zap } from 'lucide-react';

interface QuizEditorPageProps {
  quizId?: string;
  onBack: () => void;
  onSaved: (quizId: string) => void;
}

export const QuizEditorPage: React.FC<QuizEditorPageProps> = ({
  quizId,
  onBack,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [negativeMarks, setNegativeMarks] = useState(25);
  const [speedBonusEnabled, setSpeedBonusEnabled] = useState(false);
  const [maxSpeedBonus, setMaxSpeedBonus] = useState(20);
  const [requireStudentId, setRequireStudentId] = useState(false);
  const [allowLateJoin, setAllowLateJoin] = useState(false);
  const [allQuestionsCompulsory, setAllQuestionsCompulsory] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPointValue, setBulkPointValue] = useState(100);

  // New Question Form state
  const [newText, setNewText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newPoints, setNewPoints] = useState(100);
  const [newNegativeMarks, setNewNegativeMarks] = useState(0);
  const [newExplanation, setNewExplanation] = useState('');
  const [newIsRequired, setNewIsRequired] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  useEffect(() => {
    if (quizId) {
      setLoading(true);
      Promise.all([api.quiz.get(quizId), api.question.list(quizId)])
        .then(([qRes, questRes]) => {
          const q = qRes.quiz;
          setTitle(q.title);
          setDescription(q.description || '');
          setDurationMinutes(q.durationMinutes);
          setNegativeMarkingEnabled(q.scoringSettings?.negativeMarkingEnabled || false);
          setNegativeMarks(q.scoringSettings?.negativeMarks || 25);
          setSpeedBonusEnabled(q.scoringSettings?.speedBonusEnabled || false);
          setMaxSpeedBonus(q.scoringSettings?.maxSpeedBonus || 20);
          setAllQuestionsCompulsory(q.scoringSettings?.allQuestionsCompulsory || false);
          setRequireStudentId(q.registrationSettings?.requireStudentId || false);
          setAllowLateJoin(q.registrationSettings?.allowLateJoin || false);

          setQuestions(questRes.questions);
        })
        .catch((err) => console.error('Failed to load quiz for edit:', err))
        .finally(() => setLoading(false));
    }
  }, [quizId]);

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      alert('Assessment title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        durationMinutes,
        scoringSettings: {
          defaultPoints: 100,
          negativeMarkingEnabled,
          negativeMarks,
          speedBonusEnabled,
          maxSpeedBonus,
          allQuestionsCompulsory,
        },
        registrationSettings: {
          requireStudentId,
          allowLateJoin,
        },
      };

      let activeQuizId = quizId;
      if (quizId) {
        await api.quiz.update(quizId, payload);
      } else {
        const res = await api.quiz.create(payload);
        activeQuizId = (res.quiz._id || res.quiz.id) as string;
      }

      if (activeQuizId) {
        onSaved(activeQuizId);
      }
    } catch (err: any) {
      alert(err.message || 'Error saving assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId) {
      alert('Please save the assessment parameters first before adding questions.');
      return;
    }

    if (newOptions.some((o) => !o.trim())) {
      alert('All options must be non-empty');
      return;
    }

    try {
      const res = await api.question.create(quizId, {
        text: newText,
        options: newOptions,
        correctOptionIndex: newCorrectIndex,
        points: Number(newPoints),
        negativeMarks: Number(newNegativeMarks),
        explanation: newExplanation,
        isRequired: newIsRequired,
      });

      setQuestions((prev) => [...prev, res.question]);
      setNewText('');
      setNewOptions(['', '', '', '']);
      setNewCorrectIndex(0);
      setNewPoints(100);
      setNewNegativeMarks(0);
      setNewExplanation('');
      setNewIsRequired(true);
      setShowAddQuestion(false);
    } catch (err: any) {
      alert(err.message || 'Error creating question');
    }
  };

  const handleToggleRequired = async (qId: string, currentRequired: boolean) => {
    try {
      const nextRequired = !currentRequired;
      await api.question.update(qId, { isRequired: nextRequired });
      setQuestions((prev) =>
        prev.map((q) => (q._id === qId ? { ...q, isRequired: nextRequired } : q))
      );
    } catch (err: any) {
      alert(err.message || 'Error updating question requirement');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to remove this question?')) return;
    try {
      await api.question.delete(qId);
      setQuestions((prev) => prev.filter((q) => q._id !== qId));
    } catch (err: any) {
      alert(err.message || 'Error deleting question');
    }
  };

  const handleUpdatePointsInline = async (qId: string, pts: number) => {
    try {
      await api.question.update(qId, { points: pts });
      setQuestions((prev) =>
        prev.map((q) => (q._id === qId ? { ...q, points: pts } : q))
      );
    } catch (err: any) {
      alert(err.message || 'Error updating points');
    }
  };

  const handleBulkPoints = async () => {
    if (!quizId) return;
    try {
      const updates = questions.map((q) => ({
        questionId: q._id,
        points: bulkPointValue,
      }));
      const res = await api.question.bulkUpdatePoints(quizId, updates);
      setQuestions(res.questions);
      setBulkModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error applying bulk points');
    }
  };

  const totalPossiblePoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
          Loading assessment configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-bold opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-main)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <button
          onClick={handleSaveQuiz}
          disabled={saving}
          className="px-5 py-2.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-transform hover:scale-105 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
            boxShadow: 'var(--glow-shadow)',
          }}
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Assessment Settings'}</span>
        </button>
      </div>

      {/* Basic Settings Card */}
      <div
        className="p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div>
          <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
            Assessment Parameters
          </h2>
          <p className="text-xs opacity-75 mt-1" style={{ color: 'var(--text-muted)' }}>
            Configure examination limits, duration, and scoring mechanisms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
              Assessment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Systems & High-Throughput Architecture"
              className="w-full text-xs sm:text-sm rounded-xl py-2.5 px-3 border focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
              Description & Syllabus
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide topics covered by this assessment..."
              className="w-full text-xs sm:text-sm rounded-xl py-2 px-3 border focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
              Assessment Duration (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full text-xs sm:text-sm rounded-xl py-2 px-3 border focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div className="flex flex-col justify-end space-y-2">
            <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={requireStudentId}
                onChange={(e) => setRequireStudentId(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Mandatory Candidate ID on Registration</span>
            </label>
            <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={allowLateJoin}
                onChange={(e) => setAllowLateJoin(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Allow Late Joining After Assessment Starts</span>
            </label>
          </div>
        </div>

        {/* Scoring Engine Controls */}
        <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center space-x-2" style={{ color: 'var(--text-main)' }}>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Negative Marking Penalty</span>
              </label>
              <input
                type="checkbox"
                checked={negativeMarkingEnabled}
                onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                className="w-4 h-4 rounded"
              />
            </div>
            {negativeMarkingEnabled && (
              <div>
                <label className="text-[11px] opacity-75 block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Penalty Points per Incorrect Answer
                </label>
                <input
                  type="number"
                  min={0}
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                  className="w-32 border rounded-lg py-1 px-2 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            )}
          </div>

          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center space-x-2" style={{ color: 'var(--text-main)' }}>
                <Award className="w-4 h-4 text-amber-400" />
                <span>Optional Speed Bonus Points</span>
              </label>
              <input
                type="checkbox"
                checked={speedBonusEnabled}
                onChange={(e) => setSpeedBonusEnabled(e.target.checked)}
                className="w-4 h-4 rounded"
              />
            </div>
            {speedBonusEnabled && (
              <div>
                <label className="text-[11px] opacity-75 block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Maximum Speed Bonus Points
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxSpeedBonus}
                  onChange={(e) => setMaxSpeedBonus(Number(e.target.value))}
                  className="w-32 border rounded-lg py-1 px-2 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            )}
          </div>

          <div
            className="p-4 rounded-2xl border space-y-1 sm:col-span-2"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold flex items-center space-x-2" style={{ color: 'var(--text-main)' }}>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Enforce All Questions Compulsory (Global Assessment Rule)</span>
                </label>
                <p className="text-[11px] opacity-70 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  When enabled, candidates must answer every question before submitting. When disabled, candidates can skip optional questions.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allQuestionsCompulsory}
                onChange={(e) => setAllQuestionsCompulsory(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Points Question Bank Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              Dynamic Question Bank
            </h3>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border font-mono"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent-color)',
              }}
            >
              Total: {totalPossiblePoints} Max Points
            </span>
          </div>
          <p className="text-xs opacity-75 mt-1" style={{ color: 'var(--text-muted)' }}>
            Assign custom points per question (e.g. 10, 25, 100, 500). Use inline edit or bulk tools.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {questions.length > 0 && (
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Bulk Configure Points</span>
            </button>
          )}

          <button
            onClick={() => setShowAddQuestion(true)}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-lg transition-transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
              boxShadow: 'var(--glow-shadow)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Add Question Card */}
      {showAddQuestion && (
        <form
          onSubmit={handleAddQuestion}
          className="p-6 rounded-3xl border-2 shadow-2xl space-y-5 animate-in fade-in"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--accent-color)',
          }}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
              New Multiple Choice Question
            </h4>
            <button
              type="button"
              onClick={() => setShowAddQuestion(false)}
              className="text-xs opacity-70 hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
              Question Text *
            </label>
            <textarea
              required
              rows={2}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="e.g. Which distributed algorithm guarantees consensus in asynchronous networks?"
              className="w-full text-xs sm:text-sm rounded-xl py-2 px-3 border focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold opacity-80" style={{ color: 'var(--text-main)' }}>
              Answer Options & Correct Answer Radio *
            </label>
            {newOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="correctRadio"
                  checked={newCorrectIndex === idx}
                  onChange={() => setNewCorrectIndex(idx)}
                  className="w-4 h-4"
                  title="Mark as correct answer"
                />
                <span className="w-6 text-xs font-mono font-bold opacity-60">{String.fromCharCode(65 + idx)}.</span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => {
                    const arr = [...newOptions];
                    arr[idx] = e.target.value;
                    setNewOptions(arr);
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  className="flex-1 text-xs sm:text-sm rounded-xl py-1.5 px-3 border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Points & Penalties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">
                Assigned Point Value *
              </label>
              <input
                type="number"
                min={0}
                required
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                placeholder="e.g. 100"
                className="w-full border rounded-xl py-2 px-3 text-sm font-bold text-amber-400 focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-400 mb-1">
                Incorrect Penalty Points
              </label>
              <input
                type="number"
                min={0}
                value={newNegativeMarks}
                onChange={(e) => setNewNegativeMarks(Number(e.target.value))}
                className="w-full border rounded-xl py-2 px-3 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold opacity-60 mb-1" style={{ color: 'var(--text-muted)' }}>
                Solution Explanation (Revealed Post-Exam)
              </label>
              <input
                type="text"
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                placeholder="Optional explanation of the correct solution..."
                className="w-full border rounded-xl py-2 px-3 text-xs sm:text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div className="sm:col-span-3 flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="newIsRequired"
                checked={newIsRequired}
                onChange={(e) => setNewIsRequired(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="newIsRequired" className="text-xs font-bold cursor-pointer select-none" style={{ color: 'var(--text-main)' }}>
                Compulsory Question <span className="opacity-60 font-normal">(Candidate cannot submit assessment without answering this question)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
              }}
            >
              Add Question to Bank
            </button>
          </div>
        </form>
      )}

      {/* Existing Questions List with Inline Points Editor */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div
            className="p-8 rounded-3xl border text-center opacity-60"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <p className="text-sm font-bold">No questions in this assessment yet.</p>
            <p className="text-xs mt-1">Click "Add Question" above to build your question bank.</p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q._id}
              className="p-5 rounded-3xl border shadow-md space-y-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-main)' }}>
                    {q.text}
                  </span>
                </div>

                {/* Compulsory Toggle & Inline Points Editor */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleToggleRequired(q._id, q.isRequired !== false)}
                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all ${
                      q.isRequired !== false
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-sm'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-400 opacity-80 hover:opacity-100'
                    }`}
                    title="Click to toggle whether this question is compulsory or optional for candidates"
                  >
                    {q.isRequired !== false ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span>Compulsory</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span>Optional</span>
                      </>
                    )}
                  </button>

                  <div
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-xl border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <span className="text-[11px] font-bold opacity-60" style={{ color: 'var(--text-muted)' }}>
                      Points:
                    </span>
                    <input
                      type="number"
                      min={0}
                      defaultValue={q.points}
                      onBlur={(e) => handleUpdatePointsInline(q._id, Number(e.target.value))}
                      className="w-16 border rounded px-1.5 py-0.5 text-xs font-black text-amber-400 text-center"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteQuestion(q._id)}
                    className="p-1.5 rounded-lg border hover:bg-rose-500/15 hover:border-rose-500/40 text-rose-400 transition-colors opacity-70 hover:opacity-100"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Options pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {q.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className={`p-2.5 rounded-xl border truncate font-medium ${
                      q.correctOptionIndex === oIdx
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                        : 'opacity-70'
                    }`}
                    style={{
                      backgroundColor: q.correctOptionIndex !== oIdx ? 'var(--bg-surface)' : undefined,
                      borderColor: q.correctOptionIndex !== oIdx ? 'var(--border-subtle)' : undefined,
                      color: q.correctOptionIndex !== oIdx ? 'var(--text-main)' : undefined,
                    }}
                  >
                    {String.fromCharCode(65 + oIdx)}. {opt}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bulk Points Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div
            className="rounded-3xl max-w-sm w-full p-6 text-center border shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h4 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>
              Bulk Configure Points
            </h4>
            <p className="text-xs opacity-75" style={{ color: 'var(--text-muted)' }}>
              Set a uniform point value across all {questions.length} questions in this assessment.
            </p>

            <div>
              <label className="text-xs font-bold block mb-1 opacity-80" style={{ color: 'var(--text-main)' }}>
                Set Points per Question
              </label>
              <input
                type="number"
                min={0}
                value={bulkPointValue}
                onChange={(e) => setBulkPointValue(Number(e.target.value))}
                className="w-full border rounded-xl py-2 px-3 text-center font-black text-amber-400 text-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                }}
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold hover:opacity-90"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkPoints}
                className="flex-1 py-2 rounded-xl text-white font-black text-xs uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-color) 0%, #6366f1 100%)',
                }}
              >
                Apply to All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
