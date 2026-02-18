import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";

setGlobalOptions({ region: "us-central1" });

const openaiKey = defineSecret("OPENAI_API_KEY");

export const openaiEphemeralToken = onCall({ secrets: [openaiKey] }, async (request) => {
  const apiKey = openaiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Missing OPENAI_API_KEY in Functions config.");
  }

  const model = request.data?.model || "gpt-4o-realtime-preview-2024-12-17";

  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice: request.data?.voice || "alloy"
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpsError(
      "internal",
      `OpenAI session creation failed: ${response.status} ${text}`
    );
  }

  const data = await response.json();
  const clientSecret = data?.client_secret?.value;
  if (!clientSecret) {
    throw new HttpsError("internal", "OpenAI did not return a client secret.");
  }

  return {
    client_secret: clientSecret,
    expires_at: data?.client_secret?.expires_at,
    model: data?.model
  };
});

export const openaiRealtimeSdp = onCall({ secrets: [openaiKey] }, async (request) => {
  const apiKey = openaiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Missing OPENAI_API_KEY in Functions config.");
  }

  const model = request.data?.model || "gpt-4o-realtime-preview-2024-12-17";
  const offerSdp = request.data?.offerSdp;
  if (!offerSdp) {
    throw new HttpsError("invalid-argument", "Missing offerSdp.");
  }

  const response = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/sdp",
    },
    body: offerSdp,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpsError(
      "internal",
      `OpenAI realtime SDP failed: ${response.status} ${text}`
    );
  }

  const answerSdp = await response.text();
  return { answerSdp };
});
