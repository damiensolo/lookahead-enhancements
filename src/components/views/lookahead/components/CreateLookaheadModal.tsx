import React, { useState } from 'react';
import { XIcon, CalendarIcon, ListTreeIcon, HistoryIcon } from '../../../common/Icons';
import { formatDisplayDate } from '../../../../lib/dateUtils';

interface CreateLookaheadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (strategy: 'previous' | 'master', config?: { startDate: string; durationDays: number }) => void;
  previousStartDate?: string;
  previousDurationDays?: number;
}

export const CreateLookaheadModal: React.FC<CreateLookaheadModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  previousStartDate = '2024-11-17',
  previousDurationDays = 14,
}) => {
  const [strategy, setStrategy] = useState<'previous' | 'master'>('previous');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationWeeks, setDurationWeeks] = useState(2);

  if (!isOpen) return null;

  const durationDays = durationWeeks * 7;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5 bg-zinc-50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Create New Lookahead</h2>
            <p className="text-sm text-zinc-500 mt-1">Select a strategy to initialize your lookahead schedule.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <XIcon className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Option 1: Previous Lookahead */}
            <button
              onClick={() => setStrategy('previous')}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                strategy === 'previous'
                  ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10'
                  : 'border-black/5 hover:border-black/10 bg-white'
              }`}
            >
              <div className={`p-2 rounded-lg ${strategy === 'previous' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                <HistoryIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-zinc-900">Create from Previous Lookahead</div>
                <p className="text-sm text-zinc-500 mt-1">
                  Persists changes from the last published lookahead and pulls in new tasks from the latest master schedule.
                </p>
              </div>
            </button>

            {/* Option 2: Master Schedule */}
            <button
              onClick={() => setStrategy('master')}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                strategy === 'master'
                  ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10'
                  : 'border-black/5 hover:border-black/10 bg-white'
              }`}
            >
              <div className={`p-2 rounded-lg ${strategy === 'master' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                <ListTreeIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-zinc-900">Create from Master Schedule</div>
                <p className="text-sm text-zinc-500 mt-1">
                  Initializes a clean lookahead using only tasks from the master schedule within a specific date range.
                </p>
              </div>
            </button>
          </div>

          {/* Config Panel */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-black/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {strategy === 'previous' && (
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-black/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prev. Start Date</label>
                  <div className="text-sm font-medium text-zinc-600">{formatDisplayDate(previousStartDate)}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prev. Duration</label>
                  <div className="text-sm font-medium text-zinc-600">{Math.round(previousDurationDays / 7)} Weeks ({previousDurationDays} Days)</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {strategy === 'previous' ? 'New Start Date' : 'Start Date'}
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-black/10 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duration (Weeks)</label>
                <select
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-black/10 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 12].map(w => (
                    <option key={w} value={w}>{w} Weeks ({w * 7} Days)</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-black/5 bg-zinc-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(strategy, { startDate, durationDays })}
            className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
          >
            Create Lookahead
          </button>
        </div>
      </div>
    </div>
  );
};
