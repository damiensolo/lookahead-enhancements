/**
 * /demo/commitment-status
 *
 * Isolated page that displays every TaskCommitmentStatus value as it
 * appears in the real LookaheadView (In Review mode).
 *
 * Zero dependency on ProjectContext / PersonaContext / schedules —
 * everything is hardcoded here.
 */
import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommitmentStatus =
  | 'pending'
  | 'committed'
  | 'rejected'
  | 'adjustment_proposed'
  | 'gc_accepted'
  | 'gc_revised'
  | 'disputed';

interface AdjustmentProposal {
  proposedStartDate?: string;
  proposedEndDate?: string;
  proposedCrewSize?: number;
  rejectionReason?: string;
  subNotes?: string;
  gcResponseNotes?: string;
}

interface DemoRow {
  id: string;
  name: string;
  contractor: string;
  taskCode: string;
  location: string;
  startDate: string;
  finishDate: string;
  crewAssigned: number;
  commitmentStatus: CommitmentStatus;
  adjustmentProposal?: AdjustmentProposal;
  description: string;     // plain-English explanation of this state
  gcCanAct: boolean;       // whether GC badge is clickable in the real app
}

// ─── Badge meta (mirrors commitmentMeta() in LookaheadView.tsx) ───────────────

const commitmentMeta = (status: CommitmentStatus) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending',      classes: 'bg-gray-50 text-gray-700 border-gray-200' };
    case 'committed':
      return { label: 'Committed',    classes: 'bg-green-50 text-green-700 border-green-200' };
    case 'rejected':
      return { label: 'Rejected',     classes: 'bg-red-50 text-red-700 border-red-200' };
    case 'adjustment_proposed':
      return { label: 'New Proposal', classes: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'gc_accepted':
      return { label: 'GC accepted',  classes: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'gc_revised':
      return { label: 'GC revised',   classes: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'disputed':
      return { label: 'Disputed',     classes: 'bg-orange-50 text-orange-800 border-orange-200' };
  }
};

const elevated = (s: CommitmentStatus) =>
  s === 'rejected' || s === 'adjustment_proposed' || s === 'disputed';

// ─── Hardcoded demo rows — one per status ─────────────────────────────────────

const ROWS: DemoRow[] = [
  {
    id: 'r1',
    name: 'Pave Access Roads',
    contractor: 'Martinez DevelopmentS',
    taskCode: '32 13 00',
    location: 'Building A',
    startDate: '2026-02-12',
    finishDate: '2026-02-20',
    crewAssigned: 9,
    commitmentStatus: 'pending',
    description: "SC has not yet responded. Awaiting commitment, rejection, or proposal.",
    gcCanAct: false,
  },
  {
    id: 'r2',
    name: 'Install Chainlink Fencing',
    contractor: 'Elliott Subcontractors',
    taskCode: '32 30 00',
    location: 'Perimeter',
    startDate: '2026-02-04',
    finishDate: '2026-02-18',
    crewAssigned: 4,
    commitmentStatus: 'committed',
    adjustmentProposal: {
      subNotes: 'Committed as planned.',
    },
    description: "SC confirmed they can execute as planned. No changes needed.",
    gcCanAct: false,
  },
  {
    id: 'r3',
    name: 'Install Precast Panels',
    contractor: 'Apex Electrical',
    taskCode: '03 40 00',
    location: 'Building A',
    startDate: '2026-02-10',
    finishDate: '2026-02-28',
    crewAssigned: 5,
    commitmentStatus: 'adjustment_proposed',
    adjustmentProposal: {
      proposedStartDate: '2026-02-17',
      proposedEndDate: '2026-03-07',
      proposedCrewSize: 4,
      subNotes: 'Predecessor work still in progress — need a 1-week delay to start safely.',
    },
    description: "SC wants to change dates / crew size. GC can Accept, Counter-propose, or Dispute.",
    gcCanAct: true,
  },
  {
    id: 'r4',
    name: 'Rough-In Electrical — Level 3',
    contractor: 'BlueLine Mechanical',
    taskCode: '26 05 00',
    location: 'Level 3',
    startDate: '2026-02-15',
    finishDate: '2026-03-01',
    crewAssigned: 6,
    commitmentStatus: 'rejected',
    adjustmentProposal: {
      rejectionReason: 'Unanswered RFI',
      subNotes: 'Cannot proceed without approved conduit routing drawings (RFI #014 pending).',
    },
    description: "SC cannot proceed. GC can Counter-propose or Dispute (but not Accept directly).",
    gcCanAct: true,
  },
  {
    id: 'r5',
    name: 'Install Main Gates',
    contractor: 'Steel Structures Inc.',
    taskCode: '32 30 00',
    location: 'Entry',
    startDate: '2026-02-04',
    finishDate: '2026-02-09',
    crewAssigned: 3,
    commitmentStatus: 'gc_accepted',
    adjustmentProposal: {
      proposedCrewSize: 3,
      subNotes: 'Can cover this with a 3-person crew given floor access constraints.',
      gcResponseNotes: 'Accepted — 3-person crew is fine for this scope.',
    },
    description: "GC accepted the SC's adjustment proposal. Effectively resolved.",
    gcCanAct: false,
  },
  {
    id: 'r6',
    name: 'Spray Fireproofing — Columns',
    contractor: 'Precision Drywall',
    taskCode: '07 81 00',
    location: 'Level 2',
    startDate: '2026-02-18',
    finishDate: '2026-02-25',
    crewAssigned: 4,
    commitmentStatus: 'gc_revised',
    adjustmentProposal: {
      proposedStartDate: '2026-02-18',
      proposedEndDate: '2026-02-25',
      proposedCrewSize: 4,
      rejectionReason: 'Crew not available',
      subNotes: 'Our crew is committed elsewhere through Feb 17.',
      gcResponseNotes: 'Can we start Feb 18 with a 4-person crew? Let us know if that works.',
    },
    description: "SC rejected; GC counter-proposed. SC must now Accept or Reject the GC counter.",
    gcCanAct: true,
  },
  {
    id: 'r7',
    name: 'Install Fire Alarm Devices',
    contractor: 'Global HVAC',
    taskCode: '28 31 00',
    location: 'Level 4',
    startDate: '2026-03-10',
    finishDate: '2026-03-20',
    crewAssigned: 5,
    commitmentStatus: 'disputed',
    adjustmentProposal: {
      proposedStartDate: '2026-03-17',
      proposedEndDate: '2026-03-27',
      rejectionReason: 'Material delivery delay',
      subNotes: 'Devices are on back-order until Mar 16 at the earliest.',
      gcResponseNotes: 'Schedule shows material on site Mar 10 — flagging for PM review.',
    },
    description: "GC flagged this as unresolved / conflicting claims. Needs offline PM conversation.",
    gcCanAct: true,
  },
];

// ─── GC Review Panel (inline, simplified) ─────────────────────────────────────

const GcPanel: React.FC<{ row: DemoRow; onClose: () => void }> = ({ row, onClose }) => {
  const meta = commitmentMeta(row.commitmentStatus);
  const p = row.adjustmentProposal;
  const canAccept = row.commitmentStatus === 'adjustment_proposed' || row.commitmentStatus === 'gc_revised';
  const canCounter = row.commitmentStatus === 'adjustment_proposed' || row.commitmentStatus === 'rejected';
  const canDispute = row.commitmentStatus === 'adjustment_proposed' || row.commitmentStatus === 'rejected' || row.commitmentStatus === 'gc_revised';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{row.location} · {row.taskCode}</div>
          </div>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.classes}`}>
            {meta.label}
          </span>
        </div>

        {/* SC response */}
        {p && (
          <div className="px-5 py-4 space-y-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">SC Response</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {p.proposedStartDate && (
                <div>
                  <div className="text-gray-500">Proposed start</div>
                  <div className="font-medium text-gray-800">{p.proposedStartDate}</div>
                </div>
              )}
              {p.proposedEndDate && (
                <div>
                  <div className="text-gray-500">Proposed end</div>
                  <div className="font-medium text-gray-800">{p.proposedEndDate}</div>
                </div>
              )}
              {typeof p.proposedCrewSize === 'number' && (
                <div>
                  <div className="text-gray-500">Proposed crew</div>
                  <div className="font-medium text-gray-800">{p.proposedCrewSize}</div>
                </div>
              )}
              {p.rejectionReason && (
                <div className="col-span-2">
                  <div className="text-gray-500">Reason</div>
                  <div className="font-medium text-red-700">{p.rejectionReason}</div>
                </div>
              )}
            </div>
            {p.subNotes && (
              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 italic">
                "{p.subNotes}"
              </div>
            )}
            {p.gcResponseNotes && (
              <div className="text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                <span className="font-semibold">GC previously noted: </span>{p.gcResponseNotes}
              </div>
            )}
          </div>
        )}

        {/* GC actions */}
        <div className="px-5 py-4">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">GC Actions</div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!canAccept}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                canAccept
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={!canAccept ? 'Not available for this status' : 'Accept SC proposal'}
            >
              Accept
            </button>
            <button
              disabled={!canCounter}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                canCounter
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={!canCounter ? 'Not available for this status' : 'Counter-propose new dates'}
            >
              Counter-propose
            </button>
            <button
              disabled={!canDispute}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                canDispute
                  ? 'border-gray-300 hover:bg-gray-50 text-gray-800'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title={!canDispute ? 'Not available for this status' : 'Mark as disputed'}
            >
              Dispute
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Greyed-out buttons are not available for the <strong>{meta.label}</strong> status.
          </p>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── SC Card (mirrors SubCommitmentCard in LookaheadView) ─────────────────────

const ScCard: React.FC<{ row: DemoRow }> = ({ row }) => {
  const meta = commitmentMeta(row.commitmentStatus);
  const locked = row.commitmentStatus === 'committed' || row.commitmentStatus === 'gc_accepted';
  const reopened = row.commitmentStatus === 'gc_revised';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{row.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{row.location} · {row.taskCode}</div>
          </div>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.classes}`}>
            {meta.label}
          </span>
        </div>
        {reopened && (
          <div className="mt-2 text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 rounded-md px-2 py-1">
            GC has revised this task — please review.
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
          <div><span className="text-gray-500">Start</span><div className="font-medium">{row.startDate}</div></div>
          <div><span className="text-gray-500">End</span><div className="font-medium">{row.finishDate}</div></div>
          <div><span className="text-gray-500">Crew</span><div className="font-medium">{row.crewAssigned}</div></div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div
          className={`w-full px-3 py-2 text-xs font-semibold rounded-lg text-center ${
            locked
              ? 'bg-gray-100 text-gray-500 cursor-default'
              : 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition-colors'
          }`}
        >
          {locked ? (row.commitmentStatus === 'committed' ? 'Committed ✓' : 'Accepted ✓') : 'Review & Respond'}
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const CommitmentStatusDemoPage: React.FC = () => {
  const [activePanel, setActivePanel] = useState<DemoRow | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Page header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
              Demo
            </span>
            <h1 className="text-base font-bold text-gray-900">Commitment Status Reference</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Isolated view of all 7 commitment statuses — In Review lookahead · hardcoded data · no side-effects
          </p>
        </div>
        <a href="/" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
          ← Exit demo
        </a>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-8">

        {/* ── Section 1: Status Badge Reference ─────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">All 7 status badges (as rendered in grid)</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys({
              pending: 1, committed: 1, adjustment_proposed: 1, rejected: 1,
              gc_accepted: 1, gc_revised: 1, disputed: 1,
            }) as CommitmentStatus[]).map(s => {
              const m = commitmentMeta(s);
              return (
                <span
                  key={s}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border gap-1.5 ${m.classes}`}
                >
                  {elevated(s) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" title="Needs GC attention" />}
                  {m.label}
                </span>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Amber dot = elevated (needs GC attention, rendered with <code>ring-2 ring-amber-200</code> in the actual grid cell).
          </p>
        </section>

        {/* ── Section 2: GC Grid View ────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">GC grid view — In Review</h2>
          <p className="text-xs text-gray-500 mb-3">
            Badges for <code>adjustment_proposed</code>, <code>rejected</code>, <code>gc_revised</code>, and <code>disputed</code> are clickable buttons.
            Click any highlighted badge to see the GC review modal.
          </p>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[2fr_1.2fr_1.2fr_0.6fr_0.8fr] gap-0 border-b border-gray-100 px-4 py-2.5 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <div>Task / Location</div>
              <div>Contractor</div>
              <div>Dates</div>
              <div className="text-center">Crew</div>
              <div className="text-center">Status</div>
            </div>
            <div className="divide-y divide-gray-100">
              {ROWS.map(row => {
                const meta = commitmentMeta(row.commitmentStatus);
                const elev = elevated(row.commitmentStatus);
                return (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[2fr_1.2fr_1.2fr_0.6fr_0.8fr] gap-0 px-4 py-3 items-center ${
                      elev ? 'bg-amber-50/40' : ''
                    }`}
                    title={row.description}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{row.name}</div>
                      <div className="text-xs text-gray-400 truncate">{row.location} · {row.taskCode}</div>
                    </div>
                    <div className="text-xs text-gray-600 truncate">{row.contractor}</div>
                    <div className="text-xs text-gray-600">{row.startDate} – {row.finishDate}</div>
                    <div className="text-xs text-gray-600 text-center">{row.crewAssigned}</div>
                    <div className="flex items-center justify-center">
                      {row.gcCanAct ? (
                        <button
                          type="button"
                          onClick={() => setActivePanel(row)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer hover:brightness-95 hover:shadow-sm transition-all ${meta.classes} ${elev ? 'ring-2 ring-amber-200' : ''}`}
                          title="Click to review"
                        >
                          {meta.label}
                        </button>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.classes}`}>
                          {meta.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Hover any row to see the description tooltip. Amber rows need GC attention.</p>
        </section>

        {/* ── Section 3: SC Card View ────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">SC card view — In Review</h2>
          <p className="text-xs text-gray-500 mb-3">
            This is the <code>SubCommitmentCard</code> component as seen by the sub.
            "Review &amp; Respond" is active when the SC still needs to act.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ROWS.map(row => (
              <ScCard key={row.id} row={row} />
            ))}
          </div>
        </section>

        {/* ── Section 4: Status legend ───────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Status legend</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr] gap-0 border-b border-gray-100 px-4 py-2 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <div>Status</div>
              <div>Who set it</div>
              <div>GC can</div>
              <div>SC can</div>
            </div>
            <div className="divide-y divide-gray-100 text-xs">
              {[
                { s: 'pending'            as CommitmentStatus, who: 'System (on submit)',     gc: 'Wait',                   sc: 'Commit / Reject / Propose' },
                { s: 'committed'          as CommitmentStatus, who: 'SC',                     gc: '—',                      sc: 'View' },
                { s: 'adjustment_proposed'as CommitmentStatus, who: 'SC',                     gc: 'Accept / Counter / Dispute', sc: 'View' },
                { s: 'rejected'           as CommitmentStatus, who: 'SC',                     gc: 'Counter / Dispute',      sc: 'View' },
                { s: 'gc_accepted'        as CommitmentStatus, who: 'GC',                     gc: '—',                      sc: 'View' },
                { s: 'gc_revised'         as CommitmentStatus, who: 'GC',                     gc: 'Accept / Dispute',       sc: 'Commit / Reject / Propose' },
                { s: 'disputed'           as CommitmentStatus, who: 'GC',                     gc: 'Dispute (already set)',  sc: 'View' },
              ].map(({ s, who, gc, sc }) => {
                const meta = commitmentMeta(s);
                return (
                  <div key={s} className="grid grid-cols-[0.8fr_1fr_1fr_1fr] gap-0 px-4 py-2.5 items-center">
                    <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.classes}`}>{meta.label}</span>
                    <span className="text-gray-600">{who}</span>
                    <span className="text-gray-600">{gc}</span>
                    <span className="text-gray-600">{sc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>

      {/* GC Review modal */}
      {activePanel && <GcPanel row={activePanel} onClose={() => setActivePanel(null)} />}
    </div>
  );
};

export default CommitmentStatusDemoPage;
