import React from 'react';
import { DemoCommitmentStatus, DemoLookaheadStatus } from '../data/lookahead-demo-data';

type Kind =
  | { type: 'schedule'; status: DemoLookaheadStatus }
  | { type: 'commitment'; status: DemoCommitmentStatus };

const scheduleMeta: Record<DemoLookaheadStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_review: { label: 'In Review', classes: 'bg-amber-100 text-amber-900 border-amber-200' },
  active: { label: 'Active', classes: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  closed: { label: 'Closed', classes: 'bg-slate-200 text-slate-700 border-slate-300' },
};

const commitmentMeta: Record<DemoCommitmentStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-orange-100 text-orange-900 border-orange-200' },
  committed: { label: 'Committed', classes: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  rejected: { label: 'Rejected', classes: 'bg-rose-100 text-rose-900 border-rose-200' },
  adjustment_proposed: { label: 'Adjustment', classes: 'bg-amber-100 text-amber-900 border-amber-200' },
  gc_accepted: { label: 'GC accepted', classes: 'bg-teal-100 text-teal-900 border-teal-200' },
  gc_revised: { label: 'GC revised', classes: 'bg-violet-100 text-violet-900 border-violet-200' },
  disputed: { label: 'Disputed', classes: 'bg-orange-100 text-orange-900 border-orange-200' },
};

export const StatusBadge: React.FC<
  Kind & { className?: string; size?: 'sm' | 'md'; animate?: boolean; icon?: React.ReactNode }
> = ({ type, status, className = '', size = 'sm', animate = true, icon }) => {
  const meta = type === 'schedule' ? scheduleMeta[status] : commitmentMeta[status];
  const pad = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-semibold gap-1',
        pad,
        meta.classes,
        animate ? 'transition-all duration-150 ease-out' : '',
        animate ? 'will-change-transform' : '',
        className,
      ].join(' ')}
    >
      {icon}
      {meta.label}
    </span>
  );
};

