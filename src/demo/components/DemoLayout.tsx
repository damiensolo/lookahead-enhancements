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
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
    },
    'apex-electrical': {
        label: 'Apex Electrical',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
    },
    'blueline-mechanical': {
        label: 'BlueLine Mechanical',
        badgeClass: 'border-teal-200 bg-teal-50 text-teal-700',
        dot: 'bg-teal-500',
    },
} as const;

const DemoLayout: React.FC = () => {
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
    const activeRole = useDemoStore((s) => s.activeRole);
    const setActiveRole = useDemoStore((s) => s.setActiveRole);
    const lookaheadStatus = useDemoStore((s) => s.lookaheadStatus);
    const [splitSub, setSplitSub] = useState<'apex-electrical' | 'blueline-mechanical'>('apex-electrical');
    const [isTourActive, setIsTourActive] = useState(false);


    const isSplit = layoutMode === 'split';
    // In split mode, badge reflects whichever sub is active in the right panel
    const badgeRole = isSplit ? splitSub : activeRole;
    const roleStyle = ROLE_STYLES[badgeRole];

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 pb-20">
            <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 flex-shrink-0">
                        Demo
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-gray-900 truncate">
                            Lookahead Review — Live Demo
                        </h1>
                        <p className="text-xs text-gray-500 truncate">
                            {DEMO_PROJECT.shortName} · {DEMO_LOOKAHEAD_WINDOW.label}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Role switcher — adapts to layout mode */}
                    {isSplit ? (
                        /* Split mode: GC is always left panel, toggle only the sub panel */
                        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
                            <button
                                type="button"
                                onClick={() => setSplitSub('apex-electrical')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                    splitSub === 'apex-electrical'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'text-gray-500 hover:text-gray-700 border border-transparent'
                                }`}
                            >
                                Apex
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitSub('blueline-mechanical')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                    splitSub === 'blueline-mechanical'
                                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                        : 'text-gray-500 hover:text-gray-700 border border-transparent'
                                }`}
                            >
                                BlueLine
                            </button>
                        </div>
                    ) : (
                        /* Single mode: full GC / Apex / BlueLine switcher */
                        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
                            <button
                                type="button"
                                id="demo-role-gc"
                                onClick={() => setActiveRole('gc')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                    activeRole === 'gc'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'text-gray-500 hover:text-gray-700 border border-transparent'
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
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'text-gray-500 hover:text-gray-700 border border-transparent'
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
                                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                        : 'text-gray-500 hover:text-gray-700 border border-transparent'
                                }`}
                            >
                                BlueLine
                            </button>
                        </div>
                    )}

                    {/* Active role badge */}
                    <div className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${roleStyle.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${roleStyle.dot}`} />
                        {roleStyle.label}
                    </div>

                    <button
                        type="button"
                        onClick={() => setLayoutMode(layoutMode === 'single' ? 'split' : 'single')}
                        className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label="Toggle layout mode"
                    >
                        {layoutMode === 'single' ? 'Split' : 'Single'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsTourActive((v) => !v)}
                        className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                            isTourActive
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        aria-label="Toggle guided tour"
                    >
                        Guide Me
                    </button>
                    <a
                        href="/"
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
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


