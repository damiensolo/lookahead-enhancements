import React, { useMemo, useState, useCallback } from 'react';
import { useProject } from '../../context/ProjectContext';
import { usePersona } from '../../context/PersonaContext';
import { PlusIcon, CalculatorIcon, HistoryIcon, CalendarIcon, ChevronDownIcon, TrashIcon } from '../common/Icons';
import { ScheduleStatus, LookaheadTask } from '../views/lookahead/types';
import { parseLookaheadDate } from '../../lib/dateUtils';
import { compareLookaheadTasks } from '../views/lookahead/utils/diffUtils';
import { DeltasModal } from '../views/lookahead/components/DeltasModal';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

const formatValue = (val: number) => 
    Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AppHeader: React.FC = () => {
    const {
        activeViewMode, activeView, setIsCreateLookaheadModalOpen, setIsAddTaskModalOpen,
        schedules, activeScheduleId, setActiveScheduleId, publishSchedule, forcePublishSchedule, submitScheduleForReview, pullBackScheduleToDraft, deleteDraftSchedule, deltas, projectRisks
    } = useProject();
    const { persona, scCompany } = usePersona();
    const [showRisks, setShowRisks] = useState(false);

    const [isDeltasModalOpen, setIsDeltasModalOpen] = useState(false);
    const [currentDeltas, setCurrentDeltas] = useState<any[]>([]);

    const [showPullBackDialog, setShowPullBackDialog] = useState(false);
    const [showPublishWarningDialog, setShowPublishWarningDialog] = useState(false);
    const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);
    const [unresolvedTasksList, setUnresolvedTasksList] = useState<string[]>([]);

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

    const handlePublishClick = (override = false) => {
        if (!activeScheduleId) return;

        if (activeSchedule.status === ScheduleStatus.InReview && !override) {
            const all: LookaheadTask[] = [];
            const walk = (items: LookaheadTask[]) => {
                items.forEach(t => {
                    all.push(t);
                    if (t.children) walk(t.children);
                });
            };
            walk(activeSchedule.tasks);
            const unresolved = all.filter(t => {
                const contractor = (t.contractor ?? '').trim();
                if (!contractor) return false;
                const st = t.commitmentStatus ?? 'pending';
                return !(st === 'committed' || st === 'gc_accepted');
            });

            if (unresolved.length > 0) {
                setUnresolvedTasksList(unresolved.slice(0, 10).map(t => `- ${t.name} (${t.commitmentStatus ?? 'pending'})`));
                setShowPublishWarningDialog(true);
                return;
            }
        }

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

    const handleConfirmPublishWithWarning = () => {
        if (!activeScheduleId) return;
        // Override path: bypass unresolved guard & deltas modal and publish immediately
        setShowPublishWarningDialog(false);
        forcePublishSchedule(activeScheduleId);
    };

    const handleSubmitForReview = () => {
        if (!activeScheduleId) return;
        submitScheduleForReview(activeScheduleId);
    };

    const handlePullBackToDraft = () => {
        if (!activeScheduleId) return;
        setShowPullBackDialog(true);
    };

    const confirmPullBackToDraft = () => {
        if (!activeScheduleId) return;
        pullBackScheduleToDraft(activeScheduleId);
        setShowPullBackDialog(false);
    };

    const confirmDeleteDraft = () => {
        if (!activeScheduleId) return;
        deleteDraftSchedule(activeScheduleId);
        setShowDeleteDraftDialog(false);
    };
    
    // Dynamic title based on view mode
    const getTitle = () => {
        if (activeViewMode === 'dashboard') return 'Project Dashboard';
        if (activeViewMode === 'table' || activeViewMode === 'board') return 'RFIs';
        if (activeViewMode === 'gantt') return 'Schedule';
        if (activeViewMode === 'lookahead') return 'Lookahead';
        if (activeViewMode === 'production') return 'Production Report';
        if (activeViewMode === 'kanban') return activeSchedule?.name ?? 'Kanban';
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
    const showCreateButton =
        !isSpreadsheetView && activeViewMode !== 'dashboard' && activeViewMode !== 'production' && activeViewMode !== 'kanban';

    // Status colors based on unallocated amount - used only for the status pill
    const statusClasses = unallocated === 0 
        ? 'bg-green-50 text-green-700 border-green-200 shadow-[0_1px_2px_rgba(34,197,94,0.1)]' 
        : unallocated < 0
        ? 'bg-red-50 text-red-700 border-red-200 shadow-[0_1px_2px_rgba(239,68,68,0.1)]'
        : 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_1px_2px_rgba(245,158,11,0.1)]';

    return (
        <header className="flex-shrink-0 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 relative">
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
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : (s.status === ScheduleStatus.InReview || (s.status === ScheduleStatus.Active && persona === 'sc'))
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                        : s.status === ScheduleStatus.Closed
                                                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                        : 'bg-green-50 text-green-700 border-green-200'
                                                }`}>
                                                    {s.status === ScheduleStatus.Active && persona === 'sc' ? 'In Review' : s.status}
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
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : (activeSchedule.status === ScheduleStatus.InReview || (activeSchedule.status === ScheduleStatus.Active && persona === 'sc'))
                                        ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                        : activeSchedule.status === ScheduleStatus.Closed
                                        ? 'bg-gray-100 text-gray-600 border border-gray-300'
                                        : 'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                    {activeSchedule.status === ScheduleStatus.Active && persona === 'sc' ? 'In Review' : activeSchedule.status}
                                </span>
                                {activeSchedule.status === ScheduleStatus.Draft && persona === 'gc' && (
                                    <>
                                        <button
                                            onClick={() => setShowDeleteDraftDialog(true)}
                                            className="px-2 py-1.5 text-xs font-bold rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5"
                                            title="Delete draft"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                            Delete Draft
                                        </button>
                                        <button
                                            onClick={handleSubmitForReview}
                                            className="px-4 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-md hover:bg-amber-700 shadow-sm transition-all"
                                        >
                                            Submit for Review
                                        </button>
                                    </>
                                )}
                                {activeSchedule.status === ScheduleStatus.InReview && persona === 'gc' && (
                                    <>
                                        <button 
                                            onClick={handlePullBackToDraft}
                                            className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-md hover:bg-zinc-200 border border-zinc-200 transition-all"
                                        >
                                            Pull back to Draft
                                        </button>
                                        <button 
                                            onClick={() => handlePublishClick(false)} // Pass false for initial publish click
                                            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
                                        >
                                            <HistoryIcon className="w-3.5 h-3.5" />
                                            Publish Lookahead
                                        </button>
                                    </>
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
                                {projectRisks.length > 0 && (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowRisks(prev => !prev)}
                                            className="px-4 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-md hover:bg-amber-200 border border-amber-200 transition-all flex items-center gap-2"
                                        >
                                            Risks ({projectRisks.length})
                                        </button>
                                        {showRisks && (
                                            <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 max-h-60 overflow-y-auto">
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Project risks</div>
                                                {projectRisks.map((r, i) => (
                                                    <div key={i} className="px-3 py-2 text-sm border-b border-gray-50 last:border-0">
                                                        <div className="font-medium text-gray-800 truncate" title={r.taskName}>{r.taskName}</div>
                                                        <div className="text-xs text-amber-700">{r.reason}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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

                {activeViewMode === 'lookahead' && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <span className="text-xs font-medium text-gray-500 border border-gray-200 rounded px-2 py-1 bg-gray-50">
                            {persona === 'gc' ? 'General Contractor view' : `Subcontractor view – ${scCompany ?? 'Select company'}`}
                        </span>
                    </div>
                )}
                
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

                    {activeViewMode === 'lookahead' && persona === 'gc' && (
                        <button 
                            onClick={() => setIsCreateLookaheadModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700 shadow-sm transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Create Lookahead</span>
                        </button>
                    )}
                    {activeViewMode !== 'lookahead' && showCreateButton ? (
                        <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700 shadow-sm transition-colors">
                            <PlusIcon className="w-4 h-4" />
                            <span>Create</span>
                        </button>
                    ) : null}
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
            <ConfirmationDialog
                isOpen={showPullBackDialog}
                onClose={() => setShowPullBackDialog(false)}
                onConfirm={confirmPullBackToDraft}
                title="Pull Back Lookahead to Draft?"
                message="Subcontractors will be notified and their responses will be preserved as history. Are you sure you want to proceed?"
                confirmText="Yes, Pull Back"
                cancelText="No, Keep in Review"
            />
            <ConfirmationDialog
                isOpen={showDeleteDraftDialog}
                onClose={() => setShowDeleteDraftDialog(false)}
                onConfirm={confirmDeleteDraft}
                title="Delete Draft Lookahead?"
                message={`"${activeSchedule?.name}" will be permanently deleted. This cannot be undone.`}
                confirmText="Delete Draft"
                cancelText="Cancel"
            />
            <ConfirmationDialog
                isOpen={showPublishWarningDialog}
                onClose={() => setShowPublishWarningDialog(false)}
                onConfirm={handleConfirmPublishWithWarning} 
                title="Unresolved Tasks Detected"
                message={`Cannot publish yet. ${unresolvedTasksList.length} task(s) unresolved:\n\n` + unresolvedTasksList.join('\n') + (unresolvedTasksList.length > 10 ? `\n… +${unresolvedTasksList.length - 10} more` : '') + `\n\nDo you want to override and publish anyway for demonstration purposes?`}
                confirmText="Override and Publish"
                cancelText="No, Cancel"
            />
        </header>
    );
};

export default AppHeader;