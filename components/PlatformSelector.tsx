import React from 'react';
import { SocialPlatform } from '../types';
import { Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';

interface PlatformSelectorProps {
  selected: SocialPlatform;
  onSelect: (platform: SocialPlatform) => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ selected, onSelect }) => {
  const platforms = [
    { id: SocialPlatform.Twitter, icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-50', ring: 'ring-sky-200' },
    { id: SocialPlatform.LinkedIn, icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' },
    { id: SocialPlatform.Instagram, icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', ring: 'ring-pink-200' },
    { id: SocialPlatform.Facebook, icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  ];

  return (
    <div className="mb-6">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Select Platform
      </label>
      <div className="flex flex-wrap gap-4">
        {platforms.map((p) => {
          const Icon = p.icon;
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              title={p.id}
              className={`
                w-12 h-12 flex items-center justify-center rounded-xl border transition-all duration-200
                ${isSelected 
                  ? `border-transparent ${p.bg} ${p.ring} ring-2` 
                  : 'border-slate-200 hover:bg-white hover:border-slate-300 bg-slate-50 text-slate-400'
                }
              `}
            >
              <Icon className={`w-6 h-6 ${isSelected ? p.color : 'text-slate-400'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformSelector;