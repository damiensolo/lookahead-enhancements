import { LookaheadTask } from '../types';

export type ClashResolutionStatus = 'Unresolved' | 'Resolved' | 'Accepted risk';
export type ClashType = 'Labor congestion' | 'Equipment conflict' | 'Crane conflict';

export interface LocationClash {
  id: string;
  location: string;
  overlapStartDate: string;
  overlapEndDate: string;
  taskIds: Array<string | number>;
  status: ClashResolutionStatus;
  category?: ClashType;
}

const normalizeCompany = (s: string) => (s || '').trim().toLowerCase();

/** Detect clashes where different contractors share the same location with overlapping dates. */
export function detectLocationClashes(tasks: LookaheadTask[]): LocationClash[] {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];

  const flat: LookaheadTask[] = [];
  const flatten = (ts: LookaheadTask[]) => {
    ts.forEach(t => {
      flat.push(t);
      if (t.children?.length) flatten(t.children);
    });
  };
  flatten(tasks);

  const byLocation = new Map<string, LookaheadTask[]>();
  flat.forEach(t => {
    if (!t.location || !t.startDate || !t.finishDate || !t.contractor) return;
    const loc = t.location.trim();
    if (!loc) return;
    if (!byLocation.has(loc)) byLocation.set(loc, []);
    byLocation.get(loc)!.push(t);
  });

  const clashes: LocationClash[] = [];
  const toDate = (s: string) => new Date(s + 'T00:00:00');

  for (const [location, locTasks] of byLocation.entries()) {
    if (locTasks.length < 2) continue;
    for (let i = 0; i < locTasks.length; i++) {
      const a = locTasks[i];
      const aStart = toDate(a.startDate);
      const aEnd = toDate(a.finishDate);
      for (let j = i + 1; j < locTasks.length; j++) {
        const b = locTasks[j];
        if (normalizeCompany(a.contractor) === normalizeCompany(b.contractor)) continue;
        const bStart = toDate(b.startDate);
        const bEnd = toDate(b.finishDate);
        const overlapStart = aStart > bStart ? aStart : bStart;
        const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
        if (overlapStart <= overlapEnd) {
          clashes.push({
            id: `clash-${location}-${String(a.id)}-${String(b.id)}`,
            location,
            overlapStartDate: overlapStart.toISOString().slice(0, 10),
            overlapEndDate: overlapEnd.toISOString().slice(0, 10),
            taskIds: [a.id, b.id],
            status: 'Unresolved',
          });
        }
      }
    }
  }

  return clashes;
}

