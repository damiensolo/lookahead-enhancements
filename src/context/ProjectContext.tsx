import React, { createContext, useState, useMemo, useCallback, useContext, SetStateAction, ReactNode } from 'react';
import { MOCK_TASKS } from '../data';
import { Task, View, FilterRule, Priority, ColumnId, Status, DisplayDensity, Column, ViewMode } from '../types';
import { getDefaultTableColumns, getDefaultLookaheadColumns } from '../constants';
import { LookaheadTask, LookaheadSchedule, ScheduleStatus, TaskDelta, CommitmentState, ProjectRisk, TaskCommitmentStatus, TaskAdjustmentProposal } from '../components/views/lookahead/types';
import { compareLookaheadTasks } from '../components/views/lookahead/utils/diffUtils';
import { PLANNER_TASKS, MASTER_SCHEDULE_TASKS } from '../components/views/lookahead/constants';
import { parseLookaheadDate, addDays, formatDateISO } from '../lib/dateUtils';

type SortConfig = {
  columnId: ColumnId;
  direction: 'asc' | 'desc';
} | null;

const getDefaultViewConfig = (viewMode: ViewMode): Omit<View, 'id' | 'name'> => {
  return {
    filters: [],
    sort: null,
    displayDensity: 'comfortable' as DisplayDensity,
    showGridLines: false,
    showMasterRange: false,
    taskStyles: {},
    fontSize: 12,
    type: 'lookahead',
    columns: viewMode === 'lookahead' ? JSON.parse(JSON.stringify(getDefaultLookaheadColumns())) : JSON.parse(JSON.stringify(getDefaultTableColumns())),
  };
};


interface ProjectContextType {
  tasks: Task[];
  setTasks: React.Dispatch<SetStateAction<Task[]>>;
  views: View[];
  setViews: React.Dispatch<SetStateAction<View[]>>;
  activeViewId: string | null;
  handleSelectView: (viewId: string) => void;
  defaultViewId: string;
  setDefaultViewId: React.Dispatch<SetStateAction<string>>;
  activeViewMode: ViewMode;
  handleViewModeChange: (mode: ViewMode) => void;
  selectedTaskIds: Set<number>;
  setSelectedTaskIds: React.Dispatch<SetStateAction<Set<number>>>;
  editingCell: { taskId: number; column: string } | null;
  setEditingCell: React.Dispatch<SetStateAction<{ taskId: number; column: string } | null>>;
  detailedTaskId: number | null;
  setDetailedTaskId: React.Dispatch<SetStateAction<number | null>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<SetStateAction<string>>;
  modalState: { type: 'create' | 'rename'; view?: View } | null;
  setModalState: React.Dispatch<SetStateAction<{ type: 'create' | 'rename'; view?: View } | null>>;
  showFilterMenu: boolean;
  setShowFilterMenu: React.Dispatch<SetStateAction<boolean>>;
  showFieldsMenu: boolean;
  setShowFieldsMenu: React.Dispatch<SetStateAction<boolean>>;
  activeView: View;
  updateView: (updatedView: Partial<Omit<View, 'id' | 'name'>>) => void;
  setFilters: (filters: FilterRule[]) => void;
  setSort: (sort: SortConfig) => void;
  setColumns: (updater: SetStateAction<Column[]>) => void;
  setDisplayDensity: (density: DisplayDensity) => void;
  setShowGridLines: (show: boolean) => void;
  setShowMasterRange: (show: boolean) => void;
  setFontSize: (size: number) => void;
  handleSort: (columnId: ColumnId) => void;
  handleUpdateTask: (taskId: number, updatedValues: Partial<Omit<Task, 'id' | 'children'>>) => void;
  handlePriorityChange: (taskId: number, priority: Priority) => void;
  handleToggle: (taskId: number) => void;
  handleSaveView: (name: string) => void;
  handleDeleteView: (id: string) => void;
  detailedTask: Task | null;
  // Lookahead Schedule State
  schedules: LookaheadSchedule[];
  activeScheduleId: string | null;
  setActiveScheduleId: (id: string | null) => void;
  submitScheduleForReview: (id: string) => void;
  pullBackScheduleToDraft: (id: string) => void;
  publishSchedule: (id: string) => void;
  forcePublishSchedule: (id: string) => void;
  createDraft: (strategy?: 'previous' | 'master', config?: { startDate: string; durationDays: number }) => void;
  updateScheduleTasks: (id: string, tasks: LookaheadTask[]) => void;
  deltas: Record<string, TaskDelta[]>;
  isCreateLookaheadModalOpen: boolean;
  setIsCreateLookaheadModalOpen: (open: boolean) => void;
  isAddTaskModalOpen: boolean;
  setIsAddTaskModalOpen: (open: boolean) => void;
  // Commitment state (SC net-new tasks; prototype in-memory)
  commitmentByTaskId: Record<string | number, CommitmentState>;
  setCommitment: (taskId: string | number, state: Partial<CommitmentState> | null) => void;
  // Project risks (e.g. when SC rejects with Unanswered RFI)
  projectRisks: ProjectRisk[];
  addProjectRisk: (risk: Omit<ProjectRisk, 'addedAt'>) => void;

  // In-review workflow: task actions + activity feed (in-memory)
  activityFeedByScheduleId: Record<string, LookaheadActivityEntry[]>;
  commitTask: (scheduleId: string, taskId: string | number, actorCompany?: string | null) => void;
  rejectTask: (scheduleId: string, taskId: string | number, payload: { rejectionReason: string; subNotes?: string }, actorCompany?: string | null) => void;
  proposeTaskAdjustment: (scheduleId: string, taskId: string | number, payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>, actorCompany?: string | null) => void;
  gcAcceptAdjustment: (scheduleId: string, taskId: string | number, payload?: { gcResponseNotes?: string }) => void;
  gcCounterPropose: (scheduleId: string, taskId: string | number, payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>) => void;
  gcMarkDisputed: (scheduleId: string, taskId: string | number, payload?: { gcResponseNotes?: string }) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export interface LookaheadActivityEntry {
  id: string;
  at: string; // ISO
  scheduleId: string;
  taskId?: string | number;
  actor: 'gc' | 'sub';
  actorCompany?: string;
  type:
    | 'gc_submit_for_review'
    | 'gc_pull_back_to_draft'
    | 'gc_publish'
    | 'sub_committed'
    | 'sub_rejected'
    | 'sub_adjustment_proposed'
    | 'gc_accepted_adjustment'
    | 'gc_counter_proposed'
    | 'gc_marked_disputed';
  message: string;
}

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [defaultViewId, setDefaultViewId] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('lookahead');
  const [transientView, setTransientView] = useState<View | null>(null);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ taskId: number; column: string } | null>(null);
  const [detailedTaskId, setDetailedTaskId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalState, setModalState] = useState<{ type: 'create' | 'rename'; view?: View } | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showFieldsMenu, setShowFieldsMenu] = useState(false);

  // Lookahead Schedule State
  const [schedules, setSchedules] = useState<LookaheadSchedule[]>([
    {
      id: 'initial-active',
      name: 'Lookahead - Nov 17',
      status: ScheduleStatus.Active,
      tasks: PLANNER_TASKS,
      version: 1,
      publishedAt: new Date('2024-11-17').toISOString(),
      periodStartDate: '2026-01-20',
      periodDurationDays: 42, // 6 weeks
    }
  ]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>('initial-active');
  const [deltas, setDeltas] = useState<Record<string, TaskDelta[]>>({});
  const [isCreateLookaheadModalOpen, setIsCreateLookaheadModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [commitmentByTaskId, setCommitmentByTaskIdState] = useState<Record<string | number, CommitmentState>>({});
  const [projectRisks, setProjectRisks] = useState<ProjectRisk[]>([]);
  const [activityFeedByScheduleId, setActivityFeedByScheduleId] = useState<Record<string, LookaheadActivityEntry[]>>({});

  const setCommitment = useCallback((taskId: string | number, state: Partial<CommitmentState> | null) => {
    setCommitmentByTaskIdState(prev => {
      if (state === null) {
        const next = { ...prev };
        delete next[taskId];
        return next;
      }
      const existing = prev[taskId] || { status: 'pending' as const };
      return { ...prev, [taskId]: { ...existing, ...state } };
    });
  }, []);

  const addProjectRisk = useCallback((risk: Omit<ProjectRisk, 'addedAt'>) => {
    setProjectRisks(prev => [...prev, { ...risk, addedAt: new Date().toISOString() }]);
  }, []);

  const pushActivity = useCallback((entry: Omit<LookaheadActivityEntry, 'id' | 'at'> & { at?: string }) => {
    const at = entry.at ?? new Date().toISOString();
    const full: LookaheadActivityEntry = {
      ...entry,
      at,
      id: `${entry.scheduleId}-${at}-${Math.random().toString(16).slice(2)}`,
    };
    setActivityFeedByScheduleId(prev => {
      const list = prev[entry.scheduleId] ?? [];
      return { ...prev, [entry.scheduleId]: [full, ...list].slice(0, 50) };
    });
  }, []);

  const flattenTasks = useCallback((tasks: LookaheadTask[]) => {
    const all: LookaheadTask[] = [];
    const walk = (items: LookaheadTask[]) => {
      items.forEach(t => {
        all.push(t);
        if (t.children?.length) walk(t.children);
      });
    };
    walk(tasks);
    return all;
  }, []);

  const updateTaskInSchedule = useCallback((scheduleId: string, taskId: string | number, updater: (t: LookaheadTask) => LookaheadTask) => {
    setSchedules(prev => prev.map(s => {
      if (s.id !== scheduleId) return s;
      const updateRecursively = (items: LookaheadTask[]): LookaheadTask[] =>
        items.map(t => {
          if (String(t.id) === String(taskId)) return updater(t);
          return t.children ? { ...t, children: updateRecursively(t.children) } : t;
        });
      return { ...s, tasks: updateRecursively(s.tasks) };
    }));
  }, []);

  const assertSubCanAct = useCallback((schedule: LookaheadSchedule | undefined, task: LookaheadTask | undefined, actorCompany?: string | null) => {
    if (!schedule || !task) return false;
    if (schedule.status !== ScheduleStatus.InReview) return false;
    const company = (actorCompany ?? '').trim().toLowerCase();
    if (!company) return false;
    return (task.contractor ?? '').trim().toLowerCase() === company;
  }, []);

  const submitScheduleForReview = useCallback((id: string) => {
    setSchedules(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (s.status !== ScheduleStatus.Draft) return s;
      const all = flattenTasks(s.tasks);
      const hasAnyAssigned = all.some(t => (t.contractor ?? '').trim().length > 0);
      if (!hasAnyAssigned) return s;
      const tasks = s.tasks.map(t => ({
        ...t,
        commitmentStatus: (t.contractor ?? '').trim().length === 0 ? 'committed' : (t.commitmentStatus ?? 'pending'),
        adjustmentProposal: t.adjustmentProposal ? t.adjustmentProposal : undefined,
      }));
      return { ...s, status: ScheduleStatus.InReview, tasks };
    }));
    pushActivity({
      scheduleId: id,
      actor: 'gc',
      type: 'gc_submit_for_review',
      message: 'GC submitted lookahead for review.',
    });
  }, [flattenTasks, pushActivity]);

  const pullBackScheduleToDraft = useCallback((id: string) => {
    setSchedules(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (s.status !== ScheduleStatus.InReview) return s;
      return { ...s, status: ScheduleStatus.Draft };
    }));
    pushActivity({
      scheduleId: id,
      actor: 'gc',
      type: 'gc_pull_back_to_draft',
      message: 'GC pulled lookahead back to draft.',
    });
  }, [pushActivity]);

  const createDraft = useCallback((strategy: 'previous' | 'master' = 'previous', config?: { startDate: string; durationDays: number }) => {
    const activeSchedule = schedules.find(s => s.status === ScheduleStatus.Active);
    
    let initialTasks: LookaheadTask[] = [];
    const start = config ? new Date(config.startDate) : new Date();
    const periodDays = config ? config.durationDays : 14;
    const end = config ? addDays(start, periodDays - 1) : addDays(start, periodDays - 1);

    if (strategy === 'previous') {
      // Strategy 1: Previous Lookahead
      // Persist changes from previous lookahead, then pull in new tasks from master schedule
      const previousTasks = JSON.parse(JSON.stringify(activeSchedule?.tasks || PLANNER_TASKS));
      
      // Filter previous tasks to the new range? Or just keep them?
      // Usually "Create from previous" means keep the tasks but maybe filter by the new window
      const filteredPrevious = previousTasks.filter((t: LookaheadTask) => {
        const taskStart = parseLookaheadDate(t.startDate);
        const taskEnd = parseLookaheadDate(t.finishDate);
        return taskStart >= start && taskEnd <= end;
      });

      const existingIds = new Set(filteredPrevious.map((t: LookaheadTask) => t.id));
      const newFromMaster = MASTER_SCHEDULE_TASKS.filter(t => {
        const taskStart = parseLookaheadDate(t.startDate);
        const taskEnd = parseLookaheadDate(t.finishDate);
        // Overlap check: task starts before window ends AND task ends after window starts
        return !existingIds.has(t.id) && taskStart <= end && taskEnd >= start;
      }).map(t => ({
        ...t,
        masterStartDate: t.startDate,
        masterFinishDate: t.finishDate
      }));
      
      initialTasks = [...filteredPrevious, ...newFromMaster];
    } else {
      // Strategy 2: Master Schedule
      // Pull in tasks from master schedule that overlap with the defined start date and duration
      initialTasks = MASTER_SCHEDULE_TASKS.filter(t => {
        const taskStart = parseLookaheadDate(t.startDate);
        const taskEnd = parseLookaheadDate(t.finishDate);
        // Overlap check: task starts before window ends AND task ends after window starts
        return taskStart <= end && taskEnd >= start;
      }).map(t => ({
        ...t,
        masterStartDate: t.startDate,
        masterFinishDate: t.finishDate
      }));
    }

    const newDraft: LookaheadSchedule = {
      id: `draft-${Date.now()}`,
      name: `Draft Lookahead - ${new Date().toLocaleDateString()}`,
      status: ScheduleStatus.Draft,
      tasks: initialTasks,
      version: (activeSchedule?.version || 0) + 1,
      ...(config && {
        periodStartDate: config.startDate,
        periodDurationDays: config.durationDays,
      }),
    };
    setSchedules(prev => [...prev, newDraft]);
    setActiveScheduleId(newDraft.id);
  }, [schedules]);

  const publishSchedule = useCallback((id: string) => {
    setSchedules(prev => {
      const draft = prev.find(s => s.id === id);
      if (!draft) return prev;
      if (draft.status === ScheduleStatus.Active || draft.status === ScheduleStatus.Closed) return prev;

      if (draft.status === ScheduleStatus.InReview) {
        const all = flattenTasks(draft.tasks);
        const unresolved = all.filter(t => {
          const contractor = (t.contractor ?? '').trim();
          if (!contractor) return false; // self-managed
          const st = t.commitmentStatus ?? 'pending';
          return !(st === 'committed' || st === 'gc_accepted');
        });
        if (unresolved.length > 0) return prev; // gated: UI should explain why
      }

      // Find the last active or closed schedule for comparison
      const lastPublished = [...prev]
        .filter(s => s.status === ScheduleStatus.Active || s.status === ScheduleStatus.Closed)
        .sort((a, b) => (b.version || 0) - (a.version || 0))[0];

      const newDeltas = lastPublished 
        ? compareLookaheadTasks(lastPublished.tasks, draft.tasks)
        : [];

      setDeltas(current => ({ ...current, [id]: newDeltas }));

      return prev.map(s => {
        if (s.id === id) {
          return { ...s, status: ScheduleStatus.Active, publishedAt: new Date().toISOString() };
        }
        if (s.status === ScheduleStatus.Active) {
          return { ...s, status: ScheduleStatus.Closed };
        }
        return s;
      });
    });

    pushActivity({
      scheduleId: id,
      actor: 'gc',
      type: 'gc_publish',
      message: 'GC published lookahead to Active.',
    });
  }, []);

  const forcePublishSchedule = useCallback((id: string) => {
    setSchedules(prev => {
      const draft = prev.find(s => s.id === id);
      if (!draft) return prev;
      if (draft.status === ScheduleStatus.Active || draft.status === ScheduleStatus.Closed) return prev;

      // Find the last active or closed schedule for comparison
      const lastPublished = [...prev]
        .filter(s => s.status === ScheduleStatus.Active || s.status === ScheduleStatus.Closed)
        .sort((a, b) => (b.version || 0) - (a.version || 0))[0];

      const newDeltas = lastPublished 
        ? compareLookaheadTasks(lastPublished.tasks, draft.tasks)
        : [];

      setDeltas(current => ({ ...current, [id]: newDeltas }));

      return prev.map(s => {
        if (s.id === id) {
          return { ...s, status: ScheduleStatus.Active, publishedAt: new Date().toISOString() };
        }
        if (s.status === ScheduleStatus.Active) {
          return { ...s, status: ScheduleStatus.Closed };
        }
        return s;
      });
    });

    pushActivity({
      scheduleId: id,
      actor: 'gc',
      type: 'gc_publish',
      message: 'GC published lookahead to Active (override).',
    });
  }, []);

  const updateScheduleTasks = useCallback((id: string, tasks: LookaheadTask[]) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, tasks } : s));
  }, []);

  const commitTask = useCallback((scheduleId: string, taskId: string | number, actorCompany?: string | null) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    const task = schedule ? flattenTasks(schedule.tasks).find(t => String(t.id) === String(taskId)) : undefined;
    if (!assertSubCanAct(schedule, task, actorCompany)) return;
    updateTaskInSchedule(scheduleId, taskId, t => ({
      ...t,
      commitmentStatus: 'committed',
      adjustmentProposal: t.adjustmentProposal
        ? {
            ...t.adjustmentProposal,
            history: [
              ...(t.adjustmentProposal.history ?? []),
              { at: new Date().toISOString(), actor: 'sub', status: 'committed', summary: 'Committed' },
            ],
          }
        : t.adjustmentProposal,
    }));
    pushActivity({
      scheduleId,
      taskId,
      actor: 'sub',
      actorCompany: actorCompany ?? undefined,
      type: 'sub_committed',
      message: `${actorCompany ?? 'Sub'} committed to Task #${taskId}.`,
    });
  }, [schedules, flattenTasks, assertSubCanAct, updateTaskInSchedule, pushActivity]);

  const rejectTask = useCallback((scheduleId: string, taskId: string | number, payload: { rejectionReason: string; subNotes?: string }, actorCompany?: string | null) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    const task = schedule ? flattenTasks(schedule.tasks).find(t => String(t.id) === String(taskId)) : undefined;
    if (!assertSubCanAct(schedule, task, actorCompany)) return;
    updateTaskInSchedule(scheduleId, taskId, t => {
      const existing: TaskAdjustmentProposal = t.adjustmentProposal ?? { history: [] };
      const proposal: TaskAdjustmentProposal = {
        ...existing,
        rejectionReason: payload.rejectionReason,
        subNotes: payload.subNotes,
        history: [
          ...(existing.history ?? []),
          { at: new Date().toISOString(), actor: 'sub', status: 'rejected', summary: `Rejected: ${payload.rejectionReason}` },
        ],
      };
      return { ...t, commitmentStatus: 'rejected', adjustmentProposal: proposal };
    });
    pushActivity({
      scheduleId,
      taskId,
      actor: 'sub',
      actorCompany: actorCompany ?? undefined,
      type: 'sub_rejected',
      message: `${actorCompany ?? 'Sub'} rejected Task #${taskId}: ${payload.rejectionReason}.`,
    });
  }, [schedules, flattenTasks, assertSubCanAct, updateTaskInSchedule, pushActivity]);

  const proposeTaskAdjustment = useCallback((scheduleId: string, taskId: string | number, payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>, actorCompany?: string | null) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    const task = schedule ? flattenTasks(schedule.tasks).find(t => String(t.id) === String(taskId)) : undefined;
    if (!assertSubCanAct(schedule, task, actorCompany)) return;
    updateTaskInSchedule(scheduleId, taskId, t => {
      const existing: TaskAdjustmentProposal = t.adjustmentProposal ?? { history: [] };
      const next: TaskAdjustmentProposal = {
        ...existing,
        ...payload,
        history: [
          ...(existing.history ?? []),
          { at: new Date().toISOString(), actor: 'sub', status: 'adjustment_proposed', summary: 'Adjustment proposed', proposal: { ...(payload as any), history: undefined } },
        ],
      };
      return { ...t, commitmentStatus: 'adjustment_proposed', adjustmentProposal: next };
    });
    pushActivity({
      scheduleId,
      taskId,
      actor: 'sub',
      actorCompany: actorCompany ?? undefined,
      type: 'sub_adjustment_proposed',
      message: `${actorCompany ?? 'Sub'} proposed an adjustment for Task #${taskId}.`,
    });
  }, [schedules, flattenTasks, assertSubCanAct, updateTaskInSchedule, pushActivity]);

  const gcAcceptAdjustment = useCallback((scheduleId: string, taskId: string | number, payload?: { gcResponseNotes?: string }) => {
    updateTaskInSchedule(scheduleId, taskId, t => {
      const existing: TaskAdjustmentProposal = t.adjustmentProposal ?? { history: [] };
      const next: TaskAdjustmentProposal = {
        ...existing,
        gcResponseNotes: payload?.gcResponseNotes ?? existing.gcResponseNotes,
        history: [
          ...(existing.history ?? []),
          { at: new Date().toISOString(), actor: 'gc', status: 'gc_accepted', summary: 'GC accepted adjustment' },
        ],
      };
      return { ...t, commitmentStatus: 'gc_accepted', adjustmentProposal: next };
    });
    pushActivity({
      scheduleId,
      taskId,
      actor: 'gc',
      type: 'gc_accepted_adjustment',
      message: `GC accepted adjustment for Task #${taskId}.`,
    });
  }, [updateTaskInSchedule, pushActivity]);

  const gcCounterPropose = useCallback((scheduleId: string, taskId: string | number, payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>) => {
    updateTaskInSchedule(scheduleId, taskId, t => {
      const existing: TaskAdjustmentProposal = t.adjustmentProposal ?? { history: [] };
      const next: TaskAdjustmentProposal = {
        ...existing,
        ...payload,
        history: [
          ...(existing.history ?? []),
          { at: new Date().toISOString(), actor: 'gc', status: 'gc_revised', summary: 'GC counter-proposed', proposal: { ...(payload as any), history: undefined } },
        ],
      };
      return { ...t, commitmentStatus: 'gc_revised', adjustmentProposal: next };
    });
    pushActivity({
      scheduleId,
      taskId,
      actor: 'gc',
      type: 'gc_counter_proposed',
      message: `GC counter-proposed on Task #${taskId}.`,
    });
  }, [updateTaskInSchedule, pushActivity]);

  const gcMarkDisputed = useCallback((scheduleId: string, taskId: string | number, payload?: { gcResponseNotes?: string }) => {
    updateTaskInSchedule(scheduleId, taskId, t => {
      const existing: TaskAdjustmentProposal = t.adjustmentProposal ?? { history: [] };
      const next: TaskAdjustmentProposal = {
        ...existing,
        gcResponseNotes: payload?.gcResponseNotes ?? existing.gcResponseNotes,
        history: [
          ...(existing.history ?? []),
          { at: new Date().toISOString(), actor: 'gc', status: 'disputed', summary: 'Marked disputed' },
        ],
      };
      return { ...t, commitmentStatus: 'disputed', adjustmentProposal: next };
    });
    pushActivity({
      scheduleId,
      taskId,
      actor: 'gc',
      type: 'gc_marked_disputed',
      message: `GC marked Task #${taskId} as disputed.`,
    });
  }, [updateTaskInSchedule, pushActivity]);
  
  const activeView = useMemo<View>(() => {
    if (activeViewId === null) {
      if (transientView && transientView.type === activeViewMode) {
        return transientView;
      }
      return { id: `transient-${Date.now()}`, name: 'Default View', ...getDefaultViewConfig(activeViewMode) };
    }
    const foundView = views.find(v => v.id === activeViewId);
    if (!foundView) {
        return { id: `transient-fallback-${Date.now()}`, name: 'Default View', ...getDefaultViewConfig(activeViewMode) };
    }
    return foundView;
  }, [views, activeViewId, activeViewMode, transientView]);

  const handleSelectView = (viewId: string) => {
    const selectedView = views.find(v => v.id === viewId);
    if (selectedView) {
      setActiveViewId(selectedView.id);
      setActiveViewMode(selectedView.type);
      setTransientView(null);
    }
    setDetailedTaskId(null);
  };

  const updateView = useCallback((updatedProps: Partial<Omit<View, 'id' | 'name'>>) => {
    if (activeViewId === null) {
      setTransientView(prev => ({ ...(prev ?? activeView), ...updatedProps }));
    } else {
      setViews(prev => prev.map(v => v.id === activeViewId ? { ...v, ...updatedProps } : v));
    }
  }, [activeViewId, activeView]);

  const setFilters = (filters: FilterRule[]) => updateView({ filters });
  const setSort = (sort: SortConfig) => updateView({ sort });
  const setColumns = (updater: SetStateAction<View['columns']>) => {
    const newColumns =
      typeof updater === 'function'
        ? updater(activeView.columns)
        : updater;
    updateView({ columns: newColumns });
  };
  const setDisplayDensity = (density: View['displayDensity']) => updateView({ displayDensity: density });
  const setShowGridLines = (show: boolean) => updateView({ showGridLines: show });
  const setShowMasterRange = (show: boolean) => updateView({ showMasterRange: show });
  const setFontSize = (size: number) => updateView({ fontSize: size });

  const handleSort = (columnId: ColumnId) => {
    const newSort: SortConfig = {
        columnId,
        direction: activeView.sort?.columnId === columnId && activeView.sort.direction === 'asc' ? 'desc' : 'asc',
    };
    setSort(newSort);
  };
  
  const handleViewModeChange = (mode: ViewMode) => {
      setActiveViewMode(mode);
      setActiveViewId(null);
      setTransientView({ 
          id: `transient-${Date.now()}`, 
          name: 'Default View', 
          ...getDefaultViewConfig(mode) 
      });
      setDetailedTaskId(null);
  };

  const handleUpdateTask = useCallback((taskId: number, updatedValues: Partial<Omit<Task, 'id' | 'children'>>) => {
      const updateRecursively = (taskItems: Task[]): Task[] => {
          return taskItems.map(task => {
              if (task.id === taskId) {
                  return { ...task, ...updatedValues };
              }
              if (task.children) {
                  return { ...task, children: updateRecursively(task.children) };
              }
              return task;
          });
      };
      setTasks(prev => updateRecursively(prev));
  }, []);

  const handlePriorityChange = useCallback((taskId: number, priority: Priority) => {
    handleUpdateTask(taskId, { priority });
  }, [handleUpdateTask]);

  const handleToggle = useCallback((taskId: number) => {
      const toggleRecursively = (taskItems: Task[]): Task[] => {
          return taskItems.map(task => {
              if (task.id === taskId) {
                  return { ...task, isExpanded: !task.isExpanded };
              }
              if (task.children) {
                  return { ...task, children: toggleRecursively(task.children) };
              }
              return task;
          });
      };
      setTasks(prev => toggleRecursively(prev));
  }, []);

  const handleSaveView = (name: string) => {
    if (modalState?.type === 'rename' && modalState.view) {
        setViews(views.map(v => v.id === modalState.view!.id ? { ...v, name } : v));
    } else {
        const newView: View = {
             ...activeView,
             id: `view_${Date.now()}`,
             name,
        };
        const newViews = [...views, newView];
        setViews(newViews);
        setActiveViewId(newView.id);
        setTransientView(null);

        if (newViews.length === 1) {
            setDefaultViewId(newView.id);
        }
    }
    setModalState(null);
  };
  
  const handleDeleteView = (id: string) => {
    const viewToDelete = views.find(v => v.id === id);
    if (!viewToDelete) return;

    const newViews = views.filter(v => v.id !== id);
    setViews(newViews);

    if (defaultViewId === id) {
        setDefaultViewId(newViews.length > 0 ? newViews[0].id : '');
    }

    if (activeViewId === id) {
        const nextViewInMode = newViews.find(v => v.type === viewToDelete.type);
        if (nextViewInMode) {
            setActiveViewId(nextViewInMode.id);
        } else {
            setActiveViewId(null);
            setActiveViewMode(viewToDelete.type);
            setTransientView({ id: `transient-${Date.now()}`, name: `Default ${viewToDelete.type}`, ...getDefaultViewConfig(viewToDelete.type) });
        }
    }
  };

  const detailedTask = useMemo(() => {
    if (!detailedTaskId) return null;
    const findTask = (items: Task[]): Task | null => {
        for (const item of items) {
            if (item.id === detailedTaskId) return item;
            if (item.children) {
                const found = findTask(item.children);
                if (found) return found;
            }
        }
        return null;
    }
    return findTask(tasks);
  }, [tasks, detailedTaskId]);

  const value: ProjectContextType = {
    tasks, setTasks,
    views, setViews,
    activeViewId,
    handleSelectView,
    defaultViewId, setDefaultViewId,
    activeViewMode, handleViewModeChange,
    selectedTaskIds, setSelectedTaskIds,
    editingCell, setEditingCell,
    detailedTaskId, setDetailedTaskId,
    searchTerm, setSearchTerm,
    modalState, setModalState,
    showFilterMenu, setShowFilterMenu,
    showFieldsMenu, setShowFieldsMenu,
    activeView,
    updateView,
    setFilters,
    setSort,
    setColumns,
    setDisplayDensity,
    setShowGridLines,
    setShowMasterRange,
    setFontSize,
    handleSort,
    handleUpdateTask,
    handlePriorityChange,
    handleToggle,
    handleSaveView,
    handleDeleteView,
    detailedTask,
    schedules,
    activeScheduleId,
    setActiveScheduleId,
    publishSchedule,
    forcePublishSchedule,
    submitScheduleForReview,
    pullBackScheduleToDraft,
    createDraft,
    updateScheduleTasks,
    deltas,
    isCreateLookaheadModalOpen,
    setIsCreateLookaheadModalOpen,
    isAddTaskModalOpen,
    setIsAddTaskModalOpen,
    commitmentByTaskId,
    setCommitment,
    projectRisks,
    addProjectRisk,

    activityFeedByScheduleId,
    commitTask,
    rejectTask,
    proposeTaskAdjustment,
    gcAcceptAdjustment,
    gcCounterPropose,
    gcMarkDisputed,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};