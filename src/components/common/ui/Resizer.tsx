
import React from 'react';

interface ResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isActive: boolean;
}

export const Resizer: React.FC<ResizerProps> = ({ onMouseDown, isActive }) => (
  <div
    onMouseDown={onMouseDown}
    onClick={(e) => e.stopPropagation()}
    className={`absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-400 ${isActive ? 'bg-blue-400' : ''}`}
    style={{ zIndex: 10 }}
  />
);
