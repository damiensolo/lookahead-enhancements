import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LookaheadTask, Constraint, ConstraintStatus, ConstraintType, CONTRACTORS, TaskDelta, CommitmentState, ProjectRisk, ScheduleStatus, TaskAdjustmentProposal } from '../types';
import { getEffectiveDailyMetrics, getTotalPlannedQuantity, getTotalActualQuantity, getQuantityUnit, ensureProductionQuantity, formatQuantityDisplay, getMaxActualForDay } from '../utils/quantityUtils';
import { getLookaheadPermissions } from '../utils/permissionUtils';
import { XIcon, PlusIcon, AlertTriangleIcon, HardHatIcon } from '../../../common/Icons';
import ManHoursBar from './ManHoursBar';
import ContractorSelect from './ContractorSelect';
import ProgressSlider from './ProgressSlider';
import { formatDisplayDate } from '../../../../lib/dateUtils';
import { GroupedBarChart, LineChart, SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes } from '@carbon/charts';
import '@carbon/charts/styles.css';
import { getDailyPlannedVsActual, getCumulativeCurve, getRollingProductionRate } from '../../production/productionReportUtils';


interface LookaheadDetailsPanelProps {
  task: LookaheadTask | null;
  taskDelta?: TaskDelta;
  onClose: () => void;
  onAddConstraint: (taskId: string | number, constraint: Constraint) => void;
  onUpdateProgress?: (taskId: string | number, progress: number) => void;
  onUpdateContractor?: (taskId: string | number, contractor: string) => void;
  onUpdatePlannedQuantity?: (taskId: string | number, planned: number, unit: string) => void;
  onUpdateDailyQuantity?: (taskId: string | number, date: string, plan: number, actual: number) => void;
  /** Open Add Crew modal for this task (taskId, dateString) */
  onOpenAddCrew?: (taskId: string | number, dateString: string) => void;
  /** When true (lookahead in draft mode), quantity fields are editable */
  isDraft?: boolean;
  /** When true (closed lookahead), entire panel is read-only - no edits */
  isReadOnly?: boolean;
  /** When true, render content only (no aside wrapper) for use inside unified panel */
  embedded?: boolean;
  /** SC commitment state for this task (when persona is SC and task is net-new) */
  commitment?: CommitmentState | null;
  /** True when this task was added in last publish and belongs to SC company */
  isNetNew?: boolean;
  /** Update commitment state (SC net-new workflow) */
  onSetCommitment?: (state: Partial<CommitmentState>) => void;
  /** Persona for GC/SC demo */
  persona?: 'gc' | 'sc';
  /** When SC rejects with Unanswered RFI, add to project risks */
  addProjectRisk?: (risk: Omit<ProjectRisk, 'addedAt'>) => void;
  /** Open the commitment modal (SC net-new workflow) */
  onOpenCommitmentModal?: () => void;
  /** True when this task is a root-level task (not a field breakdown child); commitment only applies to top-level */
  isTopLevelTask?: boolean;

  /** Schedule status (used for In Review workflow) */
  scheduleStatus?: ScheduleStatus;
  /** GC in-review actions */
  onGcAcceptAdjustment?: (taskId: string | number, payload?: { gcResponseNotes?: string }) => void;
  onGcCounterPropose?: (taskId: string | number, payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>) => void;
  onGcMarkDisputed?: (taskId: string | number, payload?: { gcResponseNotes?: string }) => void;
  /** Open the GC review modal for this task */
  onOpenGcReviewModal?: () => void;
}

const getStatusDot = (status: ConstraintStatus) => {
  let color = 'bg-gray-400';
  switch (status) {
    case ConstraintStatus.Complete:
    case ConstraintStatus.OnSite:
      color = 'bg-green-500';
      break;
    case ConstraintStatus.Overdue:
      color = 'bg-red-500';
      break;
    case ConstraintStatus.Pending:
      color = 'bg-yellow-500';
      break;
  }
  return <span className={`w-3 h-3 rounded-full ${color}`}></span>;
};

const getStatusClasses = (status: ConstraintStatus): { text: string; bg: string; } => {
  switch (status) {
    case ConstraintStatus.Complete:
    case ConstraintStatus.OnSite:
      return { text: 'text-green-800', bg: 'bg-green-100' };
    case ConstraintStatus.Overdue:
      return { text: 'text-red-800', bg: 'bg-red-100' };
    case ConstraintStatus.Pending:
      return { text: 'text-yellow-800', bg: 'bg-yellow-100' };
    default:
      return { text: 'text-gray-800', bg: 'bg-gray-100' };
  }
};

const getOverallStatusInfo = (constraints: Constraint[], progress?: number): { label: string; dotColor: string; textColor: string } => {
  if (progress !== undefined && progress >= 100) {
    return { label: 'Complete', dotColor: 'bg-emerald-600', textColor: 'text-emerald-700' };
  }
  if (constraints.some(c => c.status === ConstraintStatus.Overdue || c.severity === 'Blocking')) {
    return { label: 'Blocked', dotColor: 'bg-red-500', textColor: 'text-red-700' };
  }
  if (constraints.some(c => c.status === ConstraintStatus.Pending)) {
    return { label: 'At Risk', dotColor: 'bg-yellow-500', textColor: 'text-yellow-700' };
  }
  return { label: 'Ready', dotColor: 'bg-green-500', textColor: 'text-green-700' };
};


const AddConstraintForm: React.FC<{ onAdd: (constraint: Constraint) => void, onCancel: () => void }> = ({ onAdd, onCancel }) => {
    const [type, setType] = useState<ConstraintType>(ConstraintType.Material);
    const [severity, setSeverity] = useState<'Blocking' | 'Warning'>('Warning');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (!description.trim()) return;
        const newConstraint: Constraint = {
            type,
            name: description,
            status: severity === 'Blocking' ? ConstraintStatus.Overdue : ConstraintStatus.Pending,
            severity,
            flaggedBy: 'GC Super', // Mocked user
            timestamp: new Date().toLocaleString(),
        };
        onAdd(newConstraint);
    };

    return (
        <div className="p-4 my-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Flag New Constraint</h4>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <select value={type} onChange={e => setType(e.target.value as ConstraintType)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        {Object.values(ConstraintType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={severity} onChange={e => setSeverity(e.target.value as 'Blocking' | 'Warning')} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="Warning">Warning</option>
                        <option value="Blocking">Blocking</option>
                    </select>
                </div>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description (e.g., Material delivery delayed)"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                />
            </div>
            <div className="flex justify-end gap-2 mt-3">
                <button onClick={onCancel} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} className="px-3 py-1 text-sm font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700 disabled:opacity-50" disabled={!description.trim()}>Add</button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Helpers for analytics charts
// ---------------------------------------------------------------------------

const fmtDate = (iso: string): string => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ---------------------------------------------------------------------------
// Analytics tab — Part C
// ---------------------------------------------------------------------------

const AnalyticsTab: React.FC<{ task: LookaheadTask }> = ({ task }) => {
    const totalPlanned = getTotalPlannedQuantity(task);

    const dailyData = useMemo(() => getDailyPlannedVsActual([task]), [task]);

    const plannedByFmtDate = useMemo(() => {
        const m: Record<string, number> = {};
        dailyData.forEach(d => { m[fmtDate(d.date)] = d.planned; });
        return m;
    }, [dailyData]);

    // Chart 1 — Daily planned vs actual (GroupedBarChart)
    const chart1Data = useMemo(() => dailyData.flatMap(d => [
        { group: 'Planned', date: fmtDate(d.date), value: d.planned },
        { group: 'Actual', date: fmtDate(d.date), value: d.actual },
    ]), [dailyData]);

    const chart1Options = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        accessibility: { enabled: true },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
        },
        height: '200px',
        color: {
            getFillColor: (group: string, label: string | number, data: Record<string, unknown>) => {
                if (group === 'Planned') return '#94a3b8';
                const planned = plannedByFmtDate[String(label)] ?? 0;
                const actual = typeof data?.value === 'number' ? data.value : 0;
                if (actual <= 0) return '#d1d5db';
                return actual >= planned ? '#15803D' : '#B91C1C';
            },
        },
    }), [plannedByFmtDate]);

    // Chart 2 — Cumulative production (LineChart)
    const curve = useMemo(() => getCumulativeCurve(task), [task]);
    const hasActuals = useMemo(() => curve.actual.some(v => v > 0), [curve]);

    const chart2Data = useMemo(() => [
        ...curve.dates.map((d, i) => ({ group: 'Planned', date: fmtDate(d), value: curve.planned[i] })),
        ...(hasActuals ? curve.dates.map((d, i) => ({ group: 'Actual', date: fmtDate(d), value: curve.actual[i] })) : []),
    ], [curve, hasActuals]);

    const chart2Options = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        accessibility: { enabled: true },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
        },
        height: '180px',
        color: { scale: { Planned: '#94a3b8', Actual: '#2563eb' } },
    }), []);

    // Chart 3 — Daily variance (SimpleBarChart)
    const chart3Data = useMemo(() =>
        dailyData
            .filter(d => d.planned > 0)
            .map(d => ({ group: 'Variance', date: fmtDate(d.date), value: d.actual - d.planned })),
        [dailyData]
    );

    const chart3Options = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        accessibility: { enabled: true },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
        },
        height: '160px',
        color: {
            getFillColor: (group: string, label: string | number, data: Record<string, unknown>) => {
                const val = typeof data?.value === 'number' ? data.value : 0;
                return val >= 0 ? '#15803D' : '#B91C1C';
            },
        },
    }), []);

    // Chart 4 — Production rate sparkline (LineChart)
    const rolling = useMemo(() => getRollingProductionRate(task), [task]);
    const actualDays = useMemo(() => dailyData.filter(d => d.actual > 0).length, [dailyData]);
    const sevenDayAvg = rolling.length > 0 ? rolling[rolling.length - 1].rate : null;

    const sparkData = useMemo(() =>
        rolling.map(r => ({ group: 'Rate', date: fmtDate(r.date), value: r.rate })),
        [rolling]
    );

    const chart4Options = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        accessibility: { enabled: true },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS, visible: false },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR, visible: false },
        },
        height: '100px',
        color: { scale: { Rate: '#2563eb' } },
        points: { enabled: false },
        grid: { x: { enabled: false }, y: { enabled: false } },
    }), []);

    if (totalPlanned === 0) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[160px]">
                <p className="text-sm text-gray-400 text-center">No production data planned for this task yet.</p>
            </div>
        );
    }

    return (
        <div className="p-4 flex flex-col" style={{ gap: '12px' }}>
            {/* Chart 1 */}
            <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Daily planned vs actual</div>
                <GroupedBarChart data={chart1Data} options={chart1Options} />
            </div>

            {/* Chart 2 */}
            <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Cumulative production</div>
                <LineChart data={chart2Data} options={chart2Options} />
                {!hasActuals && (
                    <p className="text-[10px] text-gray-400 mt-1">Actual data populates as days are closed.</p>
                )}
            </div>

            {/* Chart 3 */}
            <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Daily variance (actual − planned)</div>
                <SimpleBarChart data={chart3Data} options={chart3Options} />
            </div>

            {/* Chart 4 */}
            <div>
                <div className="flex items-baseline gap-2 mb-1">
                    <span style={{ fontSize: '16px', fontWeight: 500 }}>
                        {actualDays >= 2 && sevenDayAvg !== null ? sevenDayAvg.toFixed(2) : '—'}
                    </span>
                    <span className="text-xs text-gray-400">7-day avg output</span>
                </div>
                {actualDays >= 2 ? (
                    <LineChart data={sparkData} options={chart4Options} />
                ) : null}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

const LookaheadDetailsPanel: React.FC<LookaheadDetailsPanelProps> = ({ task, taskDelta, onClose, onAddConstraint, onUpdateProgress, onUpdateContractor, onUpdatePlannedQuantity, onUpdateDailyQuantity, onOpenAddCrew, isDraft = true, isReadOnly = false, embedded = false, commitment, isNetNew, isTopLevelTask = true, onSetCommitment, persona, addProjectRisk, onOpenCommitmentModal, scheduleStatus, onGcAcceptAdjustment, onGcCounterPropose, onGcMarkDisputed, onOpenGcReviewModal }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [plannedInputValue, setPlannedInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  useEffect(() => {
    if (task) setIsAdding(false);
  }, [task]);

  useEffect(() => {
    if (task) {
      const pq = getTotalPlannedQuantity(task);
      setPlannedInputValue(pq > 0 ? String(pq) : '');
    } else {
      setPlannedInputValue('');
    }
  }, [task?.id]);

  useEffect(() => {
    setActiveTab('overview');
  }, [task?.id]);


  const { canEditPlannedQty, showActualQtySection, canEditActualQty } = getLookaheadPermissions(scheduleStatus ?? '');

  const overallStatus = task ? getOverallStatusInfo(task.constraints, task.progress) : null;
  const content = task && overallStatus ? (
        <div className="flex flex-col h-full bg-gray-50">
          <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="lookahead-details-title" className="text-lg font-semibold text-gray-800 truncate">{task.name}</h2>
            <button onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close details">
              <XIcon className="w-5 h-5" />
            </button>
          </header>

          {/* Tab bar — Part B */}
          <div
            role="tablist"
            className="relative grid border-b border-gray-200 bg-white flex-shrink-0"
            style={{ gridTemplateColumns: '1fr 1fr' }}
          >
            <button
              role="tab"
              aria-selected={activeTab === 'overview'}
              data-state={activeTab === 'overview' ? 'active' : 'inactive'}
              onClick={() => setActiveTab('overview')}
              className={`py-2.5 text-sm font-medium transition-colors ${activeTab === 'overview' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Overview
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'analytics'}
              data-state={activeTab === 'analytics' ? 'active' : 'inactive'}
              onClick={() => setActiveTab('analytics')}
              className={`py-2.5 text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Analytics
            </button>
            {/* Sliding indicator */}
            <div
              className="absolute bottom-0 h-0.5 bg-gray-900 pointer-events-none"
              style={{
                width: '50%',
                transform: `translateX(${activeTab === 'overview' ? '0%' : '100%'})`,
                transition: 'transform 200ms ease, width 200ms ease',
              }}
            />
          </div>

          {/* Tab content */}
          <div className="flex-grow overflow-y-auto">

            {/* Overview tab — Part B: all current content, Part A: restructured metadata grid */}
            {activeTab === 'overview' && (
              <div className="p-6">

                <div className="mb-8">
                  <div className="px-4 py-0 bg-gray-50 rounded-lg space-y-4">
                    {task.isCriticalPath && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangleIcon className="w-5 h-5" />
                        <span className="font-semibold text-sm">Critical Task</span>
                      </div>
                    )}

                    {/* Metadata grid */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 3fr' }}>
                        {/* Row 1: Cost Code | Contractor */}
                        <div>
                            <div className="text-xs text-gray-500">Cost Code</div>
                            <div className="font-semibold text-gray-800 text-sm">{task.taskCode}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Contractor</div>
                            {task.taskType === 'Field Task' && onUpdateContractor ? (
                                <ContractorSelect
                                    value={task.contractor}
                                    onChange={(val) => onUpdateContractor(task.id, val)}
                                />
                            ) : (
                                <div className="font-semibold text-gray-800 text-sm px-1">{task.contractor}</div>
                            )}
                        </div>
                        {/* Row 2: Overall Health | Crew Assigned */}
                        <div>
                            <div className="text-xs text-gray-500">Overall Health</div>
                            <div className={`flex items-center gap-2 font-bold text-lg ${overallStatus.textColor}`}>
                                <span className={`w-3 h-3 rounded-full ${overallStatus.dotColor}`}></span>
                                <span>{overallStatus.label}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Crew Assigned</div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-800 text-sm">
                                    {task.assignedCrewByDate?.[task.startDate]?.length ?? task.crewAssigned}
                                </span>
                                {onOpenAddCrew && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenAddCrew(task.id, task.startDate)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-transparent border border-transparent rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                        title="Add Crew"
                                    >
                                        <HardHatIcon className="w-4 h-4" />
                                        Add Crew
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* taskDelta — full width */}
                        {taskDelta && (
                            <div className="col-span-2">
                                <div className="text-xs text-gray-500">Change from last publish</div>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                    taskDelta.type === 'added' ? 'bg-green-100 text-green-600' :
                                    taskDelta.type === 'modified' ? 'bg-blue-100 text-blue-600' :
                                    'bg-red-100 text-red-600'
                                }`}>
                                    {taskDelta.type}
                                </span>
                            </div>
                        )}
                        {/* Schedule Analysis — full width */}
                        {(() => {
                            // Derive effective field date range.
                            // If this task has field-breakdown children, compute min start / max finish
                            // from those children so the panel reflects their actual scheduled range.
                            const fieldKids = task.children?.filter(c => c.taskType === 'Field Task') ?? [];
                            const effFieldStart = fieldKids.length > 0
                                ? fieldKids.reduce((m, c) => { const d = c.fieldStartDate || c.startDate; return d < m ? d : m; }, fieldKids[0].fieldStartDate || fieldKids[0].startDate)
                                : (task.fieldStartDate || task.startDate);
                            const effFieldFinish = fieldKids.length > 0
                                ? fieldKids.reduce((m, c) => { const d = c.fieldFinishDate || c.finishDate; return d > m ? d : m; }, fieldKids[0].fieldFinishDate || fieldKids[0].finishDate)
                                : (task.fieldFinishDate || task.finishDate);
                            const fieldSlipped = effFieldStart > task.startDate || effFieldFinish > task.finishDate;
                            const hasFieldData = effFieldStart !== task.startDate || effFieldFinish !== task.finishDate;
                            return (
                                <div className="col-span-2">
                                    <div className="text-xs text-gray-500 mb-1">Schedule Analysis</div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-2 bg-white border border-black/5 rounded-lg">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Planned</span>
                                            <span className="text-sm font-medium text-zinc-600">{formatDisplayDate(task.startDate)} → {formatDisplayDate(task.finishDate)}</span>
                                        </div>
                                        {hasFieldData ? (
                                            <div className={`flex items-center justify-between p-2 rounded-lg border ${fieldSlipped ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Field (Actual)</span>
                                                <span className={`text-sm font-bold ${fieldSlipped ? 'text-red-600' : 'text-blue-700'}`}>
                                                    {formatDisplayDate(effFieldStart)} → {formatDisplayDate(effFieldFinish)}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center p-2 bg-gray-50 border border-gray-100 rounded-lg">
                                                <span className="text-[11px] text-gray-400">No field adjustments yet</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Production — merged progress + quantities */}
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Production</h3>
                        {(() => {
                            const hasSubTasks = task.children && task.children.length > 0;
                            const isEditable = !hasSubTasks && onUpdateProgress;
                            const plannedQty = getTotalPlannedQuantity(task);
                            const actualQty = getTotalActualQuantity(task);
                            const unit = getQuantityUnit(task);
                            const hasQty = plannedQty > 0;
                            return (
                                <>
                                    {/* Summary row: % + quantity fraction */}
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-lg font-bold text-blue-600">{task.progress}%</span>
                                        {hasQty && (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-semibold text-gray-700">
                                                    {formatQuantityDisplay(actualQty)}&thinsp;/&thinsp;{formatQuantityDisplay(plannedQty)}
                                                </span>
                                                <span className="text-xs text-gray-400">{unit}</span>
                                                {task.productionQuantity?.plannedLocked && (
                                                    <span className="text-[10px] text-amber-600">(locked)</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress bar or slider */}
                                    {isEditable ? (
                                        <div className="px-2 py-1">
                                            <ProgressSlider
                                                value={task.progress}
                                                onChange={(v) => onUpdateProgress(task.id, v)}
                                                size="md"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${task.progress}%` }}
                                                    className="h-full bg-blue-500"
                                                />
                                            </div>
                                            {hasSubTasks && (
                                                <p className="text-xs text-gray-500 mt-1">Calculated from sub-tasks</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Draft: set planned qty inputs */}
                                    {canEditPlannedQty && (
                                        <div className="mt-3 space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Set Planned Qty</label>
                                            <div className="flex gap-2 w-full min-w-0">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={plannedInputValue}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        setPlannedInputValue(raw);
                                                        const v = parseFloat(raw);
                                                        if (onUpdatePlannedQuantity && (raw === '' || (!isNaN(v) && v >= 0))) {
                                                            onUpdatePlannedQuantity(task.id, raw === '' ? 0 : v, getQuantityUnit(task));
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const v = parseFloat(plannedInputValue);
                                                        if (isNaN(v) || v < 0) setPlannedInputValue(getTotalPlannedQuantity(task) > 0 ? String(getTotalPlannedQuantity(task)) : '');
                                                    }}
                                                    placeholder="Enter planned"
                                                    className="flex-1 min-w-0 w-24 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <select
                                                    value={getQuantityUnit(task)}
                                                    onChange={(e) => onUpdatePlannedQuantity?.(task.id, parseFloat(plannedInputValue) || getTotalPlannedQuantity(task) || 0, e.target.value)}
                                                    className="flex-shrink-0 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    {['EA', 'CY', 'LF', 'SF', 'TON', 'CF'].map(u => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {onUpdatePlannedQuantity && getTotalPlannedQuantity(task) > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdatePlannedQuantity(task.id, getTotalPlannedQuantity(task), getQuantityUnit(task))}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    Evenly distribute
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Daily table */}
                                    <div className="mt-3">
                                    <div className="rounded border border-gray-200 bg-white overflow-hidden">
                                    {getEffectiveDailyMetrics(task).length === 0 ? (
                                        <p className="text-xs text-gray-500 py-6 px-4 text-center">No daily data. Enter planned qty to distribute.</p>
                                    ) : (
                                        <div className="overflow-y-auto overflow-x-hidden max-h-44">
                                            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                                                <colgroup>
                                                    <col style={{ width: '38%' }} />
                                                    <col style={{ width: '31%' }} />
                                                    <col style={{ width: '31%' }} />
                                                </colgroup>
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="text-left px-2 py-2 font-semibold text-gray-600">Date</th>
                                                        <th className="text-right px-1 py-2 font-semibold text-gray-600">Plan</th>
                                                        <th className="text-right px-1 py-2 font-semibold text-gray-600">Actual</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getEffectiveDailyMetrics(task).map((m) => {
                                                        const planVal = m.quantity?.plan ?? 0;
                                                        const actualVal = m.quantity?.actual ?? 0;
                                                        const canEdit = (canEditPlannedQty || canEditActualQty) && !!onUpdateDailyQuantity;
                                                        const canEditActual = canEditActualQty && !!onUpdateDailyQuantity;
                                                        return (
                                                            <tr key={m.date} className="border-t border-gray-100">
                                                                <td className="px-2 py-1 text-gray-700 truncate align-middle" title={formatDisplayDate(m.date)}>{formatDisplayDate(m.date)}</td>
                                                                <td className="px-1 py-1 text-right align-middle">
                                                                    {canEdit ? (
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            step={1}
                                                                            value={Math.round(planVal)}
                                                                            onChange={(e) => {
                                                                                const v = Math.round(parseFloat(e.target.value));
                                                                                if (!isNaN(v) && v >= 0) onUpdateDailyQuantity(task.id, m.date, v, actualVal);
                                                                            }}
                                                                            className="w-full max-w-full min-w-0 py-1 px-1.5 text-right text-xs border border-gray-300 rounded box-border"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-gray-600">{formatQuantityDisplay(planVal)}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-1 py-1 text-right align-middle">
                                                                    {canEditActual ? (
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            max={getMaxActualForDay(task, m.date)}
                                                                            step={1}
                                                                            value={Math.round(actualVal)}
                                                                            onChange={(e) => {
                                                                                const v = Math.round(parseFloat(e.target.value));
                                                                                if (!isNaN(v) && v >= 0) onUpdateDailyQuantity(task.id, m.date, planVal, v);
                                                                            }}
                                                                            className="w-full max-w-full min-w-0 py-1 px-1.5 text-right text-xs border border-gray-300 rounded box-border font-medium text-blue-700"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-medium text-blue-700">{formatQuantityDisplay(actualVal)}</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    </div>
                                    </div>
                                    </>
                                );
                            })()}
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs text-gray-500">Man-Hours Progress</span>
                        </div>
                        <ManHoursBar manHours={task.manHours} />
                    </div>

                  </div>
                </div>

                {/* Commitment summary (SC): only for top-level tasks; field breakdown children are created by SC and do not require commit */}
                {persona === 'sc' && task && isTopLevelTask && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Commitment</h3>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      {(!commitment || commitment.status === 'pending') && isNetNew ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-600">Commit required for this task.</p>
                          <button
                            type="button"
                            onClick={onOpenCommitmentModal}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full"
                          >
                            Commit
                          </button>
                        </div>
                      ) : commitment?.status === 'committed' ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-green-700 font-medium">Committed{commitment.committedAt ? ` on ${new Date(commitment.committedAt).toLocaleDateString()}` : ''}.</p>
                          <button type="button" onClick={onOpenCommitmentModal} className="text-xs text-blue-600 hover:underline flex-shrink-0">View response →</button>
                        </div>
                      ) : commitment?.status === 'proposed' ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-amber-700">Proposed: {commitment.proposedStartDate} – {commitment.proposedFinishDate}</p>
                          <button type="button" onClick={onOpenCommitmentModal} className="text-xs text-blue-600 hover:underline flex-shrink-0">View response →</button>
                        </div>
                      ) : commitment?.status === 'rejected' ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-red-700">Rejected: {commitment.rejectionReason}</p>
                          <button type="button" onClick={onOpenCommitmentModal} className="text-xs text-blue-600 hover:underline flex-shrink-0">View response →</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Review (GC) — compact summary matching SC commitment pattern */}
                {persona === 'gc' && scheduleStatus === ScheduleStatus.InReview && task && isTopLevelTask && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Review</h3>
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      {(() => {
                        const status = task.commitmentStatus ?? 'pending';
                        const proposal = task.adjustmentProposal;

                        if (status === 'pending') {
                          return <p className="text-sm text-gray-500">Awaiting subcontractor response.</p>;
                        }

                        if (status === 'committed') {
                          return (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-green-700 font-medium">Committed as planned.</p>
                              {onOpenGcReviewModal && (
                                <button type="button" onClick={onOpenGcReviewModal} className="text-xs text-blue-600 hover:underline flex-shrink-0">View →</button>
                              )}
                            </div>
                          );
                        }

                        if (status === 'adjustment_proposed') {
                          return (
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm text-amber-700 font-medium">Adjustment proposed</p>
                                {(proposal?.proposedStartDate || proposal?.proposedEndDate) && (
                                  <p className="text-xs text-amber-600 mt-0.5">
                                    {proposal?.proposedStartDate} – {proposal?.proposedEndDate}
                                    {proposal?.proposedCrewSize != null ? `, crew: ${proposal.proposedCrewSize}` : ''}
                                  </p>
                                )}
                                {proposal?.subNotes && (
                                  <p className="text-xs text-gray-500 mt-0.5 italic truncate" title={proposal.subNotes}>"{proposal.subNotes}"</p>
                                )}
                              </div>
                              {onOpenGcReviewModal && (
                                <button type="button" onClick={onOpenGcReviewModal} className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full flex-shrink-0">Respond →</button>
                              )}
                            </div>
                          );
                        }

                        if (status === 'rejected') {
                          return (
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm text-red-700 font-medium">Rejected</p>
                                {proposal?.rejectionReason && (
                                  <p className="text-xs text-red-600 mt-0.5 truncate" title={proposal.rejectionReason}>{proposal.rejectionReason}</p>
                                )}
                                {proposal?.subNotes && (
                                  <p className="text-xs text-gray-500 mt-0.5 italic truncate" title={proposal.subNotes}>"{proposal.subNotes}"</p>
                                )}
                              </div>
                              {onOpenGcReviewModal && (
                                <button type="button" onClick={onOpenGcReviewModal} className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full flex-shrink-0">Respond →</button>
                              )}
                            </div>
                          );
                        }

                        if (status === 'gc_accepted') {
                          return (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-teal-700 font-medium">Adjustment accepted.</p>
                              {onOpenGcReviewModal && (
                                <button type="button" onClick={onOpenGcReviewModal} className="text-xs text-blue-600 hover:underline flex-shrink-0">View →</button>
                              )}
                            </div>
                          );
                        }

                        if (status === 'gc_revised') {
                          return (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-purple-700 font-medium">Counter-proposal sent.</p>
                              {onOpenGcReviewModal && (
                                <button type="button" onClick={onOpenGcReviewModal} className="text-xs text-blue-600 hover:underline flex-shrink-0">View →</button>
                              )}
                            </div>
                          );
                        }

                        if (status === 'disputed') {
                          return (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-orange-700 font-medium">Marked as disputed.</p>
                              {onOpenGcReviewModal && (
                                <button type="button" onClick={onOpenGcReviewModal} className="text-xs text-blue-600 hover:underline flex-shrink-0">View →</button>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })()}
                    </div>
                  </div>
                )}

                {/* Constraints Section */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Constraints</h3>
                    <ul className="space-y-3">
                      {task.constraints.length > 0 ? task.constraints.map((constraint, i) => {
                        const statusClasses = getStatusClasses(constraint.status);
                        return (
                            <li key={`${constraint.type}-${constraint.name}-${i}`} className="flex items-start gap-3">
                                <div className="flex-shrink-0 pt-1">{getStatusDot(constraint.status)}</div>
                                <div className="flex-grow">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-gray-800 mr-2">{constraint.type}: {constraint.name}</p>
                                        {constraint.severity === 'Blocking' && (
                                            <AlertTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" title="Blocking constraint" />
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusClasses.bg} ${statusClasses.text}`}>
                                            {constraint.status}
                                        </span>
                                        {constraint.link && <a href={constraint.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>}
                                    </div>
                                    {constraint.flaggedBy && <p className="text-xs text-gray-400 mt-1">Flagged by {constraint.flaggedBy} on {constraint.timestamp}</p>}
                                </div>
                            </li>
                        )
                      }) : (
                        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">No constraints flagged.</p>
                      )}
                    </ul>

                    {!isReadOnly && (isAdding ? (
                         <AddConstraintForm onAdd={(c) => { onAddConstraint?.(task.id, c); setIsAdding(false); }} onCancel={() => setIsAdding(false)} />
                    ) : onAddConstraint ? (
                        <button onClick={() => setIsAdding(true)} className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 font-medium p-2 hover:bg-blue-50 rounded-md w-full justify-center border-2 border-dashed border-gray-300 hover:border-blue-300">
                            <PlusIcon className="w-4 h-4" />
                            Flag a Constraint
                        </button>
                    ) : null)}
                </div>
              </div>
            )}

            {/* Analytics tab — Part C */}
            {activeTab === 'analytics' && (
              <AnalyticsTab task={task} />
            )}

          </div>
        </div>
  ) : null;

  if (embedded) return content;
  return (
    <aside className="absolute top-0 right-0 h-full bg-gray-50 border-l border-gray-200 z-50" style={{ width: '420px' }} role="dialog" aria-modal="true" aria-labelledby="lookahead-details-title">
      {content}
    </aside>
  );
};

export default LookaheadDetailsPanel;
