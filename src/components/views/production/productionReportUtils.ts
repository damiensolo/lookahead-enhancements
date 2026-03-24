import { LookaheadTask, DailyMetric } from '../lookahead/types';

// ---------------------------------------------------------------------------
// Internal helper — resolves dailyMetrics from either productionQuantity or
// the legacy top-level dailyMetrics field
// ---------------------------------------------------------------------------
function getMetrics(task: LookaheadTask): DailyMetric[] {
    if (task.productionQuantity?.dailyMetrics?.length) return task.productionQuantity.dailyMetrics;
    return task.dailyMetrics ?? [];
}

// ---------------------------------------------------------------------------
// Public utility functions — all pure, no side effects
// ---------------------------------------------------------------------------

/** Sum of all planned quantities across all tasks and all days */
export function getTotalPlannedQty(tasks: LookaheadTask[]): number {
    return Math.round(
        tasks.reduce((sum, t) =>
            sum + getMetrics(t).reduce((s, m) => s + (m.quantity?.plan ?? 0), 0), 0)
    );
}

/** Sum of all actual quantities recorded across all tasks and all days */
export function getTotalActualQty(tasks: LookaheadTask[]): number {
    return Math.round(
        tasks.reduce((sum, t) =>
            sum + getMetrics(t).reduce((s, m) => s + (m.quantity?.actual ?? 0), 0), 0)
    );
}

/**
 * Schedule Performance Index: totalActual / totalPlanned.
 * Returns null if totalPlanned is 0 to avoid division-by-zero.
 */
export function getSchedulePerformanceIndex(tasks: LookaheadTask[]): number | null {
    const planned = getTotalPlannedQty(tasks);
    if (planned === 0) return null;
    const actual = getTotalActualQty(tasks);
    return parseFloat((actual / planned).toFixed(2));
}

/**
 * Percentage of days that had a planned qty > 0 AND actual qty > 0.
 * Returns an integer 0–100. Returns 0 when no days have a plan set.
 */
export function getPlanReliabilityPct(tasks: LookaheadTask[]): number {
    let total = 0;
    let met = 0;
    for (const t of tasks) {
        for (const m of getMetrics(t)) {
            if ((m.quantity?.plan ?? 0) > 0) {
                total++;
                if ((m.quantity?.actual ?? 0) > 0) met++;
            }
        }
    }
    if (total === 0) return 0;
    return Math.round((met / total) * 100);
}

/**
 * Total actual qty divided by total crew-days logged across all task days.
 * crewByDay is an optional override map { 'YYYY-MM-DD': crewCount }; when
 * omitted, crew.actual from dailyMetrics is used.
 * Returns null when no crew data is available.
 */
export function getAvgDailyOutputPerCrewDay(
    tasks: LookaheadTask[],
    crewByDay?: Record<string, number>
): number | null {
    let totalActual = 0;
    let totalCrewDays = 0;
    for (const t of tasks) {
        for (const m of getMetrics(t)) {
            const actual = m.quantity?.actual ?? 0;
            const crew = crewByDay ? (crewByDay[m.date] ?? 0) : (m.crew?.actual ?? 0);
            if (actual > 0 && crew > 0) {
                totalActual += actual;
                totalCrewDays += crew;
            }
        }
    }
    if (totalCrewDays === 0) return null;
    return parseFloat((totalActual / totalCrewDays).toFixed(2));
}

export interface DailyTotal {
    date: string;
    planned: number;
    actual: number;
}

/**
 * Array of { date, planned, actual } for each calendar day in the lookahead
 * range, with quantities summed across all tasks. Sorted ascending by date.
 */
export function getDailyPlannedVsActual(tasks: LookaheadTask[]): DailyTotal[] {
    const map = new Map<string, { planned: number; actual: number }>();
    for (const t of tasks) {
        for (const m of getMetrics(t)) {
            const entry = map.get(m.date) ?? { planned: 0, actual: 0 };
            entry.planned += m.quantity?.plan ?? 0;
            entry.actual += m.quantity?.actual ?? 0;
            map.set(m.date, entry);
        }
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
            date,
            planned: Math.round(v.planned),
            actual: Math.round(v.actual),
        }));
}

export interface CumulativeCurve {
    dates: string[];
    planned: number[];
    actual: number[];
}

/**
 * Cumulative planned and actual quantity arrays for a single task, sorted by
 * date. Each index corresponds to a day in dates[].
 */
export function getCumulativeCurve(task: LookaheadTask): CumulativeCurve {
    const metrics = [...getMetrics(task)].sort((a, b) => a.date.localeCompare(b.date));
    let cumPlan = 0;
    let cumActual = 0;
    const planned: number[] = [];
    const actual: number[] = [];
    const dates: string[] = [];
    for (const m of metrics) {
        cumPlan += m.quantity?.plan ?? 0;
        cumActual += m.quantity?.actual ?? 0;
        planned.push(Math.round(cumPlan));
        actual.push(Math.round(cumActual));
        dates.push(m.date);
    }
    return { dates, planned, actual };
}

export interface RollingRate {
    date: string;
    rate: number;
}

/**
 * Rolling N-day average of actual qty per crew-day for a single task.
 * Only includes entries where crew.actual > 0 in the window.
 * Returns an empty array when no crew data is available.
 */
export function getRollingProductionRate(
    task: LookaheadTask,
    windowDays: number = 7
): RollingRate[] {
    const metrics = [...getMetrics(task)].sort((a, b) => a.date.localeCompare(b.date));
    const result: RollingRate[] = [];
    for (let i = 0; i < metrics.length; i++) {
        const window = metrics.slice(Math.max(0, i - windowDays + 1), i + 1);
        const totalActual = window.reduce((s, m) => s + (m.quantity?.actual ?? 0), 0);
        const totalCrew = window.reduce((s, m) => s + (m.crew?.actual ?? 0), 0);
        if (totalCrew > 0) {
            result.push({
                date: metrics[i].date,
                rate: parseFloat((totalActual / totalCrew).toFixed(2)),
            });
        }
    }
    return result;
}

export interface SPIByDay {
    date: string;
    spi: number;
}

/**
 * Cumulative SPI at each calendar day: cumActual / cumPlanned.
 * Returns 0 for days where cumPlanned is still 0.
 */
export function getSPIByDay(tasks: LookaheadTask[]): SPIByDay[] {
    const daily = getDailyPlannedVsActual(tasks);
    let cumPlanned = 0;
    let cumActual = 0;
    return daily.map(d => {
        cumPlanned += d.planned;
        cumActual += d.actual;
        const spi = cumPlanned > 0 ? parseFloat((cumActual / cumPlanned).toFixed(2)) : 0;
        return { date: d.date, spi };
    });
}
