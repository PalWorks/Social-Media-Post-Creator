
import React, { useState, useRef, useEffect } from 'react';
import { SocialPlatform, PostTone, PostContent, GenerationState, ImageOption, TextModel, ImageModel } from './types';
import PlatformSelector from './components/PlatformSelector';
import ToneSelector from './components/ToneSelector';
import ImageSourceSelector from './components/ImageSourceSelector';
import PreviewCard from './components/PreviewCard';
import { generatePostText, generatePostImage } from './services/geminiService';
import { Sparkles, ArrowRight, Layout, Image as ImageIcon, Link as LinkIcon, FileText, AlertTriangle, Mic, MicOff, Cpu } from 'lucide-react';

const App: React.FC = () => {
  // Inputs
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  
  // Settings
  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.Twitter);
  const [tone, setTone] = useState<PostTone>(PostTone.Professional);
  const [imageOption, setImageOption] = useState<ImageOption>(ImageOption.Auto);
  
  // Models
  const [textModel, setTextModel] = useState<TextModel>(TextModel.Gemini25Flash);
  const [imageModel, setImageModel] = useState<ImageModel>(ImageModel.Gemini25FlashImage);
  
  // Specific image inputs
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [imageStyle, setImageStyle] = useState('');
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generationState, setGenerationState] = useState<GenerationState>({
    isGeneratingText: false,
    isGeneratingImage: false,
    error: null,
    warning: null,
  });

  const [generatedContent, setGeneratedContent] = useState<PostContent | null>(null);

  // Speech to text
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        let newContent = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newContent += event.results[i][0].transcript + ' ';
          }
        }
        
        if (newContent) {
           setTextInput(prev => {
             const trimmedNew = newContent.trim();
             if (!trimmedNew) return prev;
             // Add space if needed
             const prefix = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
             return prev + prefix + trimmedNew;
           });
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition", e);
        setIsListening(false);
      }
    }
  };

  const handleClear = () => {
    setGeneratedContent(null);
    setGenerationState({
      isGeneratingText: false,
      isGeneratingImage: false,
      error: null,
      warning: null,
    });
  };

  // Effect to handle disabling "FromSource" if URL is cleared
  useEffect(() => {
    if (!urlInput.trim() && imageOption === ImageOption.FromSource) {
      setImageOption(ImageOption.Auto);
    }
  }, [urlInput, imageOption]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImageBase64(reader.result as string);
        setCustomImageUrl(''); // Clear URL if file is uploaded
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    // Basic validation
    if (!textInput.trim() && !urlInput.trim()) return;

    setGenerationState({ isGeneratingText: true, isGeneratingImage: false, error: null, warning: null });
    setGeneratedContent(null);

    try {
      // 1. Generate Text and get metadata (including sourceImageUrl if found)
      const postData = await generatePostText(textInput, urlInput, platform, tone, textModel, imageStyle);
      
      let finalImageBase64: string | null = null;
      let warningMsg: string | null = null;

      // Handle URL Access Warning
      if (postData.urlAccessDenied) {
        warningMsg = "We couldn't access the content of the provided URL (it might be private). The post was generated based on your text input.";
      }
      
      // Handle Image Source Logic
      if (imageOption === ImageOption.None) {
        finalImageBase64 = null;
      } else if (imageOption === ImageOption.Custom) {
        // Prioritize Uploaded File, then Custom URL
        if (uploadedImageBase64) {
          finalImageBase64 = uploadedImageBase64;
        } else if (customImageUrl.trim()) {
          finalImageBase64 = customImageUrl.trim();
        }
      } else if (imageOption === ImageOption.FromSource) {
        // Use the URL extracted by Gemini, if any
        if (postData.sourceImageUrl) {
          finalImageBase64 = postData.sourceImageUrl;
        } else {
          // Fallback if no image found in source
          const imgWarning = "We couldn't find a usable image in the source article. Generated text post only.";
          warningMsg = warningMsg ? `${warningMsg} Also, ${imgWarning.toLowerCase()}` : imgWarning;
          console.warn("Gemini could not extract an image from the source URL.");
        }
      }

      const newContent: PostContent = {
        originalText: textInput || urlInput, 
        generatedText: postData.text,
        hashtags: postData.hashtags,
        generatedImageBase64: finalImageBase64,
        platform,
        tone,
        imageOption
      };
      
      setGeneratedContent(newContent);
      setGenerationState(prev => ({ 
        ...prev, 
        isGeneratingText: false, 
        isGeneratingImage: imageOption === ImageOption.Auto,
        warning: warningMsg
      }));

      // 2. Generate AI Image if selected
      if (imageOption === ImageOption.Auto) {
        try {
          const imageBase64 = await generatePostImage(postData.imagePrompt, imageModel);
          setGeneratedContent(prev => prev ? { ...prev, generatedImageBase64: imageBase64 } : null);
        } catch (imgError) {
          console.error("Image generation failed", imgError);
          setGenerationState(prev => ({ ...prev, warning: "AI Image generation failed. Generated text post only." }));
        } finally {
          setGenerationState(prev => ({ ...prev, isGeneratingImage: false }));
        }
      }

    } catch (error: any) {
      // Only log errors that are not expected user validation errors
      const errorMessage = error.message || "Failed to generate content. Please try again.";
      
      if (!errorMessage.includes("Unable to access")) {
        console.error(error);
      }
      
      setGenerationState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isGeneratingText: false 
      }));
    }
  };

  const isFormValid = () => {
    const hasContent = textInput.trim().length > 0 || urlInput.trim().length > 0;
    
    // Check image requirements
    let imageValid = true;
    if (imageOption === ImageOption.Custom && !uploadedImageBase64 && !customImageUrl.trim()) imageValid = false;
    if (imageOption === ImageOption.FromSource && !urlInput.trim()) imageValid = false;

    return hasContent && imageValid;
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 sm:px-6">
      
      {/* Increased bottom margin to make room for absolute positioned buttons on desktop */}
      <header className="mb-14 text-center max-w-2xl">
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-4">
          <Sparkles className="w-6 h-6 text-indigo-500 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Social Media Content Creator App</h1>
        </div>
        <p className="text-slate-500 text-sm sm:text-base">
          Convert URLs and thoughts into optimized social media posts with visuals.
        </p>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Input & Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 z-10 h-full">
          {/* Inner sticky wrapper for controls */}
          <div className="sticky top-10">
            <div className="mb-6 space-y-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Content Source
              </label>
              
              {/* URL Input */}
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                  type="url"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  placeholder="https://example.com/article"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>

              {/* Text Input */}
              <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea
                    className="w-full pl-10 pr-4 py-3 h-32 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    placeholder="Add your thoughts, summary, or raw text content here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                  <button
                      onClick={toggleListening}
                      className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-200 flex items-center justify-center ${
                          isListening 
                          ? 'bg-red-50 text-red-600 animate-pulse ring-2 ring-red-100' 
                          : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                      title={isListening ? "Stop listening" : "Start speech to text"}
                  >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                Provide a URL, Text, or both.
              </p>
            </div>

            <PlatformSelector selected={platform} onSelect={setPlatform} />
            <ToneSelector selected={tone} onSelect={setTone} />
            
            <ImageSourceSelector 
              selected={imageOption} 
              onSelect={setImageOption} 
              hasSourceUrl={urlInput.trim().length > 0} 
            />

            {/* Conditional Inputs based on Image Option */}
            {imageOption === ImageOption.Auto && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Visual Style
                </label>
                <input
                  type="text"
                  className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Minimalist line art, Cyberpunk, Black & White sketch..."
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                />
              </div>
            )}

            {/* Combined Upload UI (File OR URL) */}
            {imageOption === ImageOption.Custom && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                
                {/* Option A: File Upload */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Upload from Computer
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-xs file:font-semibold
                        file:bg-white file:text-indigo-700
                        file:border file:border-indigo-100
                        hover:file:bg-indigo-50
                      "
                    />
                    {uploadedImageBase64 && (
                      <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-white">
                        <img src={uploadedImageBase64} alt="Preview" className="w-full h-full object-contain" />
                        <button 
                          onClick={() => setUploadedImageBase64(null)}
                          className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full text-xs hover:bg-black/70"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                </div>

                <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full absolute"></div>
                    <span className="bg-slate-50 px-2 text-xs text-slate-400 relative z-10 font-medium">OR</span>
                </div>

                {/* Option B: Direct Image URL */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Paste Image Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        disabled={!!uploadedImageBase64}
                        className="flex-1 p-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder="https://..."
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                      />
                    </div>
                    {!!uploadedImageBase64 && (
                        <p className="text-[10px] text-orange-500 mt-1">
                          Clear uploaded image to use link instead.
                        </p>
                    )}
                </div>
              </div>
            )}

            {/* Info for From Source */}
            {imageOption === ImageOption.FromSource && (
              <div className="mb-6 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  We will analyze the article at the provided URL and attempt to extract its main featured image for your post.
                </p>
              </div>
            )}

            {/* Model Settings */}
            <div className="mb-8 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-2 mb-4">
                 <Cpu className="w-4 h-4 text-slate-400" />
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Model Settings</span>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Text Model</label>
                   <select 
                    value={textModel}
                    onChange={(e) => setTextModel(e.target.value as TextModel)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 text-slate-600"
                   >
                     <option value={TextModel.Gemini25Flash}>Gemini 2.5 Flash</option>
                     <option value={TextModel.Gemini25FlashLite}>Gemini 2.5 Flash Lite</option>
                     <option value={TextModel.Gemini3Pro}>Gemini 3.0 Pro</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Image Model</label>
                   <select 
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value as ImageModel)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 text-slate-600"
                    disabled={imageOption !== ImageOption.Auto}
                   >
                     <option value={ImageModel.Gemini25FlashImage}>Gemini 2.5 Flash Image (Nano Banana)</option>
                     <option value={ImageModel.Gemini3ProImage}>Gemini 3.0 Pro Image (Nano Banana 2)</option>
                     <option value={ImageModel.Imagen4}>Imagen 3</option>
                   </select>
                 </div>
               </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!isFormValid() || generationState.isGeneratingText}
              className={`
                w-full py-3.5 px-6 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2
                ${!isFormValid() || generationState.isGeneratingText
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20 active:transform active:scale-[0.98]'
                }
              `}
            >
              {generationState.isGeneratingText ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Magic...</span>
                </>
              ) : (
                <>
                  <span>Generate Post</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {generationState.error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center animate-in fade-in">
                {generationState.error}
              </div>
            )}
            
            {generationState.warning && (
              <div className="mt-4 p-3 bg-amber-50 text-amber-600 text-xs rounded-lg border border-amber-100 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{generationState.warning}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="relative flex flex-col gap-6 h-full">
          {generatedContent ? (
            <PreviewCard 
              content={generatedContent} 
              isGeneratingImage={generationState.isGeneratingImage}
              className="flex-1"
              onClear={handleClear}
            />
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 h-full">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                <Layout className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">No content generated yet</p>
              <p className="text-xs mt-2 max-w-xs">
                Select your preferences and hit generate to see your AI-crafted social media post here.
              </p>
            </div>
          )}
          
          {generationState.isGeneratingImage && generatedContent && (
             <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 flex items-center gap-3 animate-pulse flex-shrink-0">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-indigo-100 rounded w-3/4 mb-1"></div>
                  <div className="text-xs text-indigo-600 font-medium">Creating custom visual...</div>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
