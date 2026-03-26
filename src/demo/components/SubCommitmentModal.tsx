import React, { useState, useEffect } from 'react';
import { parse, format } from 'date-fns';
import { AdjustmentProposal, DemoTask } from '../data/lookahead-demo-data';
import { SC_REJECTION_REASONS, SC_REJECTION_REASON_OTHER } from '../../components/views/lookahead/constants';

// "Apr 7" → "2025-04-07" for <input type="date">
const shortDateToISO = (s: string): string => {
    if (!s) return '';
    try { return format(parse(s, 'MMM d', new Date(2025, 0, 1)), 'yyyy-MM-dd'); } catch { return ''; }
};

// "2025-04-07" → "Apr 7" for display
const isoToShortDate = (s: string): string => {
    if (!s) return '';
    try { return format(parse(s, 'yyyy-MM-dd', new Date()), 'MMM d'); } catch { return s; }
};

type Tab = 'commit' | 'propose' | 'reject';

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: 'commit', label: 'Commit' },
  { id: 'propose', label: 'Propose New Date' },
  { id: 'reject', label: 'Reject' },
];

interface SubCommitmentModalProps {
  isOpen: boolean;
  task: DemoTask;
  onClose: () => void;
  onCommit: () => void;
  onPropose: (proposal: AdjustmentProposal) => void;
  onReject: (reason: string, notes?: string) => void;
}

export const SubCommitmentModal: React.FC<SubCommitmentModalProps> = ({
  isOpen,
  task,
  onClose,
  onCommit,
  onPropose,
  onReject,
}) => {
  const [tab, setTab] = useState<Tab>('commit');

  // Commit tab
  const [equipVerified, setEquipVerified] = useState(false);
  const [commitNotes, setCommitNotes] = useState('');

  // Propose tab
  const [proposeStart, setProposeStart] = useState('');
  const [proposeEnd, setProposeEnd] = useState('');
  const [proposeCrew, setProposeCrew] = useState(0);
  const [proposeReason, setProposeReason] = useState('');
  const [proposeComment, setProposeComment] = useState('');

  // Reject tab
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTab('commit');
      setEquipVerified(false);
      setCommitNotes('');
      setProposeStart(shortDateToISO(task.proposedStart) ?? '');
      setProposeEnd(shortDateToISO(task.proposedEnd) ?? '');
      setProposeCrew(task.crewSize ?? 0);
      setProposeReason('');
      setProposeComment('');
      setRejectReason('');
      setRejectComment('');
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const proposeCommentRequired = proposeReason === SC_REJECTION_REASON_OTHER;
  const rejectCommentRequired = rejectReason === SC_REJECTION_REASON_OTHER;

  const canPropose =
    !!proposeStart &&
    !!proposeEnd &&
    !!proposeReason &&
    (!proposeCommentRequired || proposeComment.trim().length > 0);

  const canReject =
    !!rejectReason && (!rejectCommentRequired || rejectComment.trim().length > 0);

  const handleCommit = () => {
    onCommit();
    onClose();
  };

  const handlePropose = () => {
    onPropose({
      proposedStartDate: isoToShortDate(proposeStart) || undefined,
      proposedEndDate: isoToShortDate(proposeEnd) || undefined,
      proposedCrewSize: proposeCrew || undefined,
      subNotes:
        proposeComment ||
        (SC_REJECTION_REASONS.find((r) => r.code === proposeReason)?.label ?? proposeReason),
    });
    onClose();
  };

  const handleReject = () => {
    const label = SC_REJECTION_REASONS.find((r) => r.code === rejectReason)?.label ?? rejectReason;
    onReject(label, rejectComment || undefined);
    onClose();
  };

  const inputCls =
    'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 resize-none placeholder:text-slate-500';
  const selectCls = `${inputCls} bg-slate-900 cursor-pointer`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 text-slate-50 shadow-2xl flex flex-col max-h-[calc(100vh-3rem)]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-50">Review Task</div>
            <div className="text-xs text-slate-400 mt-0.5 truncate" title={task.name}>{task.name}</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                {task.proposedStart} – {task.proposedEnd}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                {task.location}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded flex-shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          {TAB_CONFIG.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                tab === id
                  ? id === 'commit'
                    ? 'border-emerald-500 text-emerald-300'
                    : id === 'propose'
                    ? 'border-amber-500 text-amber-300'
                    : 'border-rose-500 text-rose-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* GC notes — always visible */}
          {task.gcNotes && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">GC Notes</div>
              <div className="mt-1 text-xs text-slate-200">{task.gcNotes}</div>
            </div>
          )}

          {/* ── COMMIT TAB ── */}
          {tab === 'commit' && (
            <>
              <p className="text-xs text-slate-400">
                Confirm you can deliver this task as scheduled. Equipment &amp; material availability must be verified before committing.
              </p>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Task Details</div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                  <div><span className="text-slate-500">Crew size</span><div className="font-semibold text-slate-200 mt-0.5">{task.crewSize}</div></div>
                  <div><span className="text-slate-500">Location</span><div className="font-semibold text-slate-200 mt-0.5">{task.location}</div></div>
                </div>
                <div className="text-xs mt-1">
                  <span className="text-slate-500">Materials</span>
                  <div className="text-slate-300 mt-0.5">{task.materials}</div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={equipVerified}
                  onChange={(e) => setEquipVerified(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/40 flex-shrink-0 cursor-pointer"
                />
                <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">
                  Equipment &amp; material availability verified
                </span>
              </label>

              <div>
                <label className="text-xs text-slate-400">
                  Notes <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={commitNotes}
                  onChange={(e) => setCommitNotes(e.target.value)}
                  placeholder="Add any notes for the GC…"
                  className={`mt-1 ${inputCls} focus:ring-emerald-500/40`}
                />
              </div>
            </>
          )}

          {/* ── PROPOSE TAB ── */}
          {tab === 'propose' && (
            <>
              <p className="text-xs text-slate-400">
                Propose revised dates. The GC will review and respond to your submission.
              </p>

              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-400">Original schedule</div>
                <div className="text-xs text-slate-200 mt-0.5">
                  {task.proposedStart} – {task.proposedEnd} · crew {task.crewSize}
                </div>
              </div>

              <style>{`
                .demo-date-input::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.6); cursor: pointer; }
              `}</style>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">New start</label>
                  <input
                    type="date"
                    value={proposeStart}
                    onChange={(e) => setProposeStart(e.target.value)}
                    className={`demo-date-input mt-1 ${inputCls} focus:ring-amber-500/40`}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">New end</label>
                  <input
                    type="date"
                    value={proposeEnd}
                    onChange={(e) => setProposeEnd(e.target.value)}
                    className={`demo-date-input mt-1 ${inputCls} focus:ring-amber-500/40`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Adjusted crew size</label>
                <input
                  type="number"
                  value={proposeCrew}
                  min={0}
                  onChange={(e) => setProposeCrew(parseInt(e.target.value || '0', 10))}
                  className={`mt-1 ${inputCls} focus:ring-amber-500/40`}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Reason for adjustment</label>
                <select
                  value={proposeReason}
                  onChange={(e) => setProposeReason(e.target.value)}
                  className={`mt-1 ${selectCls} focus:ring-amber-500/40`}
                >
                  <option value="">Select a reason…</option>
                  {SC_REJECTION_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">
                  Comment{' '}
                  {proposeCommentRequired
                    ? <span className="text-rose-400">(required)</span>
                    : <span className="text-slate-600">(optional)</span>}
                </label>
                <textarea
                  rows={3}
                  value={proposeComment}
                  onChange={(e) => setProposeComment(e.target.value)}
                  placeholder={proposeCommentRequired ? 'Please describe the reason…' : 'Additional context…'}
                  className={`mt-1 ${inputCls} focus:ring-amber-500/40`}
                />
              </div>
            </>
          )}

          {/* ── REJECT TAB ── */}
          {tab === 'reject' && (
            <>
              <p className="text-xs text-slate-400">
                Select a rejection reason. The GC will be notified and will need to resolve this task.
              </p>

              <div>
                <label className="text-xs text-slate-400">Rejection reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={`mt-1 ${selectCls} focus:ring-rose-500/40`}
                >
                  <option value="">Select a reason…</option>
                  {SC_REJECTION_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">
                  Comment{' '}
                  {rejectCommentRequired
                    ? <span className="text-rose-400">(required)</span>
                    : <span className="text-slate-600">(optional)</span>}
                </label>
                <textarea
                  rows={3}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder={rejectCommentRequired ? 'Please describe the reason…' : 'Additional context…'}
                  className={`mt-1 ${inputCls} focus:ring-rose-500/40`}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-md text-xs font-bold border border-slate-700 bg-transparent hover:bg-slate-900 text-slate-300 transition-colors"
          >
            Cancel
          </button>

          {tab === 'commit' && (
            <button
              type="button"
              onClick={handleCommit}
              className="px-5 py-2 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Commit to Task
            </button>
          )}
          {tab === 'propose' && (
            <button
              type="button"
              disabled={!canPropose}
              onClick={handlePropose}
              className="px-5 py-2 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Submit Proposal
            </button>
          )}
          {tab === 'reject' && (
            <button
              type="button"
              disabled={!canReject}
              onClick={handleReject}
              className="px-5 py-2 rounded-md text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Submit Rejection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
