
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { CONTRACTORS } from '../types';

interface ContractorSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  isMinimal?: boolean;
}

const ContractorSelect: React.FC<ContractorSelectProps> = ({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select Contractor...',
  isMinimal = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideTrigger = containerRef.current && !containerRef.current.contains(target);
      const isOutsidePortal = portalRef.current && !portalRef.current.contains(target);
      
      if (isOutsideTrigger && isOutsidePortal) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 200)
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Use capture for scroll to catch it anywhere
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  const allOptions = [...CONTRACTORS];
  if (value && !CONTRACTORS.includes(value)) {
    allOptions.push(value);
  }

  const dropdownMenu = (
    <div 
      ref={portalRef}
      className="fixed z-[9999] bg-white border border-black/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100"
      style={{ 
        top: coords.top + 4, 
        left: coords.left, 
        width: coords.width 
      }}
    >
      <div className="max-h-60 overflow-y-auto p-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
            setIsOpen(false);
          }}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-zinc-50 rounded-lg transition-colors italic"
        >
          None
        </button>
        {allOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(option);
              setIsOpen(false);
            }}
            className={`
              w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
              ${value === option 
                ? 'bg-blue-50 text-blue-600 font-semibold' 
                : 'text-gray-700 hover:bg-zinc-50'
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full text-left transition-all
          ${isMinimal 
            ? 'bg-transparent border-none p-0 text-gray-700 hover:text-blue-600' 
            : 'bg-white border border-black/10 rounded-lg px-3 py-2 hover:bg-zinc-50 focus:ring-2 focus:ring-blue-500/20'
          }
          text-sm font-medium
        `}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

export default ContractorSelect;
