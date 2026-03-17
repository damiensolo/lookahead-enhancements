import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';

export type Persona = 'gc' | 'sc';

interface PersonaContextType {
  persona: Persona;
  scCompany: string | null;
  setPersona: (p: Persona) => void;
  setScCompany: (company: string | null) => void;
}

const getInitialFromUrl = (): { persona: Persona; scCompany: string | null } => {
  if (typeof window === 'undefined') return { persona: 'gc', scCompany: null };
  const params = new URLSearchParams(window.location.search);
  const personaParam = params.get('persona')?.toLowerCase();
  const persona: Persona = personaParam === 'sc' ? 'sc' : 'gc';
  const scCompany = params.get('company') ?? null;
  return { persona, scCompany };
};

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export const PersonaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setPersonaState] = useState<Persona>(() => getInitialFromUrl().persona);
  const [scCompany, setScCompanyState] = useState<string | null>(() => getInitialFromUrl().scCompany);

  useEffect(() => {
    const syncFromUrl = () => {
      const { persona: p, scCompany: c } = getInitialFromUrl();
      setPersonaState(p);
      setScCompanyState(c);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const setPersona = useCallback((p: Persona) => {
    setPersonaState(p);
    const url = new URL(window.location.href);
    url.searchParams.set('persona', p);
    if (p !== 'sc') url.searchParams.delete('company');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const setScCompany = useCallback((company: string | null) => {
    setScCompanyState(company);
    const url = new URL(window.location.href);
    if (company) url.searchParams.set('company', company);
    else url.searchParams.delete('company');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const value = useMemo(
    () => ({ persona, scCompany, setPersona, setScCompany }),
    [persona, scCompany, setPersona, setScCompany]
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
};

export function usePersona(): PersonaContextType {
  const ctx = useContext(PersonaContext);
  if (ctx === undefined) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
}
