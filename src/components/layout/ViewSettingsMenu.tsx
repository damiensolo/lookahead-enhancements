import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SettingsIcon, ChevronRightIcon, CheckIcon, EyeIcon, EyeOffIcon } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';
import { DisplayDensity, ColumnId } from '../../types';

const ViewSettingsMenu: React.FC = () => {
  const { activeView, setColumns, setDisplayDensity, setFontSize } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.right - 280, // Width of menu is 280px
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleColumn = (columnId: ColumnId) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const resetToDefault = () => {
    setDisplayDensity('comfortable');
    setFontSize(12);
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const densities: { id: DisplayDensity; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'compact', 
      label: 'Compact', 
      icon: (
        <div className="flex flex-col gap-0.5 w-4">
          <div className="h-0.5 w-full bg-current opacity-60" />
          <div className="h-0.5 w-full bg-current opacity-60" />
          <div className="h-0.5 w-full bg-current opacity-60" />
        </div>
      )
    },
    { 
      id: 'standard', 
      label: 'Standard', 
      icon: (
        <div className="flex flex-col gap-1 w-4">
          <div className="h-0.5 w-full bg-current opacity-60" />
          <div className="h-0.5 w-full bg-current opacity-60" />
          <div className="h-0.5 w-full bg-current opacity-60" />
        </div>
      )
    },
    { 
      id: 'comfortable', 
      label: 'Comfortable', 
      icon: (
        <div className="flex flex-col gap-1.5 w-4">
          <div className="h-0.5 w-full bg-current opacity-60" />
          <div className="h-0.5 w-full bg-current opacity-60" />
        </div>
      )
    },
  ];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => {
          if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + 8, left: rect.right - 280 });
          }
          setIsOpen(!isOpen);
        }}
        className={`p-1.5 rounded-md transition-colors ${
          isOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title="Table Settings"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-[280px] bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="p-3 border-bottom border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Table Settings</h3>
          </div>

          <div className="p-2 max-h-[400px] overflow-y-auto">
            {/* Columns Section */}
            <div className="mb-4">
              <div className="px-2 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-tight">Columns</div>
              <div className="space-y-0.5">
                {activeView.columns.map(column => {
                  const isHideable = column.hideable !== false;
                  if (!isHideable) {
                    return (
                      <div
                        key={column.id}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-gray-500 cursor-default"
                      >
                        <span className="text-sm">{column.label}</span>
                        <span className="text-[10px] text-gray-400">Always visible</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={column.id}
                      onClick={() => toggleColumn(column.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors group"
                    >
                      <span className={`text-sm ${column.visible ? 'text-gray-700' : 'text-gray-400'}`}>
                        {column.label}
                      </span>
                      {column.visible ? (
                        <EyeIcon className="w-4 h-4 text-blue-500" />
                      ) : (
                        <EyeOffIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-gray-100 my-2 mx-2" />

            {/* Density Section */}
            <div className="mb-4">
              <div className="px-2 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-tight">Display Density</div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
                {densities.map(density => (
                  <button
                    key={density.id}
                    onClick={() => setDisplayDensity(density.id)}
                    className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-md transition-all ${
                      activeView.displayDensity === density.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {density.icon}
                    <span className="text-[10px] font-medium">{density.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100 my-2 mx-2" />

            {/* Font Size Section */}
            <div>
              <div className="px-2 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-tight flex justify-between">
                <span>Font Size</span>
                <span className="text-gray-600 font-mono">{activeView.fontSize}px</span>
              </div>
              <div className="px-2 py-2 flex items-center gap-3">
                <button 
                  onClick={() => setFontSize(Math.max(10, activeView.fontSize - 1))}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                >
                  <span className="text-lg font-bold leading-none">−</span>
                </button>
                <input 
                  type="range" 
                  min="10" 
                  max="16" 
                  step="1"
                  value={activeView.fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <button 
                  onClick={() => setFontSize(Math.min(16, activeView.fontSize + 1))}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                >
                  <span className="text-lg font-bold leading-none">+</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-2 bg-gray-50 border-t border-gray-100">
            <button
              onClick={resetToDefault}
              className="w-full py-2 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-all border border-transparent hover:border-gray-200"
            >
              Reset to Default
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ViewSettingsMenu;
