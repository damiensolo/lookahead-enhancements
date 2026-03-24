export enum Status {
  New = 'New',
  Planned = 'Planned',
  InProgress = 'In Progress',
  InReview = 'In Review',
  Completed = 'Completed',
}

export enum Priority {
  Urgent = 'Urgent',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  None = 'None',
}

export enum Impact {
    High = 'High',
    Medium = 'Medium',
    Low = 'Low',
}

export interface Assignee {
  id: number;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface Progress {
    percentage: number;
    history?: number[];
}

export interface HealthItem {
    name: string;
    status: 'complete' | 'at_risk' | 'blocked';
    details: string;
}

export interface TaskStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

export interface Task {
  id: number;
  name: string;
  status: Status;
  assignees: Assignee[];
  startDate: string; // DD/MM/YYYY
  dueDate: string; // DD/MM/YYYY
  isExpanded?: boolean;
  children?: Task[];
  priority?: Priority;
  impact?: Impact;
  progress?: Progress;
  health?: HealthItem[];
  style?: TaskStyle;
}

export type ColumnId = string;

export interface Column {
  id: ColumnId;
  label: string;
  width?: string;
  visible: boolean;
  minWidth?: number;
  /** If false, column cannot be hidden from view settings (e.g. lookahead # column). */
  hideable?: boolean;
}

export type DisplayDensity = 'compact' | 'standard' | 'comfortable';

export type FilterOperator = 'contains' | 'not_contains' | 'is' | 'is_not' | 'is_empty' | 'is_not_empty' | 'is_any_of' | 'is_none_of';

export interface FilterRule {
    id: string;
    columnId: ColumnId;
    operator: FilterOperator;
    value?: string | string[];
}

export type ViewMode = 'lookahead' | 'production' | 'kanban';

export interface View {
  id: string;
  name: string;
  type: ViewMode;
  filters: FilterRule[];
  sort: { columnId: ColumnId; direction: 'asc' | 'desc' } | null;
  columns: Column[];
  displayDensity: DisplayDensity;
  showGridLines: boolean;
  showMasterRange: boolean;
  taskStyles?: { [taskId: number]: TaskStyle };
  fontSize: number;
}