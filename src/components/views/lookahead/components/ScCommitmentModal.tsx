import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LookaheadTask, CrewMember, TaskAdjustmentProposal, CommitmentState } from '../types';
import { SC_REJECTION_REASONS, SC_REJECTION_REASON_OTHER } from '../constants';
import { XIcon, HardHatIcon, CheckIcon } from '../../../common/Icons';
import { AddCrewModal } from './AddCrewModal';

type Tab = 'commit' | 'propose' | 'reject';

interface ScCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: LookaheadTask | null;
  commitment?: CommitmentState | null;
  onCommit: (payload: { plannedQty: number; equipMaterialVerified: boolean; notes?: string }) => void;
  onReject: (payload: { rejectionReason: string; subNotes?: string }) => void;
  onPropose: (payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>) => void;
  projectCrew?: CrewMember[];
  onAssignCrew?: (taskId: string | number, dateString: string, crewIds: string[]) => void;
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'commit', label: 'Commit' },
  { id: 'propose', label: 'Propose New Date' },
  { id: 'reject', label: 'Reject' },
];

export const ScCommitmentModal: React.FC<ScCommitmentModalProps> = ({
  isOpen,
  onClose,
  task,
  commitment,
  onCommit,
  onReject,
  onPropose,
  projectCrew = [],
  onAssignCrew,
}) => {
  const [tab, setTab] = useState<Tab>('commit');
  const [showSummary, setShowSummary] = useState(false);

  // Commit tab state
  const [plannedQty, setPlannedQty] = useState(0);
  const [equipVerified, setEquipVerified] = useState(false);
  const [commitNotes, setCommitNotes] = useState('');
  const [crewModalOpen, setCrewModalOpen] = useState(false);

  // Propose tab state
  const [proposeStart, setProposeStart] = useState('');
  const [proposeEnd, setProposeEnd] = useState('');
  const [proposeReason, setProposeReason] = useState('');
  const [proposeComment, setProposeComment] = useState('');

  // Reject tab state
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComment, setRejectComment] = useState('');

  // Only reset form when modal transitions from closed → open, not on every task prop update.
  // This prevents crew assignment (which updates task in the parent) from wiping in-progress form state.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && task) {
      setTab('commit');
      setPlannedQty(task.productionQuantity?.planned ?? 0);
      setEquipVerified(false);
      setCommitNotes('');
      setProposeStart(task.startDate ?? '');
      setProposeEnd(task.finishDate ?? '');
      setProposeReason('');
      setProposeComment('');
      setRejectReason('');
      setRejectComment('');
      setShowSummary(!!commitment && commitment.status !== 'pending');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, task, commitment]);

  const assignedCrewIds = useMemo(() => {
    if (!task?.assignedCrewByDate) return [];
    return Array.from(new Set(Object.values(task.assignedCrewByDate as Record<string, string[]>).flat()));
  }, [task?.assignedCrewByDate]);

  const assignedCrewNames = useMemo(() => {
    if (assignedCrewIds.length === 0) return [];
    return assignedCrewIds.map(id => projectCrew.find(c => c.id === id)).filter(Boolean) as CrewMember[];
  }, [assignedCrewIds, projectCrew]);

  if (!isOpen || !task) return null;

  const proposeCommentRequired = proposeReason === SC_REJECTION_REASON_OTHER;
  const rejectCommentRequired = rejectReason === SC_REJECTION_REASON_OTHER;

  const hasProductionQty = !!task.productionQuantity;
  const canCommit = (!hasProductionQty || plannedQty > 0) && equipVerified;
  const canPropose = !!proposeStart && !!proposeEnd && !!proposeReason && (!proposeCommentRequired || proposeComment.trim().length > 0);
  const canReject = !!rejectReason && (!rejectCommentRequired || rejectComment.trim().length > 0);

  const handleCommit = () => {
    onCommit({ plannedQty, equipMaterialVerified: equipVerified, notes: commitNotes || undefined });
    onClose();
  };

  const handlePropose = () => {
    onPropose({
      proposedStartDate: proposeStart,
      proposedEndDate: proposeEnd,
      rejectionReason: SC_REJECTION_REASONS.find(r => r.code === proposeReason)?.label ?? proposeReason,
      subNotes: proposeComment || undefined,
    });
    onClose();
  };

  const handleReject = () => {
    onReject({
      rejectionReason: SC_REJECTION_REASONS.find(r => r.code === rejectReason)?.label ?? rejectReason,
      subNotes: rejectComment || undefined,
    });
    onClose();
  };

  // ── SUMMARY VIEW ─────────────────────────────────────────────────────────
  if (showSummary && commitment && commitment.status !== 'pending') {
    const statusMeta = {
      committed: { label: 'Committed', badge: 'bg-green-100 text-green-800 border-green-200' },
      proposed:  { label: 'Proposal Submitted', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
      rejected:  { label: 'Rejected', badge: 'bg-red-100 text-red-800 border-red-200' },
    }[commitment.status] ?? { label: commitment.status, badge: 'bg-gray-100 text-gray-700 border-gray-200' };

    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

            {/* Summary header */}
            <div className="flex items-start justify-between px-8 py-6 border-b border-gray-200 bg-gray-50">
              <div className="min-w-0 pr-4">
                <h2 className="text-lg font-bold text-gray-900">Response Summary</h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate" title={task.name}>{task.name}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0" aria-label="Close">
                <XIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Summary body */}
            <div className="px-8 py-6 space-y-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${statusMeta.badge}`}>
                {statusMeta.label}
              </span>

              {commitment.status === 'committed' && (
                <dl className="space-y-2 text-sm">
                  {commitment.committedAt && (
                    <div>
                      <dt className="text-gray-500">Submitted</dt>
                      <dd className="font-medium text-gray-900">{new Date(commitment.committedAt).toLocaleString()}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-500">Equipment &amp; materials verified</dt>
                    <dd className="font-medium text-gray-900">{commitment.equipmentMaterialVerified ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              )}

              {commitment.status === 'proposed' && (
                <dl className="space-y-2 text-sm">
                  {(commitment.proposedStartDate || commitment.proposedFinishDate) && (
                    <div>
                      <dt className="text-gray-500">Proposed dates</dt>
                      <dd className="font-medium text-gray-900">{commitment.proposedStartDate ?? '—'} – {commitment.proposedFinishDate ?? '—'}</dd>
                    </div>
                  )}
                  {commitment.rejectionReason && (
                    <div>
                      <dt className="text-gray-500">Reason</dt>
                      <dd className="font-medium text-gray-900">{commitment.rejectionReason}</dd>
                    </div>
                  )}
                  {commitment.rejectionComment && (
                    <div>
                      <dt className="text-gray-500">Notes</dt>
                      <dd className="text-gray-700">{commitment.rejectionComment}</dd>
                    </div>
                  )}
                </dl>
              )}

              {commitment.status === 'rejected' && (
                <dl className="space-y-2 text-sm">
                  {commitment.rejectionReason && (
                    <div>
                      <dt className="text-gray-500">Reason</dt>
                      <dd className="font-medium text-gray-900">{commitment.rejectionReason}</dd>
                    </div>
                  )}
                  {commitment.rejectionComment && (
                    <div>
                      <dt className="text-gray-500">Notes</dt>
                      <dd className="text-gray-700">{commitment.rejectionComment}</dd>
                    </div>
                  )}
                  {commitment.rejectedAt && (
                    <div>
                      <dt className="text-gray-500">Submitted</dt>
                      <dd className="font-medium text-gray-900">{new Date(commitment.rejectedAt).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>

            {/* Summary footer */}
            <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                Close
              </button>
              <button type="button" onClick={() => setShowSummary(false)} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Edit Response
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── FORM VIEW ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">

          {/* Header */}
          <div className="flex items-start justify-between px-8 py-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="min-w-0 pr-4">
              <h2 className="text-lg font-bold text-gray-900">Review Task</h2>
              <p className="text-sm text-gray-600 mt-0.5 truncate" title={task.name}>{task.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 flex-shrink-0 bg-white">
            {TAB_LABELS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  tab === id
                    ? id === 'commit'
                      ? 'border-green-600 text-green-700'
                      : id === 'propose'
                      ? 'border-amber-500 text-amber-700'
                      : 'border-red-500 text-red-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

            {/* --- COMMIT TAB --- */}
            {tab === 'commit' && (
              <>
                <p className="text-sm text-gray-600">
                  Confirm you can deliver this task as planned. All fields below are required to commit.
                </p>

                {/* Planned Quantity — only shown when task tracks production quantity */}
                {hasProductionQty && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Quantity{task.productionQuantity?.unit ? ` (${task.productionQuantity.unit})` : ''}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={plannedQty}
                      onChange={(e) => setPlannedQty(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Crew Assignment */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Crew Assignment</label>
                    {onAssignCrew && projectCrew.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCrewModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-transparent border border-transparent rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        <HardHatIcon className="w-4 h-4" />
                        {assignedCrewIds.length > 0 ? 'Edit Crew' : 'Add Crew'}
                      </button>
                    )}
                  </div>
                  {assignedCrewNames.length > 0 ? (
                    <ul className="space-y-1">
                      {assignedCrewNames.map(c => (
                        <li key={c.id} className="flex items-center gap-2 text-sm py-1 px-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <CheckIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span className="font-medium text-gray-800">{c.name}</span>
                          {c.title && <span className="text-gray-500">({c.title})</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 py-1">No crew assigned yet.</p>
                  )}
                </div>

                {/* Equipment & Material */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={equipVerified}
                    onChange={(e) => setEquipVerified(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">
                    Equipment &amp; material availability verified
                  </span>
                </label>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea
                    rows={3}
                    value={commitNotes}
                    onChange={(e) => setCommitNotes(e.target.value)}
                    placeholder="Add any notes for the GC…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </>
            )}

            {/* --- PROPOSE TAB --- */}
            {tab === 'propose' && (
              <>
                <p className="text-sm text-gray-600">
                  Propose revised dates and provide a reason. The GC will review your submission.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Start Date</label>
                    <input
                      type="date"
                      value={proposeStart}
                      onChange={(e) => setProposeStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New End Date</label>
                    <input
                      type="date"
                      value={proposeEnd}
                      onChange={(e) => setProposeEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <select
                    value={proposeReason}
                    onChange={(e) => setProposeReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select a reason…</option>
                    {SC_REJECTION_REASONS.map(r => (
                      <option key={r.code} value={r.code}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment {proposeCommentRequired ? <span className="text-red-500">(required)</span> : <span className="font-normal text-gray-400">(optional)</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={proposeComment}
                    onChange={(e) => setProposeComment(e.target.value)}
                    placeholder={proposeCommentRequired ? 'Please describe the reason…' : 'Additional context…'}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${proposeCommentRequired && proposeComment.trim().length === 0 ? 'border-red-300 focus:ring-red-400 focus:border-red-400' : 'border-gray-300 focus:ring-amber-500 focus:border-amber-500'}`}
                  />
                </div>
              </>
            )}

            {/* --- REJECT TAB --- */}
            {tab === 'reject' && (
              <>
                <p className="text-sm text-gray-600">
                  Select a reason for rejecting this task. The GC will be notified immediately.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select a reason…</option>
                    {SC_REJECTION_REASONS.map(r => (
                      <option key={r.code} value={r.code}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment {rejectCommentRequired ? <span className="text-red-500">(required)</span> : <span className="font-normal text-gray-400">(optional)</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder={rejectCommentRequired ? 'Please describe the reason…' : 'Additional context…'}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${rejectCommentRequired && rejectComment.trim().length === 0 ? 'border-red-300 focus:ring-red-400 focus:border-red-400' : 'border-gray-300 focus:ring-red-500 focus:border-red-500'}`}
                  />
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {tab === 'commit' && (
              <button
                type="button"
                disabled={!canCommit}
                onClick={handleCommit}
                className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Commit to Task
              </button>
            )}
            {tab === 'propose' && (
              <button
                type="button"
                disabled={!canPropose}
                onClick={handlePropose}
                className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Proposal
              </button>
            )}
            {tab === 'reject' && (
              <button
                type="button"
                disabled={!canReject}
                onClick={handleReject}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Rejection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested Add Crew Modal */}
      {crewModalOpen && onAssignCrew && (
        <AddCrewModal
          isOpen={crewModalOpen}
          onClose={() => setCrewModalOpen(false)}
          onConfirm={(crewIds) => {
            onAssignCrew(task.id, task.startDate, crewIds);
            setCrewModalOpen(false);
          }}
          availableCrew={projectCrew}
          alreadyAssigned={assignedCrewIds}
        />
      )}
    </>
  );
};
