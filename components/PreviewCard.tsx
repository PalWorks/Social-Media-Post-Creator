
import React, { useState } from 'react';
import { SocialPlatform, PostContent } from '../types';
import { Twitter, Linkedin, Instagram, Facebook, Heart, MessageCircle, Share2, MoreHorizontal, Copy, Check, Download, Trash2 } from 'lucide-react';

interface PreviewCardProps {
  content: PostContent;
  isGeneratingImage?: boolean;
  className?: string;
  onClear?: () => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ content, isGeneratingImage = false, className = '', onClear }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const fullText = `${content.generatedText}\n\n${content.hashtags.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content.generatedImageBase64) return;
    
    const link = document.createElement('a');
    link.href = content.generatedImageBase64;
    link.download = `social-morph-${Date.now()}.png`;
    // For external URLs, this might open in new tab instead of downloading due to CORS, which is acceptable fallback.
    link.target = "_blank"; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ClearButton = () => {
    if (!onClear) return null;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 mr-1"
        title="Clear Preview"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  };

  const renderHeader = () => {
    switch (content.platform) {
      case SocialPlatform.Twitter:
        return (
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                <img src="https://picsum.photos/40/40" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-slate-900">User Name <span className="text-blue-500 text-[10px]">✔</span></div>
                <div className="text-slate-500 text-sm">@username</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ClearButton />
              <Twitter className="w-5 h-5 text-sky-500" />
            </div>
          </div>
        );
      case SocialPlatform.LinkedIn:
        return (
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-slate-200 overflow-hidden">
                 <img src="https://picsum.photos/40/40" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-slate-900 text-sm">User Name</div>
                <div className="text-slate-500 text-xs">Product Designer at Tech Co.</div>
                <div className="text-slate-400 text-xs flex items-center gap-1">1h • <span className="text-xs">🌐</span></div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ClearButton />
              <Linkedin className="w-5 h-5 text-blue-700" />
            </div>
          </div>
        );
      case SocialPlatform.Instagram:
        return (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                <div className="w-full h-full bg-white rounded-full p-[2px]">
                   <img src="https://picsum.photos/32/32" alt="Avatar" className="w-full h-full rounded-full object-cover" />
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-900">username</div>
            </div>
            <div className="flex items-center gap-1">
              <ClearButton />
              <MoreHorizontal className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        );
      case SocialPlatform.Facebook:
        return (
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                 <img src="https://picsum.photos/40/40" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-slate-900 text-sm">User Name</div>
                <div className="text-slate-500 text-xs flex items-center gap-1">1h • <span>🌎</span></div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ClearButton />
              <Facebook className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        );
    }
  };

  const renderFooter = () => {
    const iconClass = "w-5 h-5 text-slate-500 hover:text-slate-700 cursor-pointer transition-colors";
    
    // Generic footer for demo, stylized slightly per platform
    return (
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 mt-auto">
        <div className="flex items-center gap-6">
          <Heart className={iconClass} />
          <MessageCircle className={iconClass} />
          <Share2 className={iconClass} />
        </div>
        {content.platform === SocialPlatform.LinkedIn && (
          <div className="text-xs text-slate-400">84 comments</div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg hover:bg-slate-700 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy Text'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
        {renderHeader()}
        
        <div className="space-y-3 flex-1">
          <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
            {content.generatedText}
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {content.hashtags.map((tag, idx) => (
              <span key={idx} className="text-blue-500 text-sm hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>

          {content.generatedImageBase64 ? (
            <div className={`mt-3 relative group/image overflow-hidden rounded-lg border border-slate-100 ${content.platform === SocialPlatform.Instagram ? 'aspect-square' : 'aspect-video'}`}>
              <img 
                src={content.generatedImageBase64} 
                alt="Generated Content" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Overlay with Download Button */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-all duration-300 flex items-center justify-center">
                 <button 
                   onClick={handleDownloadImage}
                   className="bg-white/90 text-slate-700 p-2.5 rounded-full shadow-lg hover:bg-white hover:text-indigo-600 hover:scale-110 transform translate-y-4 group-hover/image:translate-y-0 transition-all duration-300 pointer-events-auto"
                   title="Download Image"
                 >
                   <Download className="w-5 h-5" />
                 </button>
              </div>
            </div>
          ) : isGeneratingImage ? (
             <div className="mt-3 aspect-video bg-slate-100 rounded-lg animate-pulse flex items-center justify-center text-slate-400 text-xs">
                Generating visual...
             </div>
          ) : null}
        </div>

        {renderFooter()}
      </div>
    </div>
  );
};

export default PreviewCard;
