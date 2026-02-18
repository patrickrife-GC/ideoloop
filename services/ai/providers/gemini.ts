import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GeneratedResult, InterviewStyle, SocialContent, AiModel } from "../../../types";
import { AiClient, LiveAudioConnectArgs, LiveAudioSession } from "../types";
import { blobToBase64, cleanJsonString, getCleanMimeType } from "../utils";

type GeminiProviderOptions = {
  apiKey?: string;
};

const requireApiKey = (apiKey?: string) => {
  if (!apiKey) {
    throw new Error("Missing AI API key. Set AI_API_KEY (or GEMINI_API_KEY) in .env.local.");
  }
};

const mapModalities = (modalities: Array<"AUDIO" | "TEXT">) =>
  modalities.map((modality) => (modality === "AUDIO" ? Modality.AUDIO : Modality.TEXT));

export const createGeminiProvider = (options: GeminiProviderOptions = {}): AiClient => {
  requireApiKey(options.apiKey);
  const client = new GoogleGenAI({ apiKey: options.apiKey as string });

  const connectLiveAudio = async (args: LiveAudioConnectArgs): Promise<LiveAudioSession> => {
    const sessionPromise = client.live.connect({
      model: args.model,
      config: {
        responseModalities: mapModalities(args.responseModalities),
        speechConfig: args.voice
          ? { voiceConfig: { prebuiltVoiceConfig: { voiceName: args.voice } } }
          : undefined,
        systemInstruction: args.systemInstruction,
      },
      callbacks: args.callbacks,
    });

    return sessionPromise;
  };

  const generateTextAssets = async (
    mediaBlob: Blob,
    interviewStyle: InterviewStyle,
    modelTier: AiModel = "GEMINI_PRO"
  ): Promise<GeneratedResult> => {
    const modelName = modelTier === "GEMINI_PRO" ? "gemini-3-pro-preview" : "gemini-2.5-flash";
    console.log(`Using Model: ${modelName}`);

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
                  enum: ["Tweet Thread", "Blog Post Intro", "LinkedIn Post", "Video Hook"],
                },
                content: {
                  type: Type.STRING,
                  description: "The formatted content string. Use \\n\\n for line breaks.",
                },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                imagePrompt: {
                  type: Type.STRING,
                  description: "A detailed prompt for an AI image generator to create a relevant visual.",
                },
              },
              required: ["type", "content", "imagePrompt"],
            },
          },
        },
        required: ["transcription", "socialAssets"],
      };

      const response = await client.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: promptContext }, { inlineData: { mimeType, data: base64Data } }],
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

  const generateSocialImages = async (assets: SocialContent[]): Promise<SocialContent[]> => {
    const updatedAssets = await Promise.all(
      assets.map(async (asset) => {
        if (!asset.imagePrompt) return asset;

        try {
          let aspectRatio = "1:1";
          if (asset.type === "Tweet Thread" || asset.type === "Blog Post Intro") {
            aspectRatio = "16:9";
          }

          const response = await client.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
              parts: [{ text: asset.imagePrompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: aspectRatio,
              },
            },
          });

          let imageUrl: string | undefined;
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const base64String = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || "image/png";
              imageUrl = `data:${mimeType};base64,${base64String}`;
              break;
            }
          }

          if (!imageUrl) {
            throw new Error("No image data returned from model.");
          }

          return {
            ...asset,
            imageUrl,
            imageStatus: "ready",
            imageError: undefined,
          };
        } catch (e: any) {
          const message = e?.message ? String(e.message) : "Image generation failed.";
          console.error("Image gen failed", e);
          return {
            ...asset,
            imageStatus: "failed",
            imageError: message,
          };
        }
      })
    );

    return updatedAssets;
  };

  return {
    providerId: "gemini",
    connectLiveAudio,
    generateTextAssets,
    generateSocialImages,
  };
};
