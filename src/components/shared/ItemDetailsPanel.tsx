import React, { useState, useEffect } from 'react';
import { Task, Progress, Priority } from '../../types';
import { XIcon, ArrowUpIcon, ArrowDownIcon, MoreHorizontalIcon, DocumentIcon } from '../common/Icons';
import { InteractiveProgressChart, PrioritySelector, StatusDisplay, AssigneeAvatar } from './TaskElements';

interface ItemDetailsPanelProps {
  task: Task | null;
  onClose: () => void;
  onPriorityChange: (taskId: number, priority: Priority) => void;
}

const ProgressStats: React.FC<{ progress: Progress }> = ({ progress }) => {
  const { percentage, history = [] } = progress;

  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (history.length > 1) {
    const start = history[0];
    const end = history[history.length - 1];
    if (end > start) trend = 'up';
    else if (end < start) trend = 'down';
  }
  
  const trendInfo = {
    up: { text: "Trending Up", icon: ArrowUpIcon, color: "text-green-600" },
    down: { text: "Trending Down", icon: ArrowDownIcon, color: "text-red-600" },
    flat: { text: "Flat", icon: MoreHorizontalIcon, color: "text-gray-600" },
  };
  const TrendIcon = trendInfo[trend].icon;

  return (
    <div className="flex items-center gap-6">
      <div>
        <div className="text-xs text-gray-500">Current Progress</div>
        <div className="text-2xl font-bold text-gray-800">{percentage}%</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Trend</div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${trendInfo[trend].color}`}>
          <TrendIcon className="w-4 h-4" />
          <span>{trendInfo[trend].text}</span>
        </div>
      </div>
    </div>
  );
};

const HealthStatusDot: React.FC<{ status: 'complete' | 'at_risk' | 'blocked' }> = ({ status }) => {
  const color = status === 'complete' ? 'bg-green-500' : status === 'at_risk' ? 'bg-yellow-500' : 'bg-red-500';
  return <span className={`w-3 h-3 rounded-full ${color} flex-shrink-0`}></span>;
};


const ItemDetailsPanel: React.FC<ItemDetailsPanelProps> = ({ task, onClose, onPriorityChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!!task);
  }, [task]);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <aside
      className={`flex-shrink-0 bg-white border-l border-gray-200 transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen ? 'w-[400px]' : 'w-0 border-l-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-panel-title"
    >
      {task && (
        <div className="flex flex-col h-full" style={{ width: '400px' }}>
          <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="details-panel-title" className="text-lg font-semibold text-gray-800 truncate">{task.name}</h2>
            <button onClick={handleClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close details">
              <XIcon className="w-5 h-5" />
            </button>
          </header>
          <div className="flex-grow p-4 overflow-y-auto space-y-6">
            
            {/* Dashboard Section */}
            <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-lg">
              <div>
                <dt className="text-xs text-gray-500 mb-1">Priority</dt>
                <dd><PrioritySelector taskId={task.id} currentPriority={task.priority} onPriorityChange={onPriorityChange} /></dd>
              </div>
               <div>
                <dt className="text-xs text-gray-500 mb-1">Status</dt>
                <dd><StatusDisplay status={task.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 mb-1">Assignees</dt>
                <dd className="flex items-center -space-x-2">
                    {task.assignees.map(a => <AssigneeAvatar key={a.id} assignee={a} />)}
                </dd>
              </div>
            </div>

            {/* Task Health Section */}
            {task.health && task.health.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Task Health</h3>
                    <ul className="space-y-3">
                        {task.health.map((item, index) => (
                            <li key={index} className="flex items-center gap-3" title={item.details}>
                                <HealthStatusDot status={item.status} />
                                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* Sub-Items Section */}
            {task.children && task.children.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Sub-Items</h3>
                    <ul className="space-y-2">
                        {task.children.map(child => (
                            <li key={child.id} className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100">
                                <div className="flex items-center gap-2">
                                    <DocumentIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-800">{child.name}</span>
                                </div>
                                <div className="w-28 flex-shrink-0">
                                  <StatusDisplay status={child.status} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* Progress Section */}
            {task.progress && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Progress Overview</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="mb-4">
                            <ProgressStats progress={task.progress} />
                        </div>
                        <InteractiveProgressChart progress={task.progress} />
                    </div>
                </div>
            )}

          </div>
        </div>
      )}
    </aside>
  );
};

export default ItemDetailsPanel;