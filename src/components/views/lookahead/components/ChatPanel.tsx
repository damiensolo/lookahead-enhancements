import React, { useState, useRef, useEffect } from 'react';
import { XIcon } from '../../../common/Icons';

interface ChatMessage {
    id: string;
    author: string;
    company: string;
    role: 'gc' | 'sc';
    text: string;
    timestamp: Date;
    taskRef?: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
    {
        id: '1',
        author: 'Marcus Rivera',
        company: 'Turner Construction',
        role: 'gc',
        text: 'Hey team — confirming Week 12 lookahead is published. Please review your assigned tasks and commit by EOD Thursday.',
        timestamp: new Date('2026-03-16T08:12:00'),
    },
    {
        id: '2',
        author: 'Jess Park',
        company: 'EliteMEP',
        role: 'sc',
        text: 'Noted. We have a concern on the HVAC rough-in task — our duct fabrication lead time pushed out by 3 days. Proposing a shift to the 20th.',
        timestamp: new Date('2026-03-16T09:04:00'),
        taskRef: 'HVAC Rough-In – Level 3',
    },
    {
        id: '3',
        author: 'Marcus Rivera',
        company: 'Turner Construction',
        role: 'gc',
        text: 'Got it. Can you attach the updated delivery confirmation to the task? I need it before I can approve the shift.',
        timestamp: new Date('2026-03-16T09:31:00'),
        taskRef: 'HVAC Rough-In – Level 3',
    },
    {
        id: '4',
        author: 'Jess Park',
        company: 'EliteMEP',
        role: 'sc',
        text: "Will do, uploading now. Also — the electrical rough-in on Level 2 is on track, no changes needed there.",
        timestamp: new Date('2026-03-16T10:15:00'),
    },
    {
        id: '5',
        author: 'Derek Okonkwo',
        company: 'ProSteel Inc.',
        role: 'sc',
        text: 'Steel erection for grid lines E-H is committed as scheduled. Crew confirmed, materials staged.',
        timestamp: new Date('2026-03-17T07:48:00'),
    },
    {
        id: '6',
        author: 'Marcus Rivera',
        company: 'Turner Construction',
        role: 'gc',
        text: 'Great, thanks Derek. Jess — still waiting on that delivery confirmation.',
        timestamp: new Date('2026-03-17T08:20:00'),
    },
];

function formatTimestamp(date: Date): string {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today ${time}`;
    if (isYesterday) return `Yesterday ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(role: 'gc' | 'sc'): string {
    return role === 'gc' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700';
}

interface ChatPanelProps {
    onClose: () => void;
    currentUserRole: 'gc' | 'sc';
    currentUserName?: string;
    currentUserCompany?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    onClose,
    currentUserRole,
    currentUserName = 'You',
    currentUserCompany = '',
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        const text = draft.trim();
        if (!text) return;
        const newMsg: ChatMessage = {
            id: String(Date.now()),
            author: currentUserName,
            company: currentUserCompany,
            role: currentUserRole,
            text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMsg]);
        setDraft('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Group consecutive messages by the same author
    const groupedMessages = messages.reduce<{ msg: ChatMessage; showHeader: boolean }[]>((acc, msg, i) => {
        const prev = messages[i - 1];
        const showHeader = !prev || prev.author !== msg.author ||
            (msg.timestamp.getTime() - prev.timestamp.getTime()) > 5 * 60 * 1000;
        acc.push({ msg, showHeader });
        return acc;
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-800">Team Chat</h2>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 leading-none">
                        {messages.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    aria-label="Close chat"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {groupedMessages.map(({ msg, showHeader }) => {
                    const isOwn = msg.author === currentUserName;
                    return (
                        <div key={msg.id} className={`flex gap-3 ${showHeader ? 'mt-6 first:mt-0' : ''}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0 w-8 h-8 mt-0.5">
                                {showHeader ? (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(msg.role)}`}>
                                        {getInitials(msg.author)}
                                    </div>
                                ) : (
                                    <div className="w-8 h-8" /> /* spacer */
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 py-1">
                                {showHeader && (
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className={`text-sm font-semibold ${isOwn ? 'text-indigo-700' : 'text-gray-800'}`}>
                                            {isOwn ? 'You' : msg.author}
                                        </span>
                                        {msg.company && (
                                            <span className="text-xs text-gray-500">{msg.company}</span>
                                        )}
                                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                                            {formatTimestamp(msg.timestamp)}
                                        </span>
                                    </div>
                                )}

                                {msg.taskRef && (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 mb-2 rounded bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                        </svg>
                                        {msg.taskRef}
                                    </div>
                                )}

                                <p className="text-sm text-gray-700 leading-normal whitespace-pre-wrap break-words">
                                    {msg.text}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-gray-200 p-3">
                <div className="flex items-end gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-300 transition-all">
                    <textarea
                        ref={inputRef}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message the team… (Enter to send)"
                        rows={1}
                        className="flex-1 resize-none text-xs text-gray-700 placeholder-gray-400 bg-transparent leading-relaxed"
                        style={{ maxHeight: '80px', overflowY: 'auto' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!draft.trim()}
                        className="flex-shrink-0 p-1 rounded-md text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 px-0.5">Shift+Enter for new line</p>
            </div>
        </div>
    );
};

export default ChatPanel;
