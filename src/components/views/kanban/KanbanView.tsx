import React, { useMemo } from 'react';
import { useProject } from '../../../context/ProjectContext';
import { LookaheadTask, ConstraintStatus } from '../lookahead/types';
import { parseDate } from '../../../lib/dateUtils';
import { detectLocationClashes, LocationClash } from '../lookahead/utils/clashUtils';
import { AlertTriangleIcon, HardHatIcon } from '../../common/Icons';

// ─── Column definitions ──────────────────────────────────────────────────────

type KanbanColumn = 'delayed' | 'on_track' | 'yet_to_start';

interface ColumnConfig {
  id: KanbanColumn;
  label: string;
  /** Uppercase lane title */
  headerTitle: string;
  dotClass: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'yet_to_start',
    label: 'Yet to Start',
    headerTitle: 'YET TO START',
    dotClass: 'bg-gray-400',
  },
  {
    id: 'on_track',
    label: 'On Track',
    headerTitle: 'ON TRACK',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'delayed',
    label: 'Delayed',
    headerTitle: 'DELAYED',
    dotClass: 'bg-orange-500',
  },
];

// ─── Categorisation logic ─────────────────────────────────────────────────────

function categorise(task: LookaheadTask, today: Date): KanbanColumn {
  const start = parseDate(task.startDate);
  const finish = parseDate(task.finishDate);
  const progress = task.progress ?? 0;

  if (progress === 0 && start > today) return 'yet_to_start';
  if (progress >= 100) return 'on_track';
  if (finish < today && progress < 100) return 'delayed';
  if (progress === 0 && start <= today) return 'delayed';
  return 'on_track';
}

function taskMatchesSearch(task: LookaheadTask, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    task.name,
    task.taskCode,
    String(task.id),
    task.contractor,
    task.taskType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(s);
}

// ─── Flatten hierarchy ────────────────────────────────────────────────────────

function flattenTasks(tasks: LookaheadTask[]): LookaheadTask[] {
  const result: LookaheadTask[] = [];
  for (const t of tasks) {
    if (!t.children || t.children.length === 0) {
      result.push(t);
    } else {
      result.push(...flattenTasks(t.children));
    }
  }
  return result;
}

// ─── Card helpers ─────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-emerald-500',
  'bg-orange-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-rose-500',
] as const;

function avatarColorKey(s: string): (typeof AVATAR_PALETTE)[number] {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function getInitials(task: LookaheadTask): string {
  const name = (task.contractor || task.name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function displayTaskId(task: LookaheadTask): string {
  const code = (task.taskCode || '').trim();
  if (code) return code;
  return `ID-${task.id}`;
}

/** Same rules as ConstraintBadge / DailyMetricsPanel: Complete → Blocked → At Risk → Ready */
function statusBadgeForTask(task: LookaheadTask): { label: string; pill: string; dot: string } {
  if ((task.progress ?? 0) >= 100) {
    return {
      label: 'Complete',
      pill: 'bg-blue-50 text-blue-800 ring-1 ring-blue-100/80',
      dot: 'text-blue-600',
    };
  }
  const statuses = Object.values(task.status);
  if (statuses.includes(ConstraintStatus.Overdue)) {
    return {
      label: 'Blocked',
      pill: 'bg-red-50 text-red-800 ring-1 ring-red-100/80',
      dot: 'text-red-500',
    };
  }
  if (statuses.includes(ConstraintStatus.Pending)) {
    return {
      label: 'At Risk',
      pill: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100/80',
      dot: 'text-amber-500',
    };
  }
  return {
    label: 'Ready',
    pill: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100/80',
    dot: 'text-emerald-500',
  };
}

const hasBlockingConstraint = (task: LookaheadTask) =>
  task.constraints.some(c => c.severity === 'Blocking' && c.status !== ConstraintStatus.Complete);

function hasOpenWarningConstraint(task: LookaheadTask) {
  return task.constraints.some(c => c.severity === 'Warning' && c.status !== ConstraintStatus.Complete);
}

function buildClashesByTaskId(clashes: LocationClash[]) {
  const map = new Map<string | number, LocationClash[]>();
  clashes.forEach(c => {
    c.taskIds.forEach(id => {
      const existing = map.get(id) ?? [];
      existing.push(c);
      map.set(id, existing);
    });
  });
  return map;
}

function getClashAlertForTask(task: LookaheadTask, clashesByTaskId: Map<string | number, LocationClash[]>) {
  const list = clashesByTaskId.get(task.id) ?? [];
  const urgent = list.find(c => c.status === 'Unresolved' || c.status === 'Accepted risk');
  return urgent ?? null;
}

function constraintSeverityStyles(c: { severity: 'Blocking' | 'Warning'; status: ConstraintStatus }) {
  const open = c.status !== ConstraintStatus.Complete;
  if (!open) return 'border-l-emerald-400 bg-emerald-50/40';
  if (c.severity === 'Blocking') return 'border-l-red-500 bg-red-50/50';
  return 'border-l-amber-400 bg-amber-50/40';
}

// ─── Card component ───────────────────────────────────────────────────────────

const TaskCard: React.FC<{
  task: LookaheadTask;
  column: KanbanColumn;
  clashesByTaskId: Map<string | number, LocationClash[]>;
}> = ({ task, column, clashesByTaskId }) => {
  const blocked = hasBlockingConstraint(task);
  const openWarnings = hasOpenWarningConstraint(task);
  const clashAlert = getClashAlertForTask(task, clashesByTaskId);
  const healthBadge = statusBadgeForTask(task);
  const showTrend = column === 'delayed' || task.isCriticalPath === true;
  const initials = getInitials(task);
  const avKey = task.contractor || task.name || String(task.id);
  const avBg = avatarColorKey(avKey);
  const pct = Math.round(Math.min(100, Math.max(0, task.progress ?? 0)));

  const barColor =
    task.progress >= 100
      ? 'bg-emerald-500'
      : column === 'delayed'
        ? 'bg-red-400'
        : 'bg-blue-500';

  const hasAnyAlert = blocked || openWarnings || !!clashAlert;

  return (
    <div
      className={`bg-white rounded-lg border p-4 space-y-3 transition-shadow duration-150 hover:shadow-md ${
        blocked
          ? 'border-amber-300 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-amber-200/60'
          : 'border-gray-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-gray-400 tabular-nums truncate">{displayTaskId(task)}</span>
          {showTrend && (
            <span className="text-[11px] font-bold text-orange-500 flex-shrink-0" title="Attention">
              ↑
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${healthBadge.pill}`}
        >
          <span className={healthBadge.dot}>●</span>
          {healthBadge.label}
        </span>
      </div>

      <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-3">{task.name}</p>

      <div className="flex items-start gap-2 rounded-md bg-gray-50/80 px-2.5 py-2 border border-gray-100">
        <HardHatIcon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Contractor</p>
          <p className="text-sm font-medium text-gray-800 leading-snug break-words">
            {(task.contractor || '').trim() || '—'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-500">Progress</span>
          <span className="text-sm font-bold tabular-nums text-gray-900">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {task.constraints.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Constraints</p>
          <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {task.constraints.map((c, i) => (
              <li
                key={`${c.type}-${c.name}-${i}`}
                className={`rounded-md pl-2 py-1.5 text-left border-l-4 ${constraintSeverityStyles(c)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-gray-600">{c.type}</span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      c.severity === 'Blocking'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {c.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-800 leading-snug line-clamp-2 mt-0.5">{c.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{c.status}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasAnyAlert && (
        <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900 flex items-center gap-1">
            <AlertTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            Warnings
          </p>
          <ul className="space-y-1 text-xs text-amber-950">
            {blocked && (
              <li className="flex gap-1.5">
                <span className="font-semibold text-red-700 flex-shrink-0">Blocking</span>
                <span>Open blocking constraints must be resolved.</span>
              </li>
            )}
            {openWarnings && (
              <li className="flex gap-1.5">
                <span className="font-semibold text-amber-800 flex-shrink-0">Warning</span>
                <span>Open warning-level constraints on this task.</span>
              </li>
            )}
            {clashAlert && (
              <li className="flex gap-1.5">
                <span className="font-semibold text-amber-800 flex-shrink-0">Clash</span>
                <span>
                  Location overlap at {clashAlert.location}
                  {clashAlert.status === 'Unresolved' ? ' (unresolved)' : ` (${clashAlert.status})`}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-gray-100">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-gray-400">
          <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" aria-hidden />
          <span className="truncate tabular-nums">End {task.finishDate}</span>
        </div>
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${avBg}`}
          title={task.contractor || undefined}
        >
          {initials}
        </div>
      </div>
    </div>
  );
};

// ─── Column component ─────────────────────────────────────────────────────────

const KanbanColumnPanel: React.FC<{
  config: ColumnConfig;
  tasks: LookaheadTask[];
  clashesByTaskId: Map<string | number, LocationClash[]>;
}> = ({ config, tasks, clashesByTaskId }) => (
  <div className="flex w-[400px] min-w-[380px] flex-shrink-0 flex-col rounded-t-xl bg-[#F4F5F7] min-h-0">
    <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${config.dotClass}`} aria-hidden />
        <span className="truncate text-xs font-bold tracking-wide text-gray-700">{config.headerTitle}</span>
      </div>
      <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-gray-200/90 px-1.5 text-xs font-semibold text-gray-700 tabular-nums">
        {tasks.length}
      </span>
    </div>

    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 pt-0.5">
      {tasks.length === 0 ? (
        <p className="py-8 text-center text-xs text-gray-400">No tasks</p>
      ) : (
        tasks.map(t => (
          <TaskCard key={String(t.id)} task={t} column={config.id} clashesByTaskId={clashesByTaskId} />
        ))
      )}
    </div>
  </div>
);

// ─── Main view ────────────────────────────────────────────────────────────────

const KanbanView: React.FC = () => {
  const { schedules, activeScheduleId, searchTerm } = useProject();

  const schedule = useMemo(
    () => schedules.find(s => s.id === activeScheduleId) ?? schedules[0] ?? null,
    [schedules, activeScheduleId],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const grouped = useMemo<Record<KanbanColumn, LookaheadTask[]>>(() => {
    const base: Record<KanbanColumn, LookaheadTask[]> = {
      delayed: [],
      on_track: [],
      yet_to_start: [],
    };
    if (!schedule) return base;
    const flat = flattenTasks(schedule.tasks).filter(t => taskMatchesSearch(t, searchTerm));
    for (const t of flat) {
      base[categorise(t, today)].push(t);
    }
    return base;
  }, [schedule, today, searchTerm]);

  const clashesByTaskId = useMemo(() => {
    if (!schedule) return new Map<string | number, LocationClash[]>();
    return buildClashesByTaskId(detectLocationClashes(schedule.tasks));
  }, [schedule]);

  if (!schedule) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F4F5F7] text-sm text-gray-400">
        No schedule available.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F4F5F7]">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-min gap-5 p-4">
          {COLUMNS.map(col => (
            <KanbanColumnPanel
              key={col.id}
              config={col}
              tasks={grouped[col.id]}
              clashesByTaskId={clashesByTaskId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanView;
