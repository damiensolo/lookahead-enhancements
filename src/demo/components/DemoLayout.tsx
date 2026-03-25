import React, { useState } from 'react';
import { DEMO_PROJECT, DEMO_LOOKAHEAD_WINDOW, DEMO_SUBS, DemoRole } from '../data/lookahead-demo-data';
import { useDemoStore } from '../store/demo-store';
import { GCView } from './GCView';
import { SubView } from './SubView';
import { GuidedTour } from './GuidedTour';
import { DemoControlsBar } from './DemoControlsBar';

type LayoutMode = 'single' | 'split';

const ROLE_STYLES = {
    gc: {
        label: 'General Contractor',
        badgeClass: 'border-blue-500/40 bg-blue-500/15 text-blue-200',
        dot: 'bg-blue-400',
    },
    'apex-electrical': {
        label: 'Apex Electrical',
        badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
        dot: 'bg-amber-400',
    },
    'blueline-mechanical': {
        label: 'BlueLine Mechanical',
        badgeClass: 'border-teal-500/40 bg-teal-500/15 text-teal-200',
        dot: 'bg-teal-400',
    },
} as const;

const DemoLayout: React.FC = () => {
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
    const activeRole = useDemoStore((s) => s.activeRole);
    const setActiveRole = useDemoStore((s) => s.setActiveRole);
    const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
    const [splitSub, setSplitSub] = useState<'apex-electrical' | 'blueline-mechanical'>('apex-electrical');
    const [isTourActive, setIsTourActive] = useState(false);


    const roleStyle = ROLE_STYLES[activeRole];

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 pb-20">
            <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 flex-shrink-0">
                        Demo
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-slate-50 truncate">
                            Lookahead Review — Live Demo
                        </h1>
                        <p className="text-xs text-slate-400 truncate">
                            {DEMO_PROJECT.shortName} · {DEMO_LOOKAHEAD_WINDOW.label}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Role switcher */}
                    <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 gap-0.5">
                        <button
                            type="button"
                            id="demo-role-gc"
                            onClick={() => setActiveRole('gc')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                activeRole === 'gc'
                                    ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                        >
                            GC
                        </button>
                        <button
                            type="button"
                            id="demo-role-apex"
                            onClick={() => setActiveRole('apex-electrical')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                activeRole === 'apex-electrical'
                                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                        >
                            Apex
                        </button>
                        <button
                            type="button"
                            id="demo-role-blueline"
                            onClick={() => setActiveRole('blueline-mechanical')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                activeRole === 'blueline-mechanical'
                                    ? 'bg-teal-500/20 text-teal-200 border border-teal-500/30'
                                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                        >
                            BlueLine
                        </button>
                    </div>

                    {/* Active role badge */}
                    <div className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${roleStyle.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${roleStyle.dot}`} />
                        {roleStyle.label}
                    </div>

                    <button
                        type="button"
                        onClick={() => setLayoutMode(layoutMode === 'single' ? 'split' : 'single')}
                        className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                        aria-label="Toggle layout mode"
                    >
                        {layoutMode === 'single' ? 'Split' : 'Single'}
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
                    <a
                        href="/"
                        className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Exit demo
                    </a>
                </div>
            </header>

            <main className="flex-1 flex flex-col px-6 py-4 gap-4">
                <div className="flex-1 flex gap-4">
                    {layoutMode === 'single' ? (
                        <div key={activeRole} className="w-full max-w-5xl mx-auto animate-[fade_120ms_ease-out]">
                            {activeRole === 'gc' ? <GCView /> : <SubView key={activeRole} subId={activeRole} />}
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
                                    <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setSplitSub('apex-electrical')}
                                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                                splitSub === 'apex-electrical'
                                                    ? 'bg-amber-500/20 text-amber-200'
                                                    : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            Apex
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSplitSub('blueline-mechanical')}
                                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                                splitSub === 'blueline-mechanical'
                                                    ? 'bg-teal-500/20 text-teal-200'
                                                    : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            BlueLine
                                        </button>
                                    </div>
                                </div>
                                <SubView key={splitSub} subId={splitSub} />
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


