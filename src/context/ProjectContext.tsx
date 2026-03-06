import React, { createContext, useState, useMemo, useCallback, useContext, SetStateAction, ReactNode } from 'react';
import { MOCK_TASKS } from '../data';
import { Task, View, FilterRule, Priority, ColumnId, Status, DisplayDensity, Column, ViewMode } from '../types';
import { getDefaultTableColumns, getDefaultLookaheadColumns } from '../constants';
import { LookaheadTask, LookaheadSchedule, ScheduleStatus, TaskDelta } from '../components/views/lookahead/types';
import { compareLookaheadTasks } from '../components/views/lookahead/utils/diffUtils';
import { PLANNER_TASKS, MASTER_SCHEDULE_TASKS } from '../components/views/lookahead/constants';
import { parseLookaheadDate, addDays, formatDateISO } from '../lib/dateUtils';

type SortConfig = {
  columnId: ColumnId;
  direction: 'asc' | 'desc';
} | null;

const getDefaultViewConfig = (viewMode: ViewMode): Omit<View, 'id' | 'name'> => {
  return {
    filters: [],
    sort: null,
    displayDensity: 'comfortable' as DisplayDensity,
    showGridLines: false,
    taskStyles: {},
    fontSize: 12,
    type: 'lookahead',
    columns: viewMode === 'lookahead' ? JSON.parse(JSON.stringify(getDefaultLookaheadColumns())) : JSON.parse(JSON.stringify(getDefaultTableColumns())),
  };
};


interface ProjectContextType {
  tasks: Task[];
  setTasks: React.Dispatch<SetStateAction<Task[]>>;
  views: View[];
  setViews: React.Dispatch<SetStateAction<View[]>>;
  activeViewId: string | null;
  handleSelectView: (viewId: string) => void;
  defaultViewId: string;
  setDefaultViewId: React.Dispatch<SetStateAction<string>>;
  activeViewMode: ViewMode;
  handleViewModeChange: (mode: ViewMode) => void;
  selectedTaskIds: Set<number>;
  setSelectedTaskIds: React.Dispatch<SetStateAction<Set<number>>>;
  editingCell: { taskId: number; column: string } | null;
  setEditingCell: React.Dispatch<SetStateAction<{ taskId: number; column: string } | null>>;
  detailedTaskId: number | null;
  setDetailedTaskId: React.Dispatch<SetStateAction<number | null>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<SetStateAction<string>>;
  modalState: { type: 'create' | 'rename'; view?: View } | null;
  setModalState: React.Dispatch<SetStateAction<{ type: 'create' | 'rename'; view?: View } | null>>;
  showFilterMenu: boolean;
  setShowFilterMenu: React.Dispatch<SetStateAction<boolean>>;
  showFieldsMenu: boolean;
  setShowFieldsMenu: React.Dispatch<SetStateAction<boolean>>;
  activeView: View;
  updateView: (updatedView: Partial<Omit<View, 'id' | 'name'>>) => void;
  setFilters: (filters: FilterRule[]) => void;
  setSort: (sort: SortConfig) => void;
  setColumns: (updater: SetStateAction<Column[]>) => void;
  setDisplayDensity: (density: DisplayDensity) => void;
  setShowGridLines: (show: boolean) => void;
  setFontSize: (size: number) => void;
  handleSort: (columnId: ColumnId) => void;
  handleUpdateTask: (taskId: number, updatedValues: Partial<Omit<Task, 'id' | 'children'>>) => void;
  handlePriorityChange: (taskId: number, priority: Priority) => void;
  handleToggle: (taskId: number) => void;
  handleSaveView: (name: string) => void;
  handleDeleteView: (id: string) => void;
  detailedTask: Task | null;
  // Lookahead Schedule State
  schedules: LookaheadSchedule[];
  activeScheduleId: string | null;
  setActiveScheduleId: (id: string | null) => void;
  publishSchedule: (id: string) => void;
  createDraft: (strategy?: 'previous' | 'master', config?: { startDate: string; durationDays: number }) => void;
  updateScheduleTasks: (id: string, tasks: LookaheadTask[]) => void;
  deltas: Record<string, TaskDelta[]>;
  isCreateLookaheadModalOpen: boolean;
  setIsCreateLookaheadModalOpen: (open: boolean) => void;
  isAddTaskModalOpen: boolean;
  setIsAddTaskModalOpen: (open: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [defaultViewId, setDefaultViewId] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('lookahead');
  const [transientView, setTransientView] = useState<View | null>(null);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ taskId: number; column: string } | null>(null);
  const [detailedTaskId, setDetailedTaskId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalState, setModalState] = useState<{ type: 'create' | 'rename'; view?: View } | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showFieldsMenu, setShowFieldsMenu] = useState(false);

  // Lookahead Schedule State
  const [schedules, setSchedules] = useState<LookaheadSchedule[]>([
    {
      id: 'initial-active',
      name: 'Lookahead - Nov 17',
      status: ScheduleStatus.Active,
      tasks: PLANNER_TASKS,
      version: 1,
      publishedAt: new Date('2024-11-17').toISOString(),
    }
  ]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>('initial-active');
  const [deltas, setDeltas] = useState<Record<string, TaskDelta[]>>({});
  const [isCreateLookaheadModalOpen, setIsCreateLookaheadModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  const createDraft = useCallback((strategy: 'previous' | 'master' = 'previous', config?: { startDate: string; durationDays: number }) => {
    const activeSchedule = schedules.find(s => s.status === ScheduleStatus.Active);
    
    let initialTasks: LookaheadTask[] = [];
    const start = config ? new Date(config.startDate) : new Date();
    const end = config ? addDays(start, config.durationDays) : addDays(start, 14);
    
    if (strategy === 'previous') {
      // Strategy 1: Previous Lookahead
      // Persist changes from previous lookahead, then pull in new tasks from master schedule
      const previousTasks = JSON.parse(JSON.stringify(activeSchedule?.tasks || PLANNER_TASKS));
      
      // Filter previous tasks to the new range? Or just keep them?
      // Usually "Create from previous" means keep the tasks but maybe filter by the new window
      const filteredPrevious = previousTasks.filter((t: LookaheadTask) => {
        const taskStart = parseLookaheadDate(t.startDate);
        const taskEnd = parseLookaheadDate(t.finishDate);
        return taskStart >= start && taskEnd <= end;
      });

      const existingIds = new Set(filteredPrevious.map((t: LookaheadTask) => t.id));
      const newFromMaster = MASTER_SCHEDULE_TASKS.filter(t => {
        const taskStart = parseLookaheadDate(t.startDate);
        const taskEnd = parseLookaheadDate(t.finishDate);
        // Overlap check: task starts before window ends AND task ends after window starts
        return !existingIds.has(t.id) && taskStart <= end && taskEnd >= start;
      }).map(t => ({
        ...t,
        masterStartDate: t.startDate,
        masterFinishDate: t.finishDate
      }));
      
      initialTasks = [...filteredPrevious, ...newFromMaster];
    } else {
      // Strategy 2: Master Schedule
      // Pull in tasks from master schedule that overlap with the defined start date and duration
      initialTasks = MASTER_SCHEDULE_TASKS.filter(t => {
        const taskStart = parseLookaheadDate(t.startDate);
        const taskEnd = parseLookaheadDate(t.finishDate);
        // Overlap check: task starts before window ends AND task ends after window starts
        return taskStart <= end && taskEnd >= start;
      }).map(t => ({
        ...t,
        masterStartDate: t.startDate,
        masterFinishDate: t.finishDate
      }));
    }

    const newDraft: LookaheadSchedule = {
      id: `draft-${Date.now()}`,
      name: `Draft Lookahead - ${new Date().toLocaleDateString()}`,
      status: ScheduleStatus.Draft,
      tasks: initialTasks,
      version: (activeSchedule?.version || 0) + 1,
    };
    setSchedules(prev => [...prev, newDraft]);
    setActiveScheduleId(newDraft.id);
  }, [schedules]);

  const publishSchedule = useCallback((id: string) => {
    setSchedules(prev => {
      const draft = prev.find(s => s.id === id);
      if (!draft) return prev;

      // Find the last active or closed schedule for comparison
      const lastPublished = [...prev]
        .filter(s => s.status === ScheduleStatus.Active || s.status === ScheduleStatus.Closed)
        .sort((a, b) => (b.version || 0) - (a.version || 0))[0];

      const newDeltas = lastPublished 
        ? compareLookaheadTasks(lastPublished.tasks, draft.tasks)
        : [];

      setDeltas(current => ({ ...current, [id]: newDeltas }));

      return prev.map(s => {
        if (s.id === id) {
          return { ...s, status: ScheduleStatus.Active, publishedAt: new Date().toISOString() };
        }
        if (s.status === ScheduleStatus.Active) {
          return { ...s, status: ScheduleStatus.Closed };
        }
        return s;
      });
    });
  }, []);

  const updateScheduleTasks = useCallback((id: string, tasks: LookaheadTask[]) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, tasks } : s));
  }, []);
  
  const activeView = useMemo<View>(() => {
    if (activeViewId === null) {
      if (transientView && transientView.type === activeViewMode) {
        return transientView;
      }
      return { id: `transient-${Date.now()}`, name: 'Default View', ...getDefaultViewConfig(activeViewMode) };
    }
    const foundView = views.find(v => v.id === activeViewId);
    if (!foundView) {
        return { id: `transient-fallback-${Date.now()}`, name: 'Default View', ...getDefaultViewConfig(activeViewMode) };
    }
    return foundView;
  }, [views, activeViewId, activeViewMode, transientView]);

  const handleSelectView = (viewId: string) => {
    const selectedView = views.find(v => v.id === viewId);
    if (selectedView) {
      setActiveViewId(selectedView.id);
      setActiveViewMode(selectedView.type);
      setTransientView(null);
    }
    setDetailedTaskId(null);
  };

  const updateView = useCallback((updatedProps: Partial<Omit<View, 'id' | 'name'>>) => {
    if (activeViewId === null) {
      setTransientView(prev => ({ ...(prev ?? activeView), ...updatedProps }));
    } else {
      setViews(prev => prev.map(v => v.id === activeViewId ? { ...v, ...updatedProps } : v));
    }
  }, [activeViewId, activeView]);

  const setFilters = (filters: FilterRule[]) => updateView({ filters });
  const setSort = (sort: SortConfig) => updateView({ sort });
  const setColumns = (updater: SetStateAction<View['columns']>) => {
    const newColumns =
      typeof updater === 'function'
        ? updater(activeView.columns)
        : updater;
    updateView({ columns: newColumns });
  };
  const setDisplayDensity = (density: View['displayDensity']) => updateView({ displayDensity: density });
  const setShowGridLines = (show: boolean) => updateView({ showGridLines: show });
  const setFontSize = (size: number) => updateView({ fontSize: size });

  const handleSort = (columnId: ColumnId) => {
    const newSort: SortConfig = {
        columnId,
        direction: activeView.sort?.columnId === columnId && activeView.sort.direction === 'asc' ? 'desc' : 'asc',
    };
    setSort(newSort);
  };
  
  const handleViewModeChange = (mode: ViewMode) => {
      setActiveViewMode(mode);
      setActiveViewId(null);
      setTransientView({ 
          id: `transient-${Date.now()}`, 
          name: 'Default View', 
          ...getDefaultViewConfig(mode) 
      });
      setDetailedTaskId(null);
  };

  const handleUpdateTask = useCallback((taskId: number, updatedValues: Partial<Omit<Task, 'id' | 'children'>>) => {
      const updateRecursively = (taskItems: Task[]): Task[] => {
          return taskItems.map(task => {
              if (task.id === taskId) {
                  return { ...task, ...updatedValues };
              }
              if (task.children) {
                  return { ...task, children: updateRecursively(task.children) };
              }
              return task;
          });
      };
      setTasks(prev => updateRecursively(prev));
  }, []);

  const handlePriorityChange = useCallback((taskId: number, priority: Priority) => {
    handleUpdateTask(taskId, { priority });
  }, [handleUpdateTask]);

  const handleToggle = useCallback((taskId: number) => {
      const toggleRecursively = (taskItems: Task[]): Task[] => {
          return taskItems.map(task => {
              if (task.id === taskId) {
                  return { ...task, isExpanded: !task.isExpanded };
              }
              if (task.children) {
                  return { ...task, children: toggleRecursively(task.children) };
              }
              return task;
          });
      };
      setTasks(prev => toggleRecursively(prev));
  }, []);

  const handleSaveView = (name: string) => {
    if (modalState?.type === 'rename' && modalState.view) {
        setViews(views.map(v => v.id === modalState.view!.id ? { ...v, name } : v));
    } else {
        const newView: View = {
             ...activeView,
             id: `view_${Date.now()}`,
             name,
        };
        const newViews = [...views, newView];
        setViews(newViews);
        setActiveViewId(newView.id);
        setTransientView(null);

        if (newViews.length === 1) {
            setDefaultViewId(newView.id);
        }
    }
    setModalState(null);
  };
  
  const handleDeleteView = (id: string) => {
    const viewToDelete = views.find(v => v.id === id);
    if (!viewToDelete) return;

    const newViews = views.filter(v => v.id !== id);
    setViews(newViews);

    if (defaultViewId === id) {
        setDefaultViewId(newViews.length > 0 ? newViews[0].id : '');
    }

    if (activeViewId === id) {
        const nextViewInMode = newViews.find(v => v.type === viewToDelete.type);
        if (nextViewInMode) {
            setActiveViewId(nextViewInMode.id);
        } else {
            setActiveViewId(null);
            setActiveViewMode(viewToDelete.type);
            setTransientView({ id: `transient-${Date.now()}`, name: `Default ${viewToDelete.type}`, ...getDefaultViewConfig(viewToDelete.type) });
        }
    }
  };

  const detailedTask = useMemo(() => {
    if (!detailedTaskId) return null;
    const findTask = (items: Task[]): Task | null => {
        for (const item of items) {
            if (item.id === detailedTaskId) return item;
            if (item.children) {
                const found = findTask(item.children);
                if (found) return found;
            }
        }
        return null;
    }
    return findTask(tasks);
  }, [tasks, detailedTaskId]);

  const value: ProjectContextType = {
    tasks, setTasks,
    views, setViews,
    activeViewId,
    handleSelectView,
    defaultViewId, setDefaultViewId,
    activeViewMode, handleViewModeChange,
    selectedTaskIds, setSelectedTaskIds,
    editingCell, setEditingCell,
    detailedTaskId, setDetailedTaskId,
    searchTerm, setSearchTerm,
    modalState, setModalState,
    showFilterMenu, setShowFilterMenu,
    showFieldsMenu, setShowFieldsMenu,
    activeView,
    updateView,
    setFilters,
    setSort,
    setColumns,
    setDisplayDensity,
    setShowGridLines,
    setFontSize,
    handleSort,
    handleUpdateTask,
    handlePriorityChange,
    handleToggle,
    handleSaveView,
    handleDeleteView,
    detailedTask,
    schedules,
    activeScheduleId,
    setActiveScheduleId,
    publishSchedule,
    createDraft,
    updateScheduleTasks,
    deltas,
    isCreateLookaheadModalOpen,
    setIsCreateLookaheadModalOpen,
    isAddTaskModalOpen,
    setIsAddTaskModalOpen,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};