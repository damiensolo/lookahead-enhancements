import React from 'react';
import { LookaheadTask, ConstraintType, ConstraintStatus, ScheduleStatus } from '../types';
import { AlertTriangleIcon, ClipboardIcon, DocumentIcon } from '../../../common/Icons';
import { parseLookaheadDate } from '../../../../lib/dateUtils';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../common/ui/Tooltip';

interface EnhancedTaskSelectionRowProps {
  task: LookaheadTask;
  onSelect: (task: LookaheadTask) => void;
  isSelected: boolean;
  showStatusLabels: boolean; // New prop
}

export const EnhancedTaskSelectionRow: React.FC<EnhancedTaskSelectionRowProps> = ({
  task,
  onSelect,
  isSelected,
  showStatusLabels,
}) => {
  const hasUnansweredRFIs = task.constraints.some(
    (c) => c.type === ConstraintType.RFI && (c.status === ConstraintStatus.Pending || c.status === ConstraintStatus.Overdue)
  );

  const hasUnansweredSubmittals = task.constraints.some(
    (c) => c.type === ConstraintType.Submittal && (c.status === ConstraintStatus.Pending || c.status === ConstraintStatus.Overdue)
  );

  const isTaskDelayed = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskStartDate = parseLookaheadDate(task.startDate);
    const taskFinishDate = parseLookaheadDate(task.finishDate);
    const fieldStartDate = task.fieldStartDate ? parseLookaheadDate(task.fieldStartDate) : null;

    // Check if dates are valid before proceeding
    if (isNaN(taskStartDate.getTime()) || isNaN(taskFinishDate.getTime())) {
      console.error("Invalid date encountered for task:", task.id, task.name);
      return false;
    }
    if (fieldStartDate && isNaN(fieldStartDate.getTime())) {
      console.error("Invalid field start date encountered for task:", task.id, task.name);
      return false;
    }

    const isStarted = taskStartDate <= today;
    const isNotComplete = task.progress < 100;

    // Delayed if field start date is after planned start date
    if (fieldStartDate && fieldStartDate > taskStartDate) return true;

    // Delayed if not complete and theoretical finish date is in the past
    if (isStarted && isNotComplete && taskFinishDate < today) return true;

    return false;
  })();

  const isIncomplete = task.progress < 100;

  return (
    <TooltipProvider>
      <div
        className={`flex items-center justify-between px-6 py-3 border-b border-black/5 hover:bg-black/5 transition-colors cursor-pointer ${
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
            <div className="font-medium text-sm text-zinc-900 flex items-center gap-2">
              <span>{task.name}</span>
              {showStatusLabels && isTaskDelayed && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold uppercase tracking-wider border border-red-200">
                  Delayed
                </span>
              )}
              {showStatusLabels && isIncomplete && !isTaskDelayed && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider border border-amber-200">
                  Incomplete
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500">{task.contractor} • {task.startDate} to {task.finishDate}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Critical Task Badge */}
          {task.isCriticalPath && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
              CT
            </span>
          )}

          {/* Slack Indicator */}
          {task.slack !== undefined && (
            <Tooltip>
              <TooltipTrigger>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  task.slack === 0 
                    ? 'bg-zinc-100 text-zinc-600 border-zinc-200' 
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  Slack: {task.slack}d
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-[10px] max-w-[150px]">
                  {task.slack === 0 
                    ? "Critical: No flexibility. Any delay impacts project finish." 
                    : `${task.slack} days of buffer before project finish is impacted.`}
                </div>
              </TooltipContent>
            </Tooltip>
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
                <TooltipContent side="top">
                  <div className="text-[10px]">Unanswered RFI: Risk to task start</div>
                </TooltipContent>
              </Tooltip>
            )}
            {hasUnansweredSubmittals && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="p-0.5">
                    <DocumentIcon className="w-4 h-4 text-amber-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-[10px]">Pending Submittal: Risk to material/approval</div>
                </TooltipContent>
              </Tooltip>
            )}
            {(hasUnansweredRFIs || hasUnansweredSubmittals) && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangleIcon className="w-4 h-4 text-red-500 animate-pulse" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-[10px] font-bold text-red-500">High Risk: Open constraints</div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
