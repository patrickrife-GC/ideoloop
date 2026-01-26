import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedResult, InterviewStyle, SocialContent, AiModel, VoiceProfile } from "../types";
import { generateSocialContent } from "./claudeService";

const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log("🔑 Gemini API key present:", !!apiKey, "Length:", apiKey?.length);
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is missing from environment variables.");
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

// Transcribe audio only (no content generation)
// Gemini-based social content generation (fallback when Claude fails)
const generateSocialContentWithGemini = async (
    transcription: string,
    interviewStyle: InterviewStyle,
    modelTier: AiModel,
    voiceProfile?: VoiceProfile
): Promise<SocialContent[]> => {
    const ai = getGeminiClient();
    const modelName = modelTier === 'GEMINI_PRO' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';

    let voiceContext = '';
    if (voiceProfile) {
        voiceContext = `
VOICE PROFILE CONTEXT:
${voiceProfile.contrarianBelief ? `Contrarian belief: ${voiceProfile.contrarianBelief}` : ''}
${voiceProfile.targetAudience ? `Target audience: ${voiceProfile.targetAudience}` : ''}
${voiceProfile.coreLesson ? `Core lesson: ${voiceProfile.coreLesson}` : ''}
${voiceProfile.currentGoal ? `Current goal: ${voiceProfile.currentGoal}` : ''}
`;
    }

    const prompt = `You are an elite ghostwriter for thought leaders. Transform this interview into viral social content.

${voiceContext}

TRANSCRIPT:
${transcription}

Generate 4 social media assets as a JSON array:

1. LinkedIn Post (Broetry):
- One sentence per line
- Hook with contrarian statement
- Bullet points with •
- End with specific question
- 3 hashtags

2. Tweet Thread (5-7 tweets):
- First tweet: hook under 280 chars
- Numbered tweets (1/, 2/)
- Final: summary + "Follow for more"

3. Video Hook (10 seconds):
- [Visual directions] in brackets
- Spoken audio in quotes
- High energy

4. Blog Post Intro (2-3 paragraphs):
- Start in media res
- Narrative storytelling

Return ONLY valid JSON array with this structure:
[{"type":"LinkedIn Post","content":"...","hashtags":["..."],"imagePrompt":"..."},{"type":"Tweet Thread","content":"...","imagePrompt":"..."},{"type":"Video Hook","content":"...","imagePrompt":"..."},{"type":"Blog Post Intro","content":"...","imagePrompt":"..."}]`;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: prompt }] },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const cleanJson = text.trim().replace(/^```json?\s*/, '').replace(/```\s*$/, '').trim();
    const socialAssets = JSON.parse(cleanJson) as SocialContent[];

    // Add attribution
    return socialAssets.map(asset => ({ ...asset, generatedBy: 'Gemini' as const }));
};

export const transcribeAudio = async (
    mediaBlob: Blob,
    modelTier: AiModel = 'GEMINI_PRO'
): Promise<string> => {
    const ai = getGeminiClient();
    const modelName = modelTier === 'GEMINI_PRO' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';

    try {
        const base64Data = await blobToBase64(mediaBlob);
        const mimeType = getCleanMimeType(mediaBlob);

        const response = await ai.models.generateContent({
            model: modelName,
            contents: {
                parts: [
                    { text: "Transcribe this audio interview accurately. Return only the transcription as plain text, no formatting or additional commentary." },
                    { inlineData: { mimeType, data: base64Data } }
                ],
            },
        });

        const text = response.text;
        if (!text) throw new Error("No transcription from Gemini");
        return text.trim();

    } catch (error: any) {
        console.error("Gemini transcription error:", error);
        throw error;
    }
};

// 1. FAST TRACK: Transcribe & Write Text Content (+ Image Prompts)
// Now uses Claude for content generation!
export const generateTextAssets = async (
    mediaBlob: Blob,
    interviewStyle: InterviewStyle,
    modelTier: AiModel = 'GEMINI_PRO',
    voiceProfile?: VoiceProfile
): Promise<GeneratedResult> => {
    console.log(`🔊 Transcribing with Gemini ${modelTier}...`);

    try {
        // Step 1: Transcribe audio with Gemini
        const transcription = await transcribeAudio(mediaBlob, modelTier);
        console.log("Transcription complete:", transcription.substring(0, 100) + "...");

        // Step 2: Try Claude first, fall back to Gemini if Claude fails (e.g., no credits)
        let socialAssets: SocialContent[];

        try {
            console.log(`✍️  Generating content with Claude Sonnet 4...`);
            socialAssets = await generateSocialContent(transcription, interviewStyle, voiceProfile);
            console.log("Claude generated", socialAssets.length, "social assets");
        } catch (claudeError: any) {
            console.warn("Claude failed, falling back to Gemini:", claudeError.message);
            console.log(`✍️  Generating content with Gemini ${modelTier} (fallback)...`);
            socialAssets = await generateSocialContentWithGemini(transcription, interviewStyle, modelTier, voiceProfile);
            console.log("Gemini generated", socialAssets.length, "social assets");
        }

        return {
            transcription,
            socialAssets,
        };

    } catch (error: any) {
        console.error("Content generation error:", error);
        throw error;
    }
};

// 2. IMAGE GENERATION TRACK
export const generateSocialImages = async (
    assets: SocialContent[]
): Promise<SocialContent[]> => {
    const ai = getGeminiClient();

    console.log(`🎨 Generating ${assets.length} images with Gemini Imagen...`);

    // We process these in parallel to speed it up
    const updatedAssets = await Promise.all(assets.map(async (asset, index) => {
        if (!asset.imagePrompt) {
            console.log(`⏭️  Skipping ${asset.type} - no image prompt`);
            return asset;
        }

        console.log(`🖼️  [${index + 1}/${assets.length}] Generating ${asset.type} (${asset.imagePrompt.substring(0, 50)}...)`);

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
            let imageFound = false;
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64String = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    asset.imageUrl = `data:${mimeType};base64,${base64String}`;
                    console.log(`✅ Generated ${asset.type} image (${(base64String.length / 1024).toFixed(1)}KB)`);
                    imageFound = true;
                    break;
                }
            }

            if (!imageFound) {
                console.warn(`⚠️  No image data returned for ${asset.type}`);
            }

            return asset;
        } catch (e) {
            console.error(`❌ Failed to generate image for ${asset.type}:`, e);
            return asset; // Return original asset without image on fail
        }
    }));

    return updatedAssets;
};
