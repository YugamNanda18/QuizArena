import React, { useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, ArrowUp, ArrowDown, Minus, Crown, Medal, Clock, CheckCircle2, Search, Zap, Flame, UserCheck } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightParticipantId?: string;
  showPodium?: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  highlightParticipantId,
  showPodium = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter((e) =>
    (e.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const topThree = entries.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top 3 Podium Cards */}
      {showPodium && entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
          {/* Rank 2 (Silver) */}
          {topThree[1] && (
            <div
              className="order-2 md:order-1 relative rounded-3xl p-5 border shadow-xl flex flex-col items-center text-center transition-transform hover:-translate-y-1"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-500/10 border-2 border-slate-300 flex items-center justify-center mb-2 shadow-inner">
                <Medal className="w-7 h-7 text-slate-300" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">2nd Place • Silver</span>
              <h4 className="font-extrabold text-base truncate max-w-[190px] mt-1" style={{ color: 'var(--text-main)' }}>
                {topThree[1].name || 'Candidate'}
              </h4>
              <div className="mt-3 flex items-baseline space-x-1">
                <span className="text-3xl font-black text-slate-200">{topThree[1].totalScore || 0}</span>
                <span className="text-xs text-slate-400 font-bold">pts</span>
              </div>
              <div className="mt-2 text-xs flex items-center space-x-2 font-mono opacity-80" style={{ color: 'var(--text-muted)' }}>
                <span>{topThree[1].accuracy || 0}% Acc</span>
                <span>•</span>
                <span>{(((topThree[1].cumulativeResponseTimeMs || 0) / 1000)).toFixed(1)}s</span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold Pedestal) */}
          {topThree[0] && (
            <div
              className="order-1 md:order-2 relative rounded-3xl p-6 border-2 shadow-2xl flex flex-col items-center text-center md:-translate-y-3 transition-transform hover:-translate-y-4 glow-theme"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: '#f59e0b',
              }}
            >
              <div className="absolute -top-3.5 px-3.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest flex items-center space-x-1 shadow-md animate-bounce-subtle">
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>Leader</span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-400 flex items-center justify-center mb-2 shadow-inner">
                <Trophy className="w-8 h-8 text-amber-400 fill-current" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Champion • Gold</span>
              <h4 className="font-black text-lg truncate max-w-[210px] mt-1" style={{ color: 'var(--text-main)' }}>
                {topThree[0].name || 'Candidate'}
              </h4>
              <div className="mt-3 flex items-baseline space-x-1">
                <span className="text-4xl font-black text-amber-400">{topThree[0].totalScore || 0}</span>
                <span className="text-xs text-amber-300 font-bold">pts</span>
              </div>
              <div className="mt-2 text-xs flex items-center space-x-2 font-mono text-amber-200/90">
                <span className="flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>{topThree[0].accuracy || 0}% Acc</span>
                </span>
                <span>•</span>
                <span>{(((topThree[0].cumulativeResponseTimeMs || 0) / 1000)).toFixed(1)}s speed</span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {topThree[2] && (
            <div
              className="order-3 relative rounded-3xl p-5 border shadow-xl flex flex-col items-center text-center transition-transform hover:-translate-y-1"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-900/20 border-2 border-amber-700/60 flex items-center justify-center mb-2 shadow-inner">
                <Medal className="w-7 h-7 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">3rd Place • Bronze</span>
              <h4 className="font-extrabold text-base truncate max-w-[190px] mt-1" style={{ color: 'var(--text-main)' }}>
                {topThree[2].name || 'Candidate'}
              </h4>
              <div className="mt-3 flex items-baseline space-x-1">
                <span className="text-3xl font-black text-amber-200">{topThree[2].totalScore || 0}</span>
                <span className="text-xs text-slate-400 font-bold">pts</span>
              </div>
              <div className="mt-2 text-xs flex items-center space-x-2 font-mono opacity-80" style={{ color: 'var(--text-muted)' }}>
                <span>{topThree[2].accuracy || 0}% Acc</span>
                <span>•</span>
                <span>{(((topThree[2].cumulativeResponseTimeMs || 0) / 1000)).toFixed(1)}s</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div
        className="rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Table Filter Header */}
        <div
          className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-main)' }}>
              Live Standings ({entries.length} Participants)
            </span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-50" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by candidate name..."
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
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4 text-center">Accuracy</th>
                <th className="py-3 px-4 text-center">Correct</th>
                <th className="py-3 px-4 text-right">Speed</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center opacity-60" style={{ color: 'var(--text-muted)' }}>
                    <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No participants match your filter.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isCurrent = highlightParticipantId && entry.id === highlightParticipantId;
                  const initials = (entry.name || 'Candidate')
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'QA';

                  return (
                    <tr
                      key={entry.id}
                      className={`transition-all duration-150 ${
                        isCurrent
                          ? 'font-bold ring-1 ring-inset'
                          : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: isCurrent ? 'var(--bg-surface)' : 'transparent',
                        borderLeft: isCurrent ? '4px solid var(--accent-color)' : 'none',
                        boxShadow: isCurrent ? 'inset 0 0 0 1px var(--border-accent)' : 'none',
                      }}
                    >
                      {/* Rank & Movement Indicator */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                              entry.rank === 1
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                                : entry.rank === 2
                                ? 'bg-slate-300 text-slate-950'
                                : entry.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'opacity-80'
                            }`}
                            style={{
                              backgroundColor: entry.rank > 3 ? 'var(--bg-surface)' : undefined,
                              color: entry.rank > 3 ? 'var(--text-main)' : undefined,
                            }}
                          >
                            {entry.rank}
                          </span>
                          <span title={`Movement: ${entry.movement}`}>
                            {entry.movement === 'up' && (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                            )}
                            {entry.movement === 'down' && (
                              <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            {entry.movement === 'same' && (
                              <Minus className="w-3 h-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                            )}
                            {entry.movement === 'new' && (
                              <span className="text-[9px] font-black uppercase text-sky-400">NEW</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Candidate Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border flex-shrink-0"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--accent-color)',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-main)' }}>
                                {entry.name}
                              </span>
                              {isCurrent && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                                  style={{
                                    backgroundColor: 'var(--bg-card)',
                                    borderColor: 'var(--border-accent)',
                                    color: 'var(--accent-color)',
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Score */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-base text-emerald-400 font-mono">
                          {entry.totalScore}
                        </span>
                        <span className="text-xs opacity-60 ml-1">pts</span>
                        {entry.bonusScore > 0 && (
                          <div className="text-[10px] text-amber-400 font-mono font-bold">
                            +{entry.bonusScore} bonus
                          </div>
                        )}
                      </td>

                      {/* Accuracy */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className="font-mono text-xs px-2.5 py-0.5 rounded-lg border font-bold"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-main)',
                          }}
                        >
                          {entry.accuracy}%
                        </span>
                      </td>

                      {/* Correct Answers */}
                      <td className="py-3 px-4 text-center font-mono text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                        {entry.correctCount}
                      </td>

                      {/* Response Time */}
                      <td className="py-3 px-4 text-right font-mono text-xs opacity-80" style={{ color: 'var(--text-muted)' }}>
                        <div className="flex items-center justify-end space-x-1">
                          <Clock className="w-3 h-3 opacity-60" />
                          <span>{(((entry.cumulativeResponseTimeMs || 0) / 1000)).toFixed(1)}s</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {entry.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
