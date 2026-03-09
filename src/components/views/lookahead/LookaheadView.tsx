
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LookaheadTask, Constraint, ConstraintStatus, ConstraintType, WeatherForecast, ScheduleStatus } from './types';
import { PLANNER_TASKS, MOCK_WEATHER, MASTER_SCHEDULE_TASKS } from './constants';
import { parseLookaheadDate, getDaysDiff, addDays, formatDateISO, formatDisplayDate } from '../../../lib/dateUtils';
import { ChevronDownIcon, ChevronRightIcon, DocumentIcon, SunIcon, CloudIcon, CloudRainIcon, PlusIcon, ListTreeIcon, TrashIcon, HistoryIcon, PublicLinkIcon, LinkIcon } from '../../common/Icons';
import ConstraintBadge from './components/ConstraintBadge';
import ManHoursBar from './components/ManHoursBar';
import DraggableTaskBar from './components/DraggableTaskBar';
import LookaheadDetailsPanel from './components/LookaheadDetailsPanel';
import DailyMetricsPanel from './components/DailyMetricsPanel';
import { TaskSelectionModal } from './components/TaskSelectionModal';
import { CreateLookaheadModal } from './components/CreateLookaheadModal';
import { FieldBreakdownModal } from './components/FieldBreakdownModal';
import { DeltasModal } from './components/DeltasModal';
import ProgressCell from './components/ProgressCell';
import { compareLookaheadTasks } from './utils/diffUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../common/ui/Tooltip';
import { useProject } from '../../../context/ProjectContext';
import { DisplayDensity } from '../../../types';
import ViewControls from '../../layout/ViewControls';

const WeatherIcon: React.FC<{ icon: 'sun' | 'cloud' | 'rain' }> = ({ icon }) => {
    switch (icon) {
        case 'sun': return <SunIcon className="w-4 h-4 text-yellow-500" />;
        case 'cloud': return <CloudIcon className="w-4 h-4 text-gray-500" />;
        case 'rain': return <CloudRainIcon className="w-4 h-4 text-blue-500" />;
        default: return null;
    }
};

const DAY_WIDTH = 40;

const getRowHeight = (density: DisplayDensity) => {
  switch (density) {
    case 'compact': return 32;
    case 'standard': return 38;
    case 'comfortable': return 48;
    default: return 38;
  }
};

// Mapping from Generic Column ID to Lookahead specific logic
type LookaheadColumnType = 'sNo' | 'name' | 'status' | 'taskType' | 'progress' | 'planStart' | 'planEnd' | 'contractor' | 'crewAssigned' | 'location' | 'shared';

const COLUMN_MAPPING: Record<string, LookaheadColumnType> = {
    sNo: 'sNo',
    name: 'name',
    status: 'status',
    taskType: 'taskType',
    progress: 'progress',
    planStart: 'planStart',
    planEnd: 'planEnd',
    contractor: 'contractor',
    crewAssigned: 'crewAssigned',
    location: 'location',
    shared: 'shared',
};

const RowNumberCheckbox = ({ 
    index, 
    isSelected, 
    onToggle 
}: { 
    index: number; 
    isSelected: boolean; 
    onToggle: () => void; 
}) => {
    return (
        <div className="flex items-center justify-center w-full h-full relative">
            <span className={`text-xs text-gray-400 transition-opacity duration-100 ${isSelected ? 'opacity-0' : 'group-hover:opacity-0'}`}>
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

const LookaheadView: React.FC = () => {
    const { 
        activeView, setColumns, createDraft, schedules, activeScheduleId, updateScheduleTasks, publishSchedule, deltas,
        isCreateLookaheadModalOpen, setIsCreateLookaheadModalOpen,
        isAddTaskModalOpen, setIsAddTaskModalOpen
    } = useProject();
    const { columns, displayDensity } = activeView;

    const activeSchedule = useMemo(() => 
        schedules.find(s => s.id === activeScheduleId) || schedules[0]
    , [schedules, activeScheduleId]);

    const previousPublishedSchedule = useMemo(() => 
        [...schedules]
            .filter(s => s.status === ScheduleStatus.Active || s.status === ScheduleStatus.Closed)
            .sort((a, b) => (b.version || 0) - (a.version || 0))[0]
    , [schedules]);

    const previousDurationDays = useMemo(() => {
        if (!previousPublishedSchedule || previousPublishedSchedule.tasks.length === 0) return 14;
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
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set());
    const [selectedTask, setSelectedTask] = useState<LookaheadTask | null>(null);
    const [selectedDay, setSelectedDay] = useState<{ task: LookaheadTask; date: Date; forecast?: WeatherForecast } | null>(null);
    const [isFieldBreakdownModalOpen, setIsFieldBreakdownModalOpen] = useState(false);
    const [taskToBreakdown, setTaskToBreakdown] = useState<LookaheadTask | null>(null);
    
    const allTaskIds = useMemo(() => {
        const ids: (string | number)[] = [];
        const flatten = (tasks: LookaheadTask[]) => {
            tasks.forEach(t => {
                ids.push(t.id);
                if (t.children) flatten(t.children);
            });
        };
        flatten(plannerTasks);
        return ids;
    }, [plannerTasks]);

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
        } else {
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const container = scrollContainerRef.current;
        const handleScroll = () => {
            if (container) {
                setIsScrolled(container.scrollLeft > 0);
            }
        };
        container?.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => container?.removeEventListener('scroll', handleScroll);
    }, []);

    const visiblePanelColumns = useMemo(() => {
        return columns
            .filter(col => col.visible && COLUMN_MAPPING[col.id])
            .map(col => ({
                ...col,
                lookaheadType: COLUMN_MAPPING[col.id]!,
                widthPx: parseInt(col.width || '100', 10) || 100
            }));
    }, [columns]);

    const totalLeftPanelWidth = useMemo(() => visiblePanelColumns.reduce((sum, col) => sum + col.widthPx, 0), [visiblePanelColumns]);
    const rowHeight = getRowHeight(displayDensity);

    const handleMouseDown = useCallback((e: React.MouseEvent, columnId: string, currentWidth: number) => {
        e.preventDefault();

        const startX = e.clientX;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const moveHandler = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(currentWidth + deltaX, 40);
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
    }, [setColumns]);


    const { projectStartDate, projectEndDate, totalDays } = useMemo(() => {
        const allTasks: LookaheadTask[] = [];
        const flatten = (tasks: LookaheadTask[]) => {
            tasks.forEach(t => {
                allTasks.push(t);
                if (t.children) flatten(t.children);
            });
        };
        flatten(plannerTasks);
        if (allTasks.length === 0) return { projectStartDate: new Date(), projectEndDate: new Date(), totalDays: 0 };

        const start = allTasks.reduce((min, t) => parseLookaheadDate(t.startDate) < min ? parseLookaheadDate(t.startDate) : min, parseLookaheadDate(allTasks[0].startDate));
        const end = allTasks.reduce((max, t) => parseLookaheadDate(t.finishDate) > max ? parseLookaheadDate(t.finishDate) : max, parseLookaheadDate(allTasks[0].finishDate));
        
        return {
            projectStartDate: start,
            projectEndDate: end,
            totalDays: getDaysDiff(start, end) + 1,
        };
    }, [plannerTasks]);

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
                    updatedTask.progress = progress;
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

    const handleAddConstraint = (taskId: string | number, newConstraint: Constraint) => {
        const addConstraintRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(task => {
                if (task.id === taskId) {
                    const updatedConstraints = [...task.constraints, newConstraint];
                    const newStatus = { ...task.status };
                    if (newConstraint.severity === 'Blocking') {
                        newStatus[newConstraint.type] = ConstraintStatus.Overdue;
                    } else if (newConstraint.severity === 'Warning' && newStatus[newConstraint.type] === ConstraintStatus.Complete) {
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
                    return {
                        ...task,
                        startDate: newStart,
                        finishDate: newFinish,
                    };
                }
                if (task.children) {
                    return { ...task, children: updateRecursively(task.children) };
                }
                return task;
            });
        };
        setPlannerTasks(prev => updateRecursively(prev));
    }, []);
    
    const handleDayClick = useCallback((task: LookaheadTask, date: Date) => {
        setSelectedTask(null);
        const dateString = formatDateISO(date);
        const forecast = weatherByDate.get(dateString);
        setSelectedDay({ task, date, forecast });
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

    const handleSaveBreakdown = (taskId: string | number, subTasks: Partial<LookaheadTask>[]) => {
        const updateTasks = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(t => {
                if (t.id === taskId) {
                    return { ...t, children: subTasks as LookaheadTask[], isExpanded: true };
                }
                if (t.children) {
                    return { ...t, children: updateTasks(t.children) };
                }
                return t;
            });
        };
        setPlannerTasks(prev => updateTasks(prev));
    };

    const handleToggleShared = (taskId: string | number) => {
        const updateRecursively = (tasks: LookaheadTask[]): LookaheadTask[] => {
            return tasks.map(task => {
                if (task.id === taskId) {
                    return { ...task, isShared: !task.isShared };
                }
                if (task.children) {
                    return { ...task, children: updateRecursively(task.children) };
                }
                return task;
            });
        };
        setPlannerTasks(prev => updateRecursively(prev));
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

    const renderCell = (type: LookaheadColumnType, task: LookaheadTask, level: number) => {
        switch (type) {
            case 'sNo':
                return (
                    <RowNumberCheckbox 
                        index={task.sNo}
                        isSelected={selectedRowIds.has(task.id)}
                        onToggle={() => toggleRowSelection(task.id)}
                    />
                );
            case 'name': {
                const hasBlockingConstraints = task.constraints.some(c => c.severity === 'Blocking');
                const taskDeltas = activeScheduleId ? deltas[activeScheduleId] || [] : [];
                const taskDelta = taskDeltas.find(d => String(d.taskId) === String(task.id));
                
                const isFieldTask = task.taskType === 'Field Task';
                
                return (
                    <div className="flex items-center w-full overflow-hidden group/cell" style={{ paddingLeft: `${8 + (level * 24)}px`}}>
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mr-1">
                            {task.children && task.children.length > 0 ? (
                                <button onClick={(e) => { e.stopPropagation(); handleToggle(task.id); }} className="text-gray-400 hover:text-gray-800">
                                    {task.isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                </button>
                            ) : <DocumentIcon className="w-4 h-4 text-gray-400"/>}
                        </div>
                        <span className={`truncate font-medium text-sm ${isFieldTask ? 'text-blue-700' : 'text-gray-800'}`} title={task.name}>{task.name}</span>
                        
                        {/* Inline Add Button */}
                        {isFieldTask && (
                            <span className="ml-1.5 px-1 rounded bg-blue-100 text-blue-600 text-[8px] font-bold uppercase tracking-wider" title="Field Breakdown Task">Field</span>
                        )}
                        {hasBlockingConstraints && (
                            <span className="ml-1 text-amber-500" title="Has blocking constraints">⚠️</span>
                        )}
                        {taskDelta && (
                            <span className={`ml-1.5 px-1 rounded text-[8px] font-bold uppercase ${
                                taskDelta.type === 'added' ? 'bg-green-100 text-green-600' : 
                                taskDelta.type === 'modified' ? 'bg-blue-100 text-blue-600' : 
                                'bg-red-100 text-red-600'
                            }`}>
                                {taskDelta.type}
                            </span>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsAddTaskModalOpen(true); }}
                                className="p-1 rounded-full hover:bg-blue-100 text-blue-500 opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                title="Add task"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTaskToBreakdown(task);
                                    setIsFieldBreakdownModalOpen(true);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                title="Field Breakdown"
                            >
                                <ListTreeIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                }}
                                className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                title="Delete Task"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                );
            }
            case 'status':
                return (
                    <ConstraintBadge 
                        status={task.status} 
                        onClick={() => handleConstraintBadgeClick(task)} 
                    />
                );
            case 'shared':
                return (
                    <div className="flex items-center justify-center w-full">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleShared(task.id);
                            }}
                            className={`p-1 rounded-md transition-colors ${
                                task.isShared 
                                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                                    : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={task.isShared ? "Shared with team" : "Private (Draft)"}
                        >
                            {task.isShared ? <PublicLinkIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                        </button>
                    </div>
                );
            case 'taskType':
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        task.taskType === 'Budget Task' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-50 text-gray-700 border border-gray-100'
                    }`}>
                        {task.taskType}
                    </span>
                );
            case 'contractor':
                return <span className="truncate text-gray-700 min-w-0" title={task.contractor}>{task.contractor}</span>;
            case 'location':
                return <span className="truncate text-gray-500 italic min-w-0">{task.location || '-'}</span>;
            case 'progress': {
                const isFieldTask = task.taskType === 'Field Task';
                return (
                    <ProgressCell 
                        progress={task.progress}
                        isEditable={isFieldTask}
                        onChange={(val) => handleUpdateProgress(task.id, val)}
                    />
                );
            }
            case 'crewAssigned':
                return <span className="w-full text-center font-medium text-gray-700">{task.crewAssigned}</span>;
            case 'planStart':
                return <span className="text-gray-600 text-xs">{formatDisplayDate(task.startDate)}</span>;
            case 'planEnd':
                return <span className="text-gray-600 text-xs">{formatDisplayDate(task.finishDate)}</span>;
            default:
                return null;
        }
    };
    
    const renderTaskRows = (tasks: LookaheadTask[], level: number): React.ReactNode[] => {
        return tasks.flatMap(task => {
            const isSelected = selectedRowIds.has(task.id);
            const isFieldTask = task.taskType === 'Field Task';
            const row = (
                <div 
                    key={task.id} 
                    className={`group flex border-b border-gray-200 first:border-t transition-colors ${isSelected ? 'bg-blue-50/50' : isFieldTask ? 'bg-blue-50/20' : ''}`} 
                    style={{ height: `${rowHeight}px`}}
                >
                    {/* Left Panel */}
                    <div 
                        className={`sticky left-0 z-30 flex border-r border-gray-200 transition-shadow cursor-pointer ${isScrolled ? 'shadow-[2px_0_5px_rgba(0,0,0,0.1)]' : ''} ${isSelected ? 'bg-blue-50' : isFieldTask ? 'bg-blue-50/40' : 'bg-white'}`} 
                        style={{ width: `${totalLeftPanelWidth}px` }}
                        onClick={() => setSelectedTask(task)}
                    >
                        {visiblePanelColumns.map((col, index) => (
                             <div 
                                key={col.id} 
                                className={`flex-shrink-0 flex items-center px-2 text-sm relative ${index > 0 ? 'border-l border-gray-200' : ''} ${col.lookaheadType === 'sNo' ? 'justify-center' : ''} ${col.lookaheadType === 'progress' ? '' : 'overflow-hidden'}`}
                                style={{ width: `${col.widthPx}px` }}
                            >
                                <div className={`w-full min-w-0 flex items-center ${col.lookaheadType === 'progress' ? '' : 'overflow-hidden'}`}>
                                    {renderCell(col.lookaheadType, task, level)}
                                </div>
                             </div>
                        ))}
                    </div>
                    {/* Right Panel (Timeline) */}
                    <div className="relative flex-grow flex">
                        <DraggableTaskBar
                            task={task}
                            projectStartDate={projectStartDate}
                            dayWidth={DAY_WIDTH}
                            onUpdateTask={handleUpdateTaskDates}
                            onDayClick={handleDayClick}
                            offsetLeft={0}
                        />
                    </div>
                </div>
            );
            return [row, task.isExpanded && task.children ? renderTaskRows(task.children, level + 1) : []];
        });
    };

    const Resizer: React.FC<{ onMouseDown: (e: React.MouseEvent) => void; isLast?: boolean }> = ({ onMouseDown, isLast }) => (
        <div 
            onMouseDown={onMouseDown} 
            className={`absolute top-0 right-0 h-full cursor-col-resize z-20 transition-colors ${
                isLast ? 'w-1 bg-transparent hover:bg-blue-400' : 'w-1 hover:bg-blue-300'
            }`} 
        />
    );

    const SplitResizer: React.FC = () => {
        const lastCol = visiblePanelColumns[visiblePanelColumns.length - 1];
        if (!lastCol) return null;

        return (
            <div 
                onMouseDown={(e) => handleMouseDown(e, lastCol.id, lastCol.widthPx)}
                className="absolute top-0 bottom-0 z-[50] cursor-col-resize group pointer-events-auto"
                style={{ 
                    left: `${totalLeftPanelWidth - 4}px`,
                    width: '8px',
                }}
            >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col p-4 gap-4">
            <div className="flex items-center justify-between">
                <ViewControls />
            </div>
            
            <div className="flex-grow flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative">
                {/* Main Planner */}
                <div className="flex-grow overflow-hidden relative flex">
                    <div ref={scrollContainerRef} className="flex-grow overflow-auto min-w-0">
                        <div className="relative" style={{ minWidth: `${totalLeftPanelWidth + (totalDays * DAY_WIDTH)}px`}}>
                            {/* Unified Background Grid */}
                            <div
                                className="absolute top-0 left-0 w-full h-full pt-[80px] flex"
                                style={{ zIndex: 0 }}
                                aria-hidden="true"
                            >
                                <div style={{ width: `${totalLeftPanelWidth}px` }} className="flex-shrink-0 sticky left-0 bg-white z-10"></div>
                                <div
                                    className="flex-grow grid"
                                    style={{ gridTemplateColumns: `repeat(${totalDays}, ${DAY_WIDTH}px)` }}
                                >
                                    {Array.from({ length: totalDays }).map((_, i) => {
                                        const date = addDays(projectStartDate, i);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        return (
                                            <div key={i} className={`h-full border-r border-gray-100 ${isWeekend ? 'bg-gray-50' : ''}`}></div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Header */}
                            <div className="sticky top-0 bg-gray-50 z-40 text-xs font-semibold text-gray-600 uppercase border-b border-t border-gray-200">
                                <div className="flex border-b border-gray-200" style={{ height: '30px' }}>
                                    <div className={`sticky left-0 bg-gray-50 flex border-r border-gray-200 transition-shadow ${isScrolled ? 'shadow-[2px_0_5px_rgba(0,0,0,0.1)]' : ''}`} style={{ width: `${totalLeftPanelWidth}px` }}></div>
                                    <div className="flex-grow flex">
                                        {weekHeaders.map((week, i) => (
                                            <div key={i} className="flex items-center justify-center border-r border-gray-200" style={{ width: `${week.days * DAY_WIDTH}px`}}>{week.label}</div>
                                        ))}
                                    </div>
                                </div>
                                 <div className="flex" style={{ height: '50px' }}>
                                     <div className={`sticky left-0 bg-gray-50 flex border-r border-gray-200 transition-shadow ${isScrolled ? 'shadow-[2px_0_5px_rgba(0,0,0,0.1)]' : ''}`} style={{ width: `${totalLeftPanelWidth}px` }}>
                                        {visiblePanelColumns.map((col, index) => (
                                            <div 
                                                key={col.id} 
                                                className={`relative flex-shrink-0 px-2 flex items-end pb-1 ${index > 0 ? 'border-l border-gray-200' : ''} ${col.lookaheadType === 'sNo' ? 'justify-center' : ''}`}
                                                style={{ width: `${col.widthPx}px` }}
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
                                                    onMouseDown={(e) => handleMouseDown(e, col.id, col.widthPx)} 
                                                    isLast={index === visiblePanelColumns.length - 1}
                                                />
                                                {index === visiblePanelColumns.length - 1 && (
                                                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gray-300/30 pointer-events-none" />
                                                )}
                                            </div>
                                        ))}
                                     </div>
                                     <div
                                        className="flex-grow grid"
                                        style={{ gridTemplateColumns: `repeat(${totalDays}, ${DAY_WIDTH}px)` }}
                                     >
                                        {Array.from({length: totalDays}).map((_, i) => {
                                            const date = addDays(projectStartDate, i);
                                            const dateString = formatDateISO(date);
                                            const forecast = weatherByDate.get(dateString);
                                            return (
                                                <div key={i} className="flex flex-col items-center justify-between py-1 border-r border-gray-200">
                                                    <div className="flex items-center">
                                                        <span className="text-[10px] text-gray-400 mr-0.5">{date.toLocaleString('default', { weekday: 'short' })[0]}</span>
                                                        <span className="font-normal">{date.getDate()}</span>
                                                    </div>
                                                    <div className="h-7 flex flex-col items-center justify-center">
                                                        {forecast ? (
                                                            <div className="flex flex-col items-center" title={`${forecast.temp}°F`}>
                                                                <WeatherIcon icon={forecast.icon} />
                                                                <span className="text-[10px] font-medium text-gray-600">{forecast.temp}°</span>
                                                            </div>
                                                        ) : <div style={{height: '28px'}}></div>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                     </div>
                                 </div>
                            </div>

                            {/* Body */}
                            <div className="relative z-10">
                                {renderTaskRows(plannerTasks, 0)}
                            </div>

                            {/* Global Split Resizer */}
                            <div className="absolute inset-0 pointer-events-none z-[60]">
                                <SplitResizer />
                            </div>
                        </div>
                    </div>
                    <LookaheadDetailsPanel 
                        task={selectedTask} 
                        onClose={() => setSelectedTask(null)} 
                        onAddConstraint={handleAddConstraint} 
                        onUpdateProgress={handleUpdateProgress}
                    />
                    <DailyMetricsPanel data={selectedDay} onClose={() => setSelectedDay(null)} />
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
        </div>
    );
};

export default LookaheadView;
