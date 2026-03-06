import React, { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/utils';

interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  open: controlledOpen,
  onOpenChange,
  align = 'start',
  sideOffset = 4,
  className,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let left = rect.left;
      
      // Basic alignment logic
      if (align === 'center') {
          left = rect.left + rect.width / 2; // Note: requires content centering logic which we'll skip for now to keep it simple like StatusSelector
      } else if (align === 'end') {
          left = rect.right; // Requires subtracting content width, will handle this simply by default align start
      }

      setCoords({
        top: rect.bottom + sideOffset,
        left: left,
        width: rect.width
      });
    }
  }, [align, sideOffset]);

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, updateCoords]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && 
        !triggerRef.current.contains(event.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) updateCoords();
    };
    const handleResize = () => {
        if (isOpen) updateCoords();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateCoords, setOpen]);

  return (
    <>
      <div ref={triggerRef} onClick={() => setOpen(!isOpen)} className="inline-block w-full">
        {trigger}
      </div>
      {isOpen && createPortal(
        <div
          ref={contentRef}
          className={cn(
            "fixed z-50 rounded-md border border-slate-200 bg-white shadow-md outline-none animate-in fade-in-0 zoom-in-95",
            className
          )}
          style={{
            top: coords.top,
            left: coords.left,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};