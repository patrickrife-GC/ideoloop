import { GeneratedResult, InterviewStyle, SocialContent, AiModel } from "../../types";

export type AiProviderId = "gemini" | "openai" | "anthropic";

export type LiveAudioInput = {
  text?: string;
  media?: {
    mimeType: string;
    data: string;
  };
};

export type LiveAudioSession = {
  sendRealtimeInput: (input: LiveAudioInput) => void;
};

export type LiveAudioCallbacks = {
  onopen?: () => void;
  onmessage?: (msg: any) => void;
  onclose?: () => void;
  onerror?: (err: any) => void;
  ontrack?: (stream: MediaStream) => void;
};

export type LiveAudioConnectArgs = {
  model: string;
  responseModalities: Array<"AUDIO" | "TEXT">;
  voice?: string;
  systemInstruction: string;
  callbacks: LiveAudioCallbacks;
  localStream?: MediaStream;
};

export type AiClient = {
  providerId: AiProviderId;
  connectLiveAudio: (args: LiveAudioConnectArgs) => Promise<LiveAudioSession>;
  generateTextAssets: (
    mediaBlob: Blob,
    interviewStyle: InterviewStyle,
    modelTier?: AiModel
  ) => Promise<GeneratedResult>;
  generateSocialImages: (assets: SocialContent[]) => Promise<SocialContent[]>;
};
