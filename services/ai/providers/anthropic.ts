import { GeneratedResult, InterviewStyle, SocialContent, AiModel } from "../../../types";
import { AiClient, LiveAudioConnectArgs, LiveAudioSession } from "../types";
import { cleanJsonString } from "../utils";
import { generateImagesWithOpenAI, transcribeWithOpenAI } from "./openaiHelpers";

type AnthropicProviderOptions = {
  apiKey?: string;
  openaiApiKey?: string;
  baseUrl?: string;
  openaiBaseUrl?: string;
};

const requireApiKey = (apiKey?: string) => {
  if (!apiKey) {
    throw new Error("Missing Anthropic API key. Set ANTHROPIC_API_KEY (or AI_API_KEY) in .env.local.");
  }
};

const promptFromTranscript = (transcript: string, interviewStyle: InterviewStyle) => `
You are Ideoloop, an elite ghostwriter for top business executives.
You are given the transcript of a "${interviewStyle}" interview. Produce the required assets strictly as JSON.

TRANSCRIPT:
${transcript}

OUTPUT FORMAT (JSON):
{
  "transcription": string,
  "socialAssets": [
    {
      "type": "Tweet Thread" | "Blog Post Intro" | "LinkedIn Post" | "Video Hook",
      "content": string,
      "hashtags"?: string[],
      "imagePrompt": string
    }
  ]
}

Rules:
- Use the transcript summary as "transcription".
- Respect the platform formatting rules used by Ideoloop.
`;

export const createAnthropicProvider = (options: AnthropicProviderOptions = {}): AiClient => {
  requireApiKey(options.apiKey);
  const apiKey = options.apiKey as string;
  const baseUrl = options.baseUrl || "https://api.anthropic.com/v1";

  const connectLiveAudio = async (_args: LiveAudioConnectArgs): Promise<LiveAudioSession> => {
    throw new Error("Live audio is only supported with the Gemini provider in this app.");
  };

  const generateTextAssets = async (
    mediaBlob: Blob,
    interviewStyle: InterviewStyle,
    modelTier: AiModel = "GEMINI_PRO"
  ): Promise<GeneratedResult> => {
    if (!options.openaiApiKey) {
      throw new Error("Anthropic provider needs transcription. Set OPENAI_API_KEY for Whisper transcription.");
    }

    const transcript = await transcribeWithOpenAI(mediaBlob, {
      apiKey: options.openaiApiKey,
      baseUrl: options.openaiBaseUrl,
    });

    const modelName =
      modelTier === "GEMINI_FLASH" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20240620";

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 2000,
        system: "You are a helpful assistant that outputs strict JSON only.",
        messages: [{ role: "user", content: promptFromTranscript(transcript, interviewStyle) }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic content generation failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) throw new Error("No response text from Anthropic.");
    return JSON.parse(cleanJsonString(content)) as GeneratedResult;
  };

  const generateSocialImages = async (assets: SocialContent[]): Promise<SocialContent[]> => {
    if (!options.openaiApiKey) {
      return assets.map((asset) =>
        asset.imagePrompt
          ? { ...asset, imageStatus: "failed", imageError: "Image generation not supported by Anthropic." }
          : asset
      );
    }

    return generateImagesWithOpenAI(assets, {
      apiKey: options.openaiApiKey,
      baseUrl: options.openaiBaseUrl,
    });
  };

  return {
    providerId: "anthropic",
    connectLiveAudio,
    generateTextAssets,
    generateSocialImages,
  };
};
