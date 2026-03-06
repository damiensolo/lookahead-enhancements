import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  endOfMonth, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '../Icons';
import { cn } from '../../../lib/utils';

interface CalendarProps {
  mode?: 'single';
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
}

const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected,
  onSelect,
  className,
}) => {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between space-x-4 pt-1 pb-4">
        <div className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <div className="flex items-center space-x-1">
            <button
                onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-slate-100 rounded-md flex items-center justify-center"
            >
                <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-slate-100 rounded-md flex items-center justify-center"
            >
                <ChevronRightIcon className="h-4 w-4" />
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
              <div key={day} className="text-[0.8rem] font-normal text-slate-500 text-center">
                  {day}
              </div>
          ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, dayIdx) => {
            const isSelected = selected && isSameDay(day, selected);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);

            return (
                <button
                    key={day.toString()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onSelect) onSelect(day);
                    }}
                    className={cn(
                        "h-8 w-8 p-0 font-normal text-sm aria-selected:opacity-100 rounded-md flex items-center justify-center hover:bg-slate-100 focus:bg-slate-100 focus:outline-none",
                        !isCurrentMonth && "text-slate-300 opacity-50 pointer-events-none", // simpler to disable outside days for this version
                        isSelected && "bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50 focus:bg-slate-900 focus:text-slate-50",
                        isTodayDate && !isSelected && "bg-slate-100 text-slate-900",
                    )}
                >
                    <time dateTime={format(day, 'yyyy-MM-dd')}>
                        {format(day, 'd')}
                    </time>
                </button>
            );
        })}
      </div>
    </div>
  );
};