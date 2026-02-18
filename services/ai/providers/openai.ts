import { GeneratedResult, InterviewStyle, SocialContent, AiModel } from "../../../types";
import { AiClient, LiveAudioConnectArgs, LiveAudioSession } from "../types";
import { cleanJsonString } from "../utils";
import { generateImagesWithOpenAI, transcribeWithOpenAI } from "./openaiHelpers";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";

type OpenAiProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
};

const requireApiKey = (apiKey?: string) => {
  if (!apiKey) {
    throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY (or AI_API_KEY) in .env.local.");
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

export const createOpenAiProvider = (options: OpenAiProviderOptions = {}): AiClient => {
  requireApiKey(options.apiKey);
  const baseUrl = options.baseUrl || "https://api.openai.com/v1";
  const apiKey = options.apiKey as string;

  const connectLiveAudio = async (args: LiveAudioConnectArgs): Promise<LiveAudioSession> => {
    const createRealtimeSdp = httpsCallable(functions, "openaiRealtimeSdp");
    const model = args.model || "gpt-4o-realtime-preview-2024-12-17";

    const pc = new RTCPeerConnection();
    const remoteStream = new MediaStream();
    pc.addTransceiver("audio", { direction: "sendrecv" });

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      args.callbacks.ontrack?.(remoteStream);
    };

    const localStream = args.localStream || (await navigator.mediaDevices.getUserMedia({ audio: true }));
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const dataChannel = pc.createDataChannel("oai-events");
    const pendingTextInputs: string[] = [];
    let channelReady = false;

    const sendTextInput = (text: string) => {
      if (!channelReady) {
        pendingTextInputs.push(text);
        return;
      }
      if (text.trim().toLowerCase().startsWith("system:")) {
        const instructions = text.replace(/^system:/i, "").trim();
      dataChannel.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions,
            modalities: ["audio"]
          }
        })
      );
      return;
      }

      dataChannel.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text }]
          }
        })
      );
      dataChannel.send(JSON.stringify({ type: "response.create" }));
    };
    dataChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        args.callbacks.onmessage?.(msg);
      } catch (e) {
        args.callbacks.onerror?.(e);
      }
    };
    dataChannel.onopen = () => {
      channelReady = true;
      dataChannel.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: args.systemInstruction,
            voice: args.voice || "alloy",
            modalities: args.responseModalities.map((m) => (m === "AUDIO" ? "audio" : "text"))
          }
        })
      );
      dataChannel.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions: "Ask the first question now. Do not greet the user.",
            modalities: ["audio"]
          }
        })
      );
      if (pendingTextInputs.length > 0) {
        pendingTextInputs.splice(0).forEach((text) => sendTextInput(text));
      }
      args.callbacks.onopen?.();
    };
    dataChannel.onerror = (err) => args.callbacks.onerror?.(err);
    dataChannel.onclose = () => args.callbacks.onclose?.();

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResult = await createRealtimeSdp({ model, offerSdp: offer.sdp });
    const answerSdp = (sdpResult.data as any)?.answerSdp;
    if (!answerSdp) throw new Error("OpenAI realtime SDP missing.");
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    const sendRealtimeInput = (input: { text?: string }) => {
      if (input.text) {
        sendTextInput(input.text);
      }
    };

    return {
      sendRealtimeInput,
    };
  };

  const generateTextAssets = async (
    mediaBlob: Blob,
    interviewStyle: InterviewStyle,
    modelTier: AiModel = "GEMINI_PRO"
  ): Promise<GeneratedResult> => {
    const transcript = await transcribeWithOpenAI(mediaBlob, { apiKey, baseUrl });
    const modelName = modelTier === "GEMINI_FLASH" ? "gpt-4o-mini" : "gpt-4o";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: "You are a helpful assistant that outputs strict JSON." },
          { role: "user", content: promptFromTranscript(transcript, interviewStyle) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI content generation failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response text from OpenAI.");
    return JSON.parse(cleanJsonString(content)) as GeneratedResult;
  };

  const generateSocialImages = async (assets: SocialContent[]): Promise<SocialContent[]> => {
    return generateImagesWithOpenAI(assets, { apiKey, baseUrl });
  };

  return {
    providerId: "openai",
    connectLiveAudio,
    generateTextAssets,
    generateSocialImages,
  };
};
