import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

interface ProgressCellProps {
    progress: number;
    isEditable: boolean;
    onChange: (val: number) => void;
}

const ProgressCell: React.FC<ProgressCellProps> = ({ progress, isEditable, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPopoverPos({
                top: rect.bottom + window.scrollY,
                left: rect.right - 192 + window.scrollX // 192 is the width of the popover (w-48)
            });
        }
    }, [isOpen]);

    const presets = [0, 25, 50, 75, 100];

    return (
        <div ref={containerRef} className={`relative w-full flex items-center gap-2 group/progress ${isOpen ? 'z-[100]' : ''}`}>
            {/* Progress Bar */}
            <div className="flex-grow bg-gray-100 h-1.5 rounded-full overflow-hidden relative">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-blue-500 h-full"
                />
            </div>

            {/* Percentage Label / Trigger */}
            <button
                onClick={(e) => {
                    if (isEditable) {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }
                }}
                disabled={!isEditable}
                className={`
                    flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all
                    ${isEditable 
                        ? 'text-blue-600 hover:bg-blue-50 cursor-pointer' 
                        : 'text-gray-500 cursor-default'
                    }
                `}
            >
                <span className="min-w-[24px] text-right">{progress}%</span>
                {isEditable && (
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Popover via Portal */}
            {isOpen && createPortal(
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-100 p-4 w-48 pointer-events-auto"
                        style={{
                            top: `${popoverPos.top + 8}px`,
                            left: `${popoverPos.left}px`
                        }}
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Set Progress</span>
                                <span className="text-sm font-bold text-blue-600">{progress}%</span>
                            </div>

                            {/* Slider */}
                            <input 
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={(e) => onChange(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />

                            {/* Presets */}
                            <div className="grid grid-cols-5 gap-1">
                                {presets.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => onChange(p)}
                                        className={`
                                            h-7 rounded text-[10px] font-bold transition-all
                                            ${progress === p 
                                                ? 'bg-blue-600 text-white shadow-md' 
                                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            {/* Quick Increment/Decrement */}
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onChange(Math.max(0, progress - 5))}
                                    className="flex-1 flex items-center justify-center gap-1 h-8 bg-gray-50 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600"
                                >
                                    -5%
                                </button>
                                <button 
                                    onClick={() => onChange(Math.min(100, progress + 5))}
                                    className="flex-1 flex items-center justify-center gap-1 h-8 bg-gray-50 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600"
                                >
                                    +5%
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ProgressCell;
