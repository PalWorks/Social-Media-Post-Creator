import React from 'react';
import { PostTone } from '../types';

interface ToneSelectorProps {
  selected: PostTone;
  onSelect: (tone: PostTone) => void;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="mb-6">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Select Tone
      </label>
      <div className="flex flex-wrap gap-3">
        {Object.values(PostTone).map((tone) => (
          <button
            key={tone}
            onClick={() => onSelect(tone)}
            className={`
              px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200
              ${selected === tone 
                ? 'bg-slate-800 text-white border-slate-800 shadow-sm ring-2 ring-slate-200 ring-offset-1' 
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300'
              }
            `}
          >
            {tone}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToneSelector;