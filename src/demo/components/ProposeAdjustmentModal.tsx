import React, { useMemo, useState } from 'react';
import { AdjustmentProposal, DemoTask } from '../data/lookahead-demo-data';

export const ProposeAdjustmentModal: React.FC<{
  isOpen: boolean;
  task: DemoTask;
  onClose: () => void;
  onSubmit: (proposal: AdjustmentProposal) => void;
}> = ({ isOpen, task, onClose, onSubmit }) => {
  const initial = useMemo(() => {
    return {
      proposedStartDate: task.proposedStart,
      proposedEndDate: task.proposedEnd,
      proposedCrewSize: task.crewSize,
      subNotes: '',
    };
  }, [task]);

  const [start, setStart] = useState<string>(initial.proposedStartDate ?? '');
  const [end, setEnd] = useState<string>(initial.proposedEndDate ?? '');
  const [crew, setCrew] = useState<number>(initial.proposedCrewSize ?? 0);
  const [notes, setNotes] = useState<string>(initial.subNotes ?? '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Propose adjustment</div>
            <div className="text-xs text-gray-500 mt-0.5">{task.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-sm px-2 py-1 rounded"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-[11px] font-semibold text-gray-600">Original</div>
            <div className="text-xs text-gray-700 mt-0.5">
              {task.proposedStart} – {task.proposedEnd} · crew {task.crewSize}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">
              New start
              <input
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Apr 7"
              />
            </label>
            <label className="text-xs text-gray-600">
              New end
              <input
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Apr 10"
              />
            </label>
          </div>

          <label className="text-xs text-gray-600">
            Adjusted crew size
            <input
              type="number"
              value={crew}
              onChange={(e) => setCrew(parseInt(e.target.value || '0', 10))}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              min={0}
            />
          </label>

          <label className="text-xs text-gray-600">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full min-h-[90px] rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
              placeholder="Explain the adjustment reason..."
            />
          </label>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-md text-xs font-bold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                proposedStartDate: start || undefined,
                proposedEndDate: end || undefined,
                proposedCrewSize: Number.isFinite(crew) ? crew : undefined,
                subNotes: notes || undefined,
              })
            }
            className="px-4 py-2 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          >
            Submit proposal
          </button>
        </div>
      </div>
    </div>
  );
};

