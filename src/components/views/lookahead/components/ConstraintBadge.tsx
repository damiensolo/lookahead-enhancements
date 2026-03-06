import React from 'react';
import { LookaheadStatus, ConstraintType, ConstraintStatus } from '../types';

const getSegmentColor = (status: ConstraintStatus): string => {
  switch (status) {
    case ConstraintStatus.Overdue: return 'bg-red-500';
    case ConstraintStatus.Pending: return 'bg-yellow-500';
    case ConstraintStatus.Complete:
    case ConstraintStatus.OnSite:
      return 'bg-green-500';
    default: return 'bg-gray-300';
  }
};

const getOverallStatusInfo = (status: LookaheadStatus): { label: string; dotColor: string } => {
  const statuses = Object.values(status);
  if (statuses.includes(ConstraintStatus.Overdue)) {
    return { label: 'Blocked', dotColor: 'bg-red-500' };
  }
  if (statuses.includes(ConstraintStatus.Pending)) {
    return { label: 'At Risk', dotColor: 'bg-yellow-500' };
  }
  return { label: 'Ready', dotColor: 'bg-green-500' };
};

const ConstraintBadge: React.FC<{ status: LookaheadStatus, onClick: () => void }> = ({ status, onClick }) => {
  const overall = getOverallStatusInfo(status);
  const constraintOrder: ConstraintType[] = [ConstraintType.Predecessor, ConstraintType.RFI, ConstraintType.Submittal, ConstraintType.Material];

  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full text-left p-1 rounded-md hover:bg-gray-100">
      <span className={`w-2.5 h-2.5 rounded-full ${overall.dotColor} flex-shrink-0`}></span>
      <span className="flex-grow text-sm text-gray-700 font-medium truncate">{overall.label}</span>
      <div className="flex items-center gap-0.5" title="Predecessor | RFI | Submittal | Material">
        {constraintOrder.map(type => (
          <div key={type} className={`w-1.5 h-3 rounded-sm ${getSegmentColor(status[type])}`}></div>
        ))}
      </div>
    </button>
  );
};

export default ConstraintBadge;