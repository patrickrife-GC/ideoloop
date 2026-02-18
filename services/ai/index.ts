import { AiClient, AiProviderId } from "./types";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAiProvider } from "./providers/openai";
import { createAnthropicProvider } from "./providers/anthropic";

export const AI_PROVIDER_STORAGE_KEY = "ideoloop_ai_provider";

const getProviderId = (rawInput?: string): AiProviderId => {
  const raw = (rawInput || "gemini").toLowerCase();
  if (raw === "openai" || raw === "anthropic" || raw === "gemini") {
    return raw;
  }
  return "gemini";
};

const getStoredProvider = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY) || undefined;
};

const getApiKey = (providerId: AiProviderId): string | undefined => {
  if (process.env.AI_API_KEY) return process.env.AI_API_KEY;
  if (providerId === "gemini") {
    return process.env.GEMINI_API_KEY || process.env.API_KEY;
  }
  if (providerId === "openai") {
    return process.env.OPENAI_API_KEY;
  }
  if (providerId === "anthropic") {
    return process.env.ANTHROPIC_API_KEY;
  }
  return undefined;
};

const createUnsupportedProvider = (providerId: AiProviderId): AiClient => {
  const error = () => {
    throw new Error(
      `AI provider "${providerId}" is not configured. Set AI_PROVIDER=gemini or implement a provider.`
    );
  };

  return {
    providerId,
    connectLiveAudio: async () => error(),
    generateTextAssets: async () => error(),
    generateSocialImages: async () => error(),
  };
};

const contentProviderId = getProviderId(getStoredProvider() || process.env.AI_PROVIDER);
const liveProviderId = getProviderId(process.env.AI_LIVE_PROVIDER || process.env.AI_PROVIDER);
const imageProviderId = getProviderId(process.env.AI_IMAGE_PROVIDER || "gemini");

const buildClient = (providerId: AiProviderId): AiClient => {
  if (providerId === "gemini") {
    return createGeminiProvider({ apiKey: getApiKey(providerId) });
  }
  if (providerId === "openai") {
    return createOpenAiProvider({ apiKey: getApiKey(providerId) });
  }
  if (providerId === "anthropic") {
    return createAnthropicProvider({
      apiKey: getApiKey(providerId),
      openaiApiKey: process.env.OPENAI_API_KEY,
    });
  }
  return createUnsupportedProvider(providerId);
};

const aiContentClient: AiClient = buildClient(contentProviderId);
const aiLiveClient: AiClient = buildClient(liveProviderId);
const aiImageClient: AiClient = buildClient(imageProviderId);

export { aiContentClient, aiLiveClient, aiImageClient };
export type { AiClient, AiProviderId };
