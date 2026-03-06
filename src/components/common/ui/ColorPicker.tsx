
import React, { useState } from 'react';
import { Popover } from './Popover';
import { ChevronDownIcon } from '../Icons';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './Tooltip';
import { cn } from '../../../lib/utils';

interface ColorPickerProps {
  icon: React.ReactNode;
  label: string;
  onColorSelect: (color: string | undefined) => void;
  presets?: string[];
}

const DEFAULT_PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
    '#f43f5e', '#64748b', '#94a3b8', '#000000', '#ffffff'
];

// Clean, recognizable Dropper icon (filled style)
const DropperIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
    <path d="M20.71 5.63l-2.34-2.34c-0.39-0.39-1.02-0.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c0.4-0.4 0.4-1.03 0.01-1.42zM6.92 19L5 19.08l.08-1.92 8.06-8.06 1.92 1.92L6.92 19z" />
  </svg>
);

const ColorPicker: React.FC<ColorPickerProps> = ({ icon, label, onColorSelect, presets = DEFAULT_PRESET_COLORS }) => {
    const [open, setOpen] = useState(false);
    const [hex, setHex] = useState('#000000');

    // Safe check for EyeDropper API support
    const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (!val.startsWith('#')) {
            val = '#' + val;
        }
        setHex(val);
        // Only update if valid hex
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            onColorSelect(val);
        }
    };

    const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setHex(val);
        onColorSelect(val);
    };

    const handleEyeDropper = async () => {
        if (!hasEyeDropper) return;
        // @ts-ignore - EyeDropper is not yet in standard TS dom lib
        const eyeDropper = new window.EyeDropper();
        try {
            const result = await eyeDropper.open();
            if (result && result.sRGBHex) {
                setHex(result.sRGBHex);
                onColorSelect(result.sRGBHex);
            }
        } catch (e) {
            // User canceled selection
        }
    };

    const handlePresetClick = (color: string) => {
        setHex(color);
        onColorSelect(color);
    };

    const handleClear = () => {
        onColorSelect(undefined);
        setOpen(false);
    };

    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger={
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <button 
                                className="flex items-center gap-1 p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-gray-200 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {icon}
                                <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            }
            content={
                <div className="w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden font-sans">
                    
                    {/* Header / Custom Section */}
                    <div className="p-3 border-b border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom</span>
                        </div>
                        <div className="flex gap-2 h-8">
                            {/* Native Picker Swatch */}
                            <div className="relative group flex-shrink-0 aspect-square h-full">
                                <div 
                                    className="w-full h-full rounded border border-gray-200 shadow-sm cursor-pointer overflow-hidden relative ring-offset-1 focus-within:ring-2 focus-within:ring-blue-500"
                                    style={{ backgroundColor: hex }}
                                >
                                    <input
                                        type="color"
                                        value={hex}
                                        onChange={handleNativeColorChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        title="Choose color"
                                    />
                                </div>
                            </div>

                            {/* Hex Input */}
                            <div className="relative flex-grow h-full">
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono select-none">#</div>
                                <input 
                                    type="text" 
                                    value={hex.replace('#', '')}
                                    onChange={handleHexChange}
                                    className="w-full h-full pl-5 pr-2 text-xs font-mono font-medium border border-gray-200 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                                    maxLength={6}
                                    spellCheck={false}
                                />
                            </div>

                            {/* Eyedropper */}
                            {hasEyeDropper && (
                                <button 
                                    onClick={handleEyeDropper}
                                    className="h-full aspect-square flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                                    title="Pick color from screen"
                                >
                                    <DropperIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Libraries / Presets */}
                    <div className="p-3 bg-gray-50/30">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Libraries</span>
                        <div className="grid grid-cols-8 gap-2">
                            {presets.map(color => (
                                <button
                                    key={color}
                                    onClick={() => handlePresetClick(color)}
                                    className="w-5 h-5 rounded-full border border-gray-200 shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer / None Action */}
                    <div className="p-2 border-t border-gray-100 bg-white">
                        <button 
                            onClick={handleClear} 
                            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"
                        >
                            <span className="relative w-3.5 h-3.5 border border-gray-300 rounded-full overflow-hidden flex items-center justify-center bg-white flex-shrink-0">
                                <span className="absolute w-full h-[1px] bg-red-500 rotate-45" />
                            </span>
                            Remove Color
                        </button>
                    </div>
                </div>
            }
            align="start"
            className="z-50 p-0 w-auto border-none"
        />
    );
};

export default ColorPicker;
