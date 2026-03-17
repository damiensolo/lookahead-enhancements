import { LookaheadTask, TaskDelta } from '../types';
import { getTotalPlannedQuantity } from './quantityUtils';

/**
 * Calculates the total planned quantity for a task.
 * @deprecated Use getTotalPlannedQuantity from quantityUtils
 */
export const calculateTotalPlannedQuantity = (task: LookaheadTask): number =>
  getTotalPlannedQuantity(task);

/**
 * Compares two sets of lookahead tasks and returns the differences (deltas).
 * Tracks added tasks, date shifts, and quantity changes.
 */
export const compareLookaheadTasks = (
  oldTasks: LookaheadTask[],
  newTasks: LookaheadTask[]
): TaskDelta[] => {
  const deltas: TaskDelta[] = [];
  
  const oldTaskMap = new Map<string | number, LookaheadTask>();
  const flattenOld = (tasks: LookaheadTask[]) => {
    tasks.forEach(t => {
      oldTaskMap.set(t.id, t);
      if (t.children) flattenOld(t.children);
    });
  };
  flattenOld(oldTasks);

  const newTaskMap = new Map<string | number, LookaheadTask>();
  const flattenNew = (tasks: LookaheadTask[]) => {
    tasks.forEach(t => {
      newTaskMap.set(t.id, t);
      
      const oldTask = oldTaskMap.get(t.id);
      if (!oldTask) {
        deltas.push({ taskId: t.id, type: 'added' });
      } else {
        const changes: NonNullable<TaskDelta['changes']> = {};
        let hasChanges = false;

        if (oldTask.startDate !== t.startDate) {
          changes.startDate = { from: oldTask.startDate, to: t.startDate };
          hasChanges = true;
        }
        if (oldTask.finishDate !== t.finishDate) {
          changes.finishDate = { from: oldTask.finishDate, to: t.finishDate };
          hasChanges = true;
        }

        const oldQty = calculateTotalPlannedQuantity(oldTask);
        const newQty = calculateTotalPlannedQuantity(t);
        if (oldQty !== newQty) {
          changes.quantity = { from: oldQty, to: newQty };
          hasChanges = true;
        }

        if (hasChanges) {
          deltas.push({ taskId: t.id, type: 'modified', changes });
        }
      }

      if (t.children) flattenNew(t.children);
    });
  };
  flattenNew(newTasks);

  // Check for removed tasks
  oldTaskMap.forEach((_, id) => {
    if (!newTaskMap.has(id)) {
      deltas.push({ taskId: id, type: 'removed' });
    }
  });

  return deltas;
};
