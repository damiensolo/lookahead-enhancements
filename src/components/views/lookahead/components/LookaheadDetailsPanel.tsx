import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LookaheadTask, Constraint, ConstraintStatus, ConstraintType } from '../types';
import { XIcon, PlusIcon, AlertTriangleIcon } from '../../../common/Icons';
import ManHoursBar from './ManHoursBar';
import { formatDisplayDate } from '../../../../lib/dateUtils';


interface LookaheadDetailsPanelProps {
  task: LookaheadTask | null;
  onClose: () => void;
  onAddConstraint: (taskId: string | number, constraint: Constraint) => void;
  onUpdateProgress?: (taskId: string | number, progress: number) => void;
}

const getStatusDot = (status: ConstraintStatus) => {
  let color = 'bg-gray-400';
  switch (status) {
    case ConstraintStatus.Complete:
    case ConstraintStatus.OnSite:
      color = 'bg-green-500';
      break;
    case ConstraintStatus.Overdue:
      color = 'bg-red-500';
      break;
    case ConstraintStatus.Pending:
      color = 'bg-yellow-500';
      break;
  }
  return <span className={`w-3 h-3 rounded-full ${color}`}></span>;
};

const getStatusClasses = (status: ConstraintStatus): { text: string; bg: string; } => {
  switch (status) {
    case ConstraintStatus.Complete:
    case ConstraintStatus.OnSite:
      return { text: 'text-green-800', bg: 'bg-green-100' };
    case ConstraintStatus.Overdue:
      return { text: 'text-red-800', bg: 'bg-red-100' };
    case ConstraintStatus.Pending:
      return { text: 'text-yellow-800', bg: 'bg-yellow-100' };
    default:
      return { text: 'text-gray-800', bg: 'bg-gray-100' };
  }
};

const getOverallStatusInfo = (constraints: Constraint[]): { label: string; dotColor: string; textColor: string } => {
  if (constraints.some(c => c.status === ConstraintStatus.Overdue || c.severity === 'Blocking')) {
    return { label: 'Blocked', dotColor: 'bg-red-500', textColor: 'text-red-700' };
  }
  if (constraints.some(c => c.status === ConstraintStatus.Pending)) {
    return { label: 'At Risk', dotColor: 'bg-yellow-500', textColor: 'text-yellow-700' };
  }
  return { label: 'Ready', dotColor: 'bg-green-500', textColor: 'text-green-700' };
};


const AddConstraintForm: React.FC<{ onAdd: (constraint: Constraint) => void, onCancel: () => void }> = ({ onAdd, onCancel }) => {
    const [type, setType] = useState<ConstraintType>(ConstraintType.Material);
    const [severity, setSeverity] = useState<'Blocking' | 'Warning'>('Warning');
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (!description.trim()) return;
        const newConstraint: Constraint = {
            type,
            name: description,
            status: severity === 'Blocking' ? ConstraintStatus.Overdue : ConstraintStatus.Pending,
            severity,
            flaggedBy: 'GC Super', // Mocked user
            timestamp: new Date().toLocaleString(),
        };
        onAdd(newConstraint);
    };

    return (
        <div className="p-4 my-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Flag New Constraint</h4>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <select value={type} onChange={e => setType(e.target.value as ConstraintType)} className="form-select w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white">
                        {Object.values(ConstraintType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={severity} onChange={e => setSeverity(e.target.value as 'Blocking' | 'Warning')} className="form-select w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white">
                        <option value="Warning">Warning</option>
                        <option value="Blocking">Blocking</option>
                    </select>
                </div>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description (e.g., Material delivery delayed)"
                    className="form-textarea w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                />
            </div>
            <div className="flex justify-end gap-2 mt-3">
                <button onClick={onCancel} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} className="px-3 py-1 text-sm font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700 disabled:opacity-50" disabled={!description.trim()}>Add</button>
            </div>
        </div>
    );
};


const LookaheadDetailsPanel: React.FC<LookaheadDetailsPanelProps> = ({ task, onClose, onAddConstraint, onUpdateProgress }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setIsOpen(!!task);
    setIsAdding(false); // Reset form on new task
  }, [task]);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Allow for transition
  };
  
  const overallStatus = task ? getOverallStatusInfo(task.constraints) : null;

  return (
    <aside
      className={`absolute top-0 right-0 h-full bg-white border-l border-gray-200 z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '400px' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lookahead-details-title"
    >
      {task && overallStatus && (
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="lookahead-details-title" className="text-lg font-semibold text-gray-800 truncate">{task.name}</h2>
            <button onClick={handleClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close details">
              <XIcon className="w-5 h-5" />
            </button>
          </header>
          <div className="flex-grow p-6 overflow-y-auto">

            {/* Summary Section */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Summary</h3>
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                {task.isCriticalPath && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangleIcon className="w-5 h-5" />
                    <span className="font-semibold text-sm">Critical Path Task</span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-500">Outline</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.outline}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Task Code</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.taskCode}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Task Type</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.taskType}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Contractor</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.contractor}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Crew Assigned</div>
                        <div className="font-semibold text-gray-800 text-sm">{task.crewAssigned}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Overall Health</div>
                        <div className={`flex items-center gap-2 font-bold text-lg ${overallStatus.textColor}`}>
                            <span className={`w-3 h-3 rounded-full ${overallStatus.dotColor}`}></span>
                            <span>{overallStatus.label}</span>
                        </div>
                    </div>
                    <div className="col-span-2">
                        <div className="text-xs text-gray-500">Dates</div>
                        <div className="font-semibold text-gray-800 text-sm">{formatDisplayDate(task.startDate)} → {formatDisplayDate(task.finishDate)}</div>
                    </div>
                </div>
                
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task Progress</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-blue-600">{task.progress}%</span>
                            {task.taskType === 'Field Task' && (
                                <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button 
                                        onClick={() => onUpdateProgress?.(task.id, Math.max(0, task.progress - 5))}
                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                                    >
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    <button 
                                        onClick={() => onUpdateProgress?.(task.id, Math.min(100, task.progress + 5))}
                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                                    >
                                        <ChevronUp className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {task.taskType === 'Field Task' && onUpdateProgress ? (
                        <div className="space-y-6 px-2">
                            <div className="relative h-8 flex items-center">
                                <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={task.progress}
                                    onChange={(e) => onUpdateProgress(task.id, parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 z-10"
                                />
                                <div className="absolute inset-0 flex justify-between pointer-events-none translate-y-4">
                                    {[0, 25, 50, 75, 100].map(p => (
                                        <div key={p} className="flex flex-col items-center">
                                            <div className="h-1.5 w-0.5 bg-gray-300 mb-0.5" />
                                            <span className="text-[8px] font-bold text-gray-400">{p}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-2">
                                {[0, 25, 50, 75, 100].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => onUpdateProgress(task.id, p)}
                                        className={`
                                            py-1.5 rounded-lg text-[10px] font-bold transition-all
                                            ${task.progress === p 
                                                ? 'bg-blue-600 text-white shadow-md' 
                                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        {p}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                                className="h-full bg-blue-500"
                            />
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs text-gray-500">Man-Hours Progress</span>
                    </div>
                    <ManHoursBar manHours={task.manHours} />
                </div>
              </div>
            </div>

            {/* Make-Ready Checklist Section */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Make-Ready Checklist</h3>
                <ul className="space-y-3">
                  {task.constraints.length > 0 ? task.constraints.map((constraint, i) => {
                    const statusClasses = getStatusClasses(constraint.status);
                    return (
                        <li key={`${constraint.type}-${constraint.name}-${i}`} className="flex items-start gap-3">
                            <div className="flex-shrink-0 pt-1">{getStatusDot(constraint.status)}</div>
                            <div className="flex-grow">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-gray-800 mr-2">{constraint.type}: {constraint.name}</p>
                                    {constraint.severity === 'Blocking' && (
                                        <AlertTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" title="Blocking constraint" />
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusClasses.bg} ${statusClasses.text}`}>
                                        {constraint.status}
                                    </span>
                                    {constraint.link && <a href={constraint.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>}
                                </div>
                                {constraint.flaggedBy && <p className="text-xs text-gray-400 mt-1">Flagged by {constraint.flaggedBy} on {constraint.timestamp}</p>}
                            </div>
                        </li>
                    )
                  }) : (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">No constraints flagged.</p>
                  )}
                </ul>

                {isAdding ? (
                     <AddConstraintForm onAdd={(c) => { onAddConstraint(task.id, c); setIsAdding(false); }} onCancel={() => setIsAdding(false)} />
                ) : (
                    <button onClick={() => setIsAdding(true)} className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 font-medium p-2 hover:bg-blue-50 rounded-md w-full justify-center border-2 border-dashed border-gray-300 hover:border-blue-300">
                        <PlusIcon className="w-4 h-4" />
                        Flag a Constraint
                    </button>
                )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default LookaheadDetailsPanel;