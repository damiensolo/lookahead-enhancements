
import React from 'react';
import { LookaheadTask, TaskDelta } from '../types';
import { XIcon, PlusIcon, TrashIcon, HistoryIcon } from '../../../common/Icons';

interface DeltasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
  deltas: TaskDelta[];
  tasks: LookaheadTask[];
  oldTasks?: LookaheadTask[];
}

export const DeltasModal: React.FC<DeltasModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  deltas,
  tasks,
  oldTasks = [],
}) => {
  if (!isOpen) return null;

  const getTaskName = (id: string | number) => {
    const find = (items: LookaheadTask[]): string => {
      for (const t of items) {
        if (t.id === id) return t.name;
        if (t.children) {
          const res = find(t.children);
          if (res !== 'Unknown') return res;
        }
      }
      return 'Unknown';
    };
    
    let name = find(tasks);
    if (name === 'Unknown') {
      name = find(oldTasks);
    }
    return name;
  };

  const added = deltas.filter(d => d.type === 'added');
  const modified = deltas.filter(d => d.type === 'modified');
  const removed = deltas.filter(d => d.type === 'removed');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-black/5 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Review Changes</h2>
              <p className="text-sm text-zinc-500 mt-1">Review the deltas before publishing this lookahead.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <XIcon className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {deltas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 italic">No changes detected vs last published version.</p>
            </div>
          ) : (
            <>
              {added.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Added Tasks ({added.length})
                  </h3>
                  <div className="space-y-2">
                    {added.map(d => (
                      <div key={d.taskId} className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-medium text-green-900">{getTaskName(d.taskId)}</span>
                        <span className="text-[10px] font-bold text-green-600 uppercase bg-white px-2 py-0.5 rounded border border-green-200">New</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {modified.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Modified Tasks ({modified.length})
                  </h3>
                  <div className="space-y-2">
                    {modified.map(d => (
                      <div key={d.taskId} className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">{getTaskName(d.taskId)}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {d.changes?.startDate && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zinc-400">Start:</span>
                              <span className="line-through text-zinc-400">{d.changes.startDate.from}</span>
                              <span className="text-blue-600 font-bold">→ {d.changes.startDate.to}</span>
                            </div>
                          )}
                          {d.changes?.finishDate && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zinc-400">End:</span>
                              <span className="line-through text-zinc-400">{d.changes.finishDate.from}</span>
                              <span className="text-blue-600 font-bold">→ {d.changes.finishDate.to}</span>
                            </div>
                          )}
                          {d.changes?.quantity && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zinc-400">Qty:</span>
                              <span className="line-through text-zinc-400">{d.changes.quantity.from}</span>
                              <span className="text-blue-600 font-bold">→ {d.changes.quantity.to}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {removed.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Removed Tasks ({removed.length})
                  </h3>
                  <div className="space-y-2">
                    {removed.map(d => (
                      <div key={d.taskId} className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-medium text-red-900">{getTaskName(d.taskId)}</span>
                        <span className="text-[10px] font-bold text-red-600 uppercase bg-white px-2 py-0.5 rounded border border-red-200">Removed</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-black/5 bg-zinc-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Back to Editing
          </button>
          <button
            onClick={onPublish}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
          >
            Confirm & Publish
          </button>
        </div>
      </div>
    </div>
  );
};
