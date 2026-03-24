import React from 'react';
import { motion } from 'framer-motion';

// --- Type Definitions ---
interface PrimaryMenuItemData {
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    navIcon: React.ReactNode;
}

interface MoreItem {
    key: 'more';
    title: 'More';
    items: string[];
}
interface StandardCategoryData {
    key: string;
    title: string;
    mainIcon: React.ReactNode;
    items: PrimaryMenuItemData[];
}

type CategoryData = StandardCategoryData | MoreItem;

interface HoverMenuProps {
    navigationData: { [key: string]: CategoryData };
    menuLayout: { [key: string]: string[] };
    onSelect: (categoryKey: string, subcategoryKey: string) => void;
    bookmarks?: Set<string>;
    onToggleBookmark?: (categoryKey: string, itemKey: string) => void;
}

interface PrimaryMenuItemProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
    categoryKey: string;
    itemKey: string;
    isBookmarked?: boolean;
    onToggleBookmark?: (categoryKey: string, itemKey: string) => void;
}

// Bookmark Icon Component
const BookmarkIcon: React.FC<{ filled: boolean; className?: string }> = ({ filled, className = '' }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill={filled ? "currentColor" : "none"} 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={className}
    >
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    </svg>
);

// --- Component for Primary Menu Items ---
const PrimaryMenuItem: React.FC<PrimaryMenuItemProps> = ({ 
    icon, 
    label, 
    description, 
    onClick, 
    categoryKey, 
    itemKey, 
    isBookmarked = false,
    onToggleBookmark 
}) => {
    const handleBookmarkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleBookmark?.(categoryKey, itemKey);
    };

    return (
        <a href="#" onClick={onClick} className="flex items-start gap-4 p-2 -m-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 group relative">
            {icon}
            <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                    <h5 className="font-semibold text-black text-sm group-hover:text-gray-700 transition-colors">{label}</h5>
                    {onToggleBookmark && (
                        <button
                            onClick={handleBookmarkClick}
                            className={`transition-opacity p-2 -m-1 hover:bg-gray-100 rounded touch-manipulation ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                        >
                            <BookmarkIcon 
                                filled={isBookmarked} 
                                className={`w-4 h-4 ${isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                            />
                        </button>
                    )}
                </div>
                <p className="text-gray-500 text-sm w-auto">{description}</p>
            </div>
        </a>
    );
};

// --- Component for "More" section items ---
const MoreMenuItem: React.FC<{ label: string }> = ({ label }) => (
    <a href="#" className="block text-sm font-medium text-black hover:text-gray-600 py-1 transition-colors">{label}</a>
);


// --- Helper to render a column ---
const renderColumn = (
    columnKeys: string[], 
    navigationData: HoverMenuProps['navigationData'], 
    onSelect: HoverMenuProps['onSelect'],
    bookmarks?: Set<string>,
    onToggleBookmark?: (categoryKey: string, itemKey: string) => void
) => {
  return columnKeys.map(key => {
    const category = navigationData[key];
    if (!category) return null;

    return (
        <div key={category.key} className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{category.title}</h4>
             {category.key === 'more'
                ? (category as MoreItem).items.map(item => <MoreMenuItem key={item} label={item} />)
                : (category as StandardCategoryData).items.map(item => {
                    const bookmarkKey = `${category.key}:${item.key}`;
                    const isBookmarked = bookmarks?.has(bookmarkKey) || false;
                    return (
                        <PrimaryMenuItem 
                            key={item.key} 
                            icon={item.icon} 
                            label={item.label} 
                            description={item.description}
                            categoryKey={category.key}
                            itemKey={item.key}
                            isBookmarked={isBookmarked}
                            onToggleBookmark={onToggleBookmark}
                            onClick={(e) => {
                                e.preventDefault();
                                onSelect(category.key, item.key);
                            }}
                        />
                    );
                  })
            }
        </div>
    );
  });
};


// --- Main Component Definition ---
const HoverMenu: React.FC<HoverMenuProps> = ({ navigationData, menuLayout, onSelect, bookmarks, onToggleBookmark }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 bg-white rounded-xl shadow-2xl p-4 md:p-6 lg:p-8 z-50 origin-top-left w-[calc(100vw-2rem)] md:w-auto md:min-w-[850px]"
            style={{ marginTop: '-2px' }}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 md:gap-x-6 lg:gap-x-8 text-black">
                <div className="space-y-6 md:space-y-8 border-r-0 md:border-r border-gray-100 pr-0 md:pr-6 lg:pr-8 pb-6 md:pb-0 border-b md:border-b-0 last:border-b-0 last:pb-0">
                    {renderColumn(menuLayout.column1, navigationData, onSelect, bookmarks, onToggleBookmark)}
                </div>
                <div className="space-y-6 md:space-y-8 border-r-0 md:border-r border-gray-100 pr-0 md:pr-6 lg:pr-8 pb-6 md:pb-0 border-b md:border-b-0 last:border-b-0 last:pb-0">
                    {renderColumn(menuLayout.column2, navigationData, onSelect, bookmarks, onToggleBookmark)}
                </div>
                <div className="space-y-6 md:space-y-8">
                    {renderColumn(menuLayout.column3, navigationData, onSelect, bookmarks, onToggleBookmark)}
                </div>
            </div>
        </motion.div>
    );
};

export default HoverMenu;
