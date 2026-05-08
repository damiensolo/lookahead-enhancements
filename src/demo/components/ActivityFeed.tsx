import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityEntry, DEMO_SUBS } from '../data/lookahead-demo-data';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function actorLabel(actor: ActivityEntry['actor']) {
  if (actor === 'gc') return 'GC';
  return DEMO_SUBS[actor]?.name ?? actor;
}

export const ActivityFeed: React.FC<{ entries: ActivityEntry[] }> = ({ entries }) => {
  const top = entries[0]?.id;
  const prevTopRef = useRef<string | undefined>(undefined);
  const highlightId = useMemo(() => (prevTopRef.current && prevTopRef.current !== top ? top : undefined), [top]);

  useEffect(() => {
    prevTopRef.current = top;
  }, [top]);

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-700">Activity</div>
        <div className="text-[11px] text-gray-400">{entries.length} events</div>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {entries.length === 0 ? (
          <div className="text-xs text-gray-400">No activity yet.</div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className={[
                'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2',
                e.id === highlightId ? 'animate-[slideIn_180ms_ease-out]' : '',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[11px] font-semibold text-gray-700 truncate">{actorLabel(e.actor)}</div>
                <div className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(e.at)}</div>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{e.message}</div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </aside>
  );
};

