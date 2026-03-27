import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LookaheadTask, Constraint, ConstraintStatus, ConstraintType, WeatherForecast, ScheduleStatus, CONTRACTORS, TaskCommitmentStatus, TaskAdjustmentProposal, CrewMember } from './types';
import { PLANNER_TASKS, MOCK_WEATHER, MASTER_SCHEDULE_TASKS, MOCK_PROJECT_CREW, PROJECT_COMPANY_NAMES } from './constants';
import { parseLookaheadDate, getDaysDiff, addDays, formatDateISO, formatDisplayDate } from '../../../lib/dateUtils';
import { ChevronDownIcon, ChevronRightIcon, DocumentIcon, SunIcon, CloudIcon, CloudRainIcon, PlusIcon, ListTreeIcon, TrashIcon, HistoryIcon, PublicLinkIcon, LinkIcon, HardHatIcon, HandshakeIcon, AlertTriangleIcon, OctagonXIcon, PanelLeftIcon, PanelRightIcon, XIcon, MessageSquareIcon } from '../../common/Icons';
import ConstraintBadge from './components/ConstraintBadge';
import ManHoursBar from './components/ManHoursBar';
import DraggableTaskBar from './components/DraggableTaskBar';
import LookaheadDetailsPanel from './components/LookaheadDetailsPanel';
import DailyMetricsPanel from './components/DailyMetricsPanel';
import { TaskSelectionModal } from './components/TaskSelectionModal';
import { CreateLookaheadModal } from './components/CreateLookaheadModal';
import { FieldBreakdownModal } from './components/FieldBreakdownModal';
import { AddCrewModal } from './components/AddCrewModal';
import { DeltasModal } from './components/DeltasModal';
import { ScCommitmentModal } from './components/ScCommitmentModal';
import ChatPanel from './components/ChatPanel';
import { ClashResolutionModal } from './components/ClashResolutionModal';
import ProgressCell from './components/ProgressCell';
import ContractorSelect from './components/ContractorSelect';
import { ReviewProgressBar } from './components/ReviewProgressBar';
import { compareLookaheadTasks } from './utils/diffUtils';
import { detectLocationClashes, LocationClash } from './utils/clashUtils';
import { getTotalPlannedQuantity, getTotalActualQuantity, getQuantityUnit, distributePlannedQuantityUniformly, ensureDailyPlanWithinTotal, ensureProductionQuantity, hasAnyActualQuantity, formatQuantityDisplay, getMaxActualForDay } from './utils/quantityUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../common/ui/Tooltip';
import { useProject } from '../../../context/ProjectContext';
import { usePersona } from '../../../context/PersonaContext';
import { DisplayDensity } from '../../../types';
import ViewControls from '../../layout/ViewControls';
import ViewSettingsMenu from '../../layout/ViewSettingsMenu';

const WeatherIcon: React.FC<{ icon: 'sun' | 'cloud' | 'rain' }> = ({ icon }) => {
    switch (icon) {
        case 'sun': return <SunIcon className="w-4 h-4 text-yellow-500" />;
        case 'cloud': return <CloudIcon className="w-4 h-4 text-gray-500" />;
        case 'rain': return <CloudRainIcon className="w-4 h-4 text-blue-500" />;
        default: return null;
    }
};

const LOOKAHEAD_BUFFER_DAYS = 2;
const MAX_TIMELINE_DAYS_WITHOUT_PERIOD = 84; // Cap when schedule has no period to avoid excessive scroll

const getRowHeight = (density: DisplayDensity) => {
  switch (density) {
    case 'compact': return 36;
    case 'standard': return 40;
    case 'comfortable': return 50;
    default: return 34;
  }
};

const getDayWidth = (density: DisplayDensity) => {
  switch (density) {
    case 'compact': return 28;
    case 'standard': return 34;
    case 'comfortable': return 40;
    default: return 40;
  }
};

const getHeaderHeights = (density: DisplayDensity) => {
  switch (density) {
    case 'compact':     return { weekRow: 22, dayRow: 34, weatherSection: 0 };
    case 'standard':    return { weekRow: 26, dayRow: 42, weatherSection: 20 };
    case 'comfortable': return { weekRow: 30, dayRow: 50, weatherSection: 28 };
    default:            return { weekRow: 30, dayRow: 50, weatherSection: 28 };
  }
};

// Mapping from Generic Column ID to Lookahead specific logic
type LookaheadColumnType = 'sNo' | 'costCode' | 'name' | 'commitment' | 'actions' | 'status' | 'taskType' | 'quantity' | 'progress' | 'planStart' | 'planEnd' | 'contractor' | 'crewAssigned' | 'location' | 'shared';

const STICKY_COLUMN_TYPES: LookaheadColumnType[] = ['sNo', 'name'];

const COLUMN_MAPPING: Record<string, LookaheadColumnType> = {
    sNo: 'sNo',
    costCode: 'costCode',
    name: 'name',
    commitment: 'commitment',
    actions: 'actions',
    status: 'status',
    taskType: 'taskType',
    quantity: 'quantity',
    progress: 'progress',
    planStart: 'planStart',
    planEnd: 'planEnd',
    contractor: 'contractor',
    crewAssigned: 'crewAssigned',
    location: 'location',
};

const RowNumberCheckbox = ({
    index,
    isSelected,
    onToggle,
    isCritical
}: {
    index: string | number;
    isSelected: boolean;
    onToggle: () => void;
    isCritical?: boolean;
}) => {
    return (
        <div className="flex items-center justify-center w-full h-full relative group/sno">
            <span className={`text-xs transition-opacity duration-100 ${isSelected ? 'opacity-0' : 'group-hover:opacity-0'} text-gray-400`}>
                {index}
            </span>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`absolute w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-opacity duration-100 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            />
        </div>
    );
};

const normalizeCompany = (s: string) => (s || '').trim().toLowerCase();

/** Filter task tree to only tasks for the given contractor (include parent if any child matches). */
function filterTasksByContractor(tasks: LookaheadTask[], scCompany: string): LookaheadTask[] {
    const want = normalizeCompany(scCompany);
    if (!want) return tasks;
    const out: LookaheadTask[] = [];
    for (const task of tasks) {
        const filteredChildren = task.children ? filterTasksByContractor(task.children, scCompany) : undefined;
        const selfMatch = normalizeCompany(task.contractor) === want;
        if (selfMatch || (filteredChildren && filteredChildren.length > 0)) {
            out.push({ ...task, children: filteredChildren?.length ? filteredChildren : undefined });
        }
    }
    return out;
}

const commitmentMeta = (status: TaskCommitmentStatus | undefined) => {
    const s = status ?? 'pending';
    switch (s) {
        case 'pending':
            return { label: 'Pending', classes: 'bg-gray-50 text-gray-700 border-gray-200' };
        case 'committed':
            return { label: 'Committed', classes: 'bg-green-50 text-green-700 border-green-200' };
        case 'rejected':
            return { label: 'Rejected', classes: 'bg-red-50 text-red-700 border-red-200' };
        case 'adjustment_proposed':
            return { label: 'New Proposal', classes: 'bg-amber-50 text-amber-800 border-amber-200' };
        case 'gc_accepted':
            return { label: 'GC accepted', classes: 'bg-teal-50 text-teal-700 border-teal-200' };
        case 'gc_revised':
            return { label: 'GC revised', classes: 'bg-purple-50 text-purple-700 border-purple-200' };
        case 'disputed':
            return { label: 'Disputed', classes: 'bg-orange-50 text-orange-800 border-orange-200' };
        default:
            return { label: s, classes: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
};

const flattenTasks = (tasks: LookaheadTask[]) => {
    const out: LookaheadTask[] = [];
    const walk = (items: LookaheadTask[]) => {
        items.forEach(t => {
            out.push(t);
            if (t.children?.length) walk(t.children);
        });
    };
    walk(tasks);
    return out;
};

const LookaheadView: React.FC = () => {
    const {
        activeView, setColumns, createDraft, schedules, activeScheduleId, updateScheduleTasks, publishSchedule, deltas,
        isCreateLookaheadModalOpen, setIsCreateLookaheadModalOpen,
        isAddTaskModalOpen, setIsAddTaskModalOpen,
        commitmentByTaskId, setCommitment, addProjectRisk,
        activityFeedByScheduleId,
        commitTask, rejectTask, proposeTaskAdjustment,
        gcAcceptAdjustment, gcCounterPropose, gcMarkDisputed
    } = useProject();
    const { persona, scCompany } = usePersona();
    const { columns, displayDensity, fontSize, showMasterRange } = activeView;

    const activeSchedule = useMemo(() =>
        schedules.find(s => s.id === activeScheduleId) || schedules[0]
    , [schedules, activeScheduleId]);

    const previousPublishedSchedule = useMemo(() =>
        [...schedules]
            .filter(s => s.status === ScheduleStatus.Active || s.status === ScheduleStatus.Closed)
            .sort((a, b) => (b.version || 0) - (a.version || 0))[0]
    , [schedules]);

    const previousDurationDays = useMemo(() => {
        if (!previousPublishedSchedule) return 42; // 6 weeks default for first-loaded lookahead
        if (previousPublishedSchedule.periodDurationDays != null && previousPublishedSchedule.periodDurationDays > 0) {
            return previousPublishedSchedule.periodDurationDays;
        }
        if (previousPublishedSchedule.tasks.length === 0) return 42;
        const allTasks: LookaheadTask[] = [];
        const flatten = (tasks: LookaheadTask[]) => {
            tasks.forEach(t => {
                allTasks.push(t);
                if (t.children) flatten(t.children);
            });
        };
        flatten(previousPublishedSchedule.tasks);
        const start = allTasks.reduce((min, t) => parseLookaheadDate(t.startDate) < min ? parseLookaheadDate(t.startDate) : min, parseLookaheadDate(allTasks[0].startDate));
        const end = allTasks.reduce((max, t) => parseLookaheadDate(t.finishDate) > max ? parseLookaheadDate(t.finishDate) : max, parseLookaheadDate(allTasks[0].finishDate));
        return getDaysDiff(start, end) + 1;
    }, [previousPublishedSchedule]);

    const [plannerTasks, setPlannerTasks] = useState<LookaheadTask[]>(activeSchedule.tasks);
    const [clashes, setClashes] = useState<LocationClash[]>([]);
    const [activeClash, setActiveClash] = useState<LocationClash | null>(null);

    useEffect(() => {
        // Re-detect clashes but preserve any resolutions the user has already saved.
        setClashes(prev => {
            const detected = detectLocationClashes(plannerTasks);
            return detected.map(newClash => {
                const existing = prev.find(c => c.id === newClash.id);
                return existing ? { ...newClash, status: existing.status, category: existing.category } : newClash;
            });
        });
    }, [plannerTasks]);

    const clashesByTaskId = useMemo(() => {
        const map = new Map<string | number, LocationClash[]>();
        clashes.forEach(c => {
            c.taskIds.forEach(id => {
                const existing = map.get(id) ?? [];
                existing.push(c);
                map.set(id, existing);
            });
        });
        return map;
    }, [clashes]);

    /**
     * Set of task IDs that have at least one unresolved clash anywhere in their subtree.
     * Parent tasks bubble up from their children so the warning icon shows at every level.
     */
    const tasksWithUnresolvedClash = useMemo(() => {
        const unresolvedIds = new Set<string | number>();
        clashes.forEach(c => {
            if (c.status !== 'Resolved') c.taskIds.forEach(id => unresolvedIds.add(id));
        });
        const result = new Set<string | number>();
        const walk = (tasks: LookaheadTask[]): boolean => {
            let any = false;
            for (const t of tasks) {
                const childHas = t.children?.length ? walk(t.children) : false;
                if (unresolvedIds.has(t.id) || childHas) {
                    result.add(t.id);
                    any = true;
                }
            }
            return any;
        };
        walk(plannerTasks);
        return result;
    }, [clashes, plannerTasks]);

    /** Returns the first unresolved clash for a task or any of its descendants. */
    const getFirstUnresolvedClash = useCallback((task: LookaheadTask): LocationClash | null => {
        const own = (clashesByTaskId.get(task.id) ?? []).find(c => c.status !== 'Resolved');
        if (own) return own;
        if (task.children?.length) {
            for (const child of task.children) {
                const found = getFirstUnresolvedClash(child);
                if (found) return found;
            }
        }
        return null;
    }, [clashesByTaskId]);

    /** For SC view, show only tasks for scCompany; for GC show all. */
    const tasksForDisplay = useMemo(() => {
        if (persona !== 'sc' || !scCompany) return plannerTasks;
        return filterTasksByContractor(plannerTasks, scCompany);
    }, [persona, scCompany, plannerTasks]);

    const commitmentCounts = useMemo(() => {
        if (activeSchedule?.status !== ScheduleStatus.InReview) return null;
        const leafTasks = flattenTasks(tasksForDisplay).filter(t => !t.children?.length);
        const counts: Partial<Record<TaskCommitmentStatus, number>> = {};
        for (const t of leafTasks) {
            const s = t.commitmentStatus ?? 'pending';
            counts[s] = (counts[s] ?? 0) + 1;
        }
        return { counts, total: leafTasks.length };
    }, [activeSchedule?.status, tasksForDisplay]);

    const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set());
    const [selectedTask, setSelectedTask] = useState<LookaheadTask | null>(null);
    const [selectedDay, setSelectedDay] = useState<{ task: LookaheadTask; date: Date; forecast?: WeatherForecast } | null>(null);
    const [isFieldBreakdownModalOpen, setIsFieldBreakdownModalOpen] = useState(false);
    const [taskToBreakdown, setTaskToBreakdown] = useState<LookaheadTask | null>(null);
    const [addCrewContext, setAddCrewContext] = useState<{ taskId: string | number; dateString: string } | null>(null);
    const [taskForCommitmentModal, setTaskForCommitmentModal] = useState<LookaheadTask | null>(null);
    const [taskForGcReviewModal, setTaskForGcReviewModal] = useState<LookaheadTask | null>(null);
    const [isPanelClosing, setIsPanelClosing] = useState(false);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [rightPanelView, setRightPanelView] = useState<'details' | 'chat'>('details');
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

    const handleCloseRightPanel = useCallback(() => {
        setSelectedDay(null);
        setSelectedTask(null);
        setSelectedCellId(null);
        setIsRightPanelOpen(false);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isRightPanelOpen) handleCloseRightPanel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRightPanelOpen, handleCloseRightPanel]);

    const allTaskIds = useMemo(() => {
        const ids: (string | number)[] = [];
        const flatten = (tasks: LookaheadTask[]) => {
            tasks.forEach(t => {
                ids.push(t.id);
                if (t.children) flatten(t.children);
            });
        };
        flatten(tasksForDisplay);
        return ids;
    }, [tasksForDisplay]);

    /** Flattened visible rows (respects isExpanded) for consistent row order and row numbers */
    const flattenedTaskRows = useMemo(() => {
        const rows: { task: LookaheadTask; level: number }[] = [];
        const walk = (tasks: LookaheadTask[], level: number) => {
            tasks.forEach(t => {
                rows.push({ task: t, level });
                if (t.isExpanded && t.children?.length) walk(t.children, level + 1);
            });
        };
        walk(tasksForDisplay, 0);
        return rows;
    }, [tasksForDisplay]);

    const findTaskById = useCallback((tasks: LookaheadTask[], id: string | number): LookaheadTask | null => {
        for (const t of tasks) {
            if (String(t.id) === String(id)) return t;
            if (t.children) {
                const found = findTaskById(t.children, id);
                if (found) return found;
            }
        }
        return null;
    }, []);

    /** For SC: top-level task IDs that are net-new (added by GC, belong to scCompany). Only root-level tasks require commitment; field breakdown children are created by SC. */
    const netNewTaskIds = useMemo(() => {
        if (persona !== 'sc' || !scCompany || !activeScheduleId) return new Set<string | number>();
        const scheduleDeltas = deltas[activeScheduleId] || [];
        const want = normalizeCompany(scCompany);
        const added = new Set<string | number>();
        const isRootTask = (taskId: string | number) => plannerTasks.some(t => String(t.id) === String(taskId));
        if (scheduleDeltas.length > 0) {
            scheduleDeltas.forEach(d => {
                if (d.type !== 'added') return;
                const task = findTaskById(plannerTasks, d.taskId);
                if (task && normalizeCompany(task.contractor) === want && isRootTask(d.taskId)) added.add(d.taskId);
            });
        } else {
            // No deltas (e.g. initial schedule): treat root-level SC tasks as net-new for commitment demo
            tasksForDisplay.forEach(t => {
                if (normalizeCompany(t.contractor) === want) added.add(t.id);
            });
        }
        return added;
    }, [persona, scCompany, activeScheduleId, deltas, plannerTasks, findTaskById, tasksForDisplay]);

    const toggleRowSelection = (id: string | number) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllSelection = () => {
        if (selectedRowIds.size === allTaskIds.length) {
            setSelectedRowIds(new Set());
        }
        else {
            setSelectedRowIds(new Set(allTaskIds));
        }
    };

    // Sync local state when active schedule changes
    useEffect(() => {
        setPlannerTasks(activeSchedule.tasks);
    }, [activeSchedule.id]); // Only sync when the schedule ID changes

    // Sync local changes back to context
    useEffect(() => {
        if (activeScheduleId) {
            updateScheduleTasks(activeScheduleId, plannerTasks);
        }
    }, [plannerTasks, activeScheduleId, updateScheduleTasks]);

    const [isScrolled, setIsScrolled] = useState(false);
    /** Left panel viewport width; 0 = auto (fit columns) */
    const [leftPanelViewportWidth, setLeftPanelViewportWidth] = useState(0);
    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);
    const plannerContainerRef = useRef<HTMLDivElement>(null);
    const scrollSyncRef = useRef(false);

    const syncVerticalScroll = useCallback((source: 'left' | 'right') => {
        if (scrollSyncRef.current) return;
        scrollSyncRef.current = true;
        const left = leftScrollRef.current;
        const right = rightScrollRef.current;
        if (source === 'left' && left && right) {
            right.scrollTop = left.scrollTop;
        }
        else if (source === 'right' && left && right) {
            left.scrollTop = right.scrollTop;
        }
        scrollSyncRef.current = false;
    }, []);

    useEffect(() => {
        const left = leftScrollRef.current;
        const handleScroll = () => {
            if (left) {
                setIsScrolled(left.scrollLeft > 0);
            }
        };
        left?.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => left?.removeEventListener('scroll', handleScroll);
    }, []);

    const visiblePanelColumns = useMemo(() => {
        const isInReview = activeSchedule?.status === ScheduleStatus.InReview;
        const filtered = columns
            .filter(col => col.visible && COLUMN_MAPPING[col.id] && !(col.id === 'actions' && activeSchedule?.status === ScheduleStatus.Closed) && !(col.id === 'commitment' && !(persona === 'sc' || isInReview)) && !(col.id === 'contractor' && persona === 'sc'))
            .map(col => ({
                ...col,
                lookaheadType: COLUMN_MAPPING[col.id]!,
                widthPx: parseInt(col.width || '100', 10) || 100
            }));

        // Compute natural left offsets based on full column order
        let leftOffset = 0;
        const withOffsets = filtered.map(col => {
            const colWithOffset = { ...col, leftOffset };
            leftOffset += col.widthPx;
            return colWithOffset;
        });

        // Determine which columns are actually sticky based on current order:
        // - Always make the first S.No column sticky.
        // - Any subsequent columns that are in STICKY_COLUMN_TYPES *and*
        //   appear contiguously after the last sticky column also become sticky.
        // - Once a non-sticky column appears, all following columns are non-sticky.
        let hasStartedSticky = false;
        let encounteredNonStickyAfterPrefix = false;
        let stickyLeft = 0;

        return withOffsets.map(col => {
            let isSticky = false;

            if (!encounteredNonStickyAfterPrefix && STICKY_COLUMN_TYPES.includes(col.lookaheadType)) {
                // This column is eligible to be sticky and is still in the leading prefix.
                isSticky = true;
                hasStartedSticky = true;
            }
            else if (hasStartedSticky) {
                // We have started the sticky prefix but this column is not eligible,
                // so mark that the sticky prefix has ended.
                encounteredNonStickyAfterPrefix = true;
            }

            const stickyLeftOffset = isSticky ? stickyLeft : undefined;
            if (isSticky) {
                stickyLeft += col.widthPx;
            }

            return {
                ...col,
                stickyLeftOffset,
                isSticky,
            };
        });
    }, [columns, activeSchedule?.status, persona]);

    const totalLeftPanelWidth = useMemo(() => visiblePanelColumns.reduce((sum, col) => sum + col.widthPx, 0), [visiblePanelColumns]);
    /** Width of columns through End (inclusive) so split can default to just after End and show more days */
    const widthThroughEndColumn = useMemo(() => {
        let sum = 0;
        for (const col of visiblePanelColumns) {
            sum += col.widthPx;
            if (col.lookaheadType === 'planEnd') break;
        }
        return sum;
    }, [visiblePanelColumns]);
    const rowHeight = getRowHeight(displayDensity);
    const dayWidth = getDayWidth(displayDensity);
    const headerHeights = getHeaderHeights(displayDensity);
    const totalHeaderHeight = headerHeights.weekRow + headerHeights.dayRow;
    const SPLIT_GRABBER_WIDTH = 4;
    const SPLIT_HIT_WIDTH = 12;
    const MIN_COL_WIDTH = 40;
    const MIN_TIMELINE_WIDTH = 200;
    const handleMouseDown = useCallback((e: React.MouseEvent, columnId: string, currentWidth: number, isLastCol?: boolean) => {
        e.preventDefault();

        const startX = e.clientX;
        const otherColsSum = isLastCol ? totalLeftPanelWidth - currentWidth : 0;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const moveHandler = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            let newWidth = Math.max(currentWidth + deltaX, MIN_COL_WIDTH);
            if (isLastCol) {
                const container = plannerContainerRef.current;
                const maxLeftPanel = container ? container.clientWidth - SPLIT_HIT_WIDTH - MIN_TIMELINE_WIDTH : Infinity;
                const maxLastCol = Math.max(MIN_COL_WIDTH, maxLeftPanel - otherColsSum);
                newWidth = Math.min(newWidth, maxLastCol);
            }
            setColumns(prev => prev.map(c => c.id === columnId ? { ...c, width: `${newWidth}px` } : c));
        };

        const upHandler = () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
        };

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
    }, [setColumns, totalLeftPanelWidth, SPLIT_HIT_WIDTH]);

    const MIN_LEFT_VIEWPORT = 80;
    const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const currentWidth = leftPanelViewportWidth > 0 ? leftPanelViewportWidth : widthThroughEndColumn;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const moveHandler = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const raw = currentWidth + deltaX;
            const container = plannerContainerRef.current;
            const maxWidth = container
                ? container.clientWidth - SPLIT_HIT_WIDTH - MIN_TIMELINE_WIDTH
                : totalLeftPanelWidth;
            const clamped = Math.max(MIN_LEFT_VIEWPORT, Math.min(raw, Math.max(maxWidth, totalLeftPanelWidth)));
            setLeftPanelViewportWidth(clamped);
        };

        const upHandler = () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
        };

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
    }, [leftPanelViewportWidth, widthThroughEndColumn, totalLeftPanelWidth, SPLIT_HIT_WIDTH]);


    const { projectStartDate, projectEndDate, totalDays, bufferDaysBefore, periodDurationDays } = useMemo(() => {
        const periodStartStr = activeSchedule?.periodStartDate;
        const periodDuration = activeSchedule?.periodDurationDays;
        if (periodStartStr && periodDuration != null && periodDuration > 0) {
            const periodStart = parseLookaheadDate(periodStartStr);
            const periodEnd = addDays(periodStart, periodDuration - 1);
            const viewStart = addDays(periodStart, -LOOKAHEAD_BUFFER_DAYS);
            const viewEnd = addDays(periodEnd, LOOKAHEAD_BUFFER_DAYS);
            return {
                projectStartDate: viewStart,
                projectEndDate: viewEnd,
                totalDays: LOOKAHEAD_BUFFER_DAYS + periodDuration + LOOKAHEAD_BUFFER_DAYS,
                bufferDaysBefore: LOOKAHEAD_BUFFER_DAYS,
                periodDurationDays: periodDuration,
            };
        }
        const allTasks: LookaheadTask[] = [];
        const flatten = (tasks: LookaheadTask[]) => {
            tasks.forEach(t => {
                allTasks.push(t);
                if (t.children) flatten(t.children);
            });
        };
        flatten(tasksForDisplay);
        if (allTasks.length === 0) return { projectStartDate: new Date(), projectEndDate: new Date(), totalDays: 0, bufferDaysBefore: 0, periodDurationDays: 0 };

        const start = allTasks.reduce((min, t) => parseLookaheadDate(t.startDate) < min ? parseLookaheadDate(t.startDate) : min, parseLookaheadDate(allTasks[0].startDate));
        const rawEnd = allTasks.reduce((max, t) => parseLookaheadDate(t.finishDate) > max ? parseLookaheadDate(t.finishDate) : max, parseLookaheadDate(allTasks[0].finishDate));
        const cappedDays = Math.min(getDaysDiff(start, rawEnd) + 1, MAX_TIMELINE_DAYS_WITHOUT_PERIOD);
        const end = addDays(start, cappedDays - 1);

        return {
            projectStartDate: start,
            projectEndDate: end,
            totalDays: cappedDays,
            bufferDaysBefore: 0,
            periodDurationDays: cappedDays,
        };
    }, [tasksForDisplay, activeSchedule?.periodStartDate, activeSchedule?.periodDurationDays]);

    const isDayBuffer = useCallback((dayIndex: number) => bufferDaysBefore > 0 && (dayIndex < bufferDaysBefore || dayIndex >= bufferDaysBefore + periodDurationDays), [bufferDaysBefore, periodDurationDays]);

    const weatherByDate = useMemo(() => new Map<string, WeatherForecast>(MOCK_WEATHER.map(w => [w.date, w])), []);

    const handleToggle = (taskId: string | number) => {
        const toggleRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(task => {
                if (task.id === taskId) {
                    return { ...task, isExpanded: !task.isExpanded };
                }
                if (task.children) {
                    return { ...task, children: toggleRecursively(task.children) };
                }
                return task;
            });
        };
        setPlannerTasks(prev => toggleRecursively(prev));
    };

    const handleUpdateProgress = (taskId: string | number, progress: number) => {
        const updateRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(task => {
                let updatedTask = { ...task };
                if (task.id === taskId) {
                    const hasSubTasks = task.children && task.children.length > 0;
                    if (!hasSubTasks) {
                        updatedTask.progress = progress;
                    }
                }

                if (task.children && task.children.length > 0) {
                    updatedTask.children = updateRecursively(task.children);
                    // Recalculate parent progress based on children
                    const totalProgress = updatedTask.children.reduce((acc, child) => acc + child.progress, 0);
                    updatedTask.progress = Math.round(totalProgress / updatedTask.children.length);
                }

                if (selectedTask && selectedTask.id === task.id) {
                    setSelectedTask(updatedTask);
                }

                return updatedTask;
            });
        };
        setPlannerTasks(prev => updateRecursively(prev));
    };

    const handleUpdateContractor = (taskId: string | number, contractor: string) => {
        const updateRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(task => {
                if (task.id === taskId) {
                    const updatedTask = { ...task, contractor };
                    if (selectedTask && selectedTask.id === taskId) {
                        setSelectedTask(updatedTask);
                    }
                    return updatedTask;
                }
                if (task.children) {
                    return { ...task, children: updateRecursively(task.children) };
                }
                return task;
            });
        };
        setPlannerTasks(prev => updateRecursively(prev));
    };

    const handleAddConstraint = (taskId: string | number, newConstraint: Constraint) => {
        const addConstraintRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(task => {
                if (task.id === taskId) {
                    const updatedConstraints = [...task.constraints, newConstraint];
                    const newStatus = { ...task.status };
                    if (newConstraint.severity === 'Blocking') {
                        newStatus[newConstraint.type] = ConstraintStatus.Overdue;
                    }
                    else if (newConstraint.severity === 'Warning' && newStatus[newConstraint.type] === ConstraintStatus.Complete) {
                        newStatus[newConstraint.type] = ConstraintStatus.Pending;
                    }

                    const updatedTask = {
                        ...task,
                        constraints: updatedConstraints,
                        status: newStatus,
                    };

                    if (selectedTask && selectedTask.id === taskId) {
                        setSelectedTask(updatedTask);
                    }
                    return updatedTask;
                }
                if (task.children) {
                    return { ...task, children: addConstraintRecursively(task.children) };
                }
                return task;
            });
        };
        setPlannerTasks(prev => addConstraintRecursively(prev));
    };

    const handleUpdateTaskDates = useCallback((taskId: string | number, newStart: string, newFinish: string) => {
        const updateRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(task => {
                if (task.id === taskId) {
                    if (task.taskType === 'Field Task') {
                        return { ...task, fieldStartDate: newStart, fieldFinishDate: newFinish };
                    }
                    return { ...task, startDate: newStart, finishDate: newFinish };
                }
                if (task.children) {
                    const updatedChildren = updateRecursively(task.children);
                    // If a field child's dates changed, propagate min/max field range up to parent
                    if (updatedChildren !== task.children) {
                        const fieldKids = updatedChildren.filter(c => c.taskType === 'Field Task');
                        if (fieldKids.length > 0) {
                            const minStart = fieldKids.reduce((m, c) => {
                                const d = c.fieldStartDate || c.startDate;
                                return d < m ? d : m;
                            }, fieldKids[0].fieldStartDate || fieldKids[0].startDate);
                            const maxFinish = fieldKids.reduce((m, c) => {
                                const d = c.fieldFinishDate || c.finishDate;
                                return d > m ? d : m;
                            }, fieldKids[0].fieldFinishDate || fieldKids[0].finishDate);
                            return { ...task, children: updatedChildren, fieldStartDate: minStart, fieldFinishDate: maxFinish };
                        }
                    }
                    return { ...task, children: updatedChildren };
                }
                return task;
            });
        };
        setPlannerTasks(prev => updateRecursively(prev));
    }, []);

    const handleUpdateAssignedCrew = useCallback((taskId: string | number, date: string, crewIds: string[]) => {
        const updateRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => tasks.map(task => {
            if (String(task.id) === String(taskId)) {
                const assignedCrewByDate = { ...(task.assignedCrewByDate ?? {}), [date]: crewIds };
                return { ...task, assignedCrewByDate };
            }
            return task.children ? { ...task, children: updateRecursively(task.children) } : task;
        });
        setPlannerTasks(prev => updateRecursively(prev));
    }, []);

    const handleDayClick = useCallback((task: LookaheadTask, date: Date) => {
        const dateString = formatDateISO(date);
        const forecast = weatherByDate.get(dateString);
        setSelectedCellId(`${task.id}_${dateString}`);
        setSelectedTask(task);
        setSelectedDay({ task, date, forecast });
        setRightPanelView('details');
        setIsRightPanelOpen(true);
    }, [weatherByDate]);

    const handleConstraintBadgeClick = useCallback((task: LookaheadTask) => {
        setSelectedDay(null);
        setSelectedTask(task);
    }, []);

    const handleAddTasks = (newTasks: LookaheadTask[]) => {
        setPlannerTasks(prev => [...prev, ...newTasks]);
    };

    const handleCreateLookahead = (strategy: 'previous' | 'master', config?: { startDate: string; durationDays: number }) => {
        createDraft(strategy, config);
        setIsCreateLookaheadModalOpen(false);
    };

    const handleSaveBreakdown = (taskId: string | number, subTasks: LookaheadTask[]) => {
        const updateTasks = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(t => {
                if (t.id === taskId) {
                    return { ...t, children: subTasks, isExpanded: true };
                }
                if (t.children) {
                    return { ...t, children: updateTasks(t.children) };
                }
                return t;
            });
        };
        setPlannerTasks(prev => updateTasks(prev));
    };

    const handleDeleteTask = (taskId: string | number) => {
        const removeTask = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks
                .filter(t => String(t.id) !== String(taskId))
                .map(t => ({
                    ...t,
                    children: t.children ? removeTask(t.children) : undefined
                }));
        };
        setPlannerTasks(prev => removeTask(prev));
    };

    const handleUpdatePlannedQuantity = useCallback((taskId: string | number, planned: number, unit: string) => {
        const isDraft = activeSchedule.status === ScheduleStatus.Draft;
        const updateRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => tasks.map(t => {
            if (t.id !== taskId) {
                return t.children ? { ...t, children: updateRecursively(t.children) } : t;
            }
            const locked = t.productionQuantity?.plannedLocked ?? hasAnyActualQuantity(t);
            if (locked && !isDraft) return t;
            const dailyMetrics = distributePlannedQuantityUniformly(t, planned, unit);
            return {
                ...t,
                productionQuantity: {
                    planned,
                    plannedLocked: false,
                    unit,
                    dailyMetrics,
                },
            };
        });
        setPlannerTasks(prev => updateRecursively(prev));
    }, [activeSchedule.status]);

    const handleUpdateDailyQuantity = useCallback((taskId: string | number, date: string, plan: number, actual: number) => {
        const updateRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => tasks.map(t => {
            if (t.id !== taskId) {
                return t.children ? { ...t, children: updateRecursively(t.children) } : t;
            }
            const pq = ensureProductionQuantity(t);
            const totalPlanned = pq.planned;
            const maxActual = getMaxActualForDay(t, date);
            const clampedActual = totalPlanned > 0
                ? Math.min(Math.max(0, actual), maxActual)
                : Math.max(0, actual);
            let dailyMetrics = pq.dailyMetrics.map(m =>
                m.date === date
                    ? {
                        ...m,
                        quantity: {
                            ...m.quantity,
                            plan: Math.min(plan, totalPlanned),
                            actual: clampedActual,
                            unit: m.quantity?.unit ?? pq.unit,
                        },
                    }
                    : m
            );
            if (!dailyMetrics.some(m => m.date === date)) {
                dailyMetrics = [...dailyMetrics, {
                    date,
                    quantity: { plan: 0, actual: clampedActual, unit: pq.unit },
                    hours: { plan: 0, actual: 0 },
                    crew: { plan: 0, actual: 0 },
                }];
            }
            dailyMetrics = ensureDailyPlanWithinTotal(dailyMetrics, totalPlanned, pq.unit);
            const hasActual = dailyMetrics.some(m => (m.quantity?.actual ?? 0) > 0);
            return {
                ...t,
                productionQuantity: {
                    ...pq,
                    plannedLocked: hasActual,
                    dailyMetrics,
                },
            };
        });
        setPlannerTasks(prev => updateRecursively(prev));
    }, []);

    const handleCommitCellValue = useCallback((taskId: string | number, dateISO: string, value: number) => {
        const found = findTaskById(plannerTasks, taskId);
        const existingPlan = found?.productionQuantity?.dailyMetrics?.find(m => m.date === dateISO)?.quantity?.plan ?? 0;
        handleUpdateDailyQuantity(taskId, dateISO, existingPlan, value);
    }, [plannerTasks, findTaskById, handleUpdateDailyQuantity]);

    const handleTabToNextCell = useCallback((currentDateISO: string) => {
        if (!selectedCellId) return;
        const taskIdStr = selectedCellId.split('_')[0];
        const nextDate = addDays(parseLookaheadDate(currentDateISO), 1);
        const nextDateISO = formatDateISO(nextDate);
        const taskId: string | number = isNaN(Number(taskIdStr)) ? taskIdStr : Number(taskIdStr);
        const found = findTaskById(plannerTasks, taskId);
        if (!found) return;
        const taskEnd = parseLookaheadDate(found.fieldFinishDate || found.finishDate);
        if (nextDate > taskEnd) return;
        const nextDayIndex = getDaysDiff(projectStartDate, nextDate);
        if (nextDayIndex < bufferDaysBefore || nextDayIndex >= bufferDaysBefore + (periodDurationDays ?? Infinity)) return;
        setSelectedCellId(`${taskIdStr}_${nextDateISO}`);
        setSelectedTask(found);
        setSelectedDay({ task: found, date: nextDate, forecast: weatherByDate.get(nextDateISO) });
    }, [selectedCellId, plannerTasks, findTaskById, projectStartDate, bufferDaysBefore, periodDurationDays, weatherByDate]);

    const weekHeaders: { label: string; days: number }[] = [];
    let currentDate = new Date(projectStartDate);
    while (currentDate <= projectEndDate) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = addDays(weekStart, 6);
        const label = `${weekStart.toLocaleString('default', { month: 'short' })} ${weekStart.getDate()} - ${weekEnd.toLocaleString('default', { month: 'short' })} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

        let daysInWeek = 0;
        for (let i = 0; i < 7 && addDays(currentDate, i) <= projectEndDate; i++) {
            daysInWeek++;
        }

        weekHeaders.push({ label, days: daysInWeek });
        currentDate = addDays(currentDate, daysInWeek);
    }

    const renderCell = (type: LookaheadColumnType, task: LookaheadTask, level: number, rowIndex?: number) => {
        switch (type) {
            case 'sNo':
                return (
                    <RowNumberCheckbox 
                        index={rowIndex ?? task.sNo}
                        isSelected={selectedRowIds.has(task.id)}
                        onToggle={() => toggleRowSelection(task.id)}
                        isCritical={task.isCriticalPath}
                    />
                );
            case 'costCode':
                return (
                    <span className="text-xs font-medium text-gray-700 truncate block" title={task.taskCode}>{task.taskCode}</span>
                );
            case 'name': {
                const hasBlockingConstraints = task.constraints.some(c => c.severity === 'Blocking');
                const hasUnresolvedInSubtree = tasksWithUnresolvedClash.has(task.id);
                const unresolvedClash = hasUnresolvedInSubtree ? getFirstUnresolvedClash(task) : null;

                const taskDeltas = activeScheduleId ? deltas[activeScheduleId] || [] : [];
                const taskDelta = taskDeltas.find(d => String(d.taskId) === String(task.id));
                const isFieldTask = task.taskType === 'Field Task';
                return (
                    <div className="flex items-center w-full overflow-hidden" style={{ paddingLeft: `${8 + (level * 24)}px`}}>
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mr-1">
                            {task.children && task.children.length > 0 ? (
                                <button onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }} className="text-gray-400 hover:text-gray-800">
                                    {task.isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                </button>
                            ) : <DocumentIcon className="w-4 h-4 text-gray-400"/>}
                        </div>
                        <span className={`truncate font-medium ${isFieldTask ? 'text-blue-700' : 'text-gray-800'}`} title={task.name}>{task.name}</span>
                        {isFieldTask && (
                            <span className="ml-1.5 px-1 rounded bg-blue-100 text-blue-600 text-[8px] font-bold uppercase tracking-wider" title="Field Breakdown Task">Field</span>
                        )}
                        {task.isCriticalPath && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="ml-1.5 px-1 rounded bg-red-100 text-red-600 text-[8px] font-bold uppercase tracking-wider">CT</span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Critical Task</TooltipContent>
                            </Tooltip>
                        )}
                        {hasBlockingConstraints && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="ml-1 text-red-500">
                                        <OctagonXIcon className="w-4 h-4" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Has blocking constraints</TooltipContent>
                            </Tooltip>
                        )}
                        {unresolvedClash && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setActiveClash(unresolvedClash); }}
                                        className="ml-1 p-0.5 text-orange-500 hover:text-orange-700 rounded"
                                        title={`Clash detected: ${unresolvedClash.status}`}
                                    >
                                        <AlertTriangleIcon className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">{`Location clash: ${unresolvedClash.location} (${unresolvedClash.status})`}</TooltipContent>
                            </Tooltip>
                        )}
                        {taskDelta && activeSchedule.status === ScheduleStatus.Draft && (
                            <span className={`ml-1.5 px-1 rounded text-[8px] font-bold uppercase ${
                                taskDelta.type === 'added' ? 'bg-green-100 text-green-600' : 
                                taskDelta.type === 'modified' ? 'bg-blue-100 text-blue-600' : 
                                'bg-red-100 text-red-600'
                            }`}>
                                {taskDelta.type}
                            </span>
                        )}
                    </div>
                );
            }
            case 'commitment': {
                const isInReview = activeSchedule.status === ScheduleStatus.InReview;
                if (isInReview) {
                    if (level > 0) return null;
                    const meta = commitmentMeta(task.commitmentStatus);
                    const elevated = task.commitmentStatus === 'rejected' || task.commitmentStatus === 'adjustment_proposed' || task.commitmentStatus === 'disputed';
                    if (persona === 'gc') {
                        return (
                            <div className="flex items-center justify-center w-full">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setTaskForGcReviewModal(task); }}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-200 cursor-pointer hover:brightness-95 hover:shadow-sm ${meta.classes} ${elevated ? 'ring-2 ring-amber-200' : ''}`}
                                    title="Click to review"
                                >
                                    {meta.label}
                                </button>
                            </div>
                        );
                    }
                    return (
                        <div className="flex items-center justify-center w-full">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-200 ${meta.classes} ${elevated ? 'ring-2 ring-amber-200' : ''}`}>
                                {meta.label}
                            </span>
                        </div>
                    );
                }

                // Legacy prototype commitment (SC net-new tasks) for Draft/Active
                if (persona !== 'sc' || level > 0) return null;
                const status = commitmentByTaskId[task.id]?.status ?? 'pending';
                const isNetNew = netNewTaskIds.has(task.id);
                if (isNetNew && status === 'pending') {
                    return (
                        <div className="flex items-center justify-center w-full">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setTaskForCommitmentModal(task); }}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-colors"
                            >
                                Pending
                            </button>
                        </div>
                    );
                }
                if (status === 'committed') {
                    return (
                        <div className="flex items-center justify-center w-full">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setTaskForCommitmentModal(task); }} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100 hover:border-green-300 transition-colors">Committed</button>
                        </div>
                    );
                }
                if (status === 'rejected') {
                    return (
                        <div className="flex items-center justify-center w-full">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setTaskForCommitmentModal(task); }} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100 hover:border-red-300 transition-colors">Rejected</button>
                        </div>
                    );
                }
                if (status === 'proposed') {
                    return (
                        <div className="flex items-center justify-center w-full">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setTaskForCommitmentModal(task); }} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 hover:border-amber-300 transition-colors">Proposed</button>
                        </div>
                    );
                }
                return null;
            }
            case 'actions': {
                const canShowAddCrew = activeSchedule.status === ScheduleStatus.Active && MOCK_PROJECT_CREW.length > 0;
                const isGC = persona === 'gc';
                const isScPendingCommit = persona === 'sc' && level === 0 && netNewTaskIds.has(task.id) && (commitmentByTaskId[task.id]?.status ?? 'pending') === 'pending';
                return (
                    <div className="flex items-center justify-center gap-1 w-full px-1">
                        {activeSchedule.status !== ScheduleStatus.Closed && (
                            <>
                                {isScPendingCommit && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setTaskForCommitmentModal(task); }}
                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                                            aria-label="Commit Required"
                                        >
                                            <HandshakeIcon className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Commit Required</TooltipContent>
                                </Tooltip>
                                )}
                                {isGC && activeSchedule.status !== ScheduleStatus.Active && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsAddTaskModalOpen(true); }}
                                            className="p-1.5 text-zinc-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Add task</TooltipContent>
                                </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTaskToBreakdown(task);
                                                setIsFieldBreakdownModalOpen(true);
                                            }}
                                            className="p-1.5 text-zinc-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                                        >
                                            <ListTreeIcon className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Field Breakdown</TooltipContent>
                                </Tooltip>
                                {canShowAddCrew && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAddCrewContext({ taskId: task.id, dateString: task.startDate });
                                                }}
                                                className="p-1.5 text-zinc-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                                            >
                                                <HardHatIcon className="w-4 h-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Add Crew</TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTask(task.id);
                                            }}
                                            className="p-1.5 text-zinc-600 hover:text-red-700 hover:bg-red-100 rounded"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Delete Task</TooltipContent>
                                </Tooltip>
                            </>
                        )}
                    </div>
                );
            }
            case 'status':
                return (
                    <ConstraintBadge 
                        status={task.status} 
                        progress={task.progress}
                        onClick={() => handleConstraintBadgeClick(task)} 
                    />
                );
            case 'taskType':
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        task.taskType === 'Budget Task' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-50 text-gray-700 border border-gray-100'
                    }`}>
                        {task.taskType}
                    </span>
                );
            case 'quantity': {
                const planned = getTotalPlannedQuantity(task);
                const actual = getTotalActualQuantity(task);
                const unit = getQuantityUnit(task);
                if (planned === 0 && actual === 0) return <span className="text-gray-400">—</span>;
                return (
                    <span className="truncate text-gray-700" title={`Planned: ${formatQuantityDisplay(planned)} / Actual: ${formatQuantityDisplay(actual)} ${unit}`}>
                        {formatQuantityDisplay(actual)}{planned > 0 ? ` / ${formatQuantityDisplay(planned)}` : ''} <span className="text-gray-400 text-[10px]">{unit}</span>
                    </span>
                );
            }
            case 'contractor': {
                const isFieldTask = task.taskType === 'Field Task';
                const isClosed = activeSchedule.status === ScheduleStatus.Closed;
                if (isFieldTask && !isClosed) {
                    return <span className="truncate text-gray-700 min-w-0" title={task.contractor}>{task.contractor}</span>;
                }
                return <span className="truncate text-gray-700 min-w-0" title={task.contractor}>{task.contractor}</span>;
            }
            case 'location': {
                const taskClashes = clashesByTaskId.get(task.id) ?? [];
                const hasClash = taskClashes.length > 0;
                const latestClash = taskClashes[0]; // Assuming we care about the first clash found for display

                let clashClasses = '';
                let clashTitle = task.location || '-';

                if (hasClash) {
                    if (latestClash.status === 'Unresolved') {
                        clashClasses = 'text-amber-700 font-semibold bg-amber-50 border border-amber-300';
                        clashTitle = `Location clash detected: ${latestClash.location} (Unresolved) – click to resolve`;
                    }
                    else if (latestClash.status === 'Accepted risk') {
                        clashClasses = 'text-amber-700 font-semibold bg-amber-50 border border-amber-300';
                        clashTitle = `Location clash detected: ${latestClash.location} (Accepted risk) – click to view/modify`;
                    }
                    else if (latestClash.status === 'Resolved') {
                        clashClasses = 'text-green-700 font-semibold bg-green-50 border border-green-300';
                        clashTitle = `Location clash: ${latestClash.location} (Resolved) – click to view`;
                    }
                }

                return (
                    <button
                        type="button"
                        className={`truncate text-gray-500 italic min-w-0 text-left px-1 rounded cursor-pointer ${clashClasses}`}
                        onClick={hasClash ? (e) => { e.stopPropagation(); setActiveClash(latestClash); } : undefined}
                        title={clashTitle}
                    >
                        {task.location || '-'}
                    </button>
                );
            }
            case 'progress': {
                const hasSubTasks = task.children && task.children.length > 0;
                const isClosed = activeSchedule.status === ScheduleStatus.Closed;
                const isEditable = !hasSubTasks && !isClosed;
                return (
                    <ProgressCell 
                        progress={task.progress}
                        isEditable={isEditable}
                        onChange={(val) => handleUpdateProgress(task.id, val)}
                    />
                );
            }
            case 'crewAssigned': {
                const count = task.assignedCrewByDate?.[task.startDate]?.length ?? task.crewAssigned;
                return <span className="w-full text-center font-medium text-gray-700">{count}</span>;
            }
            case 'planStart': {
                const isDelayed = task.fieldStartDate && task.fieldStartDate > task.startDate;
                return (
                    <div className="flex flex-col leading-tight">
                        <span className={`${isDelayed ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                            {formatDisplayDate(task.fieldStartDate || task.startDate)}
                        </span>
                        {task.fieldStartDate && task.fieldStartDate !== task.startDate && (
                            <span className="text-[9px] text-gray-400 line-through">{formatDisplayDate(task.startDate)}</span>
                        )}
                    </div>
                );
            }
            case 'planEnd': {
                const isDelayed = task.fieldFinishDate && task.fieldFinishDate > task.finishDate;
                return (
                    <div className="flex flex-col leading-tight">
                        <span className={`${isDelayed ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                            {formatDisplayDate(task.fieldFinishDate || task.finishDate)}
                        </span>
                        {task.fieldFinishDate && task.fieldFinishDate !== task.finishDate && (
                            <span className="text-[9px] text-gray-400 line-through">{formatDisplayDate(task.finishDate)}</span>
                        )}
                    </div>
                );
            }
            default:
                return null;
        }
    };

    const renderLeftRow = (task: LookaheadTask, level: number, rowIndex: number) => {
        const isSelected = selectedRowIds.has(task.id);
        const isFieldTask = task.taskType === 'Field Task';
        const isDetailActive = isRightPanelOpen && selectedTask?.id === task.id && !selectedDay;
        return (
            <div
                key={task.id}
                className={`group flex transition-colors cursor-pointer ${isSelected ? 'bg-blue-100' : isFieldTask ? 'bg-blue-50' : 'bg-white'}`}
                style={{ height: `${rowHeight}px` }}
                onClick={() => { setSelectedDay(null); setSelectedCellId(null); setSelectedTask(task); setRightPanelView('details'); setIsRightPanelOpen(true); }}
            >
                <div
                    className={`flex ${isSelected ? 'bg-blue-100' : isFieldTask ? 'bg-blue-50' : 'bg-white'}`}
                    style={{ width: `${totalLeftPanelWidth}px` }}
                >
                    {visiblePanelColumns.map((col) => {
                        const bgClass = isSelected ? 'bg-blue-100' : isFieldTask ? 'bg-blue-50' : 'bg-white';
                        const snoBgClass = col.lookaheadType === 'sNo'
                            ? (isDetailActive ? 'bg-indigo-100' : '')
                            : '';
                        const snoStickyBgClass = col.lookaheadType === 'sNo'
                            ? (isDetailActive ? 'bg-indigo-100' : bgClass)
                            : bgClass;
                        return (
                        <div
                            key={col.id}
                            className={`flex-shrink-0 flex items-center px-2 text-sm relative border-b border-r border-gray-200 ${(col.lookaheadType === 'sNo' || col.lookaheadType === 'actions' || col.lookaheadType === 'commitment') ? 'justify-center' : ''} ${(col.lookaheadType === 'progress' || col.lookaheadType === 'sNo' || col.lookaheadType === 'status' || col.lookaheadType === 'actions' || col.lookaheadType === 'costCode' || col.lookaheadType === 'commitment') ? '' : 'overflow-hidden'} ${snoBgClass} ${col.isSticky ? `sticky z-20 ${snoStickyBgClass}` : ''}`}
                            style={{ width: `${col.widthPx}px`, ...(col.isSticky ? { left: col.stickyLeftOffset ?? col.leftOffset } : {}) }}
                        >
                            {(col.lookaheadType === 'sNo' && task.isCriticalPath) && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                            )}
                            <div className={`w-full h-full min-w-0 flex items-center ${(col.lookaheadType === 'progress' || col.lookaheadType === 'sNo' || col.lookaheadType === 'status' || col.lookaheadType === 'actions' || col.lookaheadType === 'costCode' || col.lookaheadType === 'commitment') ? '' : 'overflow-hidden'}`}>
                                {renderCell(col.lookaheadType, task, level, rowIndex)}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderRightRow = (task: LookaheadTask) => {
        const isSelected = selectedRowIds.has(task.id);
        const isFieldTask = task.taskType === 'Field Task';
        return (
            <div 
                key={task.id} 
                className={`group flex border-b border-gray-200 first:border-t transition-colors ${isSelected ? 'bg-blue-100' : isFieldTask ? 'bg-blue-50' : ''}`} 
                style={{ height: `${rowHeight}px` }}
            >
                <div className="relative flex flex-grow" style={{ minWidth: `${totalDays * dayWidth}px` }}>
                    <DraggableTaskBar
                        task={task}
                        projectStartDate={projectStartDate}
                        projectEndDate={projectEndDate}
                        dayWidth={dayWidth}
                        onUpdateTask={handleUpdateTaskDates}
                        onDayClick={handleDayClick}
                        offsetLeft={0}
                        disabled={activeSchedule.status === ScheduleStatus.Closed}
                        scheduleStatus={activeSchedule.status}
                        bufferDaysBefore={bufferDaysBefore}
                        periodDurationDays={periodDurationDays}
                        showMasterRange={showMasterRange}
                        selectedDate={
                            selectedCellId && selectedCellId.startsWith(`${task.id}_`)
                                ? parseLookaheadDate(selectedCellId.slice(String(task.id).length + 1))
                                : null
                        }
                        onCommitCellValue={handleCommitCellValue}
                        onTabToNextCell={handleTabToNextCell}
                    />
                </div>
            </div>
        );
    };

    const renderLeftRows = (): React.ReactNode[] => {
        return flattenedTaskRows.map(({ task, level }, i) => renderLeftRow(task, level, i + 1));
    };

    const renderRightRows = (): React.ReactNode[] => {
        return flattenedTaskRows.map(({ task }) => renderRightRow(task));
    };

    const Resizer: React.FC<{ onMouseDown: (e: React.MouseEvent) => void; isLast?: boolean }> = ({ onMouseDown, isLast }) => (
        <div 
            onMouseDown={onMouseDown} 
            className={`absolute top-0 right-0 h-full cursor-col-resize z-20 transition-colors ${
                isLast ? 'w-1 bg-transparent hover:bg-blue-400' : 'w-1 hover:bg-blue-300'
            }`} 
        />
    );

    const effectiveLeftViewportWidth = leftPanelViewportWidth > 0 ? leftPanelViewportWidth : widthThroughEndColumn;

    const SplitResizer: React.FC = () => (
            <div 
                onMouseDown={handleSplitMouseDown}
                className="flex-shrink-0 cursor-col-resize flex items-stretch justify-center group/split"
                style={{ width: `${SPLIT_HIT_WIDTH}px` }}
            >
                <div 
                    className="h-full bg-gray-300 group-hover/split:bg-blue-300 transition-colors"
                    style={{ width: `${SPLIT_GRABBER_WIDTH}px` }}
                />
            </div>
        );

    return (
        <div className="flex h-full flex-col p-4 gap-4">
            {activeSchedule.status === ScheduleStatus.InReview && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">In Review</div>
                            <div className="text-sm text-gray-600">
                                {persona === 'gc'
                                    ? 'Subcontractors are reviewing assigned tasks. Resolve all tasks before publishing to Active.'
                                    : 'This lookahead is awaiting your response. Please commit, propose adjustments, or reject all assigned tasks.'}
                            </div>
                        </div>
                        {persona === 'gc' && (
                            <div className="text-xs text-gray-400">
                                Recent activity: {(activityFeedByScheduleId[activeSchedule.id] ?? []).length}
                            </div>
                        )}
                    </div>
                    {persona === 'gc' && commitmentCounts && (
                        <ReviewProgressBar counts={commitmentCounts.counts} total={commitmentCounts.total} />
                    )}
                </div>
            )}

            {/* Subcontractor focused review view */}
            {activeSchedule.status === ScheduleStatus.InReview && persona === 'sc' ? (
                <SubReviewCards
                    scheduleId={activeSchedule.id}
                    scCompany={scCompany}
                    tasks={flattenTasks(tasksForDisplay).filter(t => !t.children?.length)}
                    onCommit={(taskId) => commitTask(activeSchedule.id, taskId, scCompany)}
                    onReject={(taskId, payload) => rejectTask(activeSchedule.id, taskId, payload, scCompany)}
                    onPropose={(taskId, payload) => proposeTaskAdjustment(activeSchedule.id, taskId, payload, scCompany)}
                    projectCrew={MOCK_PROJECT_CREW}
                    onAssignCrew={handleUpdateAssignedCrew}
                />
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <ViewControls
                            renderBeforeSearch={
                                <button
                                    onClick={() => setIsLeftPanelOpen(prev => !prev)}
                                    className={`p-1.5 rounded-md transition-colors ${isLeftPanelOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                                    title={isLeftPanelOpen ? "Collapse left table panel" : "Expand left table panel"}
                                >
                                    <PanelLeftIcon className="w-6 h-6" />
                                </button>
                            }
                        />
                        <div className="flex items-center gap-2">
                            <ViewSettingsMenu />
                            <button
                                onClick={() => {
                                    const chatIsActive = isRightPanelOpen && rightPanelView === 'chat';
                                    if (chatIsActive) {
                                        setIsRightPanelOpen(false);
                                    }
                                    else {
                                        setRightPanelView('chat');
                                        setIsRightPanelOpen(true);
                                    }
                                }}
                                className={`p-1.5 rounded-md transition-colors ${isRightPanelOpen && rightPanelView === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                                title="Team chat"
                            >
                                <MessageSquareIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (isRightPanelOpen) {
                                        setIsRightPanelOpen(false);
                                    } else {
                                        setRightPanelView('details');
                                        setIsRightPanelOpen(true);
                                    }
                                }}
                                className={`p-1.5 rounded-md transition-colors ${isRightPanelOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                                title={isRightPanelOpen ? "Collapse right panel" : "Expand right panel"}
                            >
                                <PanelRightIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    <div
                        className="flex-grow flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative"
                        style={{ '--table-font-size': `${fontSize}px` } as React.CSSProperties}
                    >
                        {/* Main Planner - Split view with independent scrollbars */}
                        <div ref={plannerContainerRef} className="flex-grow overflow-hidden flex min-w-0">
                            {/* Left pane - table columns; togglable like right details panel */}
                            <div
                                className="flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col"
                                style={{ width: isLeftPanelOpen ? effectiveLeftViewportWidth : 0 }}
                            >
                                <div
                                    ref={leftScrollRef}
                                    className="flex-shrink-0 overflow-auto flex flex-col border-r-0 h-full"
                                    style={{ width: `${effectiveLeftViewportWidth}px`, minWidth: `${MIN_LEFT_VIEWPORT}px` }}
                                    onScroll={() => syncVerticalScroll('left')}
                                >
                                    <div className="sticky top-0 z-40 bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-t border-b border-gray-200 flex-shrink-0">
                                        <div className="border-b border-gray-200" style={{ height: `${headerHeights.weekRow}px` }}>
                                            <div className="bg-gray-50 flex" style={{ width: `${totalLeftPanelWidth}px`, minHeight: `${headerHeights.weekRow}px` }} />
                                        </div>
                                        <div className="flex" style={{ height: `${headerHeights.dayRow}px` }}>
                                            <div className="flex bg-gray-50" style={{ width: `${totalLeftPanelWidth}px` }}>
                                                {visiblePanelColumns.map((col, index) => (
                                                    <div
                                                        key={col.id}
                                                        className={`flex-shrink-0 flex items-end pb-1 px-2 text-xs font-semibold text-gray-600 uppercase relative border-b border-r border-gray-200 ${(col.lookaheadType === 'sNo' || col.lookaheadType === 'commitment') ? 'justify-center' : ''} ${col.isSticky ? `sticky z-30 bg-gray-50` : ''}`}
                                                        style={{ width: `${col.widthPx}px`, ...(col.isSticky ? { left: col.stickyLeftOffset ?? col.leftOffset } : {}) }}
                                                    >
                                                        {col.lookaheadType === 'sNo' ? (
                                                            <div className="flex items-center justify-center w-full mb-0.5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedRowIds.size > 0 && selectedRowIds.size === allTaskIds.length}
                                                                    ref={(el) => {
                                                                        if (el) {
                                                                            el.indeterminate = selectedRowIds.size > 0 && selectedRowIds.size < allTaskIds.length;
                                                                        }
                                                                    }}
                                                                    onChange={toggleAllSelection}
                                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="truncate w-full min-w-0">{col.label}</span>
                                                        )}
                                                        <Resizer
                                                            onMouseDown={(e) => handleMouseDown(e, col.id, col.widthPx, index === visiblePanelColumns.length - 1)}
                                                            isLast={index === visiblePanelColumns.length - 1}
                                                        />
                                                        {index === visiblePanelColumns.length - 1 && (
                                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gray-300/30 pointer-events-none" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white flex-shrink-0" style={{ fontSize: `${fontSize}px` }}>
                                        {renderLeftRows()}
                                    </div>
                                </div>
                            </div>

                            {isLeftPanelOpen && <SplitResizer />}

                            {/* Right panel - timeline, both scrolls */}
                            <div
                                ref={rightScrollRef}
                                className="flex-1 overflow-auto min-w-0"
                                onScroll={() => syncVerticalScroll('right')}
                            >
                                <div className="relative" style={{ minWidth: `${totalDays * dayWidth}px` }}>
                                    {/* Background grid */}
                                    <div
                                        className="absolute top-0 left-0 w-full h-full grid"
                                        style={{ paddingTop: `${totalHeaderHeight}px`, zIndex: 0, gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}
                                        aria-hidden="true"
                                    >
                                        {Array.from({ length: totalDays }).map((_, i) => {
                                            const date = addDays(projectStartDate, i);
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                            const isBuffer = isDayBuffer(i);
                                            return (
                                                <div
                                                    key={i}
                                                    className={`h-full border-r ${isBuffer ? 'bg-gray-100 border-gray-200' : isWeekend ? 'bg-gray-50 border-gray-100' : 'border-gray-100'}`}
                                                    title={isBuffer ? 'Outside lookahead period' : undefined}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Timeline header */}
                                    <div className="sticky top-0 bg-gray-50 z-40 text-xs font-semibold text-gray-600 uppercase border-b border-t border-gray-200">
                                        <div className="flex border-b border-gray-200" style={{ height: `${headerHeights.weekRow}px` }}>
                                            {weekHeaders.map((week, i) => (
                                                <div key={i} className="flex items-center justify-center border-r border-gray-200 flex-shrink-0 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis px-1" style={{ width: `${week.days * dayWidth}px` }} title={week.label}>{week.label}</div>
                                            ))}
                                        </div>
                                        <div
                                            className="grid flex-shrink-0"
                                            style={{ height: `${headerHeights.dayRow}px`, gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}
                                        >
                                            {Array.from({ length: totalDays }).map((_, i) => {
                                                const date = addDays(projectStartDate, i);
                                                const dateString = formatDateISO(date);
                                                const forecast = weatherByDate.get(dateString) ?? { date: dateString, icon: 'cloud' as const, temp: 70 };
                                                const isBuffer = isDayBuffer(i);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`flex flex-col items-center justify-between py-1 border-r border-gray-200 ${isBuffer ? 'bg-gray-100 opacity-60 pointer-events-none' : ''}`}
                                                        title={isBuffer ? 'Outside lookahead period' : `${forecast.temp}°F`}
                                                    >
                                                        <div className="flex items-center">
                                                            <span className={`text-[10px] mr-0.5 ${isBuffer ? 'text-gray-400' : 'text-gray-400'}`}>{date.toLocaleString('default', { weekday: 'short' })[0]}</span>
                                                            <span className={isBuffer ? 'font-normal text-gray-500' : 'font-normal'}>{date.getDate()}</span>
                                                        </div>
                                                        {headerHeights.weatherSection > 0 && (
                                                            <div className="flex flex-col items-center justify-center" style={{ height: `${headerHeights.weatherSection}px` }}>
                                                                {!isBuffer && (
                                                                    <div className="flex flex-col items-center" title={`${forecast.temp}°F`}>
                                                                        <WeatherIcon icon={forecast.icon} />
                                                                        {headerHeights.weatherSection >= 28 && (
                                                                            <span className="text-[10px] font-medium text-gray-600">{forecast.temp}°</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Timeline body */}
                                    <div className="relative z-10" onClick={() => setSelectedCellId(null)}>
                                        {renderRightRows()}
                                    </div>
                                </div>
                            </div>

                            {/* Right pane - always in layout; width 0 when closed so content is pushed, not overlayed */}
                            <div
                                className="flex-shrink-0 overflow-hidden bg-gray-50 border-l border-gray-200 flex flex-col"
                                style={{
                                    width: isRightPanelOpen ? 420 : 0,
                                    transition: 'width 200ms cubic-bezier(0.32, 0.72, 0, 1)',
                                }}
                                role="region"
                                aria-label="Details panel"
                            >
                                {isRightPanelOpen && (
                                    <>
                                        {rightPanelView === 'chat' ? (
                                            <ChatPanel
                                                onClose={() => setIsRightPanelOpen(false)}
                                                currentUserRole={persona === 'sc' ? 'sc' : 'gc'}
                                                currentUserName={persona === 'sc' ? 'Jess Park' : 'Marcus Rivera'}
                                                currentUserCompany={persona === 'sc' ? 'EliteMEP' : 'Turner Construction'}
                                            />
                                        ) : selectedDay ? (
                                            <DailyMetricsPanel
                                                data={{
                                                    ...selectedDay,
                                                    task: findTaskById(plannerTasks, selectedDay.task.id) ?? selectedDay.task,
                                                }}
                                                onClose={handleCloseRightPanel}
                                                onUpdateDailyQuantity={activeSchedule.status !== ScheduleStatus.Closed ? handleUpdateDailyQuantity : undefined}
                                                onUpdateAssignedCrew={
                                                    activeSchedule.status === ScheduleStatus.Active &&
                                                    PROJECT_COMPANY_NAMES.some(c => selectedDay.task.contractor?.includes(c))
                                                        ? handleUpdateAssignedCrew
                                                        : undefined
                                                }
                                                onOpenAddCrew={
                                                    activeSchedule.status === ScheduleStatus.Active && MOCK_PROJECT_CREW.length > 0
                                                        ? (taskId, dateStr) => setAddCrewContext({ taskId, dateString: dateStr })
                                                        : undefined
                                                }
                                                isActive={activeSchedule.status === ScheduleStatus.Active}
                                                scheduleStatus={activeSchedule.status}
                                                projectCrew={MOCK_PROJECT_CREW}
                                                embedded
                                            />
                                        ) : selectedTask ? (
                                            <LookaheadDetailsPanel
                                                task={findTaskById(plannerTasks, selectedTask.id) ?? selectedTask}
                                                taskDelta={activeScheduleId ? (deltas[activeScheduleId] || []).find(d => String(d.taskId) === String(selectedTask.id)) : undefined}
                                                onClose={handleCloseRightPanel}
                                                onAddConstraint={activeSchedule.status !== ScheduleStatus.Closed ? handleAddConstraint : undefined}
                                                onUpdateProgress={activeSchedule.status !== ScheduleStatus.Closed ? handleUpdateProgress : undefined}
                                                onUpdateContractor={activeSchedule.status !== ScheduleStatus.Closed ? handleUpdateContractor : undefined}
                                                onUpdatePlannedQuantity={activeSchedule.status !== ScheduleStatus.Closed ? handleUpdatePlannedQuantity : undefined}
                                                onUpdateDailyQuantity={activeSchedule.status !== ScheduleStatus.Closed ? handleUpdateDailyQuantity : undefined}
                                                onOpenAddCrew={
                                                    activeSchedule.status === ScheduleStatus.Active && MOCK_PROJECT_CREW.length > 0
                                                        ? (taskId, dateString) => setAddCrewContext({ taskId, dateString })
                                                        : undefined
                                                }
                                                isDraft={activeSchedule.status === ScheduleStatus.Draft}
                                                isReadOnly={activeSchedule.status === ScheduleStatus.Closed}
                                                scheduleStatus={activeSchedule.status}
                                                embedded
                                                commitment={commitmentByTaskId[selectedTask.id]}
                                                isNetNew={netNewTaskIds.has(selectedTask.id)}
                                                isTopLevelTask={tasksForDisplay.some(t => String(t.id) === String(selectedTask.id))}
                                                onSetCommitment={(state) => setCommitment(selectedTask.id, state)}
                                                persona={persona}
                                                addProjectRisk={addProjectRisk}
                                                onOpenCommitmentModal={() => setTaskForCommitmentModal(selectedTask)}
                                                onGcAcceptAdjustment={(taskId, payload) => gcAcceptAdjustment(activeSchedule.id, taskId, payload)}
                                                onGcCounterPropose={(taskId, payload) => gcCounterPropose(activeSchedule.id, taskId, payload)}
                                                onGcMarkDisputed={(taskId, payload) => gcMarkDisputed(activeSchedule.id, taskId, payload)}
                                                onOpenGcReviewModal={selectedTask ? () => setTaskForGcReviewModal(selectedTask) : undefined}
                                            />
                                        ) : (
                                            /* Empty state: panel open but nothing selected */
                                            <div className="flex flex-col h-full bg-gray-50">
                                                <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                                                    <h2 className="text-lg font-semibold text-gray-800">Details</h2>
                                                    <button
                                                        onClick={() => setIsRightPanelOpen(false)}
                                                        className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                                        aria-label="Close panel"
                                                    >
                                                        <XIcon className="w-5 h-5" />
                                                    </button>
                                                </header>
                                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                                                    <p className="text-sm font-medium text-gray-700 mb-1">No task or day selected</p>
                                                    <p className="text-xs">Select a task row or a day cell in the timeline to view details here.</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <TaskSelectionModal
                        isOpen={isAddTaskModalOpen}
                        onClose={() => setIsAddTaskModalOpen(false)}
                        onConfirm={handleAddTasks}
                        availableTasks={MASTER_SCHEDULE_TASKS}
                    />

                    <CreateLookaheadModal
                        isOpen={isCreateLookaheadModalOpen}
                        onClose={() => setIsCreateLookaheadModalOpen(false)}
                        onCreate={handleCreateLookahead}
                        previousStartDate={previousPublishedSchedule?.publishedAt?.split('T')[0]}
                        previousDurationDays={previousDurationDays}
                    />

                    <FieldBreakdownModal
                        isOpen={isFieldBreakdownModalOpen}
                        onClose={() => setIsFieldBreakdownModalOpen(false)}
                        parentTask={taskToBreakdown}
                        onSave={handleSaveBreakdown}
                    />

                    {addCrewContext && (
                        <AddCrewModal
                            isOpen={true}
                            onClose={() => setAddCrewContext(null)}
                            onConfirm={(crewIds) => {
                                const taskId = addCrewContext.taskId;
                                handleUpdateAssignedCrew(taskId, addCrewContext.dateString, crewIds);
                                setAddCrewContext(null);
                                // Show commitment modal so user sees "Crew added" updated (or open it if they added crew from elsewhere)
                                if (persona === 'sc' && netNewTaskIds.has(taskId)) {
                                    const task = findTaskById(plannerTasks, taskId);
                                    setTaskForCommitmentModal(task ?? ({ id: taskId } as LookaheadTask));
                                }
                            }}
                            availableCrew={MOCK_PROJECT_CREW}
                            alreadyAssigned={(findTaskById(plannerTasks, addCrewContext.taskId)?.assignedCrewByDate?.[addCrewContext.dateString] ?? [])}
                        />
                    )}

                    <GcReviewModal
                        isOpen={!!taskForGcReviewModal}
                        task={taskForGcReviewModal ? (findTaskById(plannerTasks, taskForGcReviewModal.id) ?? taskForGcReviewModal) : null}
                        onClose={() => setTaskForGcReviewModal(null)}
                        onAccept={(taskId, payload) => { gcAcceptAdjustment(activeSchedule.id, taskId, payload); setTaskForGcReviewModal(null); }}
                        onCounterPropose={(taskId, payload) => { gcCounterPropose(activeSchedule.id, taskId, payload); setTaskForGcReviewModal(null); }}
                        onDispute={(taskId, payload) => { gcMarkDisputed(activeSchedule.id, taskId, payload); setTaskForGcReviewModal(null); }}
                    />

                    <ScCommitmentModal
                        isOpen={!!taskForCommitmentModal}
                        onClose={() => setTaskForCommitmentModal(null)}
                        task={taskForCommitmentModal ? (findTaskById(plannerTasks, taskForCommitmentModal.id) ?? taskForCommitmentModal) : null}
                        commitment={taskForCommitmentModal ? commitmentByTaskId[taskForCommitmentModal.id] : null}
                        onCommit={({ plannedQty, equipMaterialVerified }) => {
                            if (!taskForCommitmentModal) return;
                            setCommitment(taskForCommitmentModal.id, {
                                status: 'committed',
                                committedAt: new Date().toISOString(),
                                equipmentMaterialVerified: equipMaterialVerified,
                                plannedQtyAccepted: plannedQty > 0,
                            });
                        }}
                        onReject={({ rejectionReason, subNotes }) => {
                            if (!taskForCommitmentModal) return;
                            const resolvedTask = findTaskById(plannerTasks, taskForCommitmentModal.id) ?? taskForCommitmentModal;
                            setCommitment(taskForCommitmentModal.id, {
                                status: 'rejected',
                                rejectionReason,
                                rejectionComment: subNotes,
                                rejectedAt: new Date().toISOString(),
                            });
                            if (rejectionReason === 'Unanswered RFI') {
                                addProjectRisk({ taskId: resolvedTask.id, taskName: resolvedTask.name, reason: 'Unanswered RFI' });
                            }
                        }}
                        onPropose={(payload) => {
                            if (!taskForCommitmentModal) return;
                            setCommitment(taskForCommitmentModal.id, {
                                status: 'proposed',
                                proposedStartDate: payload.proposedStartDate,
                                proposedFinishDate: payload.proposedEndDate,
                                rejectionReason: payload.rejectionReason,
                                rejectionComment: payload.subNotes,
                            });
                        }}
                        projectCrew={MOCK_PROJECT_CREW}
                        onAssignCrew={(taskId, dateString, crewIds) => handleUpdateAssignedCrew(taskId, dateString, crewIds)}
                    />

                    <ClashResolutionModal
                        clash={activeClash}
                        isOpen={!!activeClash}
                        onClose={() => setActiveClash(null)}
                        onSave={(updated) => {
                            setClashes(prev => {
                                const next = prev.map(c => c.id === updated.id ? updated : c);
                                // If user resolved/accepted at the parent task level, cascade to all
                                // descendant task clashes so subtasks don't keep showing the icon.
                                if (updated.status === 'Resolved' || updated.status === 'Accepted risk') {
                                    const descendantIds = new Set<string | number>();
                                    updated.taskIds.forEach(tid => {
                                        const t = findTaskById(plannerTasks, tid);
                                        if (t?.children?.length) {
                                            const collect = (task: LookaheadTask) => {
                                                task.children?.forEach(c => { descendantIds.add(c.id); collect(c); });
                                            };
                                            collect(t);
                                        }
                                    });
                                    if (descendantIds.size > 0) {
                                        return next.map(c => {
                                            if (c.id === updated.id) return c;
                                            if (c.taskIds.some(id => descendantIds.has(id))) {
                                                return { ...c, status: updated.status, category: updated.category ?? c.category };
                                            }
                                            return c;
                                        });
                                    }
                                }
                                return next;
                            });
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default LookaheadView;

const SubReviewCards: React.FC<{
    scheduleId: string;
    scCompany: string | null;
    tasks: LookaheadTask[];
    onCommit: (taskId: string | number) => void;
    onReject: (taskId: string | number, payload: { rejectionReason: string; subNotes?: string }) => void;
    onPropose: (taskId: string | number, payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>) => void;
    projectCrew?: CrewMember[];
    onAssignCrew?: (taskId: string | number, dateString: string, crewIds: string[]) => void;
}> = ({ scCompany, tasks, onCommit, onReject, onPropose, projectCrew = [], onAssignCrew }) => {
    const assigned = useMemo(() => {
        const want = (scCompany ?? '').trim().toLowerCase();
        return tasks.filter(t => (t.contractor ?? '').trim().toLowerCase() === want);
    }, [tasks, scCompany]);

    const respondedCount = useMemo(() => assigned.filter(t => (t.commitmentStatus ?? 'pending') !== 'pending').length, [assigned]);

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{scCompany ?? 'Your company'} review</div>
                    <div className="text-xs text-gray-600">You have responded to {respondedCount} of {assigned.length} tasks.</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assigned.map(task => (
                    <SubTaskCard
                        key={String(task.id)}
                        task={task}
                        onCommit={(payload) => onCommit(task.id)}
                        onReject={(payload) => onReject(task.id, payload)}
                        onPropose={(payload) => onPropose(task.id, payload)}
                        projectCrew={projectCrew}
                        onAssignCrew={onAssignCrew}
                    />
                ))}
            </div>
        </div>
    );
};

const SubTaskCard: React.FC<{
    task: LookaheadTask;
    onCommit: (payload: { plannedQty: number; equipMaterialVerified: boolean; notes?: string }) => void;
    onReject: (payload: { rejectionReason: string; subNotes?: string }) => void;
    onPropose: (payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>) => void;
    projectCrew?: CrewMember[];
    onAssignCrew?: (taskId: string | number, dateString: string, crewIds: string[]) => void;
}> = ({ task, onCommit, onReject, onPropose, projectCrew = [], onAssignCrew }) => {
    const [modalOpen, setModalOpen] = useState(false);

    const status = task.commitmentStatus ?? 'pending';
    const meta = commitmentMeta(status);
    const locked = status === 'committed' || status === 'gc_accepted';
    const reopened = status === 'gc_revised';

    return (
        <>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate" title={task.name}>{task.name}</div>
                            <div className="text-xs text-gray-600 mt-0.5">{task.location || '—'} · {task.taskCode}</div>
                        </div>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.classes}`}>
                            {meta.label}
                        </span>
                    </div>
                    {reopened && (
                        <div className="mt-2 text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 rounded-md px-2 py-1">
                            GC has revised this task — please review.
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                        <div><span className="text-gray-500">Proposed start</span><div className="font-medium">{task.startDate}</div></div>
                        <div><span className="text-gray-500">Proposed end</span><div className="font-medium">{task.finishDate}</div></div>
                        <div><span className="text-gray-500">Crew</span><div className="font-medium">{task.crewAssigned ?? 0}</div></div>
                        <div><span className="text-gray-500">Quantity</span><div className="font-medium">{task.productionQuantity ? `${task.productionQuantity.planned} ${task.productionQuantity.unit}` : '—'}</div></div>
                    </div>
                </div>

                <div className="px-4 pb-4">
                    <button
                        type="button"
                        disabled={locked}
                        onClick={() => setModalOpen(true)}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {locked ? (status === 'committed' ? 'Committed' : 'Accepted') : 'Review & Respond'}
                    </button>
                </div>
            </div>

            <ScCommitmentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                task={task}
                onCommit={onCommit}
                onReject={onReject}
                onPropose={onPropose}
                projectCrew={projectCrew}
                onAssignCrew={onAssignCrew}
            />
        </>
    );
};

const GcReviewModal: React.FC<{
    isOpen: boolean;
    task: LookaheadTask | null;
    onClose: () => void;
    onAccept: (taskId: string | number, payload?: { gcResponseNotes?: string }) => void;
    onCounterPropose: (taskId: string | number, payload: Partial<Omit<TaskAdjustmentProposal, 'history'>>) => void;
    onDispute: (taskId: string | number, payload?: { gcResponseNotes?: string }) => void;
}> = ({ isOpen, task, onClose, onAccept, onCounterPropose, onDispute }) => {
    const [mode, setMode] = useState<'none' | 'counter'>('none');
    const [gcNotes, setGcNotes] = useState('');
    const [counterStart, setCounterStart] = useState('');
    const [counterEnd, setCounterEnd] = useState('');
    const [counterCrew, setCounterCrew] = useState('');
    const [counterNotes, setCounterNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setMode('none');
            setGcNotes('');
            setCounterStart('');
            setCounterEnd('');
            setCounterCrew('');
            setCounterNotes('');
        } else if (task) {
            setCounterStart(task.startDate ?? '');
            setCounterEnd(task.finishDate ?? '');
            setCounterCrew(String(task.crewAssigned ?? ''));
        }
    }, [isOpen, task]);

    if (!isOpen || !task) return null;

    const status = task.commitmentStatus ?? 'pending';
    const meta = commitmentMeta(status);
    const proposal = task.adjustmentProposal;
    const history = proposal?.history ?? [];

    const canAccept = status === 'adjustment_proposed' || status === 'gc_revised';
    const canCounter = status === 'adjustment_proposed' || status === 'rejected';
    const canDispute = status === 'adjustment_proposed' || status === 'rejected' || status === 'gc_revised';

    const hasScResponse = status === 'adjustment_proposed' || status === 'rejected' || status === 'gc_revised' || status === 'disputed';
    const hasGcResponse = !!proposal?.gcResponseNotes;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-bold text-gray-900 truncate">{task.name}</h2>
                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.classes}`}>
                                {meta.label}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{task.location || '—'} · {task.contractor || '—'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-shrink-0 p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <XIcon className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    {/* Original task details */}
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Planned</div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                                <div className="text-gray-500">Start</div>
                                <div className="font-medium text-gray-900">{task.startDate || '—'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Finish</div>
                                <div className="font-medium text-gray-900">{task.finishDate || '—'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Crew</div>
                                <div className="font-medium text-gray-900">{task.crewAssigned ?? '—'}</div>
                            </div>
                        </div>
                    </div>

                    {/* SC response */}
                    {hasScResponse && (
                        <div className={`rounded-lg border p-3 ${
                            status === 'rejected' ? 'border-red-200 bg-red-50' :
                            status === 'disputed' ? 'border-orange-200 bg-orange-50' :
                            'border-amber-200 bg-amber-50'
                        }`}>
                            <div className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${
                                status === 'rejected' ? 'text-red-700' :
                                status === 'disputed' ? 'text-orange-700' :
                                'text-amber-700'
                            }`}>
                                {status === 'rejected' ? 'Rejection' : status === 'disputed' ? 'Dispute' : 'Proposed adjustment'}
                            </div>
                            {(status === 'adjustment_proposed' || status === 'gc_revised') && proposal && (
                                <div className="grid grid-cols-3 gap-3 text-xs mb-2">
                                    <div>
                                        <div className="text-gray-500">Proposed start</div>
                                        <div className="font-medium text-gray-900">{proposal.proposedStartDate || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Proposed finish</div>
                                        <div className="font-medium text-gray-900">{proposal.proposedEndDate || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Proposed crew</div>
                                        <div className="font-medium text-gray-900">{proposal.proposedCrewSize ?? '—'}</div>
                                    </div>
                                </div>
                            )}
                            {proposal?.rejectionReason && (
                                <div className="text-xs mb-1">
                                    <span className="text-gray-500">Reason: </span>
                                    <span className="font-medium text-gray-900">{proposal.rejectionReason}</span>
                                </div>
                            )}
                            {proposal?.subNotes && (
                                <div className="text-xs text-gray-700 italic">"{proposal.subNotes}"</div>
                            )}
                            {proposal?.proposedMaterialNotes && (
                                <div className="text-xs mt-1">
                                    <span className="text-gray-500">Material notes: </span>
                                    <span className="text-gray-900">{proposal.proposedMaterialNotes}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Existing GC response notes */}
                    {hasGcResponse && (
                        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 mb-1">GC response</div>
                            <div className="text-xs text-gray-700 italic">"{proposal!.gcResponseNotes}"</div>
                        </div>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">History</div>
                            <div className="space-y-1.5">
                                {history.map((entry, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className={`flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${entry.actor === 'gc' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                                        <div className="min-w-0">
                                            <span className="font-semibold text-gray-700">{entry.actor === 'gc' ? 'GC' : 'Sub'}</span>
                                            {entry.summary && <span className="text-gray-500"> — {entry.summary}</span>}
                                            <span className="text-gray-400 ml-1">{new Date(entry.at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GC actions */}
                    {(canAccept || canCounter || canDispute) && (
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Your response</div>

                            <div className="flex items-center gap-2">
                                {canAccept && (
                                    <button
                                        type="button"
                                        onClick={() => onAccept(task.id, gcNotes ? { gcResponseNotes: gcNotes } : undefined)}
                                        className="flex-1 px-3 py-2 text-xs font-bold rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                                    >
                                        Accept
                                    </button>
                                )}
                                {canCounter && (
                                    <button
                                        type="button"
                                        onClick={() => setMode(m => m === 'counter' ? 'none' : 'counter')}
                                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-md border transition-colors ${
                                            mode === 'counter'
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100'
                                        }`}
                                    >
                                        Counter-propose
                                    </button>
                                )}
                                {canDispute && (
                                    <button
                                        type="button"
                                        onClick={() => onDispute(task.id, gcNotes ? { gcResponseNotes: gcNotes } : undefined)}
                                        className="flex-1 px-3 py-2 text-xs font-bold rounded-md border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 transition-colors"
                                    >
                                        Dispute
                                    </button>
                                )}
                            </div>

                            <label className="block text-xs text-gray-600">
                                Notes (optional)
                                <textarea
                                    value={gcNotes}
                                    onChange={(e) => setGcNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Add a note to the subcontractor…"
                                    className="mt-1 w-full px-2.5 py-2 text-xs border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                            </label>

                            {mode === 'counter' && (
                                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
                                    <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Counter-proposal</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="text-xs text-gray-700">
                                            Start
                                            <input
                                                type="date"
                                                value={counterStart}
                                                onChange={(e) => setCounterStart(e.target.value)}
                                                className="mt-1 w-full px-2 py-1.5 text-xs border border-purple-200 rounded bg-white"
                                            />
                                        </label>
                                        <label className="text-xs text-gray-700">
                                            Finish
                                            <input
                                                type="date"
                                                value={counterEnd}
                                                onChange={(e) => setCounterEnd(e.target.value)}
                                                className="mt-1 w-full px-2 py-1.5 text-xs border border-purple-200 rounded bg-white"
                                            />
                                        </label>
                                    </div>
                                    <label className="text-xs text-gray-700">
                                        Crew size
                                        <input
                                            type="number"
                                            value={counterCrew}
                                            onChange={(e) => setCounterCrew(e.target.value)}
                                            className="mt-1 w-full px-2 py-1.5 text-xs border border-purple-200 rounded bg-white"
                                        />
                                    </label>
                                    <label className="text-xs text-gray-700">
                                        GC notes
                                        <input
                                            type="text"
                                            value={counterNotes}
                                            onChange={(e) => setCounterNotes(e.target.value)}
                                            className="mt-1 w-full px-2 py-1.5 text-xs border border-purple-200 rounded bg-white"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={!counterStart || !counterEnd}
                                        onClick={() => {
                                            onCounterPropose(task.id, {
                                                proposedStartDate: counterStart,
                                                proposedEndDate: counterEnd,
                                                proposedCrewSize: counterCrew ? parseInt(counterCrew, 10) : undefined,
                                                gcResponseNotes: counterNotes || gcNotes || undefined,
                                            });
                                        }}
                                        className="w-full px-3 py-2 text-xs font-bold rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Send Counter-proposal
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Info-only statuses */}
                    {status === 'committed' && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800 font-medium">
                            Subcontractor has committed to this task as planned.
                        </div>
                    )}
                    {status === 'gc_accepted' && (
                        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800 font-medium">
                            You accepted the subcontractor's adjustment.{proposal?.gcResponseNotes ? '' : ' No further action needed.'}
                        </div>
                    )}
                    {status === 'pending' && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                            Awaiting response from subcontractor.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};