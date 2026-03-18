import React, { useEffect, useMemo, useState } from 'react';
import { useDemoStore } from '../store/demo-store';
import { DEMO_SUBS } from '../data/lookahead-demo-data';

export type TourStep = {
  id: string;
  title: string;
  body: string;
  targetId: string;
  nextLabel?: string;
};

const STEPS: TourStep[] = [
  {
    id: 'step-1',
    title: 'Step 1 — GC View (Draft)',
    body:
      "This is the lookahead in Draft state. The GC has assigned 8 tasks to Apex Electrical and BlueLine Mechanical. Click 'Submit for Review' to send it to both subs.",
    targetId: 'demo-submit-for-review',
    nextLabel: 'Submit for Review',
  },
  {
    id: 'step-2',
    title: 'Step 2 — GC View (In Review)',
    body:
      'The lookahead is now In Review. Watch the progress bar fill as subs respond. Switch to the Apex Electrical view to see what they see.',
    targetId: 'demo-role-apex',
    nextLabel: 'Go to Apex',
  },
  {
    id: 'step-3',
    title: 'Step 3 — Apex Electrical View',
    body:
      "Apex sees only their tasks. They’ll commit to 3 tasks and propose an adjustment to Task 3 (Device Finish) — they need one more day.",
    targetId: 'demo-sub-taskcards',
    nextLabel: 'Make Apex responses',
  },
  {
    id: 'step-4',
    title: 'Step 4 — Apex responses',
    body:
      'Commit Tasks 1, 2, 7 and propose an adjustment on Task 3 (shift one day).',
    targetId: 'demo-sub-task-3-propose',
    nextLabel: 'Next',
  },
  {
    id: 'step-5',
    title: 'Step 5 — Switch to BlueLine',
    body: 'Now BlueLine Mechanical reviews their 4 tasks.',
    targetId: 'demo-role-blueline',
    nextLabel: 'Go to BlueLine',
  },
  {
    id: 'step-6',
    title: 'Step 6 — BlueLine responses',
    body:
      'BlueLine commits Tasks 4, 5, 8 and rejects Task 6 (commissioning tech unavailable).',
    targetId: 'demo-sub-task-6-reject',
    nextLabel: 'Next',
  },
  {
    id: 'step-7',
    title: 'Step 7 — Back to GC',
    body:
      'Back on the GC side you can see the activity feed and progress bar reflecting responses. Handle Task 3 (adjustment) and Task 6 (rejected).',
    targetId: 'demo-role-gc',
    nextLabel: 'Go to GC',
  },
  {
    id: 'step-8',
    title: 'Step 8 — Accept Task 3 adjustment',
    body:
      'The one-day shift works. GC accepts the adjustment on Task 3.',
    targetId: 'demo-gc-task-3-review',
    nextLabel: 'Accept',
  },
  {
    id: 'step-9',
    title: 'Step 9 — Counter-propose Task 6',
    body:
      'For RTU startup, crane is booked Apr 15 only. Counter-propose Apr 17–18 and arrange a second crane window.',
    targetId: 'demo-gc-task-6-review',
    nextLabel: 'Counter-propose',
  },
  {
    id: 'step-10',
    title: 'Step 10 — BlueLine commits to counter',
    body: 'BlueLine reviews the GC counter and commits.',
    targetId: 'demo-role-blueline',
    nextLabel: 'Go to BlueLine',
  },
  {
    id: 'step-11',
    title: 'Step 11 — All tasks resolved',
    body:
      "All 8 tasks are now committed or accepted. 'Publish Lookahead' is now active.",
    targetId: 'demo-role-gc',
    nextLabel: 'Go to GC',
  },
  {
    id: 'step-12',
    title: 'Step 12 — Publish',
    body:
      'GC publishes. The lookahead transitions to Active state and planning is locked.',
    targetId: 'demo-publish-lookahead',
    nextLabel: 'Publish',
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const GuidedTour: React.FC<{
  isActive: boolean;
  onClose: () => void;
}> = ({ isActive, onClose }) => {
  const [idx, setIdx] = useState(0);

  const setActiveRole = useDemoStore((s) => s.setActiveRole);
  const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
  const submitForReview = useDemoStore((s) => s.submitForReview);
  const commitTask = useDemoStore((s) => s.commitTask);
  const proposeAdjustment = useDemoStore((s) => s.proposeAdjustment);
  const rejectTask = useDemoStore((s) => s.rejectTask);
  const gcAcceptAdjustment = useDemoStore((s) => s.gcAcceptAdjustment);
  const gcCounterPropose = useDemoStore((s) => s.gcCounterPropose);
  const publishLookahead = useDemoStore((s) => s.publishLookahead);

  const allTasks = useDemoStore((s) => s.tasks);
  const apexElectricalTasksCount = useMemo(() => {
    return allTasks.filter(t => t.assignedTo === 'apex-electrical').length;
  }, [allTasks]);

  const step = STEPS[Math.min(idx, STEPS.length - 1)];

  useEffect(() => {
    if (!isActive) setIdx(0);
  }, [isActive]);

  const targetRect = useMemo(() => {
    if (!isActive) return null;
    const el = document.getElementById(step.targetId);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r;
  }, [isActive, step.targetId, idx]);

  useEffect(() => {
    if (!isActive) return;
    const el = document.getElementById(step.targetId);
    el?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }, [isActive, step.targetId]);

  const runStepAction = async () => {
    switch (step.id) {
      case 'step-1':
        if (lookaheadStatus === 'draft') submitForReview();
        break;
      case 'step-2':
        setActiveRole('apex-electrical');
        await sleep(200);
        break;
      case 'step-3':
        // no-op; presenter can interact, but auto-action seeds can be done in step-4
        break;
      case 'step-4':
        commitTask('task-1', 'apex-electrical');
        commitTask('task-2', 'apex-electrical');
        commitTask('task-7', 'apex-electrical');
        proposeAdjustment('task-3', 'apex-electrical', {
          proposedStartDate: 'Apr 15',
          proposedEndDate: 'Apr 17',
          proposedCrewSize: 3,
          subNotes: 'Need one additional day; painting completes Apr 14.',
        });
        break;
      case 'step-5':
        setActiveRole('blueline-mechanical');
        await sleep(200);
        break;
      case 'step-6':
        commitTask('task-4', 'blueline-mechanical');
        commitTask('task-5', 'blueline-mechanical');
        commitTask('task-8', 'blueline-mechanical');
        rejectTask('task-6', 'blueline-mechanical', 'Commissioning tech unavailable Apr 15–17', 'Request reschedule to following week.');
        break;
      case 'step-7':
        setActiveRole('gc');
        await sleep(200);
        break;
      case 'step-8':
        gcAcceptAdjustment('task-3');
        break;
      case 'step-9':
        gcCounterPropose('task-6', {
          proposedStartDate: 'Apr 17',
          proposedEndDate: 'Apr 18',
          proposedCrewSize: 3,
          gcResponseNotes: 'Can you work Apr 17–18? We will arrange a second crane window.',
        });
        break;
      case 'step-10':
        setActiveRole('blueline-mechanical');
        await sleep(200);
        // Sub commits revised task
        commitTask('task-6', 'blueline-mechanical');
        break;
      case 'step-11':
        setActiveRole('gc');
        await sleep(200);
        break;
      case 'step-12':
        publishLookahead();
        break;
    }
  };

  if (!isActive) return null;

  const top = targetRect ? Math.min(window.innerHeight - 220, Math.max(16, targetRect.bottom + 12)) : 90;
  const left = targetRect ? Math.min(window.innerWidth - 360, Math.max(16, targetRect.left)) : 24;

  return (
    <>
      {/* spotlight ring */}
      {targetRect && (
        <div
          className="fixed z-[250] pointer-events-none rounded-lg ring-2 ring-amber-400/70"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      <div className="fixed inset-0 z-[240] bg-black/30" onClick={onClose} />

      <div
        className="fixed z-[260] w-[340px] rounded-xl border border-slate-800 bg-slate-950 shadow-2xl"
        style={{ top, left }}
        role="dialog"
        aria-label="Guided tour"
      >
        <div className="px-4 py-3 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-200">{step.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Step {idx + 1} of {STEPS.length}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded"
            aria-label="Close tour"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-3 text-xs text-slate-300 leading-relaxed">
          {step.body}
          {step.id === 'step-3' && (
            <div className="mt-2 text-[11px] text-slate-400">
              Tip: Apex has {apexElectricalTasksCount} tasks assigned.
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="px-3 py-2 rounded-md text-xs font-bold border border-slate-700 bg-transparent hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await runStepAction();
                setIdx((i) => Math.min(STEPS.length - 1, i + 1));
              }}
              className="px-4 py-2 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              {step.nextLabel ?? 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
