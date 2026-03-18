import React, { useState } from 'react';
import { DemoTask } from '../data/lookahead-demo-data';

export const RejectModal: React.FC<{
  isOpen: boolean;
  task: DemoTask;
  onClose: () => void;
  onSubmit: (reason: string, notes?: string) => void;
}> = ({ isOpen, task, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 text-slate-50 shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Reject task</div>
            <div className="text-xs text-slate-400 mt-0.5">{task.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <label className="text-xs text-slate-300">
            Reason (required)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              placeholder="Why can't you commit to this task as planned?"
            />
          </label>
          <label className="text-xs text-slate-300">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full min-h-[90px] rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
              placeholder="Add any additional context..."
            />
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-md text-xs font-bold border border-slate-700 bg-transparent hover:bg-slate-900 text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onSubmit(reason.trim(), notes.trim() ? notes.trim() : undefined)}
            className="px-4 py-2 rounded-md text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            Submit rejection
          </button>
        </div>
      </div>
    </div>
  );
};

