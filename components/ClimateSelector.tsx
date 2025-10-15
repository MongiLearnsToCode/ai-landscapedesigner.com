import React from 'react';

interface ClimateSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const PREDEFINED_CLIMATES = ['Temperate', 'Arid', 'Tropical', 'Mediterranean', 'Continental'];

export const ClimateSelector: React.FC<ClimateSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="climate-zone" className="block text-sm font-medium text-slate-700 mb-1.5">
          Location or Climate Zone
        </label>
        <input
          type="text"
          id="climate-zone"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., Southern California"
          className="w-full h-11 px-4 py-2 text-sm text-slate-800 bg-slate-100/80 border border-transparent rounded-lg outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
        />
        <p className="text-xs text-slate-400 mt-1.5">
          Helps the AI choose appropriate plants.
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-2">Or select a general climate type:</p>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_CLIMATES.map((climate) => (
            <button
              key={climate}
              type="button"
              onClick={() => onChange(climate)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
                value === climate
                  ? 'bg-slate-800 text-white border-transparent'
                  : 'bg-slate-100/80 text-slate-600 border-slate-200/80 hover:bg-slate-200'
              }`}
            >
              {climate}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
