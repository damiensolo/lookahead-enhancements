
import React, { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';
import { Calendar } from './Calendar';
import { Popover } from './Popover';
import { ChevronDownIcon } from '../Icons';

interface DatePickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ date, setDate, className, open, onOpenChange }) => {
    // Internal state for uncontrolled usage, though usually controlled by Popover if props passed
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = open !== undefined ? open : internalOpen;

    return (
        <Popover
            open={isOpen}
            onOpenChange={onOpenChange || setInternalOpen}
            trigger={
                <button
                    type="button"
                    className={cn(
                        "flex w-full h-full items-center justify-between text-left bg-transparent p-0 group focus:outline-none text-sm",
                        !date && "text-slate-500",
                        className
                    )}
                >
                    <span className="truncate flex-1 text-left">{date ? format(date, "M/d/yyyy") : "Pick a date"}</span>
                    <ChevronDownIcon className={cn(
                        "w-4 h-4 text-gray-400 transition-opacity duration-200 ml-2 flex-shrink-0",
                        isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )} />
                </button>
            }
            content={
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        setDate(d);
                        // Close the popover on select.
                        if (onOpenChange) onOpenChange(false);
                        else setInternalOpen(false);
                    }}
                    className="rounded-md border border-slate-200"
                />
            }
        />
    );
};
