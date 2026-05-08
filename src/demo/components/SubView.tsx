import React, { useMemo, useState } from 'react';
import {
  DEMO_LOOKAHEAD_WINDOW,
  DEMO_PROJECT,
  DEMO_SUBS,
  DemoCommitmentStatus,
  DemoTask,
} from '../data/lookahead-demo-data';
import { useDemoStore } from '../store/demo-store';
import { StatusBadge } from './StatusBadge';
import { SubCommitmentModal } from './SubCommitmentModal';

const SUB_COLORS = {
  'apex-electrical': {
    headerBorder: 'border-amber-200',
    headerBg: 'bg-amber-50',
    pillBorder: 'border-amber-200',
    pillBg: 'bg-amber-100',
    pillText: 'text-amber-700',
    label: 'SUB',
  },
  'blueline-mechanical': {
    headerBorder: 'border-teal-200',
    headerBg: 'bg-teal-50',
    pillBorder: 'border-teal-200',
    pillBg: 'bg-teal-100',
    pillText: 'text-teal-700',
    label: 'SUB',
  },
} as const;

export const SubView: React.FC<{ subId: 'apex-electrical' | 'blueline-mechanical' }> = ({ subId }) => {
  const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
  const allTasks = useDemoStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks.filter((t) => t.assignedTo === subId), [allTasks, subId]);

  const responded = useMemo(
    () => tasks.filter((t) => (t.commitmentStatus ?? 'pending') !== 'pending').length,
    [tasks]
  );

  const colors = SUB_COLORS[subId];

  return (
    <div className="h-full flex flex-col gap-4">
      <div className={`rounded-xl border ${colors.headerBorder} ${colors.headerBg} p-4`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md border ${colors.pillBorder} ${colors.pillBg} px-2 py-0.5 text-[11px] font-bold ${colors.pillText} uppercase tracking-wide`}>
                {colors.label}
              </span>
              <span className="text-sm font-semibold text-gray-900">{DEMO_SUBS[subId].name}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{DEMO_PROJECT.shortName}</div>
            <div className="text-xs text-gray-400">{DEMO_LOOKAHEAD_WINDOW.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-400">My progress</div>
            <div className="text-xs font-semibold text-gray-700">
              {responded} of {tasks.length} responded
            </div>
          </div>
        </div>

        {lookaheadStatus === 'in_review' && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-xs text-amber-800">
            {DEMO_PROJECT.gcName} has submitted a lookahead for your review.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div id="demo-sub-taskcards" className="contents">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} subId={subId} />
          ))}
        </div>
      </div>
    </div>
  );
};

type TaskCardProps = { task: DemoTask; subId: 'apex-electrical' | 'blueline-mechanical' };

const TaskCard: React.FC<TaskCardProps> = ({ task, subId }) => {
  const commitTask = useDemoStore((s) => s.commitTask);
  const proposeAdjustment = useDemoStore((s) => s.proposeAdjustment);
  const rejectTask = useDemoStore((s) => s.rejectTask);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const status: DemoCommitmentStatus = task.commitmentStatus ?? 'pending';
  const locked = status === 'committed' || status === 'gc_accepted';
  const reopened = status === 'gc_revised';

  const border =
    status === 'committed' || status === 'gc_accepted'
      ? 'border-emerald-200'
      : status === 'rejected'
      ? 'border-rose-200'
      : status === 'adjustment_proposed' || status === 'gc_revised'
      ? 'border-amber-200'
      : 'border-gray-200';

  return (
    <>
      <div className={`rounded-xl border ${border} bg-white overflow-hidden`}>
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{task.name}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                  {task.proposedStart} – {task.proposedEnd}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                  {task.location}
                </span>
              </div>
            </div>
            <StatusBadge type="commitment" status={status} />
          </div>
          {reopened && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700 animate-pulse">
              GC has revised — please review.
            </div>
          )}
        </div>

        <div className="px-4 py-3 text-xs text-gray-600 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-gray-400">Crew</div>
              <div className="font-semibold text-gray-700">{task.crewSize}</div>
            </div>
            <div>
              <div className="text-gray-400">Materials</div>
              <div className="truncate" title={task.materials}>{task.materials}</div>
            </div>
          </div>

          {(status === 'adjustment_proposed' || status === 'gc_revised') && task.adjustmentProposal && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="text-[11px] font-semibold text-amber-700">Proposed changes</div>
              <div className="mt-1 text-gray-700">
                {task.adjustmentProposal.proposedStartDate || '—'} – {task.adjustmentProposal.proposedEndDate || '—'}
                {typeof task.adjustmentProposal.proposedCrewSize === 'number'
                  ? ` · crew ${task.adjustmentProposal.proposedCrewSize}`
                  : ''}
              </div>
              {task.adjustmentProposal.gcResponseNotes && (
                <div className="mt-1 text-gray-600">GC: {task.adjustmentProposal.gcResponseNotes}</div>
              )}
              <div className="mt-1 text-[11px] text-gray-500">Awaiting GC response</div>
            </div>
          )}

          {status === 'rejected' && task.adjustmentProposal?.rejectionReason && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <div className="text-[11px] font-semibold text-rose-700">Rejected</div>
              <div className="mt-1 text-gray-700">{task.adjustmentProposal.rejectionReason}</div>
              <div className="mt-1 text-[11px] text-gray-500">Awaiting GC response</div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            disabled={locked && !reopened}
            onClick={() => setIsModalOpen(true)}
            id={task.id === 'task-3' ? 'demo-sub-task-3-propose' : task.id === 'task-6' ? 'demo-sub-task-6-reject' : undefined}
            className="w-full px-3 py-2 rounded-md text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {locked && !reopened
              ? (status === 'committed' ? 'Committed' : 'Accepted')
              : 'Review & Respond'}
          </button>
        </div>
      </div>

      <SubCommitmentModal
        isOpen={isModalOpen}
        task={task}
        onClose={() => setIsModalOpen(false)}
        onCommit={() => { commitTask(task.id, subId); setIsModalOpen(false); }}
        onPropose={(proposal) => { proposeAdjustment(task.id, subId, proposal); setIsModalOpen(false); }}
        onReject={(reason, notes) => { rejectTask(task.id, subId, reason, notes); setIsModalOpen(false); }}
      />
    </>
  );
};

