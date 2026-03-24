
import React from 'react';
import { useProject } from '../../context/ProjectContext';
import LookaheadView from '../views/lookahead/LookaheadView';
import ProductionReport from '../views/production/ProductionReport';
import KanbanView from '../views/kanban/KanbanView';

const MainContent: React.FC<{ isScrolled: boolean }> = ({ isScrolled }) => {
    const { activeView, activeViewMode } = useProject();

    if (activeViewMode === 'production') {
        return <ProductionReport />;
    }

    if (activeViewMode === 'kanban') {
        return <KanbanView />;
    }

    return <LookaheadView key={activeView.id} />;
};

export default MainContent;
