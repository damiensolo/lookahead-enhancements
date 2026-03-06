import React, { useEffect, useState, useMemo } from 'react';
import { LookaheadTask, DailyMetric, ConstraintStatus, WeatherForecast } from '../types';
import { XIcon, SunIcon, CloudIcon, CloudRainIcon } from '../../../common/Icons';

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
                {plan} {unit && <span className="text-xs text-gray-400">{unit}</span>}
            </div>
            <div className={`font-bold ${getColor()}`}>
                {actual} {unit && <span className="text-xs text-gray-400">{unit}</span>}
            </div>
        </div>
    );
};

const getOverallStatusInfo = (task: LookaheadTask): { label: string; dotColor: string } => {
    const statuses = Object.values(task.status);
    if (statuses.includes(ConstraintStatus.Overdue)) {
      return { label: 'Blocked', dotColor: 'bg-red-500' };
    }
    if (statuses.includes(ConstraintStatus.Pending)) {
      return { label: 'At Risk', dotColor: 'bg-yellow-500' };
    }
    return { label: 'Ready', dotColor: 'bg-green-500' };
};

const DailyMetricsPanel: React.FC<DailyMetricsPanelProps> = ({ data, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!!data);
  }, [data]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Allow for transition
  };
  
  const task = data?.task;
  const date = data?.date;
  const forecast = data?.forecast;

  const totals = useMemo(() => {
    if (!task?.dailyMetrics || task.dailyMetrics.length === 0) {
        return {
            quantity: { plan: 0, actual: 0, unit: '' },
            hours: { plan: 0, actual: 0 }
        };
    }
    return task.dailyMetrics.reduce((acc, metric) => {
        acc.quantity.plan += metric.quantity.plan;
        acc.quantity.actual += metric.quantity.actual;
        acc.hours.plan += metric.hours.plan;
        acc.hours.actual += metric.hours.actual;
        acc.quantity.unit = metric.quantity.unit; // Assume same unit
        return acc;
    }, {
        quantity: { plan: 0, actual: 0, unit: '' },
        hours: { plan: 0, actual: 0 }
    });
  }, [task?.dailyMetrics]);


  if (!task || !date) {
    return null;
  }
  
  const dateString = date.toISOString().split('T')[0];
  const metricData = task.dailyMetrics?.find(m => m.date === dateString);
  const overallStatus = getOverallStatusInfo(task);
  const progressPercent = task.manHours.budget > 0 ? (task.manHours.actual / task.manHours.budget) * 100 : 0;


  return (
    <aside
      className={`absolute top-0 right-0 h-full bg-white border-l border-gray-200 z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '400px' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-metrics-title"
    >
      <div className="flex flex-col h-full">
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
          <button onClick={handleClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close details">
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
                        <span className="font-semibold">{totals.quantity.actual} / {totals.quantity.plan} {totals.quantity.unit}</span>
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
                        <MetricRow 
                            label="Quantity" 
                            plan={metricData.quantity.plan} 
                            actual={metricData.quantity.actual}
                            unit={metricData.quantity.unit}
                        />
                        <MetricRow 
                            label="Hours" 
                            plan={metricData.hours.plan} 
                            actual={metricData.hours.actual}
                            unit="hrs"
                        />
                        <MetricRow 
                            label="Crew" 
                            plan={metricData.crew.plan} 
                            actual={metricData.crew.actual}
                            unit="people"
                        />
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">No data available for this day.</p>
                </div>
            )}
        </div>
      </div>
    </aside>
  );
};

export default DailyMetricsPanel;
