import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import ProgressSlider from './ProgressSlider';

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
                        if (!isOpen && containerRef.current) {
                            const rect = containerRef.current.getBoundingClientRect();
                            setPopoverPos({
                                top: rect.bottom + window.scrollY,
                                left: rect.right - 192 + window.scrollX
                            });
                        }
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
                        onMouseDown={(e) => e.stopPropagation()}
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

                            <ProgressSlider value={progress} onChange={onChange} size="md" />
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ProgressCell;
