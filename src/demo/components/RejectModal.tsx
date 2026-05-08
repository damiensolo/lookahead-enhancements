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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Reject task</div>
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
          <label className="text-xs text-gray-600">
            Reason (required)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              placeholder="Why can't you commit to this task as planned?"
            />
          </label>
          <label className="text-xs text-gray-600">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full min-h-[90px] rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
              placeholder="Add any additional context..."
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

