import React, { useState, useEffect } from 'react';
import { LookaheadTask, CommitmentState, ProjectRisk } from '../types';
import { REJECTION_REASONS, REJECTION_REASON_UNANSWERED_RFI } from '../constants';
import { XIcon, HardHatIcon } from '../../../common/Icons';

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: LookaheadTask | null;
  commitment: CommitmentState | null | undefined;
  onSetCommitment: (state: Partial<CommitmentState>) => void;
  addProjectRisk?: (risk: Omit<ProjectRisk, 'addedAt'>) => void;
  onOpenAddCrew?: (taskId: string | number, dateString: string) => void;
}

export const CommitmentModal: React.FC<CommitmentModalProps> = ({
  isOpen,
  onClose,
  task,
  commitment,
  onSetCommitment,
  addProjectRisk,
  onOpenAddCrew,
}) => {
  const [proposeStart, setProposeStart] = useState('');
  const [proposeEnd, setProposeEnd] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectList, setShowRejectList] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProposeStart('');
      setProposeEnd('');
      setRejectReason('');
      setRejectComment('');
      setShowRejectList(false);
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const crewAdded = !!(task.assignedCrewByDate && Object.values(task.assignedCrewByDate).some(ids => ids.length > 0));
  const canCommit = (commitment?.plannedQtyAccepted ?? false) && crewAdded && (commitment?.equipmentMaterialVerified ?? false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Commit to task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors" aria-label="Close">
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-8 py-7">
          <p className="text-sm font-medium text-gray-800 mb-6">{task.name}</p>
          {(!commitment || commitment.status === 'pending') ? (
            <>
              <p className="text-sm text-gray-600 mb-6">This task was added by GC. Commit to it, propose different dates, or reject with a reason.</p>
              <div className="space-y-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={commitment?.plannedQtyAccepted ?? false}
                    onChange={(e) => onSetCommitment({ plannedQtyAccepted: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Accept planned quantity</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={crewAdded}
                    readOnly
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 opacity-70"
                  />
                  <span>Crew added</span>
                  {crewAdded && (
                    <span className="text-xs font-medium text-green-600 ml-1">— Crew members assigned</span>
                  )}
                  {onOpenAddCrew && !crewAdded && (
                    <button
                      type="button"
                      onClick={() => onOpenAddCrew(task.id, task.startDate)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-transparent border border-transparent rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors ml-2"
                    >
                      <HardHatIcon className="w-4 h-4" />
                      Add Crew
                    </button>
                  )}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={commitment?.equipmentMaterialVerified ?? false}
                    onChange={(e) => onSetCommitment({ equipmentMaterialVerified: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Equipment &amp; material availability verified</span>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  disabled={!canCommit}
                  onClick={() => {
                    onSetCommitment({ status: 'committed', committedAt: new Date().toISOString() });
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Commit
                </button>
                <span className="text-gray-400">or</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={proposeStart} onChange={(e) => setProposeStart(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 rounded" />
                  <input type="date" value={proposeEnd} onChange={(e) => setProposeEnd(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 rounded" />
                  <button
                    type="button"
                    onClick={() => {
                      if (proposeStart && proposeEnd) {
                        onSetCommitment({ status: 'proposed', proposedStartDate: proposeStart, proposedFinishDate: proposeEnd });
                        setProposeStart('');
                        setProposeEnd('');
                        onClose();
                      }
                    }}
                    disabled={!proposeStart || !proposeEnd}
                    className="px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
                  >
                    Propose dates
                  </button>
                </div>
                <span className="text-gray-400">or</span>
                {!showRejectList ? (
                  <button type="button" onClick={() => setShowRejectList(true)} className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100">
                    Unable to commit
                  </button>
                ) : (
                  <div className="w-full space-y-3 pt-2">
                    <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white">
                      <option value="">Select reason</option>
                      {REJECTION_REASONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                    </select>
                    <input type="text" value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Comment (optional)" className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (rejectReason) {
                            const label = REJECTION_REASONS.find(r => r.code === rejectReason)?.label ?? rejectReason;
                            onSetCommitment({ status: 'rejected', rejectionReason: label, rejectionComment: rejectComment || undefined, rejectedAt: new Date().toISOString() });
                            if (rejectReason === REJECTION_REASON_UNANSWERED_RFI && addProjectRisk) {
                              addProjectRisk({ taskId: task.id, taskName: task.name, reason: 'Unanswered RFI' });
                            }
                            onClose();
                          }
                        }}
                        disabled={!rejectReason}
                        className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        Submit rejection
                      </button>
                      <button type="button" onClick={() => { setShowRejectList(false); setRejectReason(''); setRejectComment(''); }} className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm py-1">
              {commitment.status === 'committed' && (
                <p className="text-green-700 font-medium">Committed{commitment.committedAt ? ` at ${new Date(commitment.committedAt).toLocaleString()}` : ''}.</p>
              )}
              {commitment.status === 'proposed' && (
                <p className="text-blue-700">Proposed dates: {commitment.proposedStartDate} – {commitment.proposedFinishDate}</p>
              )}
              {commitment.status === 'rejected' && (
                <p className="text-red-700">Rejected: {commitment.rejectionReason}{commitment.rejectionComment ? ` – ${commitment.rejectionComment}` : ''}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
