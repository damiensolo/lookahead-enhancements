import { LookaheadTask, DailyMetric, ProductionQuantity } from '../types';
import { addDays, formatDateISO, parseLookaheadDate } from '../../../../lib/dateUtils';

const DEFAULT_UNIT = 'EA';

const MAX_DECIMALS = 4;

/** Format quantity for display: avoid long floats like 33.29000000000008 */
export function formatQuantityDisplay(value: number): string {
  if (value == null || Number.isNaN(value)) return '0';
  const rounded = Math.round(value * Math.pow(10, MAX_DECIMALS)) / Math.pow(10, MAX_DECIMALS);
  if (rounded === Math.floor(rounded)) return String(Math.round(rounded));
  const s = rounded.toFixed(MAX_DECIMALS);
  return s.replace(/\.?0+$/, '');
}

/** Max actual allowed for a given day so total actual ≤ total planned (no approved exception). */
export function getMaxActualForDay(task: LookaheadTask, date: string): number {
  const totalPlanned = getTotalPlannedQuantity(task);
  const metrics = getEffectiveDailyMetrics(task);
  const otherActual = metrics
    .filter(m => m.date !== date)
    .reduce((sum, m) => sum + (m.quantity?.actual ?? 0), 0);
  return Math.max(0, totalPlanned - otherActual);
}

/** Get effective daily metrics from task (productionQuantity or legacy dailyMetrics) */
export function getEffectiveDailyMetrics(task: LookaheadTask): DailyMetric[] {
  if (task.productionQuantity?.dailyMetrics?.length) {
    return task.productionQuantity.dailyMetrics;
  }
  return task.dailyMetrics ?? [];
}

/** Check if task has any actual quantity entered */
export function hasAnyActualQuantity(task: LookaheadTask): boolean {
  const metrics = getEffectiveDailyMetrics(task);
  return metrics.some(m => (m.quantity?.actual ?? 0) > 0);
}

/** Get total planned quantity (from productionQuantity.planned or sum of daily plans) */
export function getTotalPlannedQuantity(task: LookaheadTask): number {
  const pq = task.productionQuantity;
  if (pq && pq.planned > 0) return pq.planned;
  const metrics = getEffectiveDailyMetrics(task);
  return metrics.reduce((sum, m) => sum + (m.quantity?.plan ?? 0), 0);
}

/** Get total actual quantity */
export function getTotalActualQuantity(task: LookaheadTask): number {
  const metrics = getEffectiveDailyMetrics(task);
  return metrics.reduce((sum, m) => sum + (m.quantity?.actual ?? 0), 0);
}

/** Get quantity unit from task */
export function getQuantityUnit(task: LookaheadTask): string {
  return task.productionQuantity?.unit ?? 
    getEffectiveDailyMetrics(task)[0]?.quantity?.unit ?? 
    DEFAULT_UNIT;
}

/** Distribute planned quantity uniformly across working days in date range */
export function distributePlannedQuantityUniformly(
  task: LookaheadTask,
  planned: number,
  unit: string
): DailyMetric[] {
  const start = parseLookaheadDate(task.fieldStartDate || task.startDate);
  const end = parseLookaheadDate(task.fieldFinishDate || task.finishDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const perDay = Math.round((planned / days) * 100) / 100;

  const metrics: DailyMetric[] = [];
  let remaining = planned;

  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const dateStr = formatDateISO(date);
    const planForDay = i === days - 1 ? remaining : Math.min(perDay, remaining);
    remaining -= planForDay;

    metrics.push({
      date: dateStr,
      quantity: { plan: planForDay, actual: 0, unit },
      hours: { plan: 0, actual: 0 },
      crew: { plan: task.crewAssigned ?? 0, actual: 0 },
    });
  }

  return metrics;
}

/** Ensure sum of daily plans does not exceed total planned; adjust proportionally if needed */
export function ensureDailyPlanWithinTotal(
  metrics: DailyMetric[],
  totalPlanned: number,
  unit: string
): DailyMetric[] {
  const currentSum = metrics.reduce((s, m) => s + (m.quantity?.plan ?? 0), 0);
  if (currentSum <= totalPlanned || totalPlanned <= 0) return metrics;

  const ratio = totalPlanned / currentSum;
  return metrics.map(m => ({
    ...m,
    quantity: {
      ...m.quantity,
      plan: Math.round((m.quantity.plan ?? 0) * ratio * 100) / 100,
      unit: m.quantity?.unit ?? unit,
    },
  }));
}

/** Clamp a single day's plan change so daily totals don't exceed total planned */
export function clampDailyPlan(
  metrics: DailyMetric[],
  dateIndex: number,
  newPlan: number,
  totalPlanned: number
): number {
  const otherSum = metrics.reduce((s, m, i) => 
    i === dateIndex ? s : s + (m.quantity?.plan ?? 0), 0);
  const maxForDay = Math.max(0, totalPlanned - otherSum);
  return Math.min(Math.max(0, newPlan), maxForDay);
}

/** Ensure productionQuantity exists and dailyMetrics are initialized */
export function ensureProductionQuantity(
  task: LookaheadTask,
  planned?: number,
  unit?: string
): ProductionQuantity {
  const pq = task.productionQuantity;
  const effectiveUnit = unit ?? pq?.unit ?? DEFAULT_UNIT;
  const effectivePlanned = planned ?? pq?.planned ?? 0;
  const hasActual = hasAnyActualQuantity(task);
  const locked = pq?.plannedLocked ?? hasActual;

  let dailyMetrics = getEffectiveDailyMetrics(task);

  if (dailyMetrics.length === 0 && effectivePlanned > 0) {
    dailyMetrics = distributePlannedQuantityUniformly(task, effectivePlanned, effectiveUnit);
  }

  return {
    planned: effectivePlanned,
    plannedLocked: locked,
    unit: effectiveUnit,
    dailyMetrics,
  };
}
