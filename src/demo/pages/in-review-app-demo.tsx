/**
 * /demo/in-review
 *
 * The real AppLayout, running inside the real ProjectProvider/PersonaProvider,
 * but auto-booted into "In Review" state with all 7 commitment statuses seeded.
 *
 * URL variants:
 *   /demo/in-review                                  → GC persona (default)
 *   /demo/in-review?persona=sc&company=Elliott+Subcontractors  → SC persona
 *
 * Nothing here touches the main app's data or routing.
 */
import React, { useEffect, useRef } from 'react';
import { ProjectProvider, useProject } from '../../context/ProjectContext';
import { PersonaProvider } from '../../context/PersonaContext';
import AppLayout from '../../components/layout/AppLayout';
import { ScheduleStatus } from '../../components/views/lookahead/types';

// ─── Boot component ───────────────────────────────────────────────────────────
// Lives inside ProjectProvider so it can call context actions.
// Phase 1: create a draft covering the Feb 2026 demo task window.
// Phase 2: once the draft is active, submit it for review (seeds 7 statuses).

const DemoInReviewBoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { schedules, activeScheduleId, createDraft, submitScheduleForReview } = useProject();
  const phase = useRef<'init' | 'waiting' | 'done'>('init');

  // Phase 1 — runs once on mount
  useEffect(() => {
    if (phase.current !== 'init') return;
    phase.current = 'waiting';
    // Cover the Feb–Mar 2026 window where PLANNER_TASKS live
    createDraft('previous', { startDate: '2026-02-01', durationDays: 56 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2 — triggers when the new draft becomes the active schedule
  useEffect(() => {
    if (phase.current !== 'waiting') return;
    if (!activeScheduleId) return;
    const schedule = schedules.find(s => s.id === activeScheduleId);
    if (schedule?.status === ScheduleStatus.Draft) {
      phase.current = 'done';
      submitScheduleForReview(activeScheduleId);
    }
  }, [schedules, activeScheduleId, submitScheduleForReview]);

  return <>{children}</>;
};

// ─── Demo banner ──────────────────────────────────────────────────────────────
// Fixed overlay — pointer-events disabled on the pill so the UI below is
// fully interactive; only the Exit link intercepts clicks.

const DemoBanner: React.FC = () => (
  <div
    className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50/95 shadow-xl px-4 py-2 text-xs font-semibold text-amber-800 backdrop-blur-sm pointer-events-none select-none"
    style={{ whiteSpace: 'nowrap' }}
  >
    <span className="inline-flex items-center rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold">
      Demo
    </span>
    In-Review · all 7 commitment statuses visible
    <span className="mx-1 text-amber-300">|</span>
    GC:&nbsp;<code className="font-mono text-amber-700">/demo/in-review</code>
    <span className="mx-1 text-amber-300">·</span>
    SC:&nbsp;<code className="font-mono text-amber-700">?persona=sc&amp;company=Elliott+Subcontractors</code>
    <a
      href="/"
      className="pointer-events-auto ml-2 text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
    >
      Exit demo
    </a>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const InReviewAppDemo: React.FC = () => (
  <ProjectProvider>
    <PersonaProvider>
      <DemoInReviewBoot>
        <AppLayout />
      </DemoInReviewBoot>
      <DemoBanner />
    </PersonaProvider>
  </ProjectProvider>
);

export default InReviewAppDemo;
