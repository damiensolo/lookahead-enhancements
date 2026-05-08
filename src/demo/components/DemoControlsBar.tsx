import React, { useMemo, useRef, useState } from 'react';
import { useDemoStore } from '../store/demo-store';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const DemoControlsBar: React.FC<{
  layoutMode: 'single' | 'split';
  onToggleLayout: () => void;
  isTourActive: boolean;
  onToggleTour: () => void;
}> = ({ layoutMode, onToggleLayout, isTourActive, onToggleTour }) => {
  const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
  const tasks = useDemoStore((s) => s.tasks);
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      pending: 0,
      committed: 0,
      rejected: 0,
      adjustment_proposed: 0,
      gc_accepted: 0,
      gc_revised: 0,
      disputed: 0,
    };
    tasks.forEach((t) => {
      c[t.commitmentStatus] = (c[t.commitmentStatus] ?? 0) + 1;
    });
    return c;
  }, [tasks]);
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const submitForReview = useDemoStore((s) => s.submitForReview);
  const setActiveRole = useDemoStore((s) => s.setActiveRole);
  const commitTask = useDemoStore((s) => s.commitTask);
  const proposeAdjustment = useDemoStore((s) => s.proposeAdjustment);
  const rejectTask = useDemoStore((s) => s.rejectTask);
  const gcAcceptAdjustment = useDemoStore((s) => s.gcAcceptAdjustment);
  const gcCounterPropose = useDemoStore((s) => s.gcCounterPropose);
  const publishLookahead = useDemoStore((s) => s.publishLookahead);

  const summary = useMemo(() => {
    const parts: string[] = [];
    const ordered: [string, string][] = [
      ['committed', 'committed'],
      ['gc_accepted', 'gc accepted'],
      ['adjustment_proposed', 'adjustment'],
      ['rejected', 'rejected'],
      ['pending', 'pending'],
      ['disputed', 'disputed'],
    ];
    ordered.forEach(([k, label]) => {
      const v = (counts as any)[k] ?? 0;
      if (v > 0) parts.push(`${v} ${label}`);
    });
    return parts.join(' · ');
  }, [counts]);

  const [confirmReset, setConfirmReset] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoRunStep, setAutoRunStep] = useState('');
  const abortRef = useRef(false);

  const runAuto = async () => {
    setIsAutoRunning(true);
    abortRef.current = false;
    try {
      setAutoRunStep('Resetting demo…');
      resetDemo();
      await sleep(600);
      if (abortRef.current) return;

      setAutoRunStep('GC reviewing draft…');
      setActiveRole('gc');
      await sleep(800);
      if (abortRef.current) return;

      setAutoRunStep('GC submitting for review…');
      submitForReview();
      await sleep(1200);
      if (abortRef.current) return;

      setAutoRunStep('Apex Electrical responding…');
      setActiveRole('apex-electrical');
      await sleep(900);
      if (abortRef.current) return;
      commitTask('task-1', 'apex-electrical');
      await sleep(700);
      commitTask('task-2', 'apex-electrical');
      await sleep(700);
      commitTask('task-7', 'apex-electrical');
      await sleep(700);
      setAutoRunStep('Apex proposing adjustment on task 3…');
      proposeAdjustment('task-3', 'apex-electrical', {
        proposedStartDate: 'Apr 15',
        proposedEndDate: 'Apr 17',
        proposedCrewSize: 3,
        subNotes: 'Need one additional day; painting completes Apr 14.',
      });
      await sleep(1200);
      if (abortRef.current) return;

      setAutoRunStep('BlueLine Mechanical responding…');
      setActiveRole('blueline-mechanical');
      await sleep(900);
      if (abortRef.current) return;
      commitTask('task-4', 'blueline-mechanical');
      await sleep(700);
      commitTask('task-5', 'blueline-mechanical');
      await sleep(700);
      commitTask('task-8', 'blueline-mechanical');
      await sleep(700);
      setAutoRunStep('BlueLine rejecting task 6…');
      rejectTask('task-6', 'blueline-mechanical', 'Commissioning tech unavailable Apr 15–17', 'Request reschedule to following week.');
      await sleep(1200);
      if (abortRef.current) return;

      setAutoRunStep('GC accepting adjustment, counter-proposing…');
      setActiveRole('gc');
      await sleep(900);
      gcAcceptAdjustment('task-3');
      await sleep(900);
      gcCounterPropose('task-6', {
        proposedStartDate: 'Apr 17',
        proposedEndDate: 'Apr 18',
        proposedCrewSize: 3,
        gcResponseNotes: 'Can you work Apr 17–18? We will arrange a second crane window.',
      });
      await sleep(1200);
      if (abortRef.current) return;

      setAutoRunStep('BlueLine committing to revised task 6…');
      setActiveRole('blueline-mechanical');
      await sleep(900);
      commitTask('task-6', 'blueline-mechanical');
      await sleep(900);
      if (abortRef.current) return;

      setAutoRunStep('GC publishing lookahead…');
      setActiveRole('gc');
      await sleep(800);
      publishLookahead();
      await sleep(800);
      setAutoRunStep('Done!');
    } finally {
      setIsAutoRunning(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[220] border-t border-gray-200 bg-white">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500">
              State: <span className="text-gray-700 font-semibold">{lookaheadStatus}</span>
              {isAutoRunning && autoRunStep && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {autoRunStep}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 truncate">{summary || `${tasks.length} tasks`}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={onToggleLayout}
              className="px-3 py-2 rounded-md text-xs font-bold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              {layoutMode === 'single' ? 'Split screen' : 'Single view'}
            </button>
            <button
              type="button"
              onClick={onToggleTour}
              className={`px-3 py-2 rounded-md text-xs font-bold border transition-colors ${
                isTourActive ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              Guide Me
            </button>
            <button
              type="button"
              disabled={isAutoRunning}
              onClick={runAuto}
              className="px-3 py-2 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Auto-Run Demo
            </button>
            <button
              type="button"
              disabled={isAutoRunning}
              onClick={() => setConfirmReset(true)}
              className="px-3 py-2 rounded-md text-xs font-bold border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 transition-colors"
            >
              Reset Demo
            </button>
            {isAutoRunning && (
              <button
                type="button"
                onClick={() => {
                  abortRef.current = true;
                  setIsAutoRunning(false);
                }}
                className="px-3 py-2 rounded-md text-xs font-bold border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Reset demo?</div>
                <div className="text-xs text-gray-500 mt-0.5">Reset everything to the beginning?</div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-gray-400 hover:text-gray-700 text-sm px-2 py-1 rounded"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 text-xs text-gray-600">
              This will restore the lookahead to <span className="font-semibold">draft</span> and set all tasks back to <span className="font-semibold">pending</span>.
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-md text-xs font-bold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDemo();
                  setConfirmReset(false);
                }}
                className="px-4 py-2 rounded-md text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

