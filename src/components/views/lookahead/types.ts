export const CONTRACTORS = [
  'ABC Concrete',
  'XYZ Electrical',
  'Master Plumbing',
  'Steel Structures Inc.',
  'Finish Carpentry Ltd.',
  'Global HVAC',
  'Precision Drywall',
  'Apex Roofing',
  'Titan Earthworks',
  'Modern Glazing',
];

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

/** Production quantities: planned (locked after first actual), daily plan/actual.
 * Rules: GC can set planned; SC inherits. If GC doesn't set, SC can enter once when task starts.
 * Planned is locked as soon as the first actual quantity is recorded.
 * Actual cannot exceed planned (enforced in UI/update); entered via Close Day in production.
 */
export interface ProductionQuantity {
  planned: number;
  plannedLocked: boolean;    // Locked after first actual entered
  unit: string;              // e.g. "CY", "LF", "SF"
  dailyMetrics: DailyMetric[];
}

/** Crew member assigned to project; can be assigned to tasks on specific days */
export interface CrewMember {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  companyId?: string; // matches task.contractor when filtering by company
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
  fieldStartDate?: string;
  fieldFinishDate?: string;
  masterStartDate?: string;
  masterFinishDate?: string;
  /** Task-level commitment workflow (used when schedule is In Review) */
  commitmentStatus?: TaskCommitmentStatus;
  adjustmentProposal?: TaskAdjustmentProposal;
  status: LookaheadStatus;
  constraints: Constraint[];
  manHours: ManHours;
  /** Production quantities and daily tracking (planned, daily plan, actual) */
  productionQuantity?: ProductionQuantity;
  children?: LookaheadTask[];
  isExpanded?: boolean;
  isShared?: boolean;
  isCriticalPath?: boolean;
  slack?: number; // Net slack in days
  ppcHistory?: number[];
  /** @deprecated Use productionQuantity.dailyMetrics - kept for migration */
  dailyMetrics?: DailyMetric[];
  /** Assigned crew member IDs per date (YYYY-MM-DD); used for Active schedules */
  assignedCrewByDate?: Record<string, string[]>;
}

export enum ScheduleStatus {
  Draft = 'Draft',
  InReview = 'In Review',
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
  /** Lookahead period start (YYYY-MM-DD); when set, timeline is limited to this range */
  periodStartDate?: string;
  /** Lookahead period length in days; when set with periodStartDate, timeline shows exactly this many days */
  periodDurationDays?: number;
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

/** Commitment status for SC net-new tasks (prototype: in-memory only). */
export type CommitmentStatus = 'pending' | 'committed' | 'proposed' | 'rejected';

export interface CommitmentState {
  status: CommitmentStatus;
  proposedStartDate?: string;
  proposedFinishDate?: string;
  rejectionReason?: string;
  rejectionComment?: string;
  committedAt?: string;
  rejectedAt?: string;
  plannedQtyAccepted?: boolean;
  crewAdded?: boolean;
  equipmentMaterialVerified?: boolean;
}

export interface ProjectRisk {
  taskId: string | number;
  taskName: string;
  reason: string;
  addedAt: string;
}

export type TaskCommitmentStatus =
  | 'pending'
  | 'committed'
  | 'rejected'
  | 'adjustment_proposed'
  | 'gc_accepted'
  | 'gc_revised'
  | 'disputed';

export type AdjustmentActor = 'gc' | 'sub';

export interface AdjustmentHistoryEntry {
  at: string; // ISO
  actor: AdjustmentActor;
  status: TaskCommitmentStatus;
  summary?: string;
  proposal?: Omit<TaskAdjustmentProposal, 'history'>;
}

export interface TaskAdjustmentProposal {
  proposedStartDate?: string; // YYYY-MM-DD
  proposedEndDate?: string; // YYYY-MM-DD
  proposedDuration?: number; // days
  proposedCrewSize?: number;
  proposedMaterialNotes?: string;
  rejectionReason?: string;
  subNotes?: string;
  gcResponseNotes?: string;
  history: AdjustmentHistoryEntry[];
}
