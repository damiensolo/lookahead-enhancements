
import React from 'react';
import { useProject } from '../../context/ProjectContext';
import LookaheadView from '../views/lookahead/LookaheadView';

const MainContent: React.FC<{ isScrolled: boolean }> = ({ isScrolled }) => {
    const { activeView } = useProject();

    return <LookaheadView key={activeView.id} />;
};

export default MainContent;
