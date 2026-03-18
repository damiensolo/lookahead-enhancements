export type DemoLookaheadStatus = 'draft' | 'in_review' | 'active' | 'closed';

export type DemoCommitmentStatus =
  | 'pending'
  | 'committed'
  | 'rejected'
  | 'adjustment_proposed'
  | 'gc_accepted'
  | 'gc_revised'
  | 'disputed';

export type DemoRole = 'gc' | 'apex-electrical' | 'blueline-mechanical';

export interface AdjustmentProposal {
  proposedStartDate?: string;
  proposedEndDate?: string;
  proposedDuration?: number;
  proposedCrewSize?: number;
  proposedMaterialNotes?: string;
  rejectionReason?: string;
  subNotes?: string;
  gcResponseNotes?: string;
}

export interface AdjustmentHistoryEntry {
  at: string;
  actor: 'gc' | 'sub';
  status: DemoCommitmentStatus;
  summary: string;
  proposalSnapshot?: AdjustmentProposal;
}

export interface DemoTask {
  id: string;
  name: string;
  assignedTo: 'apex-electrical' | 'blueline-mechanical';
  phase: string;
  location: string;
  proposedStart: string;
  proposedEnd: string;
  duration: number;
  crewSize: number;
  materials: string;
  gcNotes: string;
  commitmentStatus: DemoCommitmentStatus;
  adjustmentProposal?: AdjustmentProposal;
  history?: AdjustmentHistoryEntry[];
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: DemoRole;
  type:
    | 'gc_submit_for_review'
    | 'gc_pull_back_to_draft'
    | 'gc_publish'
    | 'sub_committed'
    | 'sub_rejected'
    | 'sub_adjustment_proposed'
    | 'gc_accepted_adjustment'
    | 'gc_counter_proposed'
    | 'gc_marked_disputed';
  taskId?: string;
  message: string;
}

export const DEMO_PROJECT = {
  id: 'meridian-office-tower-phase-2',
  name: 'Meridian Office Tower — Phase 2 Interior Fit-Out',
  shortName: 'Meridian Office Tower — Phase 2',
  gcName: 'Cornerstone General Contracting',
};

export const DEMO_LOOKAHEAD_WINDOW = {
  label: 'Apr 7 – Apr 18, 2025',
  startDateISO: '2025-04-07',
  endDateISO: '2025-04-18',
};

export const DEMO_SUBS = {
  'apex-electrical': {
    id: 'apex-electrical' as const,
    name: 'Apex Electrical Solutions',
  },
  'blueline-mechanical': {
    id: 'blueline-mechanical' as const,
    name: 'BlueLine Mechanical',
  },
};

export const DEMO_TASKS: DemoTask[] = [
  {
    id: 'task-1',
    name: 'Rough-in Electrical — Floors 4 & 5',
    assignedTo: 'apex-electrical',
    phase: 'Electrical',
    location: 'Floors 4–5, East Wing',
    proposedStart: 'Apr 7',
    proposedEnd: 'Apr 10',
    duration: 4,
    crewSize: 6,
    materials: 'Conduit, pull wire, junction boxes per spec sheet E-204',
    gcNotes: 'Must complete before drywall crew mobilizes Apr 11',
    commitmentStatus: 'pending',
  },
  {
    id: 'task-2',
    name: 'Panel Installation — Level 3 Electrical Room',
    assignedTo: 'apex-electrical',
    phase: 'Electrical',
    location: 'Level 3, Room 312',
    proposedStart: 'Apr 9',
    proposedEnd: 'Apr 11',
    duration: 3,
    crewSize: 4,
    materials: '400A panel, breakers per schedule, grounding kit',
    gcNotes: 'Room will be cleared and ready Apr 8 EOD',
    commitmentStatus: 'pending',
  },
  {
    id: 'task-3',
    name: 'Device & Cover Plate Finish — Floors 2 & 3',
    assignedTo: 'apex-electrical',
    phase: 'Electrical',
    location: 'Floors 2–3',
    proposedStart: 'Apr 14',
    proposedEnd: 'Apr 16',
    duration: 3,
    crewSize: 3,
    materials: 'Devices, cover plates, wall plates per finish schedule',
    gcNotes: 'Coordinate with painting — painting completes Apr 13',
    commitmentStatus: 'pending',
  },
  {
    id: 'task-4',
    name: 'HVAC Ductwork Rough-in — Floor 5',
    assignedTo: 'blueline-mechanical',
    phase: 'Mechanical',
    location: 'Floor 5, Full Floor',
    proposedStart: 'Apr 7',
    proposedEnd: 'Apr 11',
    duration: 5,
    crewSize: 5,
    materials: 'Rectangular duct, hangers, VAV boxes per M-305',
    gcNotes: 'Coordinate with electrical rough-in — shared ceiling zone',
    commitmentStatus: 'pending',
  },
  {
    id: 'task-5',
    name: 'Plumbing Rough-in — Floor 4 Core Bathrooms',
    assignedTo: 'blueline-mechanical',
    phase: 'Mechanical',
    location: 'Floor 4, Core',
    proposedStart: 'Apr 8',
    proposedEnd: 'Apr 12',
    duration: 5,
    crewSize: 4,
    materials: 'PVC waste lines, copper supply, p-traps per P-102',
    gcNotes: 'Inspection scheduled Apr 14 — must be ready',
    commitmentStatus: 'pending',
  },
  {
    id: 'task-6',
    name: 'Mechanical Equipment Startup — Roof RTUs',
    assignedTo: 'blueline-mechanical',
    phase: 'Mechanical',
    location: 'Roof Level',
    proposedStart: 'Apr 15',
    proposedEnd: 'Apr 17',
    duration: 3,
    crewSize: 3,
    materials: 'Commissioning tools, refrigerant, startup checklist',
    gcNotes: 'Crane access confirmed Apr 15 AM',
    commitmentStatus: 'pending',
  },
  {
    id: 'task-7',
    name: 'Low Voltage — Data & Security Cabling Floors 2–3',
    assignedTo: 'apex-electrical',
    phase: 'Low Voltage',
    location: 'Floors 2–3',
    proposedStart: 'Apr 10',
    proposedEnd: 'Apr 14',
    duration: 5,
    crewSize: 4,
    materials: 'Cat6A, fiber patch panels, security cameras per IT spec',
    gcNotes: 'Owner IT rep walking floor Apr 15 — want this complete',
    commitmentStatus: 'pending',
  },
  {
    id: 'task-8',
    name: 'Balancing & TAB — Floors 3, 4, 5',
    assignedTo: 'blueline-mechanical',
    phase: 'Mechanical',
    location: 'Floors 3–5',
    proposedStart: 'Apr 16',
    proposedEnd: 'Apr 18',
    duration: 3,
    crewSize: 2,
    materials: 'TAB instruments, airflow hoods, balancing report template',
    gcNotes: 'Final TAB report needed for owner closeout package',
    commitmentStatus: 'pending',
  },
];

export const cloneDemoTasks = (): DemoTask[] =>
  DEMO_TASKS.map((t) => ({
    ...t,
    adjustmentProposal: t.adjustmentProposal ? { ...t.adjustmentProposal } : undefined,
    history: t.history ? [...t.history] : [],
  }));

export const getSubDisplayName = (id: 'apex-electrical' | 'blueline-mechanical'): string =>
  DEMO_SUBS[id]?.name ?? id;

