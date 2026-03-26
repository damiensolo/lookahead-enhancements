import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import FilterMenu from './FilterMenu';
import { LookaheadIcon, SearchIcon, FilterIcon, DashboardIcon, BoardIcon } from '../common/Icons';

interface ViewControlsProps {
  renderBeforeSearch?: React.ReactNode;
  renderRoleSwitcher?: React.ReactNode;
}

const ViewControls: React.FC<ViewControlsProps> = ({ renderBeforeSearch, renderRoleSwitcher }) => {
  const {
    activeViewMode, handleViewModeChange,
    searchTerm, setSearchTerm, showFilterMenu, setShowFilterMenu, activeView,
  } = useProject();

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const showSearchAndFilter = activeViewMode === 'lookahead' || activeViewMode === 'kanban';

  return (
    <div className="flex items-center gap-3">
        {renderRoleSwitcher}
        {showSearchAndFilter && (
            <>
                {renderBeforeSearch != null && (
                    <>
                        {renderBeforeSearch}
                        <span className="text-gray-300 select-none" aria-hidden="true">|</span>
                    </>
                )}
                <div className="relative">
                    <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-opacity duration-200 ${isSearchFocused ? 'opacity-0' : 'opacity-100'}`} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className={`pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-48 shadow-sm transition-all duration-200 ${isSearchFocused ? 'pl-3' : 'pl-9'}`}
                    />
                </div>
                <div className="relative">
                    <button onClick={() => setShowFilterMenu(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm">
                        <FilterIcon className="w-4 h-4" />
                        <span>Filter</span>
                        {activeView.filters.length > 0 && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{activeView.filters.length}</span>
                        )}
                    </button>
                    {showFilterMenu && <FilterMenu onClose={() => setShowFilterMenu(false)} />}
                </div>
            </>
        )}

        {/* View mode switcher — Lookahead | Kanban | Analytics */}
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
            <button
                onClick={() => handleViewModeChange('lookahead')}
                className={`pl-2 pr-3 py-1.5 text-sm font-medium text-gray-800 rounded-md flex items-center gap-1.5 transition-all duration-150 ${
                    activeViewMode === 'lookahead' ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-gray-200'
                }`}
            >
                <LookaheadIcon className="w-4 h-4 text-gray-500" />
                Lookahead
            </button>
            <button
                onClick={() => handleViewModeChange('kanban')}
                className={`ml-1 pl-2 pr-3 py-1.5 text-sm font-medium text-gray-800 rounded-md flex items-center gap-1.5 transition-all duration-150 ${
                    activeViewMode === 'kanban' ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-gray-200'
                }`}
            >
                <BoardIcon className="w-4 h-4 text-gray-500" />
                Kanban
            </button>
            <button
                onClick={() => handleViewModeChange('production')}
                className={`ml-1 pl-2 pr-3 py-1.5 text-sm font-medium text-gray-800 rounded-md flex items-center gap-1.5 transition-all duration-150 ${
                    activeViewMode === 'production' ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-gray-200'
                }`}
            >
                <DashboardIcon className="w-4 h-4 text-gray-500" />
                Analytics
            </button>
        </div>
    </div>
  );
};

export default ViewControls;
