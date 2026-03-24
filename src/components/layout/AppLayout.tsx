import React, { useRef, useEffect, useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import AppHeader from './AppHeader';
import MainContent from './MainContent';
import ItemDetailsPanel from '../shared/ItemDetailsPanel';
import CreateViewModal from '../shared/CreateViewModal';
import Header from '../../mainnav/components/nav2/Header';
import Sidebar from '../../mainnav/components/nav2/Sidebar';
import ViewControls from './ViewControls';

const AppLayout: React.FC = () => {
    const {
        modalState, setModalState, handleSaveView,
        detailedTask, setDetailedTaskId, handlePriorityChange,
        activeViewMode,
    } = useProject();
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    
    useEffect(() => {
        const contentEl = mainContentRef.current;
        const handleScroll = () => setIsScrolled((contentEl?.scrollTop ?? 0) > 0);
        contentEl?.addEventListener('scroll', handleScroll);
        return () => contentEl?.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="flex flex-col h-full bg-white font-sans text-gray-800 overflow-hidden">
            {modalState && (
                <CreateViewModal
                    title={modalState.type === 'rename' ? 'Rename View' : 'Create New View'}
                    initialName={modalState.view?.name}
                    onSave={handleSaveView}
                    onCancel={() => setModalState(null)}
                />
            )}
            
            {/* Global Navigation Header */}
            <Header
                version="v1"
                onSelectionChange={(title) => console.log('Navigated to:', title)}
                onHomeClick={() => {}}
                onCategoryChange={() => {}}
                onBookmarksDataChange={() => {}}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Global Sidebar */}
                <Sidebar
                    version="v1"
                    onSelect={(categoryKey, subcategoryKey) => console.log('Sidebar nav:', categoryKey, subcategoryKey)}
                    onHomeClick={() => {}}
                />

                {/* Main Application Area Wrapper */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
                    {/* Existing App Header (View Controls) */}
                    <AppHeader />

                    {/* View switcher + search — production and kanban (full-width views without LookaheadView toolbar) */}
                    {(activeViewMode === 'production' || activeViewMode === 'kanban') && (
                        <div className="flex-shrink-0 flex items-center border-b border-gray-200 bg-white px-4 py-2">
                            <ViewControls />
                        </div>
                    )}

                    {/* Existing Content Area */}
                    <div className="flex flex-1 overflow-hidden relative">
                        <main ref={mainContentRef} className="flex-1 overflow-auto transition-all duration-300 ease-in-out">
                            <MainContent isScrolled={isScrolled} />
                        </main>
                        <ItemDetailsPanel 
                            task={detailedTask} 
                            onClose={() => setDetailedTaskId(null)} 
                            onPriorityChange={handlePriorityChange} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AppLayout;