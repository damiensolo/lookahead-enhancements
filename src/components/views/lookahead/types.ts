export enum ConstraintType {
  Predecessor = 'Predecessor',
  RFI = 'RFI',
  Submittal = 'Submittal',
  Material = 'Material',
}

export enum ConstraintStatus {
  Complete = 'Complete',
  Pending = 'Pending Review',
  Overdue = 'Overdue',
  OnSite = 'On Site',
}

export interface Constraint {
  type: ConstraintType;
  name: string;
  status: ConstraintStatus;
  severity: 'Blocking' | 'Warning';
  link?: string;
  flaggedBy?: string;
  timestamp?: string;
}

export interface ManHours {
  actual: number;
  budget: number;
}

export interface LookaheadStatus {
  [ConstraintType.Predecessor]: ConstraintStatus;
  [ConstraintType.RFI]: ConstraintStatus;
  [ConstraintType.Submittal]: ConstraintStatus;
  [ConstraintType.Material]: ConstraintStatus;
}

export interface WeatherForecast {
    date: string; // YYYY-MM-DD
    icon: 'sun' | 'cloud' | 'rain';
    temp: number;
}

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  quantity: { plan: number; actual: number; unit: string };
  hours: { plan: number; actual: number };
  crew: { plan: number; actual: number };
}

export interface LookaheadTask {
  id: string | number;
  sNo: number;
  outline: string;
  name: string;
  taskCode: string;
  taskType: string;
  contractor: string;
  location: string;
  progress: number;
  crewAssigned: number;
  startDate: string; // Plan Start
  finishDate: string; // Plan End
  masterStartDate?: string;
  masterFinishDate?: string;
  status: LookaheadStatus;
  constraints: Constraint[];
  manHours: ManHours;
  children?: LookaheadTask[];
  isExpanded?: boolean;
  isShared?: boolean;
  isCriticalPath?: boolean;
  slack?: number; // Net slack in days
  ppcHistory?: number[];
  dailyMetrics?: DailyMetric[];
}

export enum ScheduleStatus {
  Draft = 'Draft',
  Active = 'Active',
  Closed = 'Closed',
}

export interface LookaheadSchedule {
  id: string;
  name: string;
  status: ScheduleStatus;
  tasks: LookaheadTask[];
  publishedAt?: string;
  version: number;
}

export interface TaskDelta {
  taskId: string | number;
  type: 'added' | 'modified' | 'removed';
  changes?: {
    startDate?: { from: string; to: string };
    finishDate?: { from: string; to: string };
    quantity?: { from: number; to: number };
  };
}
