import React, { useRef, useCallback } from 'react';

const SNAP_POINTS = [0, 25, 50, 75, 100] as const;
const QUICK_DRAG_MS = 500;   // Drag ends within this = "quick" gesture
const QUICK_DRAG_DELTA = 12; // Must have moved at least this much to snap

interface ProgressSliderProps {
    value: number;
    onChange: (val: number) => void;
    className?: string;
    size?: 'sm' | 'md';
}

const snapToNearest = (value: number): number => {
    let nearest = SNAP_POINTS[0];
    let minDist = Math.abs(value - nearest);
    for (const p of SNAP_POINTS) {
        const d = Math.abs(value - p);
        if (d < minDist) {
            minDist = d;
            nearest = p;
        }
    }
    return nearest;
};

const ProgressSlider: React.FC<ProgressSliderProps> = ({ value, onChange, className = '', size = 'md' }) => {
    const dragRef = useRef<{ startTime: number; startValue: number } | null>(null);
    const valueRef = useRef(value);
    valueRef.current = value;

    const handlePointerDown = useCallback(() => {
        dragRef.current = { startTime: Date.now(), startValue: valueRef.current };
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseInt(e.target.value, 10);
        onChange(v);
    }, [onChange]);

    const handlePointerUp = useCallback(() => {
        const info = dragRef.current;
        dragRef.current = null;
        if (!info) return;

        const finalValue = valueRef.current;
        const duration = Date.now() - info.startTime;
        const delta = Math.abs(finalValue - info.startValue);
        const isQuickDrag = duration < QUICK_DRAG_MS && delta > QUICK_DRAG_DELTA;

        if (isQuickDrag) {
            const snapped = snapToNearest(finalValue);
            if (snapped !== finalValue) onChange(snapped);
        }
    }, [onChange]);

    const trackHeight = size === 'sm' ? 'h-1.5' : 'h-2';

    return (
        <div className={`relative flex items-center select-none min-h-9 ${className}`}>
            {/* Track + blue fill - no animation for instant 1:1 thumb tracking */}
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 ${trackHeight} bg-gray-200 rounded-full overflow-hidden`}>
                <div
                    className="h-full bg-blue-600 rounded-l-full origin-left"
                    style={{ width: `${value}%` }}
                />
            </div>

            <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={handleChange}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                className={`
                    relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-blue-600
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:active:cursor-grabbing
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:duration-150
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-webkit-slider-thumb]:active:scale-105
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-blue-600
                    [&::-moz-range-thumb]:border-0
                    [&::-moz-range-thumb]:cursor-grab
                    [&::-moz-range-thumb]:shadow-lg
                    [&::-moz-range-thumb]:transition-transform
                    [&::-moz-range-thumb]:duration-150
                    [&::-moz-range-thumb]:hover:scale-110
                    ${size === 'sm' ? '[&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5' : '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4'}
                `}
            />
        </div>
    );
};

export default ProgressSlider;
