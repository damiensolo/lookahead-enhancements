
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { LookaheadTask } from '../types';
import { addDays, formatDateISO, getDaysDiff, parseLookaheadDate } from '../../../../lib/dateUtils';

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

    const taskStart = parseLookaheadDate(task.startDate);
    const taskEnd = parseLookaheadDate(task.finishDate);
    const offsetDays = getDaysDiff(projectStartDate, taskStart);
    const durationDays = getDaysDiff(taskStart, taskEnd) + 1;
    const progressPercent = task.manHours.budget > 0 ? (task.manHours.actual / task.manHours.budget) * 100 : 0;
    const displayProgressPercent = Math.min(100, progressPercent);

    const hasMasterRange = !!(task.masterStartDate && task.masterFinishDate);

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

        const originalStart = parseLookaheadDate(dragState.originalTask.startDate);
        const originalFinish = parseLookaheadDate(dragState.originalTask.finishDate);

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

        // Enforce Master Range Constraint
        if (task.masterStartDate && task.masterFinishDate) {
            const masterStart = parseLookaheadDate(task.masterStartDate);
            const masterFinish = parseLookaheadDate(task.masterFinishDate);

            if (newStart < masterStart) newStart = new Date(masterStart);
            if (newFinish > masterFinish) newFinish = new Date(masterFinish);
            
            // Re-check validity after clamping
            if (newStart > newFinish) {
                if (dragState.type === 'resize-left') newStart = new Date(newFinish);
                if (dragState.type === 'resize-right') newFinish = new Date(newStart);
            }
        }
        
        onUpdateTask(task.id, formatDateISO(newStart), formatDateISO(newFinish));

    }, [dragState, dayWidth, onUpdateTask, task.id, task.masterStartDate, task.masterFinishDate]);

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

    // Master Range Indicator
    const masterIndicator = useMemo(() => {
        if (!hasMasterRange) return null;
        const mStart = parseLookaheadDate(task.masterStartDate!);
        const mFinish = parseLookaheadDate(task.masterFinishDate!);
        const mOffset = getDaysDiff(projectStartDate, mStart);
        const mDuration = getDaysDiff(mStart, mFinish) + 1;
        
        return (
            <div 
                className="absolute -bottom-2 h-1 bg-amber-400/30 rounded-full overflow-hidden"
                style={{
                    left: `${(mOffset - offsetDays) * dayWidth}px`,
                    width: `${mDuration * dayWidth}px`,
                }}
            >
                <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.5)_4px,rgba(245,158,11,0.5)_8px)]" />
            </div>
        );
    }, [hasMasterRange, task.masterStartDate, task.masterFinishDate, projectStartDate, offsetDays, dayWidth]);

    return (
        <div 
            className={`absolute top-1/2 -translate-y-1/2 group rounded-md overflow-visible h-5
                ${styles.wrapper}
                ${isFieldTask ? (dragState?.type === 'move' ? 'cursor-grabbing opacity-80 z-30' : 'cursor-grab') : 'cursor-default'}`}
            style={{ 
                left: `${(offsetDays * dayWidth) + offsetLeft}px`, 
                width: `${barWidth}px`,
            }}
            onMouseDown={(e) => isFieldTask && handleMouseDown(e, 'move')}
            title={`${task.name}: ${task.startDate} to ${task.finishDate}${hasMasterRange ? ` (Master: ${task.masterStartDate} to ${task.masterFinishDate})` : ''}`}
        >
            {masterIndicator}
            
            <div 
              className={`w-full h-full rounded-md border ${styles.bar} shadow-sm relative z-10 flex items-center`}
            >
                <div 
                    className={`h-full rounded-l-[5px] ${styles.progress} transition-all duration-300`}
                    style={{ 
                        width: `${displayProgressPercent}%`,
                    }}
                ></div>
                {isFieldTask && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <div className="w-0.5 h-2 bg-current rounded-full" />
                        <div className="w-0.5 h-2 bg-current rounded-full" />
                    </div>
                )}
            </div>

            <div className="absolute inset-0 flex">
                {Array.from({ length: durationDays }).map((_, i) => {
                    const dayDate = addDays(parseLookaheadDate(task.startDate), i);
                    return (
                        <div
                            key={i}
                            className="h-full border-r border-white/20 last:border-r-0 cursor-pointer hover:bg-black/5"
                            style={{ width: `${dayWidth}px` }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDayClick(task, dayDate);
                            }}
                        />
                    );
                })}
            </div>
            
            {/* Resize Handles */}
            <div 
                className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                style={{transform: 'translateX(-50%)'}}
                onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
            />
            <div 
                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100" 
                style={{transform: 'translateX(50%)'}}
                onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
            />
        </div>
    );
};

export default DraggableTaskBar;
