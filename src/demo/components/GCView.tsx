import React, { useEffect, useMemo, useState } from 'react';
import { DEMO_LOOKAHEAD_WINDOW, DEMO_PROJECT, DemoTask, getSubDisplayName } from '../data/lookahead-demo-data';
import { useDemoStore } from '../store/demo-store';
import { StatusBadge } from './StatusBadge';
import { ReviewProgressBar } from './ReviewProgressBar';
import { ActivityFeed } from './ActivityFeed';

export const GCView: React.FC = () => {
  const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
  const tasks = useDemoStore((s) => s.tasks);
  const activityFeed = useDemoStore((s) => s.activityFeed);
  const submitForReview = useDemoStore((s) => s.submitForReview);
  const publishLookahead = useDemoStore((s) => s.publishLookahead);
  const resetDemo = useDemoStore((s) => s.resetDemo);
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
  const lastPulse = useDemoStore((s) => s.lastPulse);

  const unresolved = useMemo(
    () => tasks.filter((t) => !(t.commitmentStatus === 'committed' || t.commitmentStatus === 'gc_accepted')),
    [tasks]
  );
  const canPublish = lookaheadStatus === 'in_review' && unresolved.length === 0;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);

  useEffect(() => {
    if (lookaheadStatus === 'active') {
      setShowPublishSuccess(true);
      const t = window.setTimeout(() => setShowPublishSuccess(false), 1400);
      return () => window.clearTimeout(t);
    }
  }, [lookaheadStatus]);

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => a.phase.localeCompare(b.phase) || a.id.localeCompare(b.id));
  }, [tasks]);

  return (
    <div className="flex gap-4 h-full relative">
      {showPublishSuccess && (
        <div className="absolute inset-0 z-[120] pointer-events-none flex items-center justify-center">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 backdrop-blur-sm px-6 py-5 shadow-2xl animate-[pop_420ms_ease-out]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-200 text-xl font-black">
                ✓
              </div>
              <div>
                <div className="text-sm font-semibold text-emerald-100">Published to Active</div>
                <div className="text-xs text-emerald-200/70">Planning locked · execution begins</div>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes pop { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-50">{DEMO_PROJECT.shortName}</div>
              <div className="text-xs text-slate-400">{DEMO_LOOKAHEAD_WINDOW.label}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <StatusBadge type="schedule" status={lookaheadStatus} size="md" />
              {lookaheadStatus === 'draft' && (
                <button
                  type="button"
                  onClick={submitForReview}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                  id="demo-submit-for-review"
                >
                  Submit for Review
                </button>
              )}
              {lookaheadStatus === 'in_review' && (
                <>
                  <button
                    type="button"
                    onClick={resetDemo}
                    className="px-3 py-2 rounded-md border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200 text-xs font-bold transition-colors"
                  >
                    Pull Back to Draft
                  </button>
                  <button
                    type="button"
                    disabled={!canPublish}
                    onClick={publishLookahead}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-colors ${
                      canPublish
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                    id="demo-publish-lookahead"
                    title={!canPublish ? `${unresolved.length} task(s) unresolved` : 'Publish lookahead'}
                  >
                    Publish Lookahead
                  </button>
                </>
              )}
              {lookaheadStatus === 'active' && (
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-200">
                  Lookahead Active
                </span>
              )}
            </div>
          </div>
        </div>

        {lookaheadStatus === 'in_review' && (
          <div className="mb-4">
            <ReviewProgressBar counts={counts} total={tasks.length} />
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="grid grid-cols-[1.6fr_0.9fr_0.9fr_0.45fr_0.55fr_0.6fr] gap-0 border-b border-slate-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <div>Task</div>
            <div>Assigned to</div>
            <div>Dates</div>
            <div className="text-center">Crew</div>
            <div className="text-center">Status</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-800">
            {sorted.map((t) => (
              <GCTaskRow
                key={t.id}
                task={t}
                isInReview={lookaheadStatus === 'in_review'}
                expanded={!!expanded[t.id]}
                onToggleExpand={() => setExpanded((p) => ({ ...p, [t.id]: !p[t.id] }))}
                pulse={!!lastPulse && lastPulse.taskId === t.id && Date.now() - lastPulse.at < 1200}
              />
            ))}
          </div>
        </div>

        {lookaheadStatus === 'in_review' && unresolved.length > 0 && (
          <div className="mt-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{unresolved.length}</span> unresolved task(s).
            Resolve all tasks to enable publishing.
          </div>
        )}
      </div>

      <div className="w-[360px] flex-shrink-0 hidden xl:block">
        <ActivityFeed entries={activityFeed} />
      </div>
    </div>
  );
};

const GCTaskRow: React.FC<{
  task: DemoTask;
  isInReview: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  pulse: boolean;
}> = ({ task, isInReview, expanded, onToggleExpand, pulse }) => {
  const canExpand =
    isInReview &&
    (task.commitmentStatus === 'adjustment_proposed' ||
      task.commitmentStatus === 'rejected' ||
      task.commitmentStatus === 'gc_revised' ||
      task.commitmentStatus === 'disputed');

  return (
    <div className={canExpand ? 'bg-slate-950/20' : ''}>
      <div
        className={[
          'grid grid-cols-[1.6fr_0.9fr_0.9fr_0.45fr_0.55fr_0.6fr] gap-0 px-4 py-3 items-center',
          isInReview && (task.commitmentStatus === 'rejected' || task.commitmentStatus === 'adjustment_proposed')
            ? 'bg-amber-500/5'
            : '',
          pulse ? 'ring-1 ring-amber-400/40 animate-pulse' : '',
        ].join(' ')}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100 truncate">{task.name}</div>
          <div className="text-xs text-slate-500 truncate">{task.location}</div>
        </div>
        <div className="text-xs text-slate-300">{getSubDisplayName(task.assignedTo)}</div>
        <div className="text-xs text-slate-300">
          {task.proposedStart} – {task.proposedEnd}
        </div>
        <div className="text-xs text-slate-300 text-center">{task.crewSize}</div>
        <div className="text-center">
          <StatusBadge type="commitment" status={task.commitmentStatus} />
        </div>
            <div className="text-right">
              {canExpand ? (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="text-xs font-semibold text-slate-200 hover:text-white hover:underline"
                  id={task.id === 'task-3' ? 'demo-gc-task-3-review' : task.id === 'task-6' ? 'demo-gc-task-6-review' : undefined}
                >
                  {expanded ? 'Hide' : 'Review'}
                </button>
              ) : (
                <span className="text-xs text-slate-500">—</span>
              )}
            </div>
      </div>
      {expanded && canExpand && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs font-semibold text-slate-200 mb-2">Response details</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500">Original</div>
                <div className="text-slate-200">
                  {task.proposedStart} – {task.proposedEnd} · crew {task.crewSize}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Proposed / notes</div>
                <div className="text-slate-200">
                  {task.adjustmentProposal?.proposedStartDate || '—'} – {task.adjustmentProposal?.proposedEndDate || '—'}
                  {typeof task.adjustmentProposal?.proposedCrewSize === 'number'
                    ? ` · crew ${task.adjustmentProposal?.proposedCrewSize}`
                    : ''}
                </div>
                {task.adjustmentProposal?.rejectionReason && (
                  <div className="mt-1 text-rose-200">Rejected: {task.adjustmentProposal.rejectionReason}</div>
                )}
                {task.adjustmentProposal?.subNotes && (
                  <div className="mt-1 text-slate-300">{task.adjustmentProposal.subNotes}</div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <GCActionButtons taskId={task.id} status={task.commitmentStatus} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GCActionButtons: React.FC<{ taskId: string; status: DemoTask['commitmentStatus'] }> = ({ taskId, status }) => {
  const gcAcceptAdjustment = useDemoStore((s) => s.gcAcceptAdjustment);
  const gcCounterPropose = useDemoStore((s) => s.gcCounterPropose);
  const gcMarkDisputed = useDemoStore((s) => s.gcMarkDisputed);

  const canAccept = status === 'adjustment_proposed' || status === 'gc_revised';
  const canCounter = status === 'adjustment_proposed' || status === 'rejected';

  return (
    <>
      <button
        type="button"
        disabled={!canAccept}
        onClick={() => gcAcceptAdjustment(taskId)}
        className={`px-3 py-2 rounded-md text-xs font-bold transition-colors ${
          canAccept ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        Accept
      </button>
      <button
        type="button"
        disabled={!canCounter}
        onClick={() =>
          gcCounterPropose(taskId, {
            proposedStartDate: 'Apr 17',
            proposedEndDate: 'Apr 18',
            proposedCrewSize: 3,
            gcResponseNotes: 'Can you work Apr 17–18? We will arrange a second crane window.',
          })
        }
        className={`px-3 py-2 rounded-md text-xs font-bold transition-colors ${
          canCounter ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        Counter-propose
      </button>
      <button
        type="button"
        onClick={() => gcMarkDisputed(taskId, 'Flagged for conversation')}
        className="px-3 py-2 rounded-md text-xs font-bold border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200 transition-colors"
      >
        Dispute
      </button>
    </>
  );
};

