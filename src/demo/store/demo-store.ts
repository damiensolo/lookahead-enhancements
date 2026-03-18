import { create } from 'zustand';
import {
  ActivityEntry,
  AdjustmentHistoryEntry,
  AdjustmentProposal,
  DEMO_PROJECT,
  DEMO_SUBS,
  DEMO_TASKS,
  DemoLookaheadStatus,
  DemoRole,
  DemoTask,
  cloneDemoTasks,
} from '../data/lookahead-demo-data';

export interface DemoStore {
  lookaheadStatus: DemoLookaheadStatus;
  tasks: DemoTask[];
  activeRole: DemoRole;
  activityFeed: ActivityEntry[];
  lastPulse?: { taskId: string; at: number; kind: 'sub' | 'gc' | 'system' };


  // actions
  setActiveRole: (role: DemoRole) => void;
  submitForReview: () => void;
  commitTask: (taskId: string, actorCompanyId: 'apex-electrical' | 'blueline-mechanical') => void;
  proposeAdjustment: (
    taskId: string,
    actorCompanyId: 'apex-electrical' | 'blueline-mechanical',
    proposal: AdjustmentProposal
  ) => void;
  rejectTask: (
    taskId: string,
    actorCompanyId: 'apex-electrical' | 'blueline-mechanical',
    reason: string,
    notes?: string
  ) => void;
  gcAcceptAdjustment: (taskId: string) => void;
  gcCounterPropose: (taskId: string, counter: AdjustmentProposal) => void;
  gcMarkDisputed: (taskId: string, notes?: string) => void;
  publishLookahead: () => void;
  resetDemo: () => void;
}

const now = () => new Date().toISOString();

const makeActivity = (
  type: ActivityEntry['type'],
  actor: DemoRole,
  message: string,
  taskId?: string
): ActivityEntry => ({
  id: `${type}-${taskId ?? 'schedule'}-${Date.now()}`,
  at: now(),
  actor,
  type,
  taskId,
  message,
});

export const useDemoStore = create<DemoStore>((set, get) => ({
  lookaheadStatus: 'draft',
  tasks: cloneDemoTasks(),
  activeRole: 'gc',
  activityFeed: [],
  lastPulse: undefined,


  setActiveRole: (role) => set({ activeRole: role }),

  submitForReview: () =>
    set((state) => {
      if (state.lookaheadStatus !== 'draft') return state;
      return {
        ...state,
        lookaheadStatus: 'in_review',
        tasks: state.tasks.map((t) => ({
          ...t,
          commitmentStatus: (t.commitmentStatus ?? ('pending' as const)) as DemoTask['commitmentStatus'],
        })),
        activityFeed: [
          makeActivity(
            'gc_submit_for_review',
            'gc',
            `${DEMO_PROJECT.gcName} submitted lookahead for review.`
          ),
          ...state.activityFeed,
        ],
      };
    }),

  commitTask: (taskId, actorCompanyId) =>
    set((state) => {
      const tasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const historyEntry: AdjustmentHistoryEntry = {
          at: now(),
          actor: 'sub',
          status: 'committed',
          summary: 'Committed to task as planned',
          proposalSnapshot: t.adjustmentProposal,
        };
        return {
          ...t,
          commitmentStatus: 'committed' as const,
          history: [...(t.history ?? []), historyEntry],
        };
      });
      const companyName = DEMO_SUBS[actorCompanyId]?.name ?? actorCompanyId;
      return {
        ...state,
        tasks,
        lastPulse: { taskId, at: Date.now(), kind: 'sub' },
        activityFeed: [
          makeActivity(
            'sub_committed',
            actorCompanyId,
            `${companyName} committed to ${taskId}.`,
            taskId
          ),
          ...state.activityFeed,
        ],
      };
    }),

  proposeAdjustment: (taskId, actorCompanyId, proposal) =>
    set((state) => {
      const tasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const merged: AdjustmentProposal = {
          ...(t.adjustmentProposal ?? {}),
          ...proposal,
        };
        const historyEntry: AdjustmentHistoryEntry = {
          at: now(),
          actor: 'sub',
          status: 'adjustment_proposed',
          summary: 'Sub proposed adjustment',
          proposalSnapshot: merged,
        };
        return {
          ...t,
          commitmentStatus: 'adjustment_proposed' as const,
          adjustmentProposal: merged,
          history: [...(t.history ?? []), historyEntry],
        };
      });
      const companyName = DEMO_SUBS[actorCompanyId]?.name ?? actorCompanyId;
      return {
        ...state,
        tasks,
        lastPulse: { taskId, at: Date.now(), kind: 'sub' },
        activityFeed: [
          makeActivity(
            'sub_adjustment_proposed',
            actorCompanyId,
            `${companyName} proposed an adjustment on ${taskId}.`,
            taskId
          ),
          ...state.activityFeed,
        ],
      };
    }),

  rejectTask: (taskId, actorCompanyId, reason, notes) =>
    set((state) => {
      const tasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const merged: AdjustmentProposal = {
          ...(t.adjustmentProposal ?? {}),
          rejectionReason: reason,
          subNotes: notes ?? (t.adjustmentProposal?.subNotes ?? undefined),
        };
        const historyEntry: AdjustmentHistoryEntry = {
          at: now(),
          actor: 'sub',
          status: 'rejected',
          summary: `Rejected: ${reason}`,
          proposalSnapshot: merged,
        };
        return {
          ...t,
          commitmentStatus: 'rejected' as const,
          adjustmentProposal: merged,
          history: [...(t.history ?? []), historyEntry],
        };
      });
      const companyName = DEMO_SUBS[actorCompanyId]?.name ?? actorCompanyId;
      return {
        ...state,
        tasks,
        lastPulse: { taskId, at: Date.now(), kind: 'sub' },
        activityFeed: [
          makeActivity(
            'sub_rejected',
            actorCompanyId,
            `${companyName} rejected ${taskId}: ${reason}.`,
            taskId
          ),
          ...state.activityFeed,
        ],
      };
    }),

  gcAcceptAdjustment: (taskId) =>
    set((state) => {
      const tasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const historyEntry: AdjustmentHistoryEntry = {
          at: now(),
          actor: 'gc',
          status: 'gc_accepted',
          summary: 'GC accepted adjustment',
          proposalSnapshot: t.adjustmentProposal,
        };
        return {
          ...t,
          commitmentStatus: 'gc_accepted' as const,
          history: [...(t.history ?? []), historyEntry],
        };
      });
      return {
        ...state,
        tasks,
        lastPulse: { taskId, at: Date.now(), kind: 'gc' },
        activityFeed: [
          makeActivity('gc_accepted_adjustment', 'gc', `GC accepted adjustment on ${taskId}.`, taskId),
          ...state.activityFeed,
        ],
      };
    }),

  gcCounterPropose: (taskId, counter) =>
    set((state) => {
      const tasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const merged: AdjustmentProposal = {
          ...(t.adjustmentProposal ?? {}),
          ...counter,
        };
        const historyEntry: AdjustmentHistoryEntry = {
          at: now(),
          actor: 'gc',
          status: 'gc_revised',
          summary: 'GC counter-proposed',
          proposalSnapshot: merged,
        };
        return {
          ...t,
          commitmentStatus: 'gc_revised' as const,
          adjustmentProposal: merged,
          history: [...(t.history ?? []), historyEntry],
        };
      });
      return {
        ...state,
        tasks,
        lastPulse: { taskId, at: Date.now(), kind: 'gc' },
        activityFeed: [
          makeActivity('gc_counter_proposed', 'gc', `GC counter-proposed on ${taskId}.`, taskId),
          ...state.activityFeed,
        ],
      };
    }),

  gcMarkDisputed: (taskId, notes) =>
    set((state) => {
      const tasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const merged: AdjustmentProposal = {
          ...(t.adjustmentProposal ?? {}),
          gcResponseNotes: notes ?? t.adjustmentProposal?.gcResponseNotes,
        };
        const historyEntry: AdjustmentHistoryEntry = {
          at: now(),
          actor: 'gc',
          status: 'disputed',
          summary: 'Marked disputed',
          proposalSnapshot: merged,
        };
        return {
          ...t,
          commitmentStatus: 'disputed' as const,
          adjustmentProposal: merged,
          history: [...(t.history ?? []), historyEntry],
        };
      });
      return {
        ...state,
        tasks,
        lastPulse: { taskId, at: Date.now(), kind: 'gc' },
        activityFeed: [
          makeActivity('gc_marked_disputed', 'gc', `GC marked ${taskId} as disputed.`, taskId),
          ...state.activityFeed,
        ],
      };
    }),

  publishLookahead: () =>
    set((state) => {
      if (state.lookaheadStatus !== 'in_review') return state;
      const unresolved = state.tasks.filter((t) => {
        const st = t.commitmentStatus;
        return !(st === 'committed' || st === 'gc_accepted');
      });
      if (unresolved.length > 0) {
        // Guard: GC view will surface unresolved tasks; demo can optionally override via separate logic.
        return state;
      }
      return {
        ...state,
        lookaheadStatus: 'active',
        lastPulse: { taskId: 'schedule', at: Date.now(), kind: 'system' },
        activityFeed: [
          makeActivity(
            'gc_publish',
            'gc',
            `${DEMO_PROJECT.gcName} published the lookahead to Active.`
          ),
          ...state.activityFeed,
        ],
      };
    }),

  resetDemo: () =>
    set(() => ({
      lookaheadStatus: 'draft',
      tasks: cloneDemoTasks(),
      activeRole: 'gc',
      activityFeed: [],
      lastPulse: undefined,
    })),
}));

