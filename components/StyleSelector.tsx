import React from 'react';
import { LANDSCAPING_STYLES } from '../constants';
import type { LandscapingStyle } from '../types';
import { useToast } from '../contexts/ToastContext';

interface StyleSelectorProps {
  selectedStyles: LandscapingStyle[];
  onStylesChange: (styles: LandscapingStyle[]) => void;
  allowStructuralChanges: boolean;
  onAllowStructuralChanges: (allow: boolean) => void;
  lockAspectRatio: boolean;
  onLockAspectRatioChange: (lock: boolean) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyles,
  onStylesChange,
  allowStructuralChanges,
  onAllowStructuralChanges,
  lockAspectRatio,
  onLockAspectRatioChange,
}) => {
  const { addToast } = useToast();
  const MAX_STYLES = 2;

  const handleStyleToggle = (styleId: LandscapingStyle) => {
    const isSelected = selectedStyles.includes(styleId);
    let newStyles: LandscapingStyle[];

    if (isSelected) {
      if (selectedStyles.length === 1) {
        addToast("At least one style must be selected.", "info");
        return;
      }
      newStyles = selectedStyles.filter(s => s !== styleId);
    } else {
      if (selectedStyles.length >= MAX_STYLES) {
        addToast(`You can select up to ${MAX_STYLES} styles.`, "info");
        return;
      }
      newStyles = [...selectedStyles, styleId];
    }
    onStylesChange(newStyles);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANDSCAPING_STYLES.map((style) => {
            const isSelected = selectedStyles.includes(style.id);
            return (
              <button
                key={style.id}
                onClick={() => handleStyleToggle(style.id)}
                className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
                  isSelected
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-100/80 text-slate-700 border-slate-200/80 hover:bg-slate-200'
                }`}
                aria-pressed={isSelected}
              >
                {style.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-center text-slate-400 mt-3">
            Select up to {MAX_STYLES} styles to combine.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={allowStructuralChanges}
              onChange={(e) => onAllowStructuralChanges(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-700"
            />
            <span className="ml-3 text-sm text-slate-700">
              Allow structural changes
            </span>
          </label>
           <p className="text-xs text-slate-400 mt-1 ml-7">
              E.g., adding walls, gates, or removing objects.
          </p>
        </div>
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={lockAspectRatio}
              onChange={(e) => onLockAspectRatioChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-700"
            />
            <span className="ml-3 text-sm text-slate-700">
              Lock aspect ratio
            </span>
          </label>
           <p className="text-xs text-slate-400 mt-1 ml-7">
              Preserves the original image's dimensions.
          </p>
        </div>
      </div>
    </div>
  );
};
