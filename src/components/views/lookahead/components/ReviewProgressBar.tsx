import React, { useMemo } from 'react';
import { TaskCommitmentStatus } from '../types';

const SEGMENTS: { key: TaskCommitmentStatus; label: string; color: string; bgClass: string }[] = [
    { key: 'committed',           label: 'Committed',          color: '#10b981', bgClass: 'bg-emerald-500' },
    { key: 'gc_accepted',         label: 'GC accepted',        color: '#14b8a6', bgClass: 'bg-teal-500'    },
    { key: 'gc_revised',          label: 'GC revised',         color: '#a855f7', bgClass: 'bg-purple-500'  },
    { key: 'adjustment_proposed', label: 'New Proposal',       color: '#f59e0b', bgClass: 'bg-amber-500'   },
    { key: 'rejected',            label: 'Rejected',           color: '#f87171', bgClass: 'bg-rose-400'    },
    { key: 'disputed',            label: 'Disputed',           color: '#f97316', bgClass: 'bg-orange-500'  },
    { key: 'pending',             label: 'Pending',            color: '#d1d5db', bgClass: 'bg-gray-300'    },
];

interface Props {
    counts: Partial<Record<TaskCommitmentStatus, number>>;
    total: number;
}

export const ReviewProgressBar: React.FC<Props> = ({ counts, total }) => {
    const segments = useMemo(() => {
        const safeTotal = Math.max(1, total);
        return SEGMENTS
            .map(s => ({ ...s, value: counts[s.key] ?? 0, pct: ((counts[s.key] ?? 0) / safeTotal) * 100 }))
            .filter(s => s.value > 0);
    }, [counts, total]);

    const resolved = (counts.committed ?? 0) + (counts.gc_accepted ?? 0) + (counts.gc_revised ?? 0);

    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-500">Commitment progress</span>
                <span className="text-xs text-gray-400">{resolved} of {total} resolved</span>
            </div>

            {/* Stacked bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-2 w-full flex">
                    {segments.map(s => (
                        <div
                            key={s.key}
                            className={`${s.bgClass} transition-[width] duration-300 ease-out`}
                            style={{ width: `${s.pct}%` }}
                            title={`${s.label}: ${s.value}`}
                        />
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                {segments.map(s => (
                    <div key={s.key} className="inline-flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-sm ${s.bgClass}`} />
                        <span>{s.value} {s.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
