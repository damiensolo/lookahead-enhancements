import React, { useMemo } from 'react';
import { LookaheadTask, DailyMetric, ConstraintStatus, WeatherForecast, CrewMember } from '../types';
import { getEffectiveDailyMetrics, getTotalPlannedQuantity, getQuantityUnit, clampDailyPlan, formatQuantityDisplay, getMaxActualForDay } from '../utils/quantityUtils';
import { XIcon, SunIcon, CloudIcon, CloudRainIcon, HardHatIcon } from '../../../common/Icons';

const WeatherIcon: React.FC<{ icon: 'sun' | 'cloud' | 'rain' }> = ({ icon }) => {
    switch (icon) {
        case 'sun': return <SunIcon className="w-5 h-5 text-yellow-500" />;
        case 'cloud': return <CloudIcon className="w-5 h-5 text-gray-500" />;
        case 'rain': return <CloudRainIcon className="w-5 h-5 text-blue-500" />;
        default: return null;
    }
};

interface DailyMetricsPanelProps {
  data: { task: LookaheadTask; date: Date; forecast?: WeatherForecast } | null;
  onClose: () => void;
  onUpdateDailyQuantity?: (taskId: string | number, date: string, plan: number, actual: number) => void;
  onUpdateAssignedCrew?: (taskId: string | number, date: string, crewIds: string[]) => void;
  /** Open Add Crew modal for this task and the panel's date */
  onOpenAddCrew?: (taskId: string | number, dateString: string) => void;
  isActive?: boolean;
  projectCrew?: CrewMember[];
  /** When true, render content only (no aside wrapper) for use inside unified panel */
  embedded?: boolean;
}

const MetricRow: React.FC<{
    label: string;
    plan: number;
    actual: number;
    unit?: string;
}> = ({ label, plan, actual, unit }) => {
    const getColor = () => {
        if (actual < plan) return 'text-red-600';
        if (actual > plan) return 'text-green-600';
        return 'text-blue-600';
    };

    return (
        <div className="grid grid-cols-3 items-center py-3">
            <div className="font-semibold text-gray-700">{label}</div>
            <div className="text-gray-600">
                {formatQuantityDisplay(plan)} {unit && <span className="text-xs text-gray-400">{unit}</span>}
            </div>
            <div className={`font-bold ${getColor()}`}>
                {formatQuantityDisplay(actual)} {unit && <span className="text-xs text-gray-400">{unit}</span>}
            </div>
        </div>
    );
};

const getOverallStatusInfo = (task: LookaheadTask): { label: string; dotColor: string } => {
    if (task.progress >= 100) {
      return { label: 'Complete', dotColor: 'bg-emerald-600' };
    }
    const statuses = Object.values(task.status);
    if (statuses.includes(ConstraintStatus.Overdue)) {
      return { label: 'Blocked', dotColor: 'bg-red-500' };
    }
    if (statuses.includes(ConstraintStatus.Pending)) {
      return { label: 'At Risk', dotColor: 'bg-yellow-500' };
    }
    return { label: 'Ready', dotColor: 'bg-green-500' };
};

const DailyMetricsPanel: React.FC<DailyMetricsPanelProps> = ({ data, onClose, onUpdateDailyQuantity, onUpdateAssignedCrew, onOpenAddCrew, isActive, projectCrew = [], embedded = false }) => {
  
  const task = data?.task;
  const date = data?.date;
  const forecast = data?.forecast;

  const dailyMetrics = useMemo(() => (task ? getEffectiveDailyMetrics(task) : []), [task]);
  const totals = useMemo(() => {
    if (!task || dailyMetrics.length === 0) {
        return {
            quantity: { plan: 0, actual: 0, unit: '' },
            hours: { plan: 0, actual: 0 }
        };
    }
    return dailyMetrics.reduce((acc, metric) => {
        acc.quantity.plan += metric.quantity?.plan ?? 0;
        acc.quantity.actual += metric.quantity?.actual ?? 0;
        acc.hours.plan += metric.hours?.plan ?? 0;
        acc.hours.actual += metric.hours?.actual ?? 0;
        acc.quantity.unit = metric.quantity?.unit ?? ''; // Assume same unit
        return acc;
    }, {
        quantity: { plan: 0, actual: 0, unit: '' },
        hours: { plan: 0, actual: 0 }
    });
  }, [task, dailyMetrics]);


  if (!task || !date) {
    return null;
  }
  
  const dateString = date.toISOString().split('T')[0];
  const metricData = dailyMetrics.find(m => m.date === dateString);
  const metricIndex = dailyMetrics.findIndex(m => m.date === dateString);
  const totalPlanned = task ? getTotalPlannedQuantity(task) : 0;
  const unit = task ? getQuantityUnit(task) : '';
  const overallStatus = getOverallStatusInfo(task);
  const progressPercent = task.manHours.budget > 0 ? (task.manHours.actual / task.manHours.budget) * 100 : 0;


  const content = (
        <div className="flex flex-col h-full bg-gray-50">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-4">
                {forecast && (
                    <div className="flex flex-col items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <WeatherIcon icon={forecast.icon} />
                        <span className="text-xs font-bold text-gray-700 mt-0.5">{forecast.temp}°</span>
                    </div>
                )}
                <div>
                    <h2 id="daily-metrics-title" className="text-lg font-semibold text-gray-800 truncate max-w-[200px]">{task.name}</h2>
                    <p className="text-sm text-gray-500">{date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                </div>
            </div>
          <button onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close details">
            <XIcon className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-grow p-6 overflow-y-auto">
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Task Summary</h3>
                <div className="p-4 bg-gray-50 rounded-lg space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Overall Status</span>
                        <div className="flex items-center gap-2 font-semibold">
                            <span className={`w-2.5 h-2.5 rounded-full ${overallStatus.dotColor}`}></span>
                            <span>{overallStatus.label}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Work Progress</span>
                        <span className="font-semibold">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Quantity</span>
                        <span className="font-semibold">{formatQuantityDisplay(totals.quantity.actual)} / {formatQuantityDisplay(totals.quantity.plan)} {totals.quantity.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Hours</span>
                        <span className="font-semibold">{totals.hours.actual} / {totals.hours.plan} hrs</span>
                    </div>
                </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Daily Plan vs. Actual</h3>
            {metricData ? (
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-2">
                        <span>Metric</span>
                        <span>Plan</span>
                        <span>Actual</span>
                    </div>
                    <div className="divide-y divide-gray-200 text-sm">
                        {onUpdateDailyQuantity && metricIndex >= 0 ? (
                            <div className="grid grid-cols-3 items-center py-3">
                                <div className="font-semibold text-gray-700">Quantity</div>
                                <div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={totalPlanned}
                                        step={0.01}
                                        value={metricData.quantity?.plan ?? 0}
                                        onChange={(e) => {
                                            const v = parseFloat(e.target.value);
                                            if (!isNaN(v) && v >= 0) {
                                                const clamped = clampDailyPlan(dailyMetrics, metricIndex, v, totalPlanned);
                                                onUpdateDailyQuantity(task.id, dateString, clamped, metricData.quantity?.actual ?? 0);
                                            }
                                        }}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={getMaxActualForDay(task, dateString)}
                                        step={0.01}
                                        value={metricData.quantity?.actual ?? 0}
                                        onChange={(e) => {
                                            const v = parseFloat(e.target.value);
                                            if (!isNaN(v) && v >= 0) {
                                                onUpdateDailyQuantity(task.id, dateString, metricData.quantity?.plan ?? 0, v);
                                            }
                                        }}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 font-medium text-blue-700"
                                    />
                                </div>
                            </div>
                        ) : (
                            <MetricRow 
                                label="Quantity" 
                                plan={metricData.quantity?.plan ?? 0} 
                                actual={metricData.quantity?.actual ?? 0}
                                unit={metricData.quantity?.unit ?? unit}
                            />
                        )}
                        <MetricRow 
                            label="Hours" 
                            plan={metricData.hours?.plan ?? 0} 
                            actual={metricData.hours?.actual ?? 0}
                            unit="hrs"
                        />
                        <MetricRow 
                            label="Crew" 
                            plan={metricData.crew?.plan ?? 0} 
                            actual={metricData.crew?.actual ?? 0}
                            unit="people"
                        />
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">No data available for this day.</p>
                </div>
            )}

            {projectCrew.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Crew assigned</h3>
                        {onOpenAddCrew && (
                            <button
                                type="button"
                                onClick={() => onOpenAddCrew(task.id, dateString)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-transparent border border-transparent rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors"
                            >
                                <HardHatIcon className="w-4 h-4" />
                                Add Crew
                            </button>
                        )}
                    </div>
                    {task.assignedCrewByDate && Object.keys(task.assignedCrewByDate).length > 0 ? (
                    <ul className="space-y-3 text-sm">
                        {Object.entries(task.assignedCrewByDate as Record<string, string[]>)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([dateStr, crewIds]) => {
                                const assigned = (crewIds as string[])
                                    .map(id => projectCrew.find(c => c.id === id))
                                    .filter((c): c is CrewMember => c != null);
                                if (assigned.length === 0) return null;
                                const isSelectedDay = dateStr === dateString;
                                const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                return (
                                    <li key={dateStr}>
                                        <span className={`font-medium ${isSelectedDay ? 'text-blue-700' : 'text-gray-500'}`}>
                                            {isSelectedDay ? `This day (${dateLabel})` : dateLabel}
                                        </span>
                                        <ul className="mt-1 space-y-1">
                                            {assigned.map((crew) => (
                                                <li key={crew.id} className="py-1 px-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="font-medium text-gray-800">{crew.name}</span>
                                                    {crew.title && <span className="text-gray-500 ml-1">({crew.title})</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                );
                            })}
                    </ul>
                    ) : (
                        <p className="text-sm text-gray-500 py-2">No crew assigned. Use Add Crew to assign.</p>
                    )}
                </div>
            )}
        </div>
      </div>
  );

  if (embedded) return content;
  return (
    <aside className="absolute top-0 right-0 h-full bg-gray-50 border-l border-gray-200 z-50" style={{ width: '420px' }} role="dialog" aria-modal="true" aria-labelledby="daily-metrics-title">
      {content}
    </aside>
  );
};

export default DailyMetricsPanel;
