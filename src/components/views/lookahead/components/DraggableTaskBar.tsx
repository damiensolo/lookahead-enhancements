
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { LookaheadTask } from '../types';
import { addDays, formatDateISO, getDaysDiff, parseLookaheadDate, formatDisplayDate } from '../../../../lib/dateUtils';

interface DraggableTaskBarProps {
    task: LookaheadTask;
    projectStartDate: Date;
    dayWidth: number;
    onUpdateTask: (taskId: string | number, newStart: string, newFinish: string) => void;
    onDayClick: (task: LookaheadTask, date: Date) => void;
    offsetLeft?: number;
}

const DraggableTaskBar: React.FC<DraggableTaskBarProps> = ({ task, projectStartDate, dayWidth, onUpdateTask, onDayClick, offsetLeft = 0 }) => {
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize-left' | 'resize-right';
        startX: number;
        originalTask: LookaheadTask;
    } | null>(null);
    
    const isFieldTask = task.taskType === 'Field Task';
    const isCritical = !!task.isCriticalPath;
    
    // Enhanced Color Logic: 
    // Main Tasks: Neutral/Slate (Fixed)
    // Field Tasks: Blue/Indigo (Editable)
    // Critical Path: Red/Rose
    const styles = useMemo(() => {
        if (isCritical) {
            return isFieldTask ? {
                bar: 'bg-rose-50 border-rose-300 border-dashed',
                progress: 'bg-rose-500',
                wrapper: 'z-20'
            } : {
                bar: 'bg-red-100 border-red-300',
                progress: 'bg-red-600',
                wrapper: 'z-20'
            };
        }
        return isFieldTask ? {
            bar: 'bg-blue-50 border-blue-300 border-dashed',
            progress: 'bg-blue-500',
            wrapper: 'z-10'
        } : {
            bar: 'bg-slate-100 border-slate-400',
            progress: 'bg-slate-500',
            wrapper: 'z-10'
        };
    }, [isCritical, isFieldTask]);

    const taskStart = parseLookaheadDate(task.fieldStartDate || task.startDate);
    const taskEnd = parseLookaheadDate(task.fieldFinishDate || task.finishDate);
    const planStart = parseLookaheadDate(task.startDate);
    const planEnd = parseLookaheadDate(task.finishDate);

    const offsetDays = getDaysDiff(projectStartDate, taskStart);
    const durationDays = getDaysDiff(taskStart, taskEnd) + 1;
    const displayProgressPercent = Math.min(100, task.progress);

    const hasMasterRange = !!(task.masterStartDate && task.masterFinishDate);
    const hasFieldDates = !!(task.fieldStartDate && task.fieldFinishDate);

    const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
        if (!isFieldTask) return; // Only field tasks can be edited
        
        e.preventDefault();
        e.stopPropagation();
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
        document.body.style.userSelect = 'none';
        setDragState({
            type,
            startX: e.clientX,
            originalTask: task,
        });
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState) return;

        const deltaX = e.clientX - dragState.startX;
        const dayDelta = Math.round(deltaX / dayWidth);

        const originalStart = parseLookaheadDate(dragState.originalTask.fieldStartDate || dragState.originalTask.startDate);
        const originalFinish = parseLookaheadDate(dragState.originalTask.fieldFinishDate || dragState.originalTask.finishDate);

        let newStart = new Date(originalStart);
        let newFinish = new Date(originalFinish);

        if (dragState.type === 'move') {
            newStart = addDays(originalStart, dayDelta);
            newFinish = addDays(originalFinish, dayDelta);
        } else if (dragState.type === 'resize-left') {
            newStart = addDays(originalStart, dayDelta);
            if (newStart > originalFinish) { // prevent start date from passing finish date
                newStart = new Date(originalFinish);
            }
        } else if (dragState.type === 'resize-right') {
            newFinish = addDays(originalFinish, dayDelta);
            if (newFinish < originalStart) { // prevent finish date from being before start date
                newFinish = new Date(originalStart);
            }
        }

        // Enforce Parent/Planned Range Constraint (Field dates must be within planned range)
        const masterStart = parseLookaheadDate(task.startDate);
        const masterFinish = parseLookaheadDate(task.finishDate);

        if (newStart < masterStart) newStart = new Date(masterStart);
        if (newFinish > masterFinish) newFinish = new Date(masterFinish);
        
        // Re-check validity after clamping
        if (newStart > newFinish) {
            if (dragState.type === 'resize-left') newStart = new Date(newFinish);
            if (dragState.type === 'resize-right') newFinish = new Date(newStart);
        }
        
        onUpdateTask(task.id, formatDateISO(newStart), formatDateISO(newFinish));

    }, [dragState, dayWidth, onUpdateTask, task.id, task.startDate, task.finishDate]);

    const handleMouseUp = useCallback(() => {
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        setDragState(null);
    }, []);

    useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, handleMouseMove, handleMouseUp]);

    const barWidth = durationDays * dayWidth;

    // Planned Range Indicator (Baseline)
    const plannedIndicator = useMemo(() => {
        const pOffset = getDaysDiff(projectStartDate, planStart);
        const pDuration = getDaysDiff(planStart, planEnd) + 1;
        
        return (
            <div 
                className="absolute -top-[3px] h-[2px] bg-zinc-200 rounded-full overflow-hidden"
                style={{
                    left: `${(pOffset - offsetDays) * dayWidth}px`,
                    width: `${pDuration * dayWidth}px`,
                }}
            />
        );
    }, [planStart, planEnd, projectStartDate, offsetDays, dayWidth]);

    // Master Range Indicator
    const masterIndicator = useMemo(() => {
        if (!hasMasterRange) return null;
        const mStart = parseLookaheadDate(task.masterStartDate!);
        const mFinish = parseLookaheadDate(task.masterFinishDate!);
        const mOffset = getDaysDiff(projectStartDate, mStart);
        const mDuration = getDaysDiff(mStart, mFinish) + 1;
        
        return (
            <div 
                className="absolute -top-[8px] h-1 bg-amber-400/40 rounded-full overflow-hidden border border-amber-500/10"
                style={{
                    left: `${(mOffset - offsetDays) * dayWidth}px`,
                    width: `${mDuration * dayWidth}px`,
                }}
            >
                <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.6)_4px,rgba(245,158,11,0.6)_8px)]" />
            </div>
        );
    }, [hasMasterRange, task.masterStartDate, task.masterFinishDate, projectStartDate, offsetDays, dayWidth]);

    return (
        <div 
            className={`absolute top-[7px] bottom-[5px] group overflow-visible
                ${styles.wrapper}
                ${isFieldTask ? (dragState?.type === 'move' ? 'cursor-grabbing opacity-80 z-30' : 'cursor-grab') : 'cursor-default'}`}
            style={{ 
                left: `${(offsetDays * dayWidth) + offsetLeft}px`, 
                width: `${barWidth}px`,
            }}
            onMouseDown={(e) => isFieldTask && handleMouseDown(e, 'move')}
            title={`${task.name}: ${formatDisplayDate(task.fieldStartDate || task.startDate)} to ${formatDisplayDate(task.fieldFinishDate || task.finishDate)}${hasMasterRange ? ` (Master: ${formatDisplayDate(task.masterStartDate!)} to ${formatDisplayDate(task.masterFinishDate!)})` : ''}`}
        >
            {masterIndicator}
            {plannedIndicator}
            
            <div className="flex h-full relative z-10">
                {Array.from({ length: durationDays }).map((_, i) => {
                    const dayDate = addDays(taskStart, i);
                    const dayProgress = Math.min(100, Math.max(0, (task.progress - (i / durationDays * 100)) * durationDays));
                    
                    return (
                        <div 
                            key={i}
                            className="h-full flex items-center justify-center"
                            style={{ width: `${dayWidth}px` }}
                        >
                            <div 
                                className={`aspect-square w-[65%] border ${styles.bar} shadow-sm relative flex items-center overflow-hidden cursor-pointer hover:brightness-95 transition-all rounded-sm`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDayClick(task, dayDate);
                                }}
                            >
                                {/* Day Progress Fill */}
                                <div 
                                    className={`h-full ${styles.progress} transition-all duration-300`}
                                    style={{ width: `${dayProgress}%` }}
                                />
                                
                                {/* Drag Handle Indicator (only on first square) */}
                                {isFieldTask && i === 0 && (
                                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="w-1.5 h-0.5 bg-current rounded-full" />
                                        <div className="w-1.5 h-0.5 bg-current rounded-full" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Resize Handles */}
            <div 
                className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20"
                style={{transform: 'translateX(-50%)'}}
                onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
            />
            <div 
                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20" 
                style={{transform: 'translateX(50%)'}}
                onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
            />
        </div>
    );
};

export default DraggableTaskBar;
