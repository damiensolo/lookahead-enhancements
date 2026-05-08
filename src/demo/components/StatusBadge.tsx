import React from 'react';
import { DemoCommitmentStatus, DemoLookaheadStatus } from '../data/lookahead-demo-data';

type Kind =
  | { type: 'schedule'; status: DemoLookaheadStatus }
  | { type: 'commitment'; status: DemoCommitmentStatus };

const scheduleMeta: Record<DemoLookaheadStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
  in_review: { label: 'In Review', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed: { label: 'Closed', classes: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const commitmentMeta: Record<DemoCommitmentStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  committed: { label: 'Committed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  adjustment_proposed: { label: 'Adjustment', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  gc_accepted: { label: 'GC Accepted', classes: 'bg-teal-50 text-teal-700 border-teal-200' },
  gc_revised: { label: 'GC Revised', classes: 'bg-violet-50 text-violet-700 border-violet-200' },
  disputed: { label: 'Disputed', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
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

