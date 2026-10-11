import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowLeft, Download, FileText, Table, FileSpreadsheet, CheckCircle, Clock, Award, HelpCircle, Sparkles } from 'lucide-react';

interface QuizAnalyticsPageProps {
  quizId: string;
  onBack: () => void;
}

export const QuizAnalyticsPage: React.FC<QuizAnalyticsPageProps> = ({ quizId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.analytics.getQuiz(quizId),
      api.registration.listForQuiz(quizId),
    ])
      .then(([aRes, pRes]) => {
        setData(aRes.analytics);
        setParticipants(pRes.participants);
      })
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
          Compiling assessment metrics & distributions...
        </p>
      </div>
    );
  }

  const downloadConsolidatedPDF = () => {
    window.open(api.export.consolidatedPDFUrl(quizId), '_blank');
  };

  const downloadCSV = () => {
    window.open(api.export.csvUrl(quizId), '_blank');
  };

  const downloadExcel = () => {
    window.open(api.export.excelUrl(quizId), '_blank');
  };

  const downloadStudentPDF = (pId: string) => {
    window.open(api.export.studentPDFUrl(quizId, pId), '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
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
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              Performance Analytics & Report Exports
            </h1>
            <p className="text-xs opacity-75 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {data.title} • Authoritative Assessment Roster
            </p>
          </div>
        </div>

        {/* 3 Working Report Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadConsolidatedPDF}
            className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors hover:opacity-90 shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <FileText className="w-4 h-4 text-brand-400" />
            <span>Consolidated PDF</span>
          </button>

          <button
            onClick={downloadCSV}
            className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors hover:opacity-90 shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <Table className="w-4 h-4 text-emerald-400" />
            <span>CSV Export</span>
          </button>

          <button
            onClick={downloadExcel}
            className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors hover:opacity-90 shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            <span>Excel Workbook</span>
          </button>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="p-5 rounded-3xl border shadow-xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block" style={{ color: 'var(--text-muted)' }}>
            Total Candidates
          </span>
          <span className="text-3xl font-black mt-2 block" style={{ color: 'var(--text-main)' }}>
            {data.totalParticipants}
          </span>
        </div>

        <div
          className="p-5 rounded-3xl border shadow-xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
            Completion Rate
          </span>
          <span className="text-3xl font-black text-emerald-400 mt-2 block">
            {data.completionRate}%
          </span>
        </div>

        <div
          className="p-5 rounded-3xl border shadow-xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
            Average Score
          </span>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-3xl font-black text-amber-400">{data.avgScore}</span>
            <span className="text-xs opacity-60 font-medium" style={{ color: 'var(--text-muted)' }}>/ {data.maxPossibleScore}</span>
          </div>
        </div>

        <div
          className="p-5 rounded-3xl border shadow-xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
            Highest Score
          </span>
          <span className="text-3xl font-black text-sky-400 mt-2 block">
            {data.topScore} pts
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question-wise Success Rate Chart */}
        <div
          className="lg:col-span-8 p-6 rounded-3xl border shadow-xl space-y-4 backdrop-blur-xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
            Question-Wise Accuracy (%)
          </h3>
          <p className="text-xs opacity-60 -mt-2" style={{ color: 'var(--text-muted)' }}>
            Percentage of candidates answering correctly per item.
          </p>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.questionAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="questionNumber" tickFormatter={(v) => `Q${v}`} stroke="#64748b" />
                <YAxis unit="%" domain={[0, 100]} stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '12px', color: 'var(--text-main)' }}
                  labelFormatter={(v) => `Question ${v}`}
                />
                <Bar dataKey="accuracy" fill="var(--accent-color)" radius={[6, 6, 0, 0]} name="Accuracy %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Distribution */}
        <div
          className="lg:col-span-4 p-6 rounded-3xl border shadow-xl space-y-4 backdrop-blur-xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
            Score Distribution
          </h3>
          <p className="text-xs opacity-60 -mt-2" style={{ color: 'var(--text-muted)' }}>
            Candidate score percentiles.
          </p>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="range" type="category" stroke="#64748b" width={60} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Candidate Performance Roster Table */}
      <div
        className="rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
            Candidate Result Roster ({participants.length})
          </h3>
          <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>
            Official certificate transcripts
          </span>
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
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4 text-right">Score</th>
                <th className="py-3.5 px-4 text-center">Correct</th>
                <th className="py-3.5 px-4 text-right">Time (s)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center opacity-60" style={{ color: 'var(--text-muted)' }}>
                    No candidate results recorded yet.
                  </td>
                </tr>
              ) : (
                participants.map((p, idx) => (
                  <tr key={p._id || idx} className="hover:opacity-90 transition-opacity">
                    <td className="py-3.5 px-4 text-center font-black text-amber-400 font-mono">
                      #{p.rank || idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{p.name}</div>
                      <div className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>{p.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-400 font-mono">
                      {p.totalScore} pts
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs opacity-80" style={{ color: 'var(--text-main)' }}>
                      {p.correctCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs opacity-75" style={{ color: 'var(--text-muted)' }}>
                      {((p.cumulativeResponseTimeMs || 0) / 1000).toFixed(1)}s
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => downloadStudentPDF((p.id || p._id) as string)}
                        className="px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center space-x-1 hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--accent-color)',
                        }}
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
