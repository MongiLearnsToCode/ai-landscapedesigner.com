import React, { useState, useLayoutEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import type { HistoryItem } from '../types';
import { HistoryGalleryItem } from './HistoryGalleryItem';
import { GalleryHorizontal } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface HistoryGalleryProps {
  items: HistoryItem[];
  onItemClick: (item: HistoryItem) => void;
}

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({ items, onItemClick }) => {
  const { navigateTo } = useApp();
  const { isSignedIn } = useUser();
  const gridRef = useRef<HTMLDivElement>(null);
  // Default to 6 to maintain existing behavior on smaller screens
  const [visibleItemCount, setVisibleItemCount] = useState(6);

  // For now, assume all users need to subscribe to access full history
  // This can be updated later to check actual subscription status
  const hasFullAccess = false;

  useLayoutEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const calculateVisibleItems = () => {
      // Check for desktop breakpoint (xl: 1280px)
      if (window.matchMedia('(min-width: 1280px)').matches) {
        const containerHeight = gridEl.clientHeight;
        const containerWidth = gridEl.clientWidth;
        
        if (containerHeight === 0 || containerWidth === 0 || !gridEl.firstElementChild) {
             // If grid is not rendered or has no items, we can't calculate.
            setVisibleItemCount(0);
            return;
        };

        const style = window.getComputedStyle(gridEl);
        // On xl, grid-cols-3 applies from md breakpoint
        const columns = style.gridTemplateColumns.split(' ').length || 3;
        const gap = parseFloat(style.gap) || 16; // 1rem from gap-4

        const itemWidth = (containerWidth - (gap * (columns - 1))) / columns;
        const itemHeight = itemWidth / (16 / 9); // aspect-video is 16:9
        const itemHeightWithGap = itemHeight + gap;
        
        if (itemHeightWithGap <= 0) return;
        
        // Add gap to height because the last row doesn't have a gap after it
        const rowCount = Math.floor((containerHeight + gap) / itemHeightWithGap);
        
        const maxItems = Math.max(0, rowCount * columns);
        setVisibleItemCount(maxItems);
      } else {
        // Fallback for smaller screens, show the original amount (up to 6)
        setVisibleItemCount(6);
      }
    };

    // Run calculation once attached
    calculateVisibleItems();

    // Use ResizeObserver to automatically recalculate on size changes
    const resizeObserver = new ResizeObserver(calculateVisibleItems);
    resizeObserver.observe(gridEl);

    // Cleanup observer on unmount
    return () => resizeObserver.disconnect();
  }, [items]); // Rerun if the items array changes (e.g., from empty to populated)

  const itemsToShow = items.slice(0, visibleItemCount);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 xl:h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <GalleryHorizontal className="h-5 w-5 mr-2 text-slate-500" />
            Your Recent Designs
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Click a design to load it, or view all your projects.
          </p>
        </div>
        <div className="flex flex-col">
          <button 
            onClick={hasFullAccess ? () => navigateTo('history') : undefined}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex-shrink-0 ${
              hasFullAccess 
                ? 'text-slate-700 bg-slate-100 hover:bg-slate-200' 
                : 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
            }`}
            disabled={!hasFullAccess}
          >
            View All Projects
          </button>
          {!hasFullAccess && (
            <p className="text-xs text-slate-500 mt-2 text-right">
              <button 
                onClick={() => navigateTo('pricing')}
                className="text-orange-500 hover:text-orange-600 underline"
              >
                Sign up and subscribe
              </button>{' '}
              to access your full project history
            </p>
          )}
        </div>
      </div>
      
      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-grow min-h-0 overflow-y-hidden">
        {itemsToShow.map(item => (
          <HistoryGalleryItem key={item.id} item={item} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};
