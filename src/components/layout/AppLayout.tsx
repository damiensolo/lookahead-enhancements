import React, { useRef, useEffect, useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import AppHeader from './AppHeader';
import MainContent from './MainContent';
import ItemDetailsPanel from '../shared/ItemDetailsPanel';
import CreateViewModal from '../shared/CreateViewModal';
import Header from '../../mainnav/components/Header';
import Sidebar from '../../mainnav/components/Sidebar';

const AppLayout: React.FC = () => {
    const { modalState, setModalState, handleSaveView, detailedTask, setDetailedTaskId, handlePriorityChange } = useProject();
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
            
            {/* New Global Navigation Header */}
            <Header onSelectionChange={(title) => console.log('Navigated to:', title)} />
            
            <div className="flex flex-1 overflow-hidden">
                {/* New Global Sidebar */}
                <Sidebar />

                {/* Main Application Area Wrapper */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
                    {/* Existing App Header (View Controls) */}
                    <AppHeader />
                    
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