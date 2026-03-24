
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
    disabled?: boolean;
    bufferDaysBefore?: number;
    periodDurationDays?: number;
    selectedDate?: Date | null;
    onCommitCellValue?: (taskId: string | number, dateISO: string, value: number) => void;
    onTabToNextCell?: (currentDateISO: string) => void;
    scheduleStatus?: string;
    showMasterRange?: boolean;
}

interface DragInit {
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    originalStart: Date;
    originalFinish: Date;
    masterStart: Date;
    masterFinish: Date;
}

function computeDragDates(drag: DragInit, dayDelta: number): { newStart: Date; newFinish: Date } {
    const { type, originalStart, originalFinish, masterStart, masterFinish } = drag;
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

    if (newStart < masterStart) newStart = new Date(masterStart);
    if (newStart > masterFinish) newStart = new Date(masterFinish);
    if (newFinish < masterStart) newFinish = new Date(masterStart);
    if (newFinish > masterFinish) newFinish = new Date(masterFinish);

    if (newStart > newFinish) {
        if (type === 'resize-left') newStart = new Date(newFinish);
        else newFinish = new Date(newStart);
    }

    return { newStart, newFinish };
}

const DraggableTaskBar: React.FC<DraggableTaskBarProps> = ({
    task, projectStartDate, projectEndDate, dayWidth, onUpdateTask, onDayClick,
    offsetLeft = 0, disabled = false, bufferDaysBefore = 0, periodDurationDays = Infinity,
    selectedDate, onCommitCellValue, onTabToNextCell, scheduleStatus, showMasterRange = true,
}) => {
    // dragInitRef: set immediately on mousedown with NO setState — pure clicks cause zero renders.
    // activeDrag: set only when actual mouse movement occurs, drives local visual position.
    // onUpdateTask called exactly once on mouseup — no parent re-renders during drag.
    const dragInitRef = useRef<DragInit | null>(null);
    const [activeDrag, setActiveDrag] = useState<(DragInit & { dayDelta: number }) | null>(null);
    const lastDayDeltaRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    const [editState, setEditState] = useState<{ dateISO: string } | null>(null);
    const editInputRef = useRef<HTMLInputElement | null>(null);

    const windowStart = projectStartDate ?? new Date();
    const windowEnd = projectEndDate ?? new Date();

    const isFieldTask = task.taskType === 'Field Task';
    const isCritical = !!task.isCriticalPath;

    const styles = useMemo(() => isFieldTask ? {
        bar: 'bg-blue-50 border-blue-300 border-dashed',
        progress: 'bg-blue-500',
        wrapper: 'z-10',
    } : {
        bar: 'bg-slate-100 border-slate-400',
        progress: 'bg-slate-500',
        wrapper: 'z-10',
    }, [isFieldTask]);

    const taskStart = parseLookaheadDate(task.fieldStartDate || task.startDate);
    const taskEnd = parseLookaheadDate(task.fieldFinishDate || task.finishDate);

    // Use local drag position while dragging; fall back to task props otherwise.
    const effectiveStart = activeDrag ? computeDragDates(activeDrag, activeDrag.dayDelta).newStart : taskStart;
    const effectiveEnd   = activeDrag ? computeDragDates(activeDrag, activeDrag.dayDelta).newFinish : taskEnd;

    const isOutsideWindow = effectiveEnd < windowStart || effectiveStart > windowEnd;
    const visibleStart = isOutsideWindow ? windowStart : (effectiveStart >= windowStart ? effectiveStart : new Date(windowStart.getTime()));
    const visibleEnd   = isOutsideWindow ? windowStart : (effectiveEnd <= windowEnd   ? effectiveEnd   : new Date(windowEnd.getTime()));
    const offsetDays   = getDaysDiff(windowStart, visibleStart);
    const durationDays = isOutsideWindow ? 0 : getDaysDiff(visibleStart, visibleEnd) + 1;
    const barWidth     = durationDays * dayWidth;

    const hasMasterRange = !!(task.masterStartDate && task.masterFinishDate);

    // Keep stable references to the latest handler implementations so the same function
    // object can be passed to add/removeEventListener regardless of re-renders.
    const onUpdateTaskRef = useRef(onUpdateTask);
    onUpdateTaskRef.current = onUpdateTask;
    const dayWidthRef = useRef(dayWidth);
    dayWidthRef.current = dayWidth;

    // Stable mousemove handler — reads latest values via refs, no dependency array issues.
    const stableMouseMove = useRef((e: MouseEvent) => {
        const init = dragInitRef.current;
        if (!init) return;
        const dayDelta = Math.round((e.clientX - init.startX) / dayWidthRef.current);
        if (dayDelta === lastDayDeltaRef.current) return;
        lastDayDeltaRef.current = dayDelta;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            setActiveDrag({ ...init, dayDelta });
        });
    });

    // Stable mouseup handler.
    const stableMouseUp = useRef(() => {
        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        window.removeEventListener('mousemove', stableMouseMove.current);
        window.removeEventListener('mouseup', stableMouseUp.current);

        const init = dragInitRef.current;
        dragInitRef.current = null;
        lastDayDeltaRef.current = null;

        setActiveDrag(prev => {
            if (prev && init) {
                const { newStart, newFinish } = computeDragDates(prev, prev.dayDelta);
                onUpdateTaskRef.current(task.id, formatDateISO(newStart), formatDateISO(newFinish));
            }
            return null;
        });
    });

    // Keep the task.id accessible inside the stable ref without re-creating it.
    const taskIdRef = useRef(task.id);
    taskIdRef.current = task.id;

    // Rebuild stableMouseUp body when task.id changes (it's captured by closure at write time).
    // We do this by re-assigning the ref body inline so it always sees the latest task.id.
    // (The ref object itself is stable; only .current changes.)
    stableMouseUp.current = () => {
        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        window.removeEventListener('mousemove', stableMouseMove.current);
        window.removeEventListener('mouseup', stableMouseUp.current);

        const init = dragInitRef.current;
        dragInitRef.current = null;
        lastDayDeltaRef.current = null;

        setActiveDrag(prev => {
            if (prev && init) {
                const { newStart, newFinish } = computeDragDates(prev, prev.dayDelta);
                onUpdateTaskRef.current(taskIdRef.current, formatDateISO(newStart), formatDateISO(newFinish));
            }
            return null;
        });
    };

    stableMouseMove.current = (e: MouseEvent) => {
        const init = dragInitRef.current;
        if (!init) return;
        const dayDelta = Math.round((e.clientX - init.startX) / dayWidthRef.current);
        if (dayDelta === lastDayDeltaRef.current) return;
        lastDayDeltaRef.current = dayDelta;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            setActiveDrag({ ...init, dayDelta });
        });
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
        if (!isFieldTask || disabled) return;
        // Commit any focused inline edit input before we prevent default.
        if (document.activeElement instanceof HTMLInputElement) {
            document.activeElement.blur();
        }
        e.preventDefault();
        e.stopPropagation();
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
        document.body.style.userSelect = 'none';
        lastDayDeltaRef.current = null;
        dragInitRef.current = {
            type,
            startX: e.clientX,
            originalStart: parseLookaheadDate(task.fieldStartDate || task.startDate),
            originalFinish: parseLookaheadDate(task.fieldFinishDate || task.finishDate),
            masterStart: parseLookaheadDate(task.masterStartDate || task.startDate),
            masterFinish: parseLookaheadDate(task.masterFinishDate || task.finishDate),
        };
        // Attach to window immediately — no setState, no re-render on pure clicks.
        window.addEventListener('mousemove', stableMouseMove.current);
        window.addEventListener('mouseup', stableMouseUp.current);
    };

    // Clean up on unmount in case mouseup fires after unmount.
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', stableMouseMove.current);
            window.removeEventListener('mouseup', stableMouseUp.current);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const activePeriodStart = useMemo(() => bufferDaysBefore > 0 ? addDays(projectStartDate, bufferDaysBefore) : null, [bufferDaysBefore, projectStartDate]);
    const activePeriodEnd   = useMemo(() => bufferDaysBefore > 0 && isFinite(periodDurationDays) ? addDays(projectStartDate, bufferDaysBefore + periodDurationDays - 1) : null, [bufferDaysBefore, periodDurationDays, projectStartDate]);

    const isBufferDate = useCallback((date: Date): boolean => {
        if (bufferDaysBefore <= 0) return false;
        const dayIndex = getDaysDiff(projectStartDate, date);
        return dayIndex < bufferDaysBefore || dayIndex >= bufferDaysBefore + periodDurationDays;
    }, [bufferDaysBefore, periodDurationDays, projectStartDate]);

    const masterIndicator = useMemo(() => {
        if (!hasMasterRange || !showMasterRange) return null;
        const mStart = parseLookaheadDate(task.masterStartDate!);
        const mFinish = parseLookaheadDate(task.masterFinishDate!);
        if (mFinish < windowStart || mStart > windowEnd) return null;
        const mStartClamp = mStart >= windowStart ? mStart : new Date(windowStart.getTime());
        const mEndClamp   = mFinish <= windowEnd   ? mFinish : new Date(windowEnd.getTime());
        const mOffset   = getDaysDiff(windowStart, mStartClamp);
        const mDuration = getDaysDiff(mStartClamp, mEndClamp) + 1;
        const left  = `${(mOffset - offsetDays) * dayWidth}px`;
        const width = `${mDuration * dayWidth}px`;

        const activeClipStart = activePeriodStart && mStartClamp < activePeriodStart ? activePeriodStart : mStartClamp;
        const activeClipEnd   = activePeriodEnd   && mEndClamp   > activePeriodEnd   ? activePeriodEnd   : mEndClamp;
        const hasActiveSegment = activePeriodStart && activeClipStart <= activeClipEnd;
        const activeOffset   = hasActiveSegment ? getDaysDiff(windowStart, activeClipStart) : 0;
        const activeDuration = hasActiveSegment ? getDaysDiff(activeClipStart, activeClipEnd) + 1 : 0;

        const cpLine = isCritical;
        return (
            <div
                className={`absolute -top-[6px] h-1 rounded-full overflow-hidden ${cpLine ? 'border border-red-400/30' : 'border border-slate-400/20'}`}
                style={{ left, width }}
            >
                <div className={`absolute inset-0 ${cpLine ? 'bg-red-400/30' : 'bg-slate-400/25'}`} />
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

    const getDayActual = useCallback((dateISO: string): number => {
        const metrics = task.productionQuantity?.dailyMetrics ?? [];
        return metrics.find(m => m.date === dateISO)?.quantity?.actual ?? 0;
    }, [task.productionQuantity]);

    const getDayPlan = useCallback((dateISO: string): number => {
        const metrics = task.productionQuantity?.dailyMetrics ?? [];
        return metrics.find(m => m.date === dateISO)?.quantity?.plan ?? 0;
    }, [task.productionQuantity]);

    const pendingSeedRef = useRef<string>('');

    const setInputRef = useCallback((el: HTMLInputElement | null) => {
        editInputRef.current = el;
        if (el) {
            el.value = pendingSeedRef.current;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        }
    }, []);

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

    const cancelEdit = useCallback(() => setEditState(null), []);

    if (isOutsideWindow) return null;

    return (
        <div
            className={`absolute top-[7px] bottom-[5px] group overflow-visible
                ${styles.wrapper}
                ${disabled ? 'cursor-default' : isFieldTask ? (activeDrag?.type === 'move' ? 'cursor-grabbing opacity-80 z-30' : 'cursor-grab') : 'cursor-default'}`}
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

                    const prevInBuffer = i === 0 ? true : isBufferDate(addDays(visibleStart, i - 1));
                    const nextInBuffer = i === durationDays - 1 ? true : isBufferDate(addDays(visibleStart, i + 1));
                    const isLeftEdge  = !inBuffer && isFieldTask && !disabled && prevInBuffer;
                    const isRightEdge = !inBuffer && isFieldTask && !disabled && nextInBuffer;
                    const isEdgeCell  = isLeftEdge || isRightEdge;

                    const dayISO    = formatDateISO(dayDate);
                    const planVal   = getDayPlan(dayISO);
                    const actualVal = getDayActual(dayISO);

                    let cellStatusType: 'meets' | 'below' | null = null;
                    if (canEnterDayActual && !inBuffer && planVal > 0) {
                        cellStatusType = actualVal >= planVal ? 'meets' : 'below';
                    }

                    return (
                        <div key={i} className="h-full flex items-center justify-center" style={{ width: `${dayWidth}px` }}>
                            <div
                                className={`relative flex items-center justify-center overflow-hidden hover:brightness-95
                                    ${inBuffer
                                        ? 'bg-transparent cursor-not-allowed pointer-events-none'
                                        : isEdgeCell
                                            ? (isSelected ? 'bg-blue-50' : 'bg-white') + ' cursor-ew-resize'
                                            : isSelected
                                                ? 'bg-blue-50 ' + (canEnterDayActual ? 'cursor-pointer' : 'cursor-default')
                                                : 'bg-white '  + (canEnterDayActual ? 'cursor-pointer' : 'cursor-default')
                                    }`}
                                style={{
                                    width: `${dayWidth - 4}px`, height: `${dayWidth - 4}px`, borderRadius: '4px', boxSizing: 'border-box',
                                    border: inBuffer
                                        ? '1px solid rgba(209,213,219,0.4)'
                                        : isSelected
                                            ? '2px solid #3b82f6'
                                            : cellStatusType === 'meets'
                                                ? '1.5px solid #16A34A'
                                                : cellStatusType === 'below'
                                                    ? '1.5px solid #F87171'
                                                    : '1px solid #9ca3af',
                                    backgroundColor: inBuffer ? undefined : isSelected ? '#EFF6FF' : 'white',
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
                                            width: '8px', height: '8px',
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
                                                        const filtered = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                                                        if (filtered !== e.target.value) e.target.value = filtered;
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                                                        else if (e.key === 'Escape') { e.preventDefault(); e.nativeEvent.stopImmediatePropagation(); cancelEdit(); }
                                                        else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); onTabToNextCell?.(editState.dateISO); }
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
                                                color: isSelected ? '#374151'
                                                    : cellStatusType === 'meets' ? '#15803D'
                                                    : cellStatusType === 'below' ? '#B91C1C'
                                                    : '#374151',
                                            }}>
                                                {Math.round(actualVal)}
                                            </span>
                                        ) : null;
                                    }
                                    return planVal > 0 ? (
                                        <span className="relative z-10 text-[11px] leading-none select-none text-gray-700" style={{ fontWeight: 600 }}>
                                            {Math.round(planVal)}
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
