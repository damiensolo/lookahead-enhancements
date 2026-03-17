
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { LookaheadTask } from '../types';
import { addDays, formatDateISO, getDaysDiff, parseLookaheadDate, formatDisplayDate } from '../../../../lib/dateUtils';

interface DraggableTaskBarProps {
    task: LookaheadTask;
    projectStartDate: Date;
    projectEndDate: Date;
    dayWidth: number;
    onUpdateTask: (taskId: string | number, newStart: string, newFinish: string) => void;
    onDayClick: (task: LookaheadTask, date: Date) => void;
    offsetLeft?: number;
    /** When true, dragging and resizing are disabled (e.g. closed lookahead) */
    disabled?: boolean;
    /** Number of buffer days before the lookahead period starts */
    bufferDaysBefore?: number;
    /** Number of days in the active lookahead period (excludes buffer) */
    periodDurationDays?: number;
}

const DraggableTaskBar: React.FC<DraggableTaskBarProps> = ({ task, projectStartDate, projectEndDate, dayWidth, onUpdateTask, onDayClick, offsetLeft = 0, disabled = false, bufferDaysBefore = 0, periodDurationDays = Infinity }) => {
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize-left' | 'resize-right';
        startX: number;
        originalTask: LookaheadTask;
    } | null>(null);

    // Guard against undefined dates (e.g. when creating a new lookahead before state is ready)
    const windowStart = projectStartDate ?? new Date();
    const windowEnd = projectEndDate ?? new Date();

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

    // Clip to visible lookahead window; avoid early return so hooks run consistently
    const isOutsideWindow = taskEnd < windowStart || taskStart > windowEnd;
    const visibleStart = isOutsideWindow ? windowStart : (taskStart >= windowStart ? taskStart : new Date(windowStart.getTime()));
    const visibleEnd = isOutsideWindow ? windowStart : (taskEnd <= windowEnd ? taskEnd : new Date(windowEnd.getTime()));

    const offsetDays = getDaysDiff(windowStart, visibleStart);
    const durationDays = isOutsideWindow ? 0 : getDaysDiff(visibleStart, visibleEnd) + 1;
    const displayProgressPercent = Math.min(100, task.progress);

    const hasMasterRange = !!(task.masterStartDate && task.masterFinishDate);
    const hasFieldDates = !!(task.fieldStartDate && task.fieldFinishDate);

    const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
        if (!isFieldTask || disabled) return; // Only field tasks can be edited; disabled when closed
        
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

    // Active period boundaries (the non-buffer region)
    const activePeriodStart = useMemo(() => bufferDaysBefore > 0 ? addDays(projectStartDate, bufferDaysBefore) : null, [bufferDaysBefore, projectStartDate]);
    const activePeriodEnd = useMemo(() => bufferDaysBefore > 0 && isFinite(periodDurationDays) ? addDays(projectStartDate, bufferDaysBefore + periodDurationDays - 1) : null, [bufferDaysBefore, periodDurationDays, projectStartDate]);

    const isBufferDate = useCallback((date: Date): boolean => {
        if (bufferDaysBefore <= 0) return false;
        const dayIndex = getDaysDiff(projectStartDate, date);
        return dayIndex < bufferDaysBefore || dayIndex >= bufferDaysBefore + periodDurationDays;
    }, [bufferDaysBefore, periodDurationDays, projectStartDate]);

    // Planned Range Indicator (Baseline) - clamped to visible window
    const plannedIndicator = useMemo(() => {
        const pStart = planStart >= windowStart ? planStart : new Date(windowStart.getTime());
        const pEnd = planEnd <= windowEnd ? planEnd : new Date(windowEnd.getTime());
        if (pStart > pEnd) return null;
        const pOffset = getDaysDiff(windowStart, pStart);
        const pDuration = getDaysDiff(pStart, pEnd) + 1;
        const left = `${(pOffset - offsetDays) * dayWidth}px`;
        const width = `${pDuration * dayWidth}px`;

        // Active-period clip for the "full opacity" overlay
        const activeClipStart = activePeriodStart && pStart < activePeriodStart ? activePeriodStart : pStart;
        const activeClipEnd = activePeriodEnd && pEnd > activePeriodEnd ? activePeriodEnd : pEnd;
        const hasActiveSegment = activePeriodStart && activeClipStart <= activeClipEnd;
        const activeOffset = hasActiveSegment ? getDaysDiff(windowStart, activeClipStart) : 0;
        const activeDuration = hasActiveSegment ? getDaysDiff(activeClipStart, activeClipEnd) + 1 : 0;

        return (
            <div className="absolute -top-[3px] h-[2px]" style={{ left, width }}>
                {/* Full span at low opacity (buffer zones appear disabled) */}
                <div className="absolute inset-0 bg-zinc-200 rounded-full opacity-30" />
                {/* Active-period portion at full opacity */}
                {hasActiveSegment && activeDuration > 0 && (
                    <div
                        className="absolute top-0 h-full bg-zinc-200 rounded-full"
                        style={{
                            left: `${(activeOffset - pOffset) * dayWidth}px`,
                            width: `${activeDuration * dayWidth}px`,
                        }}
                    />
                )}
            </div>
        );
    }, [planStart, planEnd, windowStart, windowEnd, offsetDays, dayWidth, activePeriodStart, activePeriodEnd]);

    // Master Range Indicator - clamped to visible window
    const masterIndicator = useMemo(() => {
        if (!hasMasterRange) return null;
        const mStart = parseLookaheadDate(task.masterStartDate!);
        const mFinish = parseLookaheadDate(task.masterFinishDate!);
        if (mFinish < windowStart || mStart > windowEnd) return null;
        const mStartClamp = mStart >= windowStart ? mStart : new Date(windowStart.getTime());
        const mEndClamp = mFinish <= windowEnd ? mFinish : new Date(windowEnd.getTime());
        const mOffset = getDaysDiff(windowStart, mStartClamp);
        const mDuration = getDaysDiff(mStartClamp, mEndClamp) + 1;
        const left = `${(mOffset - offsetDays) * dayWidth}px`;
        const width = `${mDuration * dayWidth}px`;

        // Active-period clip for the "full opacity" overlay
        const activeClipStart = activePeriodStart && mStartClamp < activePeriodStart ? activePeriodStart : mStartClamp;
        const activeClipEnd = activePeriodEnd && mEndClamp > activePeriodEnd ? activePeriodEnd : mEndClamp;
        const hasActiveSegment = activePeriodStart && activeClipStart <= activeClipEnd;
        const activeOffset = hasActiveSegment ? getDaysDiff(windowStart, activeClipStart) : 0;
        const activeDuration = hasActiveSegment ? getDaysDiff(activeClipStart, activeClipEnd) + 1 : 0;

        return (
            <div
                className="absolute -top-[8px] h-1 rounded-full overflow-hidden border border-amber-500/10"
                style={{ left, width }}
            >
                {/* Full span at low opacity (buffer zones appear disabled) */}
                <div className="absolute inset-0 bg-amber-400/15">
                    <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.2)_4px,rgba(245,158,11,0.2)_8px)]" />
                </div>
                {/* Active-period portion at full opacity */}
                {hasActiveSegment && activeDuration > 0 && (
                    <div
                        className="absolute top-0 h-full bg-amber-400/40"
                        style={{
                            left: `${(activeOffset - mOffset) * dayWidth}px`,
                            width: `${activeDuration * dayWidth}px`,
                        }}
                    >
                        <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.6)_4px,rgba(245,158,11,0.6)_8px)]" />
                    </div>
                )}
            </div>
        );
    }, [hasMasterRange, task.masterStartDate, task.masterFinishDate, windowStart, windowEnd, offsetDays, dayWidth, activePeriodStart, activePeriodEnd]);

    if (isOutsideWindow) return null;

    return (
        <div 
            className={`absolute top-[7px] bottom-[5px] group overflow-visible
                ${styles.wrapper}
                ${disabled ? 'cursor-default' : isFieldTask ? (dragState?.type === 'move' ? 'cursor-grabbing opacity-80 z-30' : 'cursor-grab') : 'cursor-default'}`}
            style={{ 
                left: `${(offsetDays * dayWidth) + offsetLeft}px`, 
                width: `${barWidth}px`,
            }}
            onMouseDown={(e) => isFieldTask && !disabled && handleMouseDown(e, 'move')}
            title={`${task.name}: ${formatDisplayDate(task.fieldStartDate || task.startDate)} to ${formatDisplayDate(task.fieldFinishDate || task.finishDate)}${hasMasterRange ? ` (Master: ${formatDisplayDate(task.masterStartDate!)} to ${formatDisplayDate(task.masterFinishDate!)})` : ''}`}
        >
            {masterIndicator}
            {plannedIndicator}
            
            <div className="flex h-full relative z-10">
                {Array.from({ length: durationDays }).map((_, i) => {
                    const dayDate = addDays(visibleStart, i);
                    const dayProgress = Math.min(100, Math.max(0, (task.progress - (i / durationDays * 100)) * durationDays));
                    const inBuffer = isBufferDate(dayDate);

                    return (
                        <div
                            key={i}
                            className="h-full flex items-center justify-center"
                            style={{ width: `${dayWidth}px` }}
                        >
                            <div
                                className={`aspect-square w-[65%] border relative flex items-center overflow-hidden transition-all rounded-sm
                                    ${inBuffer
                                        ? 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed pointer-events-none'
                                        : `${styles.bar} shadow-sm cursor-pointer hover:brightness-95`
                                    }`}
                                onClick={inBuffer ? undefined : (e) => {
                                    e.stopPropagation();
                                    onDayClick(task, dayDate);
                                }}
                            >
                                {/* Day Progress Fill */}
                                {!inBuffer && (
                                    <div
                                        className={`h-full ${styles.progress} transition-all duration-300`}
                                        style={{ width: `${dayProgress}%` }}
                                    />
                                )}

                                {/* Drag Handle Indicator (only on first square) */}
                                {isFieldTask && !disabled && !inBuffer && i === 0 && (
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
            
            {/* Resize Handles - hidden when disabled */}
            {!disabled && (
            <>
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
            </>
            )}
        </div>
    );
};

export default DraggableTaskBar;
