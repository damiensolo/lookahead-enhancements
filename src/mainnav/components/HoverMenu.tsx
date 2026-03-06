import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

// --- Type Definitions ---
export interface PrimaryMenuItemData {
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    navIcon: React.ReactNode;
}

export interface MoreItem {
    key: 'more';
    title: 'More';
    items: string[];
}
export interface StandardCategoryData {
    key: string;
    title: string;
    mainIcon: React.ReactNode;
    items: PrimaryMenuItemData[];
}

export type CategoryData = StandardCategoryData | MoreItem;

interface HoverMenuProps {
    navigationData: { [key: string]: CategoryData };
    menuLayout: { [key: string]: string[] };
    onSelect: (categoryKey: string, subcategoryKey: string) => void;
    top: number;
    left: number;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

interface PrimaryMenuItemProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

// --- Component for Primary Menu Items ---
const PrimaryMenuItem: React.FC<PrimaryMenuItemProps> = ({ icon, label, description, onClick }) => (
    <a href="#" onClick={onClick} className="flex items-start gap-4 p-2 -m-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 group">
        {icon}
        <div>
            <h5 className="font-semibold text-gray-800 text-sm group-hover:text-blue-600">{label}</h5>
            <p className="text-gray-500 text-sm">{description}</p>
        </div>
    </a>
);

// --- Component for "More" section items ---
const MoreMenuItem: React.FC<{ label: string }> = ({ label }) => (
    <a href="#" className="block text-sm font-medium text-gray-600 hover:text-blue-600 py-1">{label}</a>
);


// --- Helper to render a column ---
const renderColumn = (columnKeys: string[], navigationData: HoverMenuProps['navigationData'], onSelect: HoverMenuProps['onSelect']) => {
  return columnKeys.map(key => {
    const category = navigationData[key];
    if (!category) return null;

    return (
        <div key={category.key} className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{category.title}</h4>
             {category.key === 'more'
                ? (category as MoreItem).items.map(item => <MoreMenuItem key={item} label={item} />)
                : (category as StandardCategoryData).items.map(item => (
                    <PrimaryMenuItem 
                        key={item.key} 
                        icon={item.icon} 
                        label={item.label} 
                        description={item.description}
                        onClick={(e) => {
                            e.preventDefault();
                            onSelect(category.key, item.key);
                        }}
                    />
                  ))
            }
        </div>
    );
  });
};


// --- Main Component Definition ---
const HoverMenu: React.FC<HoverMenuProps> = ({ navigationData, menuLayout, onSelect, top, left, onMouseEnter, onMouseLeave }) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed mt-4 bg-white rounded-xl shadow-2xl p-8 z-[9999] origin-top-left"
            style={{ top, left }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="grid grid-cols-3 gap-x-8 text-black" style={{minWidth: '850px'}}>
                <div className="space-y-8 border-r border-gray-100 pr-8">
                    {renderColumn(menuLayout.column1, navigationData, onSelect)}
                </div>
                <div className="space-y-8 border-r border-gray-100 pr-8">
                    {renderColumn(menuLayout.column2, navigationData, onSelect)}
                </div>
                <div className="space-y-8">
                    {renderColumn(menuLayout.column3, navigationData, onSelect)}
                </div>
            </div>
        </motion.div>,
        document.body
    );
};

export default HoverMenu;