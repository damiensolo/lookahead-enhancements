import React from 'react';
import { LookaheadTask, ConstraintType, ConstraintStatus } from '../types';
import { AlertTriangleIcon, ClipboardIcon, DocumentIcon } from '../../../common/Icons';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../common/ui/Tooltip';

interface EnhancedTaskSelectionRowProps {
  task: LookaheadTask;
  onSelect: (task: LookaheadTask) => void;
  isSelected: boolean;
}

export const EnhancedTaskSelectionRow: React.FC<EnhancedTaskSelectionRowProps> = ({
  task,
  onSelect,
  isSelected,
}) => {
  const hasUnansweredRFIs = task.constraints.some(
    (c) => c.type === ConstraintType.RFI && (c.status === ConstraintStatus.Pending || c.status === ConstraintStatus.Overdue)
  );

  const hasUnansweredSubmittals = task.constraints.some(
    (c) => c.type === ConstraintType.Submittal && (c.status === ConstraintStatus.Pending || c.status === ConstraintStatus.Overdue)
  );

  return (
    <TooltipProvider>
      <div
        className={`flex items-center justify-between p-3 border-b border-black/5 hover:bg-black/5 transition-colors cursor-pointer ${
          isSelected ? 'bg-emerald-50' : ''
        }`}
        onClick={() => onSelect(task)}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded border-black/20 text-emerald-600 focus:ring-emerald-500"
          />
          <div>
            <div className="font-medium text-sm text-zinc-900">{task.name}</div>
            <div className="text-xs text-zinc-500">{task.contractor} • {task.startDate} to {task.finishDate}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Critical Path Badge */}
          {task.isCriticalPath && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
              CP
            </span>
          )}

          {/* Slack Indicator */}
          {task.slack !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              task.slack === 0 ? 'bg-zinc-100 text-zinc-600' : 'bg-blue-50 text-blue-600'
            }`}>
              Slack: {task.slack}d
            </span>
          )}

          {/* Risk Warnings */}
          <div className="flex items-center gap-1.5 ml-2">
            {hasUnansweredRFIs && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-0.5">
                    <ClipboardIcon className="w-4 h-4 text-amber-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">Unanswered RFI</TooltipContent>
              </Tooltip>
            )}
            {hasUnansweredSubmittals && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-0.5">
                    <DocumentIcon className="w-4 h-4 text-amber-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">Pending Submittal</TooltipContent>
              </Tooltip>
            )}
            {(hasUnansweredRFIs || hasUnansweredSubmittals) && (
              <AlertTriangleIcon className="w-4 h-4 text-red-500 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
