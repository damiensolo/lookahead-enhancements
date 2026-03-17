
import React, { useState, useEffect } from 'react';
import { XIcon, CalendarIcon, ListTreeIcon, HistoryIcon, CheckIcon } from '../../../common/Icons';
import { formatDisplayDate } from '../../../../lib/dateUtils';

interface CreateLookaheadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (strategy: 'previous' | 'master', config?: { startDate: string; durationDays: number }) => void;
  previousStartDate?: string;
  previousDurationDays?: number;
}

const STEPS_PREVIOUS = [
  'Reading previous lookahead…',
  'Pulling new tasks from master schedule…',
  'Applying field date overrides…',
  'Calculating buffer days…',
  'Generating draft…',
];

const STEPS_MASTER = [
  'Scanning master schedule…',
  'Filtering tasks to date window…',
  'Mapping baseline dates…',
  'Calculating buffer days…',
  'Generating draft…',
];

export const CreateLookaheadModal: React.FC<CreateLookaheadModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  previousStartDate = '2024-11-17',
  previousDurationDays = 14,
}) => {
  const [strategy, setStrategy] = useState<'previous' | 'master'>('previous');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationWeeks, setDurationWeeks] = useState(3);

  // Demo progress state
  const [isCreating, setIsCreating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsCreating(false);
      setCompletedSteps([]);
      setDone(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const durationDays = durationWeeks * 7;
  const steps = strategy === 'previous' ? STEPS_PREVIOUS : STEPS_MASTER;

  const handleCreate = () => {
    setIsCreating(true);
    setCompletedSteps([]);
    setDone(false);

    // Stagger each step completing
    steps.forEach((_, i) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, i]);
        if (i === steps.length - 1) {
          // Last step: brief pause then trigger real create + close
          setTimeout(() => {
            setDone(true);
            setTimeout(() => {
              onCreate(strategy, { startDate, durationDays });
              onClose();
            }, 600);
          }, 300);
        }
      }, 400 + i * 500);
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/5 bg-zinc-50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Create New Lookahead</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {isCreating ? 'Building your draft…' : 'Select a strategy to initialize your lookahead schedule.'}
            </p>
          </div>
          {!isCreating && (
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <XIcon className="w-5 h-5 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Body */}
        {!isCreating ? (
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
            <div className="p-4 bg-zinc-50 rounded-xl border border-black/5 space-y-4">
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
        ) : (
          /* Progress screen */
          <div className="p-8 space-y-4">
            {steps.map((label, i) => {
              const isComplete = completedSteps.includes(i);
              const isActive = completedSteps.length === i;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 transition-all duration-300 ${
                    isComplete ? 'opacity-100' : isActive ? 'opacity-80' : 'opacity-30'
                  }`}
                >
                  {/* Step indicator */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isComplete
                      ? done && i === steps.length - 1
                        ? 'bg-emerald-500 scale-110'
                        : 'bg-emerald-500'
                      : isActive
                      ? 'border-2 border-emerald-400 bg-transparent'
                      : 'border-2 border-zinc-200 bg-transparent'
                  }`}>
                    {isComplete ? (
                      <CheckIcon className="w-3 h-3 text-white" />
                    ) : isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ) : null}
                  </div>

                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    isComplete ? 'text-zinc-700' : isActive ? 'text-zinc-600' : 'text-zinc-300'
                  }`}>
                    {label}
                  </span>

                  {/* Spinner for the active step */}
                  {isActive && !isComplete && (
                    <svg className="ml-auto w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                </div>
              );
            })}

            {done && (
              <div className="pt-4 flex items-center gap-2 text-emerald-600 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CheckIcon className="w-4 h-4" />
                <span className="text-sm font-semibold">Draft created — opening now…</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isCreating && (
          <div className="p-6 border-t border-black/5 bg-zinc-50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-md hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
            >
              Create Lookahead
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
