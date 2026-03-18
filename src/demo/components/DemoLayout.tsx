import React, { useMemo, useState } from 'react';
import { DEMO_PROJECT, DEMO_LOOKAHEAD_WINDOW, DEMO_SUBS, DemoRole } from '../data/lookahead-demo-data';
import { useDemoStore } from '../store/demo-store';
import { GCView } from './GCView';
import { SubView } from './SubView';
import { GuidedTour } from './GuidedTour';
import { DemoControlsBar } from './DemoControlsBar';

type LayoutMode = 'single' | 'split';

const DemoLayout: React.FC = () => {
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
    const activeRole = useDemoStore((s) => s.activeRole);
    const setActiveRole = useDemoStore((s) => s.setActiveRole);
    const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
    const [splitSub, setSplitSub] = useState<'apex-electrical' | 'blueline-mechanical'>('apex-electrical');
    const [isTourActive, setIsTourActive] = useState(false);

    const mainRoleView = useMemo(() => {
        if (activeRole === 'gc') return <GCView />;
        return <SubView subId={activeRole} />;
    }, [activeRole]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 pb-20">
            <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                        Demo Mode
                    </span>
                    <div>
                        <h1 className="text-sm font-semibold text-slate-50">
                            Lookahead Review — Live Demo
                        </h1>
                        <p className="text-xs text-slate-400">
                            {DEMO_PROJECT.shortName} · {DEMO_LOOKAHEAD_WINDOW.label}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setLayoutMode(layoutMode === 'single' ? 'split' : 'single')}
                        className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
                        aria-label="Toggle layout mode"
                    >
                        {layoutMode === 'single' ? 'Single role' : 'Split screen'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsTourActive((v) => !v)}
                        className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                            isTourActive
                                ? 'border-amber-400/60 bg-amber-500/10 text-amber-200'
                                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                        }`}
                        aria-label="Toggle guided tour"
                    >
                        Guide Me
                    </button>
                    <div className="px-2.5 py-1 rounded-md bg-slate-700 text-slate-200 text-xs font-semibold">
                        {activeRole === 'gc' ? 'General Contractor View' : `Subcontractor View — ${DEMO_SUBS[activeRole as 'apex-electrical' | 'blueline-mechanical'].name}`}
                    </div>
                    <a
                        href="/"
                        className="text-xs font-medium text-slate-300 hover:text-white hover:underline"
                    >
                        Exit demo
                    </a>
                </div>
            </header>

            <main className="flex-1 flex flex-col px-6 py-4 gap-4">
                <div className="flex-1 flex gap-4">
                    {layoutMode === 'single' ? (
                        <div key={activeRole} className="flex-1 min-w-0 animate-[fade_120ms_ease-out]">
                            {mainRoleView}
                            <style>{`
                                @keyframes fade { from { opacity: 0.6; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
                            `}</style>
                        </div>
                    ) : (
                        <>
                            <div className="w-1/2 min-w-0">
                                <GCView />
                            </div>
                            <div className="w-1/2 min-w-0">
                                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 mb-3 flex items-center justify-between gap-3">
                                    <div className="text-xs font-semibold text-slate-200">Sub panel</div>
                                    <select
                                        value={splitSub}
                                        onChange={(e) => setSplitSub(e.target.value as any)}
                                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                                        aria-label="Select subcontractor"
                                    >
                                        <option value="apex-electrical">{DEMO_SUBS['apex-electrical'].name}</option>
                                        <option value="blueline-mechanical">{DEMO_SUBS['blueline-mechanical'].name}</option>
                                    </select>
                                </div>
                                <SubView subId={splitSub} />
                            </div>
                        </>
                    )}
                </div>
            </main>

            <GuidedTour isActive={isTourActive} onClose={() => setIsTourActive(false)} />

            <DemoControlsBar
                layoutMode={layoutMode}
                onToggleLayout={() => setLayoutMode((m) => (m === 'single' ? 'split' : 'single'))}
                isTourActive={isTourActive}
                onToggleTour={() => setIsTourActive((v) => !v)}
            />
        </div>
    );
};

export default DemoLayout;


