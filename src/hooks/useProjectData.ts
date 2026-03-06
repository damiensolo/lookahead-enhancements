
import { useMemo } from 'react';
import { Task, View } from '../types';

export const useProjectData = (tasks: Task[], activeView: View, searchTerm: string) => {

  const filteredTasks = useMemo(() => {
    const filterNode = (task: Task): Task | null => {
        let children: Task[] = [];
        if (task.children) {
            children = task.children.map(filterNode).filter(Boolean) as Task[];
        }

        const matchSearch = !searchTerm || task.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchFilters = activeView.filters.every(rule => {
            const value = (task as any)[rule.columnId];
            if (value === undefined || value === null) {
                return rule.operator === 'is_empty';
            }
            switch (rule.operator) {
                case 'contains':
                    return String(value).toLowerCase().includes(String(rule.value).toLowerCase());
                case 'not_contains':
                    return !String(value).toLowerCase().includes(String(rule.value).toLowerCase());
                case 'is':
                    return String(value) === String(rule.value);
                case 'is_not':
                    return String(value) !== String(rule.value);
                case 'is_empty':
                    return value === undefined || value === null || String(value).trim() === '';
                case 'is_not_empty':
                    return value !== undefined && value !== null && String(value).trim() !== '';
                case 'is_any_of':
                    return Array.isArray(rule.value) && rule.value.includes(String(value));
                case 'is_none_of':
                    return Array.isArray(rule.value) && !rule.value.includes(String(value));
                default:
                    return true;
            }
        });

        if ((matchSearch && matchFilters) || children.length > 0) {
            return { ...task, children };
        }
        return null;
    };
    return tasks.map(filterNode).filter(Boolean) as Task[];
  }, [tasks, activeView.filters, searchTerm]);

  const sortedTasks = useMemo(() => {
    const { sort } = activeView;
    if (!sort) return filteredTasks;
    
    const sortRecursively = (taskArray: Task[]): Task[] => {
      const sorted = [...taskArray].sort((a, b) => {
        const valA = (a as any)[sort.columnId];
        const valB = (b as any)[sort.columnId];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
      
      return sorted.map(task => {
        if (task.children && task.children.length > 0) {
          return { ...task, children: sortRecursively(task.children) };
        }
        return task;
      });
    };
    
    return sortRecursively(filteredTasks);
  }, [filteredTasks, activeView.sort]);

  const { visibleTaskIds, rowNumberMap } = useMemo(() => {
    const ids: number[] = [];
    const map = new Map<number, number>();
    
    // First pass: assign row numbers to ALL filtered tasks (stable numbering)
    let rowCounter = 1;
    const assignRowNumbers = (items: Task[]) => {
        items.forEach(task => {
            map.set(task.id, rowCounter++);
            if (task.children) {
                assignRowNumbers(task.children);
            }
        });
    };
    assignRowNumbers(sortedTasks);

    // Second pass: determine which tasks are currently visible (respecting expansion)
    const determineVisible = (items: Task[]) => {
        items.forEach(task => {
            ids.push(task.id);
            if (task.isExpanded && task.children) {
                determineVisible(task.children);
            }
        });
    };
    determineVisible(sortedTasks);

    return { visibleTaskIds: ids, rowNumberMap: map };
  }, [sortedTasks]);

  return { sortedTasks, visibleTaskIds, rowNumberMap };
};
