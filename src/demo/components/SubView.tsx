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
import { ProposeAdjustmentModal } from './ProposeAdjustmentModal';
import { RejectModal } from './RejectModal';

export const SubView: React.FC<{ subId: 'apex-electrical' | 'blueline-mechanical' }> = ({ subId }) => {
  const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
  const allTasks = useDemoStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks.filter((t) => t.assignedTo === subId), [allTasks, subId]);

  const responded = useMemo(
    () => tasks.filter((t) => (t.commitmentStatus ?? 'pending') !== 'pending').length,
    [tasks]
  );

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-50">{DEMO_SUBS[subId].name}</div>
            <div className="text-xs text-slate-400">{DEMO_PROJECT.shortName}</div>
            <div className="text-xs text-slate-500">{DEMO_LOOKAHEAD_WINDOW.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">My progress</div>
            <div className="text-xs font-semibold text-slate-200">
              {responded} of {tasks.length} responded
            </div>
          </div>
        </div>

        {lookaheadStatus === 'in_review' && (
          <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
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

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const status: DemoCommitmentStatus = task.commitmentStatus ?? 'pending';
  const locked = status === 'committed' || status === 'gc_accepted';
  const reopened = status === 'gc_revised';

  const border =
    status === 'committed' || status === 'gc_accepted'
      ? 'border-emerald-500/30'
      : status === 'rejected'
      ? 'border-rose-500/30'
      : status === 'adjustment_proposed' || status === 'gc_revised'
      ? 'border-amber-500/30'
      : 'border-slate-800';

  return (
    <div className={`rounded-xl border ${border} bg-slate-900/40 overflow-hidden`}>
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate">{task.name}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-950/40 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                {task.proposedStart} – {task.proposedEnd}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-950/40 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                {task.location}
              </span>
            </div>
          </div>
          <StatusBadge
            type="commitment"
            status={status}
          />
        </div>
        {reopened && (
          <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 animate-pulse">
            GC has revised — please review.
          </div>
        )}
      </div>

      <div className="px-4 py-3 text-xs text-slate-300 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-500">Crew</div>
            <div className="font-semibold text-slate-200">{task.crewSize}</div>
          </div>
          <div>
            <div className="text-slate-500">Materials</div>
            <div className="truncate" title={task.materials}>
              {task.materials}
            </div>
          </div>
        </div>
        <details className="rounded-lg border border-slate-800 bg-slate-950/20 px-3 py-2">
          <summary className="cursor-pointer text-slate-200 font-semibold text-[11px]">GC Notes</summary>
          <div className="mt-2 text-slate-300">{task.gcNotes}</div>
        </details>

        {(status === 'adjustment_proposed' || status === 'gc_revised') && task.adjustmentProposal && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <div className="text-[11px] font-semibold text-amber-200">Proposed changes</div>
            <div className="mt-1 text-slate-200">
              {task.adjustmentProposal.proposedStartDate || '—'} – {task.adjustmentProposal.proposedEndDate || '—'}
              {typeof task.adjustmentProposal.proposedCrewSize === 'number'
                ? ` · crew ${task.adjustmentProposal.proposedCrewSize}`
                : ''}
            </div>
            {task.adjustmentProposal.gcResponseNotes && (
              <div className="mt-1 text-slate-300">GC: {task.adjustmentProposal.gcResponseNotes}</div>
            )}
            <div className="mt-1 text-[11px] text-slate-400">Awaiting GC response</div>
          </div>
        )}

        {status === 'rejected' && task.adjustmentProposal?.rejectionReason && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
            <div className="text-[11px] font-semibold text-rose-200">Rejected</div>
            <div className="mt-1 text-slate-200">{task.adjustmentProposal.rejectionReason}</div>
            <div className="mt-1 text-[11px] text-slate-400">Awaiting GC response</div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={locked && !reopened}
            onClick={() => commitTask(task.id, subId)}
            className="px-3 py-2 rounded-md text-xs font-bold border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Commit
          </button>
          <button
            type="button"
            disabled={locked && !reopened}
            onClick={() => setIsAdjustOpen(true)}
            className="px-3 py-2 rounded-md text-xs font-bold border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            id={task.id === 'task-3' ? 'demo-sub-task-3-propose' : undefined}
          >
            Propose
          </button>
          <button
            type="button"
            disabled={locked && !reopened}
            onClick={() => setIsRejectOpen(true)}
            className="px-3 py-2 rounded-md text-xs font-bold border border-rose-500/40 text-rose-200 hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            id={task.id === 'task-6' ? 'demo-sub-task-6-reject' : undefined}
          >
            Reject
          </button>
        </div>
      </div>

      <ProposeAdjustmentModal
        isOpen={isAdjustOpen}
        task={task}
        onClose={() => setIsAdjustOpen(false)}
        onSubmit={(proposal) => {
          proposeAdjustment(task.id, subId, proposal);
          setIsAdjustOpen(false);
        }}
      />
      <RejectModal
        isOpen={isRejectOpen}
        task={task}
        onClose={() => setIsRejectOpen(false)}
        onSubmit={(reason, notes) => {
          rejectTask(task.id, subId, reason, notes);
          setIsRejectOpen(false);
        }}
      />
    </div>
  );
};

