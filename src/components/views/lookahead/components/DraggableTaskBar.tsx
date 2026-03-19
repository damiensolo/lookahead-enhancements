
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { LookaheadTask } from '../types';
import { addDays, formatDateISO, getDaysDiff, parseLookaheadDate, formatDisplayDate } from '../../../../lib/dateUtils';
import { getLookaheadPermissions } from '../utils/permissionUtils';

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
    /** The currently selected date for this task's row, if any */
    selectedDate?: Date | null;
    onCommitCellValue?: (taskId: string | number, dateISO: string, value: number) => void;
    onTabToNextCell?: (currentDateISO: string) => void;
    /** Lookahead schedule status string — used to derive cell entry permissions */
    scheduleStatus?: string;
    /** When false, the master task range indicator line is hidden */
    showMasterRange?: boolean;
}

const DraggableTaskBar: React.FC<DraggableTaskBarProps> = ({ task, projectStartDate, projectEndDate, dayWidth, onUpdateTask, onDayClick, offsetLeft = 0, disabled = false, bufferDaysBefore = 0, periodDurationDays = Infinity, selectedDate, onCommitCellValue, onTabToNextCell, scheduleStatus, showMasterRange = true }) => {
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize-left' | 'resize-right';
        startX: number;
        originalStart: Date;
        originalFinish: Date;
        masterStart: Date;
        masterFinish: Date;
    } | null>(null);
    const lastDayDeltaRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const [editState, setEditState] = useState<{ dateISO: string } | null>(null);
    const editInputRef = useRef<HTMLInputElement | null>(null);

    // Guard against undefined dates (e.g. when creating a new lookahead before state is ready)
    const windowStart = projectStartDate ?? new Date();
    const windowEnd = projectEndDate ?? new Date();

    const isFieldTask = task.taskType === 'Field Task';
    const isCritical = !!task.isCriticalPath;

    // Color Logic: Field Tasks: Blue/Indigo (Editable), Master Tasks: Slate (Fixed)
    // Critical path is indicated by the master indicator line and CP badge, not bar color.
    const styles = useMemo(() => {
        return isFieldTask ? {
            bar: 'bg-blue-50 border-blue-300 border-dashed',
            progress: 'bg-blue-500',
            wrapper: 'z-10'
        } : {
            bar: 'bg-slate-100 border-slate-400',
            progress: 'bg-slate-500',
            wrapper: 'z-10'
        };
    }, [isFieldTask]);

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
        if (!isFieldTask || disabled) return;

        // Do NOT call e.preventDefault() here — it would suppress focus-change events,
        // preventing onBlur from firing on any active edit input (value would be lost).
        e.stopPropagation();
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
        document.body.style.userSelect = 'none';
        lastDayDeltaRef.current = null;
        setDragState({
            type,
            startX: e.clientX,
            originalStart: parseLookaheadDate(task.fieldStartDate || task.startDate),
            originalFinish: parseLookaheadDate(task.fieldFinishDate || task.finishDate),
            masterStart: parseLookaheadDate(task.masterStartDate || task.startDate),
            masterFinish: parseLookaheadDate(task.masterFinishDate || task.finishDate),
        });
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState) return;

        const dayDelta = Math.round((e.clientX - dragState.startX) / dayWidth);

        // Skip work entirely if the cursor hasn't crossed a day boundary
        if (dayDelta === lastDayDeltaRef.current) return;
        lastDayDeltaRef.current = dayDelta;

        // Cancel any pending frame before scheduling a new one
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            const { type, originalStart, originalFinish, masterStart, masterFinish } = dragState;

            let newStart = new Date(originalStart);
            let newFinish = new Date(originalFinish);

            if (type === 'move') {
                newStart = addDays(originalStart, dayDelta);
                newFinish = addDays(originalFinish, dayDelta);
            } else if (type === 'resize-left') {
                newStart = addDays(originalStart, dayDelta);
                if (newStart > originalFinish) newStart = new Date(originalFinish);
            } else if (type === 'resize-right') {
                newFinish = addDays(originalFinish, dayDelta);
                if (newFinish < originalStart) newFinish = new Date(originalStart);
            }

            // Clamp within master task bounds
            if (newStart < masterStart) newStart = new Date(masterStart);
            if (newStart > masterFinish) newStart = new Date(masterFinish);
            if (newFinish < masterStart) newFinish = new Date(masterStart);
            if (newFinish > masterFinish) newFinish = new Date(masterFinish);

            if (newStart > newFinish) {
                if (type === 'resize-left') newStart = new Date(newFinish);
                if (type === 'resize-right') newFinish = new Date(newStart);
            }

            onUpdateTask(task.id, formatDateISO(newStart), formatDateISO(newFinish));
        });
    }, [dragState, dayWidth, onUpdateTask, task.id]);

    const handleMouseUp = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        lastDayDeltaRef.current = null;
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

    // Master Range Indicator - clamped to visible window
    const masterIndicator = useMemo(() => {
        if (!hasMasterRange || !showMasterRange) return null;
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

        const cpLine = isCritical;
        return (
            <div
                className={`absolute -top-[6px] h-1 rounded-full overflow-hidden ${cpLine ? 'border border-red-400/30' : 'border border-slate-400/20'}`}
                style={{ left, width }}
            >
                {/* Full span at low opacity (buffer zones appear disabled) */}
                <div className={`absolute inset-0 ${cpLine ? 'bg-red-400/30' : 'bg-slate-400/25'}`} />
                {/* Active-period portion at full opacity */}
                {hasActiveSegment && activeDuration > 0 && (
                    <div
                        className={`absolute top-0 h-full ${cpLine ? 'bg-red-500/65' : 'bg-slate-500/55'}`}
                        style={{
                            left: `${(activeOffset - mOffset) * dayWidth}px`,
                            width: `${activeDuration * dayWidth}px`,
                        }}
                    />
                )}
            </div>
        );
    }, [hasMasterRange, showMasterRange, isCritical, task.masterStartDate, task.masterFinishDate, windowStart, windowEnd, offsetDays, dayWidth, activePeriodStart, activePeriodEnd]);

    const { canEnterDayActual } = getLookaheadPermissions(scheduleStatus ?? '');

    // Helper: get the current actual value for a given date ISO
    const getDayActual = useCallback((dateISO: string): number => {
        const metrics = task.productionQuantity?.dailyMetrics ?? [];
        return metrics.find(m => m.date === dateISO)?.quantity?.actual ?? 0;
    }, [task.productionQuantity]);

    // Helper: get the distributed planned value for a given date ISO
    const getDayPlan = useCallback((dateISO: string): number => {
        const metrics = task.productionQuantity?.dailyMetrics ?? [];
        return metrics.find(m => m.date === dateISO)?.quantity?.plan ?? 0;
    }, [task.productionQuantity]);

    // Pending seed value for the next input mount (digit pressed, or '' for click-to-edit)
    const pendingSeedRef = useRef<string>('');

    // Ref callback: seeds value and focuses the instant the input is attached to the DOM
    const setInputRef = useCallback((el: HTMLInputElement | null) => {
        editInputRef.current = el;
        if (el) {
            el.value = pendingSeedRef.current;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        }
    }, []);

    // Digit keydown: enter edit mode directly without a parent round-trip.
    // Listener is not attached when canEnterDayActual is false.
    useEffect(() => {
        if (!selectedDate || !canEnterDayActual) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement instanceof HTMLInputElement) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (!/^[0-9]$/.test(e.key)) return;
            e.preventDefault();
            pendingSeedRef.current = e.key;
            setEditState({ dateISO: formatDateISO(selectedDate) });
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDate, canEnterDayActual]);

    const commitEdit = useCallback(() => {
        const input = editInputRef.current;
        if (!editState) { setEditState(null); return; }
        const raw = input?.value ?? '';
        const num = parseInt(raw, 10);
        if (!isNaN(num) && num >= 0) {
            onCommitCellValue?.(task.id, editState.dateISO, num);
        }
        setEditState(null);
    }, [editState?.dateISO, onCommitCellValue, task.id]);

    const cancelEdit = useCallback(() => {
        setEditState(null);
    }, []);

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
            
            <div className="flex h-full relative z-10">
                {Array.from({ length: durationDays }).map((_, i) => {
                    const dayDate = addDays(visibleStart, i);
                    const dayProgress = Math.min(100, Math.max(0, (task.progress - (i / durationDays * 100)) * durationDays));
                    const inBuffer = isBufferDate(dayDate);
                    const isSelected = !inBuffer && !!selectedDate && dayDate.getTime() === selectedDate.getTime();
                    // A cell is the left/right resize edge if it is the first/last non-buffer cell in the bar.
                    // Using neighbour-based detection instead of i===0 fixes the case where the bar starts
                    // in the buffer zone: i===0 would be a buffer cell and the first active cell (e.g. i===2)
                    // would never satisfy i===0, leaving the left drag handle missing.
                    const prevInBuffer = i === 0 ? true : isBufferDate(addDays(visibleStart, i - 1));
                    const nextInBuffer = i === durationDays - 1 ? true : isBufferDate(addDays(visibleStart, i + 1));
                    const isLeftEdge = !inBuffer && isFieldTask && !disabled && prevInBuffer;
                    const isRightEdge = !inBuffer && isFieldTask && !disabled && nextInBuffer;
                    const isEdgeCell = isLeftEdge || isRightEdge;

                    // Pre-compute quantities and status for color coding (active state only)
                    const dayISO = formatDateISO(dayDate);
                    const planVal = getDayPlan(dayISO);
                    const actualVal = getDayActual(dayISO);

                    // cellStatusType: only set in active state, not for buffer or selected cells
                    let cellStatusType: 'meets' | 'below' | null = null;
                    if (canEnterDayActual && !inBuffer && planVal > 0) {
                        cellStatusType = actualVal >= planVal ? 'meets' : 'below';
                    }

                    return (
                        <div
                            key={i}
                            className="h-full flex items-center justify-center"
                            style={{ width: `${dayWidth}px` }}
                        >
                            <div
                                className={`relative flex items-center justify-center overflow-hidden hover:brightness-95
                                    ${inBuffer
                                        ? 'bg-transparent cursor-not-allowed pointer-events-none'
                                        : isEdgeCell
                                            ? (isSelected ? 'bg-blue-50' : 'bg-white') + ' cursor-ew-resize'
                                            : isSelected
                                                ? 'bg-blue-50 ' + (canEnterDayActual ? 'cursor-pointer' : 'cursor-default')
                                                : 'bg-white ' + (canEnterDayActual ? 'cursor-pointer' : 'cursor-default')
                                    }`}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '4px',
                                    boxSizing: 'border-box',
                                    border: inBuffer
                                        ? '1px solid rgba(209,213,219,0.4)'
                                        : isSelected
                                            ? '2px solid #3b82f6'
                                            : cellStatusType === 'meets'
                                                ? '1.5px solid #16A34A'
                                                : cellStatusType === 'below'
                                                    ? '1.5px solid #F87171'
                                                    : '1px solid #9ca3af',
                                    backgroundColor: inBuffer
                                        ? undefined
                                        : isSelected
                                            ? '#EFF6FF'
                                            : 'white',
                                }}
                                onMouseDown={isEdgeCell ? (e) => {
                                    e.stopPropagation();
                                    handleMouseDown(e, isLeftEdge ? 'resize-left' : 'resize-right');
                                } : undefined}
                                onClick={inBuffer ? undefined : (e) => {
                                    if (isEdgeCell) {
                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        if (x < 12 || x > rect.width - 12) return;
                                    }
                                    e.stopPropagation();
                                    if (isSelected && !editState && canEnterDayActual) {
                                        // Second click on already-selected cell → enter edit mode directly
                                        pendingSeedRef.current = '';
                                        setEditState({ dateISO: formatDateISO(dayDate) });
                                    } else if (!isSelected) {
                                        onDayClick(task, dayDate);
                                    }
                                }}
                            >
                                {/* Day Progress Fill */}
                                {!inBuffer && (
                                    <div
                                        className={`absolute inset-y-0 left-0 h-full ${styles.progress} transition-all duration-300 opacity-25`}
                                        style={{ width: `${dayProgress}%` }}
                                    />
                                )}

                                {/* Status direction indicator */}
                                {!inBuffer && cellStatusType && !editState && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke={cellStatusType === 'meets' ? '#15803D' : '#B91C1C'}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="absolute top-0 right-0.5 z-20 pointer-events-none select-none"
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            transform: cellStatusType === 'meets' ? 'rotate(180deg)' : 'none',
                                        }}
                                    >
                                        <path d="M12 5v14"/>
                                        <path d="m19 12-7 7-7-7"/>
                                    </svg>
                                )}

                                {/* Quantity value / inline editor */}
                                {!inBuffer && (() => {
                                    if (canEnterDayActual) {
                                        if (editState?.dateISO === dayISO) {
                                            return (
                                                <input
                                                    ref={setInputRef}
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    autoComplete="off"
                                                    onChange={(e) => {
                                                        // Sanitize in place — no React state, zero re-renders
                                                        const filtered = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                                                        if (filtered !== e.target.value) e.target.value = filtered;
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            commitEdit();
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            e.nativeEvent.stopImmediatePropagation();
                                                            cancelEdit();
                                                        } else if (e.key === 'Tab') {
                                                            e.preventDefault();
                                                            commitEdit();
                                                            onTabToNextCell?.(editState.dateISO);
                                                        }
                                                    }}
                                                    onBlur={commitEdit}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute inset-0 w-full h-full bg-transparent border-0 outline-none text-center text-gray-800"
                                                    style={{ fontSize: '11px', fontWeight: 600, padding: 0, boxSizing: 'border-box' }}
                                                />
                                            );
                                        }
                                        return actualVal > 0 ? (
                                            <span className="relative z-10 text-[11px] leading-none select-none" style={{
                                                fontWeight: 600,
                                                color: isSelected
                                                    ? '#374151'
                                                    : cellStatusType === 'meets' ? '#15803D'
                                                    : cellStatusType === 'below' ? '#B91C1C'
                                                    : '#374151',
                                            }}>
                                                {actualVal}
                                            </span>
                                        ) : null;
                                    }
                                    // canEnterDayActual is false: show distributed planned qty as read-only
                                    return planVal > 0 ? (
                                        <span className="relative z-10 text-[11px] leading-none select-none text-gray-700" style={{ fontWeight: 500 }}>
                                            {planVal}
                                        </span>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DraggableTaskBar;
