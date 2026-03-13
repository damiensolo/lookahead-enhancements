import React, { useMemo, useState, useCallback } from 'react';
import { useProject } from '../../context/ProjectContext';
import { PlusIcon, CalculatorIcon, HistoryIcon, CalendarIcon, ChevronDownIcon } from '../common/Icons';
import { ScheduleStatus, LookaheadTask } from '../views/lookahead/types';
import { parseLookaheadDate } from '../../lib/dateUtils';
import { compareLookaheadTasks } from '../views/lookahead/utils/diffUtils';
import { DeltasModal } from '../views/lookahead/components/DeltasModal';

const formatValue = (val: number) => 
    Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AppHeader: React.FC = () => {
    const { 
        activeViewMode, activeView, setIsCreateLookaheadModalOpen, setIsAddTaskModalOpen,
        schedules, activeScheduleId, setActiveScheduleId, publishSchedule, deltas
    } = useProject();

    const [isDeltasModalOpen, setIsDeltasModalOpen] = useState(false);
    const [currentDeltas, setCurrentDeltas] = useState<any[]>([]);

    const activeSchedule = useMemo(() => 
        schedules.find(s => s.id === activeScheduleId) || schedules[0]
    , [schedules, activeScheduleId]);

    const previousPublishedSchedule = useMemo(() => 
        [...schedules]
            .filter(s => s.status === ScheduleStatus.Active || s.status === ScheduleStatus.Closed)
            .sort((a, b) => (b.version || 0) - (a.version || 0))[0]
    , [schedules]);

    const getScheduleDateRange = useCallback((tasks: LookaheadTask[]) => {
        if (!tasks || tasks.length === 0) return 'No tasks';
        const allTasks: LookaheadTask[] = [];
        const flatten = (items: LookaheadTask[]) => {
            items.forEach(t => {
                allTasks.push(t);
                if (t.children) flatten(t.children);
            });
        };
        flatten(tasks);
        if (allTasks.length === 0) return 'No tasks';
        const start = allTasks.reduce((min, t) => parseLookaheadDate(t.startDate) < min ? parseLookaheadDate(t.startDate) : min, parseLookaheadDate(allTasks[0].startDate));
        const end = allTasks.reduce((max, t) => parseLookaheadDate(t.finishDate) > max ? parseLookaheadDate(t.finishDate) : max, parseLookaheadDate(allTasks[0].finishDate));
        return `${start.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }, []);

    const handlePublishClick = () => {
        if (!activeScheduleId) return;
        const deltas = previousPublishedSchedule 
            ? compareLookaheadTasks(previousPublishedSchedule.tasks, activeSchedule.tasks)
            : [];
        setCurrentDeltas(deltas);
        setIsDeltasModalOpen(true);
    };

    const handleConfirmPublish = () => {
        if (activeScheduleId) {
            publishSchedule(activeScheduleId);
            setIsDeltasModalOpen(false);
        }
    };
    
    // Dynamic title based on view mode
    const getTitle = () => {
        if (activeViewMode === 'dashboard') return 'Project Dashboard';
        if (activeViewMode === 'table' || activeViewMode === 'board') return 'RFIs';
        if (activeViewMode === 'gantt') return 'Schedule';
        if (activeViewMode === 'lookahead') return 'Lookahead';
        return 'Budget';
    };

    const title = getTitle();
    
    // Aggregate budget metadata from root-level items
    const budgetTotals = useMemo(() => {
        const data = activeView.spreadsheetData;
        if (!data || data.length === 0) return { total: 0, distributed: 0, unallocated: 0 };
        
        return data.reduce((acc, curr) => {
            const rowBudget = curr.totalBudget || 0;
            const rowRemaining = curr.remainingContract || 0;
            return {
                distributed: acc.distributed + rowBudget,
                unallocated: acc.unallocated + rowRemaining,
                total: acc.total + (rowBudget + rowRemaining)
            };
        }, { total: 0, distributed: 0, unallocated: 0 });
    }, [activeView.spreadsheetData]);

    const { total, distributed, unallocated } = budgetTotals;

    const isSpreadsheetView = activeViewMode === 'spreadsheet' || activeViewMode === 'spreadsheetV2';
    const isReadyToLock = isSpreadsheetView && unallocated === 0;
    const showCreateButton = !isSpreadsheetView && activeViewMode !== 'dashboard';

    // Status colors based on unallocated amount - used only for the status pill
    const statusClasses = unallocated === 0 
        ? 'bg-green-50 text-green-700 border-green-200 shadow-[0_1px_2px_rgba(34,197,94,0.1)]' 
        : unallocated < 0
        ? 'bg-red-50 text-red-700 border-red-200 shadow-[0_1px_2px_rgba(239,68,68,0.1)]'
        : 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_1px_2px_rgba(245,158,11,0.1)]';

    return (
        <header className="flex-shrink-0 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-6">
                    {activeViewMode !== 'lookahead' && (
                        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                    )}
                    
                    {activeViewMode === 'lookahead' && (
                        <div className="flex items-center gap-4">
                            {/* Lookahead Date Range Picker */}
                            <div className="relative group/picker">
                                <button className="flex items-center gap-3 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm transition-all min-w-[220px] justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                                        <div className="flex flex-col items-start leading-tight">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Lookahead Period</span>
                                            <span className="text-sm font-medium text-gray-700">{getScheduleDateRange(activeSchedule.tasks)}</span>
                                        </div>
                                    </div>
                                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                                </button>
                                <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover/picker:opacity-100 group-hover/picker:visible transition-all z-50 py-1">
                                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Lookahead</span>
                                    </div>
                                    {schedules.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => setActiveScheduleId(s.id)}
                                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex flex-col gap-0.5 ${s.id === activeScheduleId ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                                    s.status === ScheduleStatus.Draft 
                                                        ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                                        : 'bg-green-50 text-green-600 border-green-100'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500">{getScheduleDateRange(s.tasks)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                                    activeSchedule.status === ScheduleStatus.Draft 
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                        : 'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                    {activeSchedule.status}
                                </span>
                                {activeSchedule.status === ScheduleStatus.Draft && (
                                    <button 
                                        onClick={handlePublishClick}
                                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
                                    >
                                        <HistoryIcon className="w-3.5 h-3.5" />
                                        Publish Lookahead
                                    </button>
                                )}
                                {activeSchedule.status === ScheduleStatus.Active && deltas[activeScheduleId!]?.length > 0 && (
                                    <button 
                                        onClick={() => {
                                            setCurrentDeltas(deltas[activeScheduleId!] || []);
                                            setIsDeltasModalOpen(true);
                                        }}
                                        className="px-4 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-md hover:bg-zinc-200 border border-zinc-200 transition-all flex items-center gap-2"
                                    >
                                        <HistoryIcon className="w-3.5 h-3.5" />
                                        View Deltas
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {isSpreadsheetView && (
                        <div className="flex items-center gap-5">
                            {/* Standard text strings for secondary metadata */}
                            <div className="flex items-center gap-5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                    <span className="font-bold text-gray-900 font-mono text-sm tracking-tight">${formatValue(total)}</span>
                                </div>
                                
                                <span className="w-px h-4 bg-gray-200"></span>
                                
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Distributed</span>
                                    <span className="font-bold text-gray-900 font-mono text-sm tracking-tight">${formatValue(distributed)}</span>
                                </div>
                            </div>

                            {/* Prominent Status Pill for critical metadata */}
                            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold border transition-all duration-300 ${statusClasses}`}>
                                <span className="opacity-70 uppercase tracking-widest">
                                    {unallocated < 0 ? 'Over Allocated' : unallocated === 0 ? 'Balanced' : 'Unallocated'}
                                </span>
                                <span className="font-mono text-sm tracking-tighter">
                                    ${formatValue(unallocated)}
                                    {unallocated < 0 && ' over'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    {isSpreadsheetView && (
                        <button 
                            disabled={!isReadyToLock}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-md shadow-sm transition-all duration-300 transform active:scale-95 ${
                                isReadyToLock 
                                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer ring-2 ring-green-500 ring-offset-2' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 opacity-60'
                            }`}
                        >
                            <CalculatorIcon className="w-4 h-4" />
                            <span>Lock Budget</span>
                        </button>
                    )}

                    {activeViewMode === 'lookahead' ? (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsCreateLookaheadModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700 shadow-sm transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Create Lookahead</span>
                            </button>
                        </div>
                    ) : showCreateButton && (
                        <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700 shadow-sm transition-colors">
                            <PlusIcon className="w-4 h-4" />
                            <span>Create</span>
                        </button>
                    )}
                </div>
            </div>
            <DeltasModal
                isOpen={isDeltasModalOpen}
                onClose={() => setIsDeltasModalOpen(false)}
                onPublish={handleConfirmPublish}
                deltas={currentDeltas}
                tasks={activeSchedule.tasks}
                oldTasks={previousPublishedSchedule?.tasks}
            />
        </header>
    );
};

export default AppHeader;