import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { View, ViewMode } from '../../types';
import { useProject } from '../../context/ProjectContext';
import FilterMenu from './FilterMenu';
import { PlusIcon, MoreHorizontalIcon, TableIcon, BoardIcon, GanttIcon, LookaheadIcon, SearchIcon, FilterIcon, SpreadsheetIcon, DashboardIcon } from '../common/Icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../common/ui/Tooltip';

const modes: { id: ViewMode; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'lookahead', label: 'Lookahead', icon: LookaheadIcon },
];

const TabMenu: React.FC<{ view: View, isDefault: boolean, onRename: () => void, onDelete: () => void, onSetDefault: () => void, canDelete: boolean }> = 
({ view, isDefault, onRename, onDelete, onSetDefault, canDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const menuWrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isOpen && menuWrapperRef.current) {
      const rect = menuWrapperRef.current.getBoundingClientRect();
      const MENU_WIDTH = 160; // w-40 matches the width below
      let left = rect.left;
      
      // Check right edge collision
      if (left + MENU_WIDTH > window.innerWidth) {
        left = rect.right - MENU_WIDTH;
      }

      setCoords({
        top: rect.bottom + 4, // Small gap
        left: left,
      });
    }
  }, [isOpen]);
    
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuWrapperRef.current && !menuWrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => setIsOpen(false);
    const handleResize = () => setIsOpen(false);

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);


  return (
    <div ref={menuWrapperRef} className="relative">
      <button onClick={() => setIsOpen(prev => !prev)} className="p-1 rounded-md hover:bg-gray-200">
        <MoreHorizontalIcon className="w-4 h-4 text-gray-500" />
      </button>
      {isOpen && createPortal(
        <div 
            className="fixed w-40 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
            style={{ top: coords.top, left: coords.left }}
            onMouseDown={(e) => e.stopPropagation()}
        >
          <ul className="py-1">
            <li>
                <button 
                    onClick={() => { if(!isDefault) { onSetDefault(); setIsOpen(false); } }}
                    disabled={isDefault}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${isDefault ? 'text-gray-400 cursor-default' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                    {isDefault ? 'Default view' : 'Set as default'}
                </button>
            </li>
            <li>
                <button 
                    onClick={() => { onRename(); setIsOpen(false); }} 
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                    Rename
                </button>
            </li>
            {canDelete && (
                <li>
                    <button 
                        onClick={() => { onDelete(); setIsOpen(false); }} 
                        className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                        Delete
                    </button>
                </li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

interface ViewControlsProps {
  /** Rendered before the search field when present; a pipe "|" is shown between this and the search (e.g. left panel toggle in lookahead) */
  renderBeforeSearch?: React.ReactNode;
}

const ViewControls: React.FC<ViewControlsProps> = ({ renderBeforeSearch }) => {
  const {
    views, activeViewId, defaultViewId, handleSelectView, setModalState, handleDeleteView, setDefaultViewId, setViews,
    activeViewMode, handleViewModeChange,
    searchTerm, setSearchTerm, showFilterMenu, setShowFilterMenu, activeView
  } = useProject();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDropIndex(index);
  };
  
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newViews = [...views];
    const [draggedItem] = newViews.splice(draggedIndex, 1);
    newViews.splice(index, 0, draggedItem);
    setViews(newViews);
    
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const searchPlaceholder = activeViewMode === 'spreadsheet' || activeViewMode === 'spreadsheetV2' ? 'Search...' : 'Search tasks...';
  const showSearchAndFilter = activeViewMode !== 'dashboard';

  return (
    <div className="flex items-center gap-3">
        {showSearchAndFilter && (
            <>
                {renderBeforeSearch != null && (
                    <>
                        {renderBeforeSearch}
                        <span className="text-gray-300 select-none" aria-hidden="true">|</span>
                    </>
                )}
                {/* Search */}
                <div className="relative">
                    <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-opacity duration-200 ${isSearchFocused ? 'opacity-0' : 'opacity-100'}`} />
                    <input 
                        type="text" 
                        placeholder={searchPlaceholder} 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className={`pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-48 shadow-sm transition-all duration-200 ${isSearchFocused ? 'pl-3' : 'pl-9'}`}
                    />
                </div>

                {/* Filter */}
                <div className="relative">
                    <button onClick={() => setShowFilterMenu(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm">
                        <FilterIcon className="w-4 h-4" />
                        <span>Filter</span>
                        {activeView.filters.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{activeView.filters.length}</span>}
                    </button>
                    {showFilterMenu && <FilterMenu onClose={() => setShowFilterMenu(false)} />}
                </div>
            </>
        )}

        {/* View Controls */}
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
            <nav className="flex items-center gap-1" onDragLeave={() => setDropIndex(null)}>
                {views.map((view, index) => {
                    const isActive = view.id === activeViewId;
                    const isDropTarget = dropIndex === index;
                    const isBeingDragged = draggedIndex === index;
                    const modeIcon = modes.find(m => m.id === view.type)?.icon;
                    const IconComponent = modeIcon || TableIcon;

                    return (
                        <div
                        key={view.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={() => { setDraggedIndex(null); setDropIndex(null); }}
                        className={`flex items-center rounded-md transition-all duration-150 ${ isBeingDragged ? 'opacity-50' : '' } ${ isDropTarget ? 'bg-gray-300' : '' } ${ isActive ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-gray-200'}`}
                        >
                        <button
                            onClick={() => handleSelectView(view.id)}
                            className={`pl-2 pr-3 py-1.5 text-sm font-medium text-gray-800 rounded-l-md flex items-center gap-1.5`}
                        >
                            <IconComponent className="w-4 h-4 text-gray-500" />
                            {view.name}
                        </button>
                        <div className="pr-1">
                            <TabMenu 
                            view={view}
                            isDefault={view.id === defaultViewId}
                            onRename={() => setModalState({ type: 'rename', view })}
                            onDelete={() => handleDeleteView(view.id)}
                            onSetDefault={() => setDefaultViewId(view.id)}
                            canDelete={view.id !== activeViewId}
                            />
                        </div>
                        </div>
                    );
                })}
            </nav>
            
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <button onClick={() => setModalState({ type: 'create' })} className="ml-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Create New View</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    </div>
  );
};

export default ViewControls;