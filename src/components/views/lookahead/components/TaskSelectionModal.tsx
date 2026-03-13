import React, { useState } from 'react';
import { LookaheadTask, ConstraintType, ConstraintStatus } from '../types';
import { EnhancedTaskSelectionRow } from './EnhancedTaskSelectionRow';
import { XIcon, SearchIcon, ClipboardIcon, AlertTriangleIcon } from '../../../common/Icons';

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTasks: LookaheadTask[]) => void;
  availableTasks: LookaheadTask[];
}

export const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableTasks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string | number>>(new Set());

  if (!isOpen) return null;

  const filteredTasks = availableTasks.filter(task => 
    task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.contractor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTask = (task: LookaheadTask) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(task.id)) {
      newSelected.delete(task.id);
    } else {
      newSelected.add(task.id);
    }
    setSelectedTasks(newSelected);
  };

  const handleConfirm = () => {
    const tasksToConfirm = availableTasks.filter(t => selectedTasks.has(t.id));
    onConfirm(tasksToConfirm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Add Tasks to Lookahead</h2>
            <p className="text-sm text-zinc-500">Select tasks from the master schedule to pull into your draft.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <XIcon className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Search & Legend */}
        <div className="p-4 bg-zinc-50 border-b border-black/5 space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tasks by name or contractor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-black/10 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Legend / Critical Info */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
            <div className="flex items-center gap-2 group cursor-help">
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold uppercase tracking-wider border border-red-200">CP</span>
              <span className="text-[11px] font-medium text-zinc-500">Critical Path</span>
              <div className="hidden group-hover:block absolute bg-zinc-900 text-white text-[10px] p-2 rounded shadow-xl z-[60] max-w-[200px] mt-12">
                Tasks that must finish on time for the project to finish on time.
              </div>
            </div>

            <div className="flex items-center gap-2 group cursor-help">
              <div className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold border border-blue-100">Slack: 5d</div>
              <span className="text-[11px] font-medium text-zinc-500">Net Slack</span>
              <div className="hidden group-hover:block absolute bg-zinc-900 text-white text-[10px] p-2 rounded shadow-xl z-[60] max-w-[200px] mt-12">
                The amount of time a task can be delayed without delaying the project.
              </div>
            </div>

            <div className="flex items-center gap-2 group cursor-help">
              <div className="flex items-center gap-1">
                <ClipboardIcon className="w-3.5 h-3.5 text-amber-500" />
                <AlertTriangleIcon className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="text-[11px] font-medium text-zinc-500">Risk Warning</span>
              <div className="hidden group-hover:block absolute bg-zinc-900 text-white text-[10px] p-2 rounded shadow-xl z-[60] max-w-[200px] mt-12">
                Unanswered RFIs or Submittals that may delay task start.
              </div>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <EnhancedTaskSelectionRow
                key={task.id}
                task={task}
                isSelected={selectedTasks.has(task.id)}
                onSelect={toggleTask}
              />
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-zinc-400 text-sm">No tasks found matching your search.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-black/5 bg-zinc-50 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-black/5 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedTasks.size === 0}
              className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 transition-all"
            >
              Add Selected Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
