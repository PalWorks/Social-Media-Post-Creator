import { GoogleGenAI } from "@google/genai";
import { SocialPlatform, PostTone, GeneratedPost, TextModel, ImageModel } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePostText = async (
  text: string,
  url: string,
  platform: SocialPlatform,
  tone: PostTone,
  model: TextModel,
  imageStyle?: string
): Promise<GeneratedPost> => {
  const ai = getAiClient();
  
  const systemInstruction = `You are an expert social media manager and content creator. 
  Your goal is to repurpose content into high-engagement social media posts.
  
  Platform Constraints:
  - Twitter: Under 280 characters, punchy, thread-style if needed (but return as one block), uses hashtags sparingly.
  - LinkedIn: Professional yet personal, line breaks for readability, "broetry" style optionally, moderate hashtags.
  - Instagram: Visual-first caption, engaging hook, spacing, many hashtags at bottom.
  - Facebook: Conversational, community-focused, moderate length.
  
  Tone Guidelines:
  - Professional: Clean, authoritative, informative.
  - Witty: Clever, maybe a pun, lighthearted.
  - Controversial: Hot take, challenges status quo (keep it safe/non-offensive but thought-provoking).
  - Casual: Friendly, "hey guys", relaxed.
  - Sales: Call to action focused, benefits-driven.
  
  CRITICAL - GROUNDING & ERROR HANDLING:
  - If a SOURCE URL is provided, you MUST use Google Search to access and verify the content.
  - If the URL is behind a login wall (like private Instagram/Facebook) or inaccessible:
    1. First, try to use any available public snippets, titles, or meta descriptions found via Search.
    2. If NO content can be found AND the user provided "USER NOTES", generate the post based ONLY on the "USER NOTES" and set "urlAccessDenied": true in the JSON.
    3. If NO content can be found AND NO "USER NOTES" are provided, return a JSON object where the 'text' property is exactly "ERROR_ACCESS_DENIED".
  - DO NOT INVENT CONTENT. Do not guess based on the URL text alone if the page content is unreadable.
  
  Output Requirements:
  You MUST return a strictly valid JSON object. 
  - Start the response immediately with {
  - End the response with }
  - Do not use Markdown code blocks (no \`\`\`json).
  - Do not include any conversational text like "Here is the post".
  - Ensure all keys are quoted correctly.
  
  The JSON object must have the following properties:
  - text: (string) The post content OR "ERROR_ACCESS_DENIED".
  - hashtags: (array of strings) Relevant hashtags without the #.
  - imagePrompt: (string) Detailed description for an image generator.
  - sourceImageUrl: (string | null) The direct URL of the main featured image from the source article if found.
  - urlAccessDenied: (boolean | null) True if the URL was inaccessible but generation proceeded using User Notes.
  `;

  // Build context from both inputs
  let contentContext = "";
  if (url.trim()) {
    contentContext += `\nSOURCE URL: "${url}"\n(Use Google Search to retrieve content.)`;
  }
  if (text.trim()) {
    contentContext += `\nUSER NOTES/THOUGHTS: "${text}"\n(Incorporate these thoughts or specific phrasing into the post)`;
  }

  // Add image style instruction if provided
  let imageInstruction = "Create a detailed image prompt relevant to the post content.";
  if (imageStyle && imageStyle.trim()) {
    imageInstruction += ` IMPORTANT: The image prompt MUST describe an image in the following style: "${imageStyle}".`;
  }

  const prompt = `Convert the source into a ${tone} post for ${platform}.
  ${contentContext}
  
  ${imageInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4, // Lower temperature to reduce hallucination
        // responseMimeType: "application/json" is unsupported with tools
        tools: [{googleSearch: {}}], 
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No text returned from Gemini");
    
    // Robust JSON extraction: Find the first '{' and last '}'
    const firstOpenBrace = resultText.indexOf('{');
    const lastCloseBrace = resultText.lastIndexOf('}');
    
    let cleanedText = resultText;
    
    if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
      cleanedText = resultText.substring(firstOpenBrace, lastCloseBrace + 1);
    } else {
      // Fallback: Remove markdown code blocks if braces search fails
      cleanedText = resultText.replace(/```json\n?|\n?```/g, "").trim();
    }
    
    let parsedResult: GeneratedPost;
    try {
      parsedResult = JSON.parse(cleanedText) as GeneratedPost;
    } catch (e) {
      console.warn("JSON parse failed, attempting fallback parsing for text format.");
      
      // Fallback parsing for key-value format (TEXT: ..., HASHTAGS: ...)
      // This handles cases where the model ignores JSON instruction and returns labeled text
      const textMatch = resultText.match(/TEXT:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i);
      const hashtagsMatch = resultText.match(/HASHTAGS:\s*(\[.*?\]|[\s\S]*?)(?=\n[A-Z_]+:|$)/i);
      const promptMatch = resultText.match(/IMAGE_PROMPT:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/i);
      const sourceImgMatch = resultText.match(/SOURCE_IMAGE_URL:\s*(.*)/i);
      const deniedMatch = resultText.match(/URL_ACCESS_DENIED:\s*(true|false)/i);

      if (textMatch && promptMatch) {
        let hashtags: string[] = [];
        try {
            // Try to parse array string first if it looks like JSON array
            if (hashtagsMatch && hashtagsMatch[1].trim().startsWith('[')) {
                 hashtags = JSON.parse(hashtagsMatch[1].trim());
            } else if (hashtagsMatch) {
                // Fallback to splitting string by comma
                hashtags = hashtagsMatch[1].replace(/[\[\]"]/g, '').split(',').map(t => t.trim()).filter(t => t);
            }
        } catch {
             // If parsing fails, use empty array or basic text split
             if (hashtagsMatch) {
                hashtags = hashtagsMatch[1].split(',').map(t => t.trim());
             }
        }

        parsedResult = {
            text: textMatch[1].trim(),
            hashtags: hashtags,
            imagePrompt: promptMatch[1].trim(),
            sourceImageUrl: sourceImgMatch ? (sourceImgMatch[1].trim() === 'null' ? null : sourceImgMatch[1].trim()) : null,
            urlAccessDenied: deniedMatch ? deniedMatch[1].toLowerCase() === 'true' : false
        };
      } else {
          console.error("Failed to parse JSON response:", resultText);
          throw new Error("AI returned invalid response format.");
      }
    }

    if (parsedResult.text === "ERROR_ACCESS_DENIED") {
      // Throw a specific error message for the UI to handle, but do not log as console.error
      throw new Error("Unable to access the source URL. It may be private or inaccessible. Please paste the content text.");
    }

    return parsedResult;
  } catch (error) {
    // Only log unexpected system errors, not validation/access errors
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("Unable to access") && !msg.includes("invalid response")) {
       console.error("Error generating text:", error);
    }
    throw error;
  }
};

export const generatePostImage = async (imagePrompt: string, model: ImageModel): Promise<string> => {
  const ai = getAiClient();
  
  try {
    // Handling for Imagen Models (using generateImages)
    if (model === ImageModel.Imagen4) {
      const response = await ai.models.generateImages({
        model: model,
        prompt: imagePrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9', // Matching the preview card aspect ratio generally
          outputMimeType: 'image/jpeg',
        },
      });
      
      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) throw new Error("No image data returned from Imagen");
      return `data:image/jpeg;base64,${imageBytes}`;
    }

    // Handling for Gemini Image Models (using generateContent)
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: imagePrompt }],
      },
      config: {
        // Nano banana models config if needed
      }
    });

    // Check all parts for inline data
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};
