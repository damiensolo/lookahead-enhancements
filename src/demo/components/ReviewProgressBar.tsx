import React, { useMemo } from 'react';

export const ReviewProgressBar: React.FC<{
  counts: Record<string, number>;
  total: number;
}> = ({ counts, total }) => {
  const segments = useMemo(() => {
    const safeTotal = Math.max(1, total);
    const items: { key: string; value: number; className: string; label: string }[] = [
      { key: 'committed', value: counts.committed ?? 0, className: 'bg-emerald-500', label: 'Committed' },
      { key: 'gc_accepted', value: counts.gc_accepted ?? 0, className: 'bg-teal-500', label: 'GC accepted' },
      { key: 'adjustment_proposed', value: counts.adjustment_proposed ?? 0, className: 'bg-amber-500', label: 'Adjustment' },
      { key: 'rejected', value: counts.rejected ?? 0, className: 'bg-rose-500', label: 'Rejected' },
      { key: 'pending', value: counts.pending ?? 0, className: 'bg-gray-300', label: 'Pending' },
      { key: 'disputed', value: counts.disputed ?? 0, className: 'bg-orange-500', label: 'Disputed' },
    ];
    return items
      .filter((s) => s.value > 0)
      .map((s) => ({ ...s, pct: (s.value / safeTotal) * 100 }));
  }, [counts, total]);

  const resolved = (counts.committed ?? 0) + (counts.gc_accepted ?? 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-xs font-semibold text-gray-700">Review progress</div>
        <div className="text-xs text-gray-500">
          {resolved} of {total} tasks resolved
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-2 w-full flex">
          {segments.map((s) => (
            <div
              key={s.key}
              className={s.className + ' transition-[width] duration-400 ease-out'}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
        {segments.map((s) => (
          <div key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${s.className}`} />
            <span>
              {s.value} {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

