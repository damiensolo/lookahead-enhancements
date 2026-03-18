import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LookaheadTask, Constraint, ConstraintStatus, ConstraintType, CONTRACTORS, TaskDelta, CommitmentState, ProjectRisk, ScheduleStatus, TaskAdjustmentProposal } from '../types';
import { getEffectiveDailyMetrics, getTotalPlannedQuantity, getTotalActualQuantity, getQuantityUnit, ensureProductionQuantity, formatQuantityDisplay, getMaxActualForDay } from '../utils/quantityUtils';
import { XIcon, PlusIcon, AlertTriangleIcon, HardHatIcon } from '../../../common/Icons';
import ManHoursBar from './ManHoursBar';
import ContractorSelect from './ContractorSelect';
import ProgressSlider from './ProgressSlider';
import { formatDisplayDate } from '../../../../lib/dateUtils';


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


const LookaheadDetailsPanel: React.FC<LookaheadDetailsPanelProps> = ({ task, taskDelta, onClose, onAddConstraint, onUpdateProgress, onUpdateContractor, onUpdatePlannedQuantity, onUpdateDailyQuantity, onOpenAddCrew, isDraft = true, isReadOnly = false, embedded = false, commitment, isNetNew, isTopLevelTask = true, onSetCommitment, persona, addProjectRisk, onOpenCommitmentModal, scheduleStatus, onGcAcceptAdjustment, onGcCounterPropose, onGcMarkDisputed }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [plannedInputValue, setPlannedInputValue] = useState('');
  const [gcNotes, setGcNotes] = useState('');
  const [counterStart, setCounterStart] = useState('');
  const [counterEnd, setCounterEnd] = useState('');
  const [counterCrew, setCounterCrew] = useState<string>('');

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
    if (!task) return;
    setGcNotes(task.adjustmentProposal?.gcResponseNotes ?? '');
    setCounterStart(task.adjustmentProposal?.proposedStartDate ?? task.startDate);
    setCounterEnd(task.adjustmentProposal?.proposedEndDate ?? task.finishDate);
    setCounterCrew(
      task.adjustmentProposal?.proposedCrewSize != null
        ? String(task.adjustmentProposal.proposedCrewSize)
        : String(task.crewAssigned ?? '')
    );
  }, [task?.id]);
  
  const overallStatus = task ? getOverallStatusInfo(task.constraints, task.progress) : null;
  const content = task && overallStatus ? (
        <div className="flex flex-col h-full bg-gray-50">
          <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="lookahead-details-title" className="text-lg font-semibold text-gray-800 truncate">{task.name}</h2>
            <button onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close details">
              <XIcon className="w-5 h-5" />
            </button>
          </header>
          <div className="flex-grow p-6 overflow-y-auto">

            <div className="mb-8">
              <div className="px-4 py-0 bg-gray-50 rounded-lg space-y-4">
                {task.isCriticalPath && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangleIcon className="w-5 h-5" />
                    <span className="font-semibold text-sm">Critical Path Task</span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">Outline</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.outline}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Task Code</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.taskCode}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Task Type</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.taskType}</div>
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
                    <div>
                        <div className="text-xs text-gray-500">Overall Health</div>
                        <div className={`flex items-center gap-2 font-bold text-lg ${overallStatus.textColor}`}>
                            <span className={`w-3 h-3 rounded-full ${overallStatus.dotColor}`}></span>
                            <span>{overallStatus.label}</span>
                        </div>
                    </div>
                    {taskDelta && (
                        <div>
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
                    <div className="col-span-2">
                        <div className="text-xs text-gray-500 mb-1">Schedule Analysis</div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-white border border-black/5 rounded-lg">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Planned</span>
                                <span className="text-sm font-medium text-zinc-600">{formatDisplayDate(task.startDate)} → {formatDisplayDate(task.finishDate)}</span>
                            </div>
                            <div className={`flex items-center justify-between p-2 rounded-lg border ${
                                (task.fieldStartDate && task.fieldStartDate > task.startDate) || (task.fieldFinishDate && task.fieldFinishDate > task.finishDate)
                                ? 'bg-red-50 border-red-100'
                                : 'bg-blue-50 border-blue-100'
                            }`}>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Field (Actual)</span>
                                <span className={`text-sm font-bold ${
                                    (task.fieldStartDate && task.fieldStartDate > task.startDate) || (task.fieldFinishDate && task.fieldFinishDate > task.finishDate)
                                    ? 'text-red-600'
                                    : 'text-blue-700'
                                }`}>
                                    {formatDisplayDate(task.fieldStartDate || task.startDate)} → {formatDisplayDate(task.fieldFinishDate || task.finishDate)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task Progress</span>
                        <span className="text-lg font-bold text-blue-600">{task.progress}%</span>
                    </div>
                    {(() => {
                        const hasSubTasks = task.children && task.children.length > 0;
                        const isEditable = !hasSubTasks && onUpdateProgress;
                        return isEditable ? (
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
                        );
                    })()}
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs text-gray-500">Man-Hours Progress</span>
                    </div>
                    <ManHoursBar manHours={task.manHours} />
                </div>

                {/* Production Quantities & Daily Tracking */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 pt-6">Production Quantities</h3>
                    <div className="px-4 py-0 bg-gray-50 rounded-lg space-y-4">
                        {/* Planned and Actual: editable rows in draft, side-by-side in read view */}
                        {isDraft ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Planned Qty</label>
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
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                                    >
                                        Evenly distribute
                                    </button>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Actual Qty</label>
                                    <div className="font-semibold text-blue-700 px-3 py-2 bg-white rounded-md border border-gray-200">
                                        {formatQuantityDisplay(getTotalActualQuantity(task))} {getQuantityUnit(task)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Planned Qty</label>
                                    <div className="font-semibold text-gray-800 px-2.5 py-1.5 text-sm bg-white rounded-md border border-gray-200">
                                        {formatQuantityDisplay(getTotalPlannedQuantity(task))} {getQuantityUnit(task)}
                                        {task.productionQuantity?.plannedLocked && (
                                            <span className="ml-1 text-[10px] text-amber-600 font-normal">(locked)</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Actual Qty</label>
                                    <div className="font-semibold text-blue-700 px-2.5 py-1.5 text-sm bg-white rounded-md border border-gray-200">
                                        {formatQuantityDisplay(getTotalActualQuantity(task))} {getQuantityUnit(task)}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Daily Plan vs Actual</label>
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
                                                    const canEdit = isDraft && onUpdateDailyQuantity;
                                                    return (
                                                        <tr key={m.date} className="border-t border-gray-100">
                                                            <td className="px-2 py-1 text-gray-700 truncate align-middle" title={formatDisplayDate(m.date)}>{formatDisplayDate(m.date)}</td>
                                                            <td className="px-1 py-1 text-right align-middle">
                                                                {canEdit ? (
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        step={0.01}
                                                                        value={planVal}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value);
                                                                            if (!isNaN(v) && v >= 0) onUpdateDailyQuantity(task.id, m.date, v, actualVal);
                                                                        }}
                                                                        className="w-full max-w-full min-w-0 py-1 px-1.5 text-right text-xs border border-gray-300 rounded box-border"
                                                                    />
                                                                ) : (
                                                                    <span className="text-gray-600">{formatQuantityDisplay(planVal)}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-1 py-1 text-right align-middle">
                                                                {canEdit ? (
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={getMaxActualForDay(task, m.date)}
                                                                        step={0.01}
                                                                        value={actualVal}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value);
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
                    </div>
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
                    <p className="text-sm text-green-700 font-medium">Committed{commitment.committedAt ? ` at ${new Date(commitment.committedAt).toLocaleString()}` : ''}.</p>
                  ) : commitment?.status === 'proposed' ? (
                    <p className="text-sm text-blue-700">Proposed dates: {commitment.proposedStartDate} – {commitment.proposedFinishDate}</p>
                  ) : commitment?.status === 'rejected' ? (
                    <p className="text-sm text-red-700">Rejected: {commitment.rejectionReason}{commitment.rejectionComment ? ` – ${commitment.rejectionComment}` : ''}{commitment.rejectedAt ? ` at ${new Date(commitment.rejectedAt).toLocaleString()}` : ''}</p>
                  ) : null}
                </div>
              </div>
            )}

            {/* In Review thread (GC) */}
            {persona === 'gc' && scheduleStatus === ScheduleStatus.InReview && task && isTopLevelTask && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Review thread</h3>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-amber-900">Task status</div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-amber-200 bg-white text-amber-900">
                      {(task.commitmentStatus ?? 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>

                  {(task.adjustmentProposal?.rejectionReason || task.adjustmentProposal?.subNotes) && (
                    <div className="text-xs text-amber-900/90 space-y-1">
                      {task.adjustmentProposal?.rejectionReason && (
                        <div><span className="font-semibold">Rejection reason:</span> {task.adjustmentProposal.rejectionReason}</div>
                      )}
                      {task.adjustmentProposal?.subNotes && (
                        <div><span className="font-semibold">Sub notes:</span> {task.adjustmentProposal.subNotes}</div>
                      )}
                    </div>
                  )}

                  {(task.adjustmentProposal?.proposedStartDate || task.adjustmentProposal?.proposedEndDate || task.adjustmentProposal?.proposedCrewSize != null) && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-amber-900/70 font-semibold">Proposed start</div>
                        <div className="font-medium text-amber-950">{task.adjustmentProposal?.proposedStartDate ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-amber-900/70 font-semibold">Proposed end</div>
                        <div className="font-medium text-amber-950">{task.adjustmentProposal?.proposedEndDate ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-amber-900/70 font-semibold">Proposed crew</div>
                        <div className="font-medium text-amber-950">{task.adjustmentProposal?.proposedCrewSize ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-amber-900/70 font-semibold">Materials</div>
                        <div className="font-medium text-amber-950 truncate" title={task.adjustmentProposal?.proposedMaterialNotes ?? ''}>{task.adjustmentProposal?.proposedMaterialNotes ?? '—'}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-amber-900/80 mb-1">GC response notes</div>
                    <input
                      type="text"
                      value={gcNotes}
                      onChange={(e) => setGcNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-amber-200 rounded-md bg-white"
                      placeholder="Add a note to the subcontractor (optional)"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!onGcAcceptAdjustment || task.commitmentStatus !== 'adjustment_proposed'}
                      onClick={() => onGcAcceptAdjustment?.(task.id, { gcResponseNotes: gcNotes || undefined })}
                      className="px-3 py-2 text-xs font-bold rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Accept adjustment
                    </button>
                    <button
                      type="button"
                      disabled={!onGcMarkDisputed}
                      onClick={() => onGcMarkDisputed?.(task.id, { gcResponseNotes: gcNotes || undefined })}
                      className="px-3 py-2 text-xs font-bold rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark disputed
                    </button>
                  </div>

                  <div className="rounded-md border border-amber-200 bg-white p-3">
                    <div className="text-xs font-semibold text-amber-900/80 mb-2">Counter-proposal</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-amber-900">
                        Start
                        <input type="date" value={counterStart} onChange={(e) => setCounterStart(e.target.value)} className="mt-1 w-full px-2 py-1.5 text-xs border border-amber-200 rounded bg-white" />
                      </label>
                      <label className="text-xs text-amber-900">
                        End
                        <input type="date" value={counterEnd} onChange={(e) => setCounterEnd(e.target.value)} className="mt-1 w-full px-2 py-1.5 text-xs border border-amber-200 rounded bg-white" />
                      </label>
                      <label className="text-xs text-amber-900 col-span-2">
                        Crew size
                        <input type="number" value={counterCrew} onChange={(e) => setCounterCrew(e.target.value)} className="mt-1 w-full px-2 py-1.5 text-xs border border-amber-200 rounded bg-white" />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={!onGcCounterPropose}
                      onClick={() => onGcCounterPropose?.(task.id, {
                        proposedStartDate: counterStart || undefined,
                        proposedEndDate: counterEnd || undefined,
                        proposedCrewSize: counterCrew ? parseInt(counterCrew || '0', 10) : undefined,
                        gcResponseNotes: gcNotes || undefined,
                      })}
                      className="mt-2 w-full px-3 py-2 text-xs font-bold rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send counter-proposal
                    </button>
                  </div>

                  {task.adjustmentProposal?.history?.length ? (
                    <div className="pt-2 border-t border-amber-200/60">
                      <div className="text-xs font-semibold text-amber-900/80 mb-2">History</div>
                      <div className="space-y-2">
                        {task.adjustmentProposal.history.slice().reverse().map((h, idx) => (
                          <div key={idx} className="text-xs text-amber-950 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold uppercase text-[10px]">{h.actor}</span>
                              <span className="ml-2 font-semibold">{h.status.replace(/_/g, ' ')}</span>
                              {h.summary && <span className="ml-2 text-amber-900/80">{h.summary}</span>}
                            </div>
                            <div className="text-[10px] text-amber-900/70 flex-shrink-0">{new Date(h.at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
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