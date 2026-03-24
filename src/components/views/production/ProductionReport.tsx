import React, { useState, useMemo } from 'react';
import { useProject } from '../../../context/ProjectContext';
import { LookaheadTask } from '../lookahead/types';
import {
    getTotalPlannedQty,
    getTotalActualQty,
    getSchedulePerformanceIndex,
    getPlanReliabilityPct,
    getAvgDailyOutputPerCrewDay,
    getDailyPlannedVsActual,
    getCumulativeCurve,
    getSPIByDay,
    getRollingProductionRate,
} from './productionReportUtils';
import { GroupedBarChart, LineChart, SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes } from '@carbon/charts';
import '@carbon/charts/styles.css';

const flattenLeafTasks = (tasks: LookaheadTask[]): LookaheadTask[] => {
    const out: LookaheadTask[] = [];
    const walk = (items: LookaheadTask[]) => {
        items.forEach(t => {
            if (t.children?.length) walk(t.children);
            else out.push(t);
        });
    };
    walk(tasks);
    return out;
};

// ---------------------------------------------------------------------------
// KPI card component
// ---------------------------------------------------------------------------
interface KpiCardProps {
    label: string;
    value: string | null;
    subLabel: string;
    valueColor?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, subLabel, valueColor }) => (
    <div className="flex-1 rounded-lg border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-1 min-w-0">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{label}</div>
        <div
            className="text-2xl font-bold leading-tight"
            style={{ color: valueColor ?? '#111827' }}
        >
            {value ?? '—'}
        </div>
        <div className="text-xs text-gray-400">{subLabel}</div>
    </div>
);

// ---------------------------------------------------------------------------
// Chart section wrapper
// ---------------------------------------------------------------------------
const ChartSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
        <div className="text-sm font-semibold text-gray-700">{title}</div>
        {children}
    </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ProductionReport: React.FC = () => {
    const { schedules, activeScheduleId } = useProject();

    const activeSchedule = schedules.find(s => s.id === activeScheduleId) ?? null;

    const tasks = useMemo(
        () => (activeSchedule ? flattenLeafTasks(activeSchedule.tasks) : []),
        [activeSchedule],
    );

    // ---- KPI values --------------------------------------------------------
    const totalPlanned = getTotalPlannedQty(tasks);
    const totalActual = getTotalActualQty(tasks);
    const spi = getSchedulePerformanceIndex(tasks);
    const planReliability = getPlanReliabilityPct(tasks);
    const avgOutput = getAvgDailyOutputPerCrewDay(tasks);

    const spiColor = spi === null ? undefined : spi >= 1.0 ? '#15803D' : '#B91C1C';
    const reliabilityColor = planReliability >= 80 ? '#15803D' : planReliability > 0 ? '#B91C1C' : undefined;

    // ---- Task selector (shared by Charts 2 & 5) ---------------------------
    const tasksWithData = useMemo(
        () =>
            tasks.filter(t => {
                const m = t.productionQuantity?.dailyMetrics ?? t.dailyMetrics ?? [];
                return m.length > 0;
            }),
        [tasks],
    );

    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

    const selectedTask = useMemo((): LookaheadTask | null => {
        if (selectedTaskId !== null) return tasks.find(t => t.id === selectedTaskId) ?? null;
        return tasksWithData[0] ?? null;
    }, [selectedTaskId, tasks, tasksWithData]);

    // ---- Chart 1: Daily planned vs actual (grouped bar) -------------------
    const { dailyChartData, plannedByDate } = useMemo(() => {
        const raw = getDailyPlannedVsActual(tasks);
        const plannedByDate: Record<string, number> = {};
        raw.forEach(d => { plannedByDate[d.date] = d.planned; });
        const dailyChartData = raw.flatMap(d => [
            { group: 'Planned', date: d.date, value: d.planned },
            { group: 'Actual', date: d.date, value: d.actual },
        ]);
        return { dailyChartData, plannedByDate };
    }, [tasks]);

    const dailyBarOptions = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
        },
        height: '280px',
        color: {
            // Planned: slate; Actual: green if ≥ planned, red if behind, gray if zero
            getFillColor: (group: string, label: string | number, data: Record<string, unknown>) => {
                if (group === 'Planned') return '#94a3b8';
                const planned = plannedByDate[String(label)] ?? 0;
                const actual = typeof data?.value === 'number' ? data.value : 0;
                if (actual <= 0) return '#d1d5db';
                return actual >= planned ? '#15803d' : '#b91c1c';
            },
        },
    }), [plannedByDate]);

    // ---- Chart 2: Cumulative production curve (line) ----------------------
    const cumulativeChartData = useMemo(() => {
        if (!selectedTask) return [];
        const curve = getCumulativeCurve(selectedTask);
        return [
            ...curve.dates.map((date, i) => ({ group: 'Planned', date, value: curve.planned[i] })),
            ...curve.dates.map((date, i) => ({ group: 'Actual', date, value: curve.actual[i] })),
        ];
    }, [selectedTask]);

    const cumulativeOptions = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
        },
        height: '240px',
        color: { scale: { Planned: '#94a3b8', Actual: '#2563eb' } },
    }), []);

    // ---- Chart 3: SPI trend (line with reference line at 1.0) -------------
    const spiChartData = useMemo(
        () => getSPIByDay(tasks).map(d => ({ group: 'SPI', date: d.date, value: d.spi })),
        [tasks],
    );

    const spiLineOptions = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: {
                mapsTo: 'value',
                scaleType: ScaleTypes.LINEAR,
                thresholds: [{ value: 1.0, fillColor: '#15803d', label: 'Target = 1.0' }],
            },
        },
        height: '240px',
        color: { scale: { SPI: '#7c3aed' } },
    }), []);

    // ---- Chart 4: Crew count by day (simple bar) --------------------------
    const crewChartData = useMemo(() => {
        const map = new Map<string, number>();
        tasks.forEach(t => {
            const metrics = t.productionQuantity?.dailyMetrics ?? t.dailyMetrics ?? [];
            metrics.forEach(m => {
                const crew = m.crew?.actual ?? 0;
                if (crew > 0) map.set(m.date, (map.get(m.date) ?? 0) + crew);
            });
        });
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({ group: 'Crew', date, value }));
    }, [tasks]);

    const crewBarOptions = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
        },
        height: '200px',
        color: { scale: { Crew: '#0891b2' } },
    }), []);

    // ---- Chart 5: Rolling 7-day production rate (line) --------------------
    const rollingRateData = useMemo(() => {
        if (!selectedTask) return [];
        return getRollingProductionRate(selectedTask).map(r => ({ group: 'Rate', date: r.date, value: r.rate }));
    }, [selectedTask]);

    const rollingRateOptions = useMemo(() => ({
        title: '',
        theme: 'white' as const,
        toolbar: { enabled: false },
        axes: {
            bottom: { mapsTo: 'date', scaleType: ScaleTypes.LABELS },
            left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR },
        },
        height: '200px',
        color: { scale: { Rate: '#d97706' } },
    }), []);

    const hasNoTasks = tasks.length === 0;

    return (
        <div className="flex h-full flex-col p-4 gap-4 overflow-y-auto">
            {/* KPI summary cards */}
            <div className="flex gap-3">
                <KpiCard
                    label="Total Planned Qty"
                    value={totalPlanned > 0 ? totalPlanned.toLocaleString() : null}
                    subLabel="across all tasks"
                />
                <KpiCard
                    label="Total Actual Qty"
                    value={totalActual > 0 ? totalActual.toLocaleString() : null}
                    subLabel="recorded to date"
                />
                <KpiCard
                    label="Schedule Performance"
                    value={spi !== null ? spi.toFixed(2) : null}
                    subLabel="target ≥ 1.00"
                    valueColor={spiColor}
                />
                <KpiCard
                    label="Plan Reliability"
                    value={totalPlanned > 0 ? `${planReliability}%` : null}
                    subLabel="days with plan + actual"
                    valueColor={reliabilityColor}
                />
                <KpiCard
                    label="Avg Daily Output"
                    value={avgOutput !== null ? avgOutput.toFixed(2) : null}
                    subLabel="qty per crew-day"
                />
            </div>

            {hasNoTasks ? (
                <div className="flex-1 flex items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="text-center text-gray-400">
                        <p className="text-sm font-medium text-gray-500">No production data available</p>
                        <p className="text-xs mt-1">Add production quantities to tasks to see charts.</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Chart 1: Daily planned vs actual — full width */}
                    <ChartSection title="Daily Planned vs Actual">
                        {dailyChartData.length > 0 ? (
                            <GroupedBarChart data={dailyChartData} options={dailyBarOptions} />
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-xs text-gray-400">
                                No daily data recorded
                            </div>
                        )}
                    </ChartSection>

                    {/* Task selector shared by Charts 2 & 5 */}
                    {tasksWithData.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Task:</span>
                            <select
                                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                value={selectedTask?.id ?? ''}
                                onChange={e => setSelectedTaskId(Number(e.target.value))}
                            >
                                {tasksWithData.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Charts 2 & 3: 2-column grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <ChartSection title="Cumulative Production Curve">
                            {cumulativeChartData.length > 0 ? (
                                <LineChart data={cumulativeChartData} options={cumulativeOptions} />
                            ) : (
                                <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">
                                    No data for selected task
                                </div>
                            )}
                        </ChartSection>
                        <ChartSection title="Schedule Performance Index (SPI) Trend">
                            {spiChartData.length > 0 ? (
                                <LineChart data={spiChartData} options={spiLineOptions} />
                            ) : (
                                <div className="h-[240px] flex items-center justify-center text-xs text-gray-400">
                                    No SPI data available
                                </div>
                            )}
                        </ChartSection>
                    </div>

                    {/* Charts 4 & 5: 2-column grid */}
                    <div className="grid grid-cols-2 gap-4 pb-4">
                        <ChartSection title="Crew Count by Day">
                            {crewChartData.length > 0 ? (
                                <SimpleBarChart data={crewChartData} options={crewBarOptions} />
                            ) : (
                                <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">
                                    No crew data recorded
                                </div>
                            )}
                        </ChartSection>
                        <ChartSection title="Rolling 7-Day Production Rate">
                            {rollingRateData.length > 0 ? (
                                <LineChart data={rollingRateData} options={rollingRateOptions} />
                            ) : (
                                <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">
                                    No rate data for selected task
                                </div>
                            )}
                        </ChartSection>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductionReport;
