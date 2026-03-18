import React from 'react';
import { DemoCommitmentStatus, DemoLookaheadStatus } from '../data/lookahead-demo-data';

type Kind =
  | { type: 'schedule'; status: DemoLookaheadStatus }
  | { type: 'commitment'; status: DemoCommitmentStatus };

const scheduleMeta: Record<DemoLookaheadStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-slate-700/60 text-slate-200 border-slate-600' },
  in_review: { label: 'In Review', classes: 'bg-amber-500/20 text-amber-200 border-amber-500/30' },
  active: { label: 'Active', classes: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' },
  closed: { label: 'Closed', classes: 'bg-slate-700/60 text-slate-400 border-slate-600' },
};

const commitmentMeta: Record<DemoCommitmentStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-slate-700/60 text-slate-300 border-slate-600' },
  committed: { label: 'Committed', classes: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' },
  rejected: { label: 'Rejected', classes: 'bg-rose-500/20 text-rose-200 border-rose-500/30' },
  adjustment_proposed: { label: 'Adjustment', classes: 'bg-amber-500/20 text-amber-200 border-amber-500/30' },
  gc_accepted: { label: 'GC Accepted', classes: 'bg-teal-500/20 text-teal-200 border-teal-500/30' },
  gc_revised: { label: 'GC Revised', classes: 'bg-violet-500/20 text-violet-200 border-violet-500/30' },
  disputed: { label: 'Disputed', classes: 'bg-orange-500/20 text-orange-200 border-orange-500/30' },
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

