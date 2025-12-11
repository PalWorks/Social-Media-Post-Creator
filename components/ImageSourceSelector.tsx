import React from 'react';
import { ImageOption } from '../types';
import { Ban, Globe, Upload, Sparkles } from 'lucide-react';

interface ImageSourceSelectorProps {
  selected: ImageOption;
  onSelect: (option: ImageOption) => void;
  hasSourceUrl: boolean;
}

const ImageSourceSelector: React.FC<ImageSourceSelectorProps> = ({ selected, onSelect, hasSourceUrl }) => {
  const options = [
    { id: ImageOption.None, label: 'No Image', icon: Ban, disabled: false },
    { 
      id: ImageOption.FromSource, 
      label: 'From Article', 
      icon: Globe, 
      disabled: !hasSourceUrl,
      title: !hasSourceUrl ? "Please enter a Source URL first" : "Use image from the article"
    },
    { id: ImageOption.Custom, label: 'Upload', icon: Upload, disabled: false },
    { id: ImageOption.Auto, label: 'Auto AI', icon: Sparkles, disabled: false },
  ];

  return (
    <div className="mb-6">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Image Source
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.id;
          const isDisabled = opt.disabled;

          return (
            <button
              key={opt.id}
              onClick={() => !isDisabled && onSelect(opt.id)}
              disabled={isDisabled}
              title={opt.title}
              className={`
                flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all duration-200 gap-2
                ${isDisabled 
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60' 
                  : isSelected 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white hover:border-slate-300'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isDisabled ? 'text-slate-300' : isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-xs font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ImageSourceSelector;