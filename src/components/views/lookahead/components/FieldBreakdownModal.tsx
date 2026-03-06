
import React, { useState, useEffect } from 'react';
import { LookaheadTask, ConstraintStatus, ConstraintType } from '../types';
import { XIcon, PlusIcon, TrashIcon, ScissorsIcon } from '../../../common/Icons';

interface FieldBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentTask: LookaheadTask | null;
  onSave: (taskId: string | number, subTasks: Partial<LookaheadTask>[]) => void;
}

export const FieldBreakdownModal: React.FC<FieldBreakdownModalProps> = ({
  isOpen,
  onClose,
  parentTask,
  onSave,
}) => {
  const [subTasks, setSubTasks] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isOpen && parentTask) {
      if (parentTask.children && parentTask.children.length > 0) {
        setSubTasks(parentTask.children.map(child => ({ 
          id: child.id.toString(), 
          name: child.name 
        })));
      } else {
        // Default empty state or some initial chunks
        setSubTasks([{ id: Date.now().toString(), name: '' }]);
      }
    }
  }, [isOpen, parentTask]);

  if (!isOpen || !parentTask) return null;

  const addSubTask = () => {
    setSubTasks([...subTasks, { id: Date.now().toString(), name: '' }]);
  };

  const removeSubTask = (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id));
  };

  const updateSubTaskName = (id: string, name: string) => {
    setSubTasks(subTasks.map(st => st.id === id ? { ...st, name } : st));
  };

  const handleSave = () => {
    const validSubTasks = subTasks.filter(st => st.name.trim() !== '');
    onSave(parentTask.id, validSubTasks.map((st, index) => ({
      id: `fb-${parentTask.id}-${index}-${Date.now()}`,
      sNo: index + 1,
      name: st.name,
      outline: `${parentTask.outline}.${index + 1}`,
      taskCode: `${parentTask.taskCode}-FB${index + 1}`,
      taskType: 'Field Task',
      contractor: parentTask.contractor,
      location: parentTask.location,
      progress: 0,
      crewAssigned: 0,
      startDate: parentTask.startDate,
      finishDate: parentTask.finishDate,
      masterStartDate: parentTask.startDate,
      masterFinishDate: parentTask.finishDate,
      status: {
        [ConstraintType.Predecessor]: ConstraintStatus.Complete,
        [ConstraintType.RFI]: ConstraintStatus.Complete,
        [ConstraintType.Submittal]: ConstraintStatus.Complete,
        [ConstraintType.Material]: ConstraintStatus.Complete,
      },
      constraints: [],
      manHours: { actual: 0, budget: 0 },
    })));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-black/5 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <ScissorsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Field Breakdown (FB)</h2>
              <p className="text-sm text-zinc-500 mt-1">Break down "{parentTask.name}" into manageable chunks.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <XIcon className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {subTasks.map((st, index) => (
              <div key={st.id} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                <div className="flex-shrink-0 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-500">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={st.name}
                  onChange={(e) => updateSubTaskName(st.id, e.target.value)}
                  placeholder="e.g., Set formwork, Pour, Cure time..."
                  className="flex-grow px-4 py-2 bg-white border border-black/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  onClick={() => removeSubTask(st.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={subTasks.length === 1}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSubTask}
            className="mt-6 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add another chunk
          </button>
        </div>

        <div className="p-6 border-t border-black/5 bg-zinc-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 shadow-lg shadow-black/10 transition-all"
          >
            Save Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
