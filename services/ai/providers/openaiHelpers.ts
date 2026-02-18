import { SocialContent } from "../../../types";

type OpenAiHelpersOptions = {
  apiKey: string;
  baseUrl?: string;
};

const getBaseUrl = (baseUrl?: string) => baseUrl || "https://api.openai.com/v1";

export const transcribeWithOpenAI = async (mediaBlob: Blob, options: OpenAiHelpersOptions): Promise<string> => {
  const baseUrl = getBaseUrl(options.baseUrl);
  const mimeType = mediaBlob.type || "audio/webm";
  const file = new File([mediaBlob], `audio.${mimeType.split("/")[1] || "webm"}`, { type: mimeType });
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", file);

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.text || "";
};

export const generateImagesWithOpenAI = async (
  assets: SocialContent[],
  options: OpenAiHelpersOptions
): Promise<SocialContent[]> => {
  const baseUrl = getBaseUrl(options.baseUrl);

  return Promise.all(
    assets.map(async (asset) => {
      if (!asset.imagePrompt) return asset;

      const aspectRatio = asset.type === "Tweet Thread" || asset.type === "Blog Post Intro" ? "16:9" : "1:1";
      const size = aspectRatio === "16:9" ? "1792x1024" : "1024x1024";

      try {
        const response = await fetch(`${baseUrl}/images/generations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: asset.imagePrompt,
            size,
            response_format: "b64_json",
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`OpenAI image gen failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) throw new Error("No image data returned from OpenAI.");

        return {
          ...asset,
          imageUrl: `data:image/png;base64,${b64}`,
          imageStatus: "ready",
          imageError: undefined,
        };
      } catch (e: any) {
        const message = e?.message ? String(e.message) : "Image generation failed.";
        return {
          ...asset,
          imageStatus: "failed",
          imageError: message,
        };
      }
    })
  );
};
