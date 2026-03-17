import React from 'react';
import { ProjectProvider } from './context/ProjectContext';
import { PersonaProvider } from './context/PersonaContext';
import AppLayout from './components/layout/AppLayout';

// Fix: Explicitly type React.FC with empty props object.
const App: React.FC<{}> = () => {
  return (
    <ProjectProvider>
      <PersonaProvider>
        <AppLayout />
      </PersonaProvider>
    </ProjectProvider>
  );
};

export default App;