import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedResult, InterviewStyle, SocialContent, AiModel } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (base64String) {
          resolve(base64String.split(',')[1]);
      } else {
          reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to clean JSON string from Markdown fences
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  // Remove markdown code blocks if present
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```json\s?/, '').replace(/^```\s?/, '').replace(/```$/, '');
  }
  return clean.trim();
};

const getCleanMimeType = (blob: Blob) => {
    // Sanitize MIME type. Defaults to audio/webm if not present
    const fullMimeType = blob.type || 'audio/webm';
    return fullMimeType.split(';')[0];
};

// 1. FAST TRACK: Transcribe & Write Text Content (+ Image Prompts)
export const generateTextAssets = async (
    mediaBlob: Blob,
    interviewStyle: InterviewStyle,
    modelTier: AiModel = 'GEMINI_PRO'
): Promise<GeneratedResult> => {
    const ai = getGeminiClient();
    
    // Select Model based on Tier
    // GEMINI_PRO = gemini-3-pro-preview (High Reasoning, "Claude-Class")
    // GEMINI_FLASH = gemini-2.5-flash (High Speed, Standard)
    const modelName = modelTier === 'GEMINI_PRO' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    console.log(`Using Model: ${modelName}`);

    // THE GHOSTWRITER PROTOCOL & PLATFORM PLAYBOOKS
    const promptContext = `
      You are Ideoloop, an elite ghostwriter for top business executives.
      You have just conducted a "${interviewStyle}" audio interview.
      
      STEP 1: Transcribe the audio to a summary.
      STEP 2: Write viral social media assets based on the transcript.
      STEP 3: For each asset, write a "Visual Prompt" that describes an abstract, high-converting image to go with the post.

      *** GHOSTWRITER STYLE GUIDE ***
      - Grade 5 Readability: Simple words. Punchy sentences.
      - Active Voice: "I decided" not "A decision was made".
      - No Fluff: Remove "I think", "In my opinion", "Basically".
      
      *** PLATFORM FORMATTING RULES (STRICT) ***

      A) LINKEDIN POST:
         - STRUCTURE: "Broetry" style. One sentence per line. Double spacing between paragraphs.
         - THE HOOK: Start with a contrarian statement or a hard number. No greeting.
         - BODY: Short, punchy lines. Use bullet points (•) for lists.
         - CTA: End with a specific question.
         - HASHTAGS: Exactly 3 relevant hashtags at the very bottom.
         - IMAGE PROMPT: Describe a minimal, professional illustration or abstract concept (1:1 aspect ratio).
      
      B) TWEET THREAD:
         - FORMAT: A series of tweets separated by double newlines.
         - TWEET 1 (The Hook): Under 280 chars. Must stop the scroll. No hashtags.
         - TWEET 2-N (The Meat): deliver the value. Use "1/", "2/" numbering.
         - FINAL TWEET: A summary + "Follow for more".
         - IMAGE PROMPT: Describe a simple chart, graph, or bold visual metaphor (16:9 aspect ratio).
      
      C) VIDEO HOOK SCRIPT:
         - FORMAT: Visual direction in [brackets], spoken audio in quotes.
         - STYLE: High energy, fast paced. Max 10 seconds of script.
         - IMAGE PROMPT: Describe a thumbnail image.
         
      D) BLOG POST INTRO:
         - STYLE: Narrative storytelling. Start *in media res* (in the middle of the action).
         - SEO: Include keywords naturally.
         - IMAGE PROMPT: Describe a cinematic, high-quality editorial header image (16:9 aspect ratio).

      Focus ONLY on the audio content.
    `;

    try {
        const base64Data = await blobToBase64(mediaBlob);
        const mimeType = getCleanMimeType(mediaBlob);

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
              transcription: { type: Type.STRING },
              socialAssets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: ['Tweet Thread', 'Blog Post Intro', 'LinkedIn Post', 'Video Hook'],
                    },
                    content: { 
                        type: Type.STRING,
                        description: "The formatted content string. Use \\n\\n for line breaks."
                    },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    imagePrompt: {
                        type: Type.STRING,
                        description: "A detailed prompt for an AI image generator to create a relevant visual."
                    }
                  },
                  required: ['type', 'content', 'imagePrompt'],
                },
              },
            },
            required: ['transcription', 'socialAssets'],
        };

        const response = await ai.models.generateContent({
            model: modelName,
            contents: {
                parts: [
                    { text: promptContext },
                    { inlineData: { mimeType, data: base64Data } }
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const text = response.text;
        if (!text) throw new Error("No response text from Gemini");
        return JSON.parse(cleanJsonString(text)) as GeneratedResult;

    } catch (error: any) {
        console.error("Gemini Text Gen Error:", error);
        throw error;
    }
};

// 2. IMAGE GENERATION TRACK
export const generateSocialImages = async (
    assets: SocialContent[]
): Promise<SocialContent[]> => {
    const ai = getGeminiClient();
    
    // We process these in parallel to speed it up
    const updatedAssets = await Promise.all(assets.map(async (asset) => {
        if (!asset.imagePrompt) return asset;

        try {
            // Determine Aspect Ratio based on platform
            let aspectRatio = "1:1";
            if (asset.type === 'Tweet Thread' || asset.type === 'Blog Post Intro') {
                aspectRatio = "16:9";
            }

            // Using 'gemini-2.5-flash-image' ("Nano Banana")
            // Note: We use generateContent with config for this model
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { text: asset.imagePrompt },
                    ],
                },
                config: {
                   imageConfig: {
                       aspectRatio: aspectRatio,
                       // responseMimeType not supported for nano banana
                   }
                },
            });

            // Iterate parts to find the inline data
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64String = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    asset.imageUrl = `data:${mimeType};base64,${base64String}`;
                    break;
                }
            }
            
            return asset;
        } catch (e) {
            console.error(`Failed to generate image for ${asset.type}`, e);
            return asset; // Return original asset without image on fail
        }
    }));

    return updatedAssets;
};