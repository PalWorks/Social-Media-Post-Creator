
export enum SocialPlatform {
  Twitter = 'Twitter',
  LinkedIn = 'LinkedIn',
  Instagram = 'Instagram',
  Facebook = 'Facebook',
}

export enum PostTone {
  Professional = 'Professional',
  Witty = 'Witty',
  Controversial = 'Controversial',
  Casual = 'Casual',
  Sales = 'Sales',
}

export enum ImageOption {
  None = 'None',
  FromSource = 'FromSource', // Extract from the main source URL
  Custom = 'Custom',         // User provides via Upload OR direct Image URL
  Auto = 'Auto',             // AI Generated
}

export enum TextModel {
  Gemini25Flash = 'gemini-2.5-flash',
  Gemini25FlashLite = 'gemini-2.5-flash-lite-latest',
  Gemini3Pro = 'gemini-3-pro-preview',
}

export enum ImageModel {
  Gemini25FlashImage = 'gemini-2.5-flash-image',
  Gemini3ProImage = 'gemini-3-pro-image-preview',
  Imagen4 = 'imagen-4.0-generate-001',
}

export interface GeneratedPost {
  text: string;
  hashtags: string[];
  imagePrompt: string;
  sourceImageUrl?: string | null; // New field for extracted image URL
  urlAccessDenied?: boolean;      // New field to indicate if URL was inaccessible but generation proceeded
}

export interface GenerationState {
  isGeneratingText: boolean;
  isGeneratingImage: boolean;
  error: string | null;
  warning: string | null;
}

export interface PostContent {
  originalText: string;
  generatedText: string;
  generatedImageBase64: string | null;
  hashtags: string[];
  platform: SocialPlatform;
  tone: PostTone;
  imageOption: ImageOption;
}
