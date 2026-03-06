import React, { useState, useRef, useEffect } from 'react';
import { View } from '../../types';
import { PlusIcon, MoreHorizontalIcon } from '../common/Icons';

interface ViewTabsProps {
  views: View[];
  activeViewId: string;
  defaultViewId: string | null;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
  onRenameView: (view: View) => void;
  onDeleteView: (id: string) => void;
  onSetDefaultView: (id: string) => void;
  onReorderViews: (views: View[]) => void;
}

const TabMenu: React.FC<{ view: View, isDefault: boolean, onRename: () => void, onDelete: () => void, onSetDefault: () => void, canDelete: boolean }> = 
({ view, isDefault, onRename, onDelete, onSetDefault, canDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuWrapperRef = useRef<HTMLDivElement>(null);
  const [positionClass, setPositionClass] = useState('left-0');

  useEffect(() => {
    if (isOpen && menuWrapperRef.current) {
      const rect = menuWrapperRef.current.getBoundingClientRect();
      // w-40 is 10rem = 160px. Add a buffer for scrollbars etc.
      if (rect.left + 160 > window.innerWidth) {
        setPositionClass('right-0');
      } else {
        setPositionClass('left-0');
      }
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuWrapperRef.current && !menuWrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if(isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);


  return (
    <div ref={menuWrapperRef} className="relative">
      <button onClick={() => setIsOpen(prev => !prev)} className="p-1 rounded-md hover:bg-gray-200">
        <MoreHorizontalIcon className="w-4 h-4 text-gray-500" />
      </button>
      {isOpen && (
        <div className={`absolute top-full mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-30 ${positionClass}`}>
          <ul className="py-1">
            <li className="px-3 py-1.5 text-sm text-gray-700">
              {isDefault ? 'Default view' : 'Set as default'}
              {!isDefault && <button onClick={() => { onSetDefault(); setIsOpen(false); }} className="absolute inset-0 w-full h-full"></button>}
            </li>
            <li className="relative px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"><button onClick={() => { onRename(); setIsOpen(false); }} className="absolute inset-0 w-full h-full text-left px-3"></button>Rename</li>
            {canDelete && <li className="relative px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><button onClick={() => { onDelete(); setIsOpen(false); }} className="absolute inset-0 w-full h-full text-left px-3"></button>Delete</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

const ViewTabs: React.FC<ViewTabsProps> = ({ views, activeViewId, defaultViewId, onSelectView, onCreateView, onRenameView, onDeleteView, onSetDefaultView, onReorderViews }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDropIndex(index);
  };
  
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newViews = [...views];
    const [draggedItem] = newViews.splice(draggedIndex, 1);
    newViews.splice(index, 0, draggedItem);
    onReorderViews(newViews);
    
    setDraggedIndex(null);
    setDropIndex(null);
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <nav className="flex items-center gap-1" onDragLeave={() => setDropIndex(null)}>
        {views.map((view, index) => {
          const isActive = view.id === activeViewId;
          const isDropTarget = dropIndex === index;
          const isBeingDragged = draggedIndex === index;

          return (
            <div
              key={view.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => { setDraggedIndex(null); setDropIndex(null); }}
              className={`flex items-center rounded-md transition-all duration-150 ${ isBeingDragged ? 'opacity-50' : '' } ${ isDropTarget ? 'bg-gray-300' : '' } ${ isActive ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-gray-200'}`}
            >
              <button
                onClick={() => onSelectView(view.id)}
                className={`px-3 py-1.5 text-sm font-medium text-gray-800 rounded-l-md`}
              >
                {view.name}
              </button>
              <div className="pr-1">
                 <TabMenu 
                  view={view}
                  isDefault={view.id === defaultViewId}
                  onRename={() => onRenameView(view)}
                  onDelete={() => onDeleteView(view.id)}
                  onSetDefault={() => onSetDefaultView(view.id)}
                  canDelete={views.length > 1}
                 />
              </div>
            </div>
          );
        })}
      </nav>
      <button onClick={onCreateView} className="ml-1 p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800">
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewTabs;