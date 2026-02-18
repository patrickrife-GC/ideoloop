"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiRealtimeSdp = exports.openaiEphemeralToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
const openaiKey = (0, params_1.defineSecret)("OPENAI_API_KEY");
exports.openaiEphemeralToken = (0, https_1.onCall)({ secrets: [openaiKey] }, async (request) => {
    var _a, _b, _c, _d;
    const apiKey = openaiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError("failed-precondition", "Missing OPENAI_API_KEY in Functions config.");
    }
    const model = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.model) || "gpt-4o-realtime-preview-2024-12-17";
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            voice: ((_b = request.data) === null || _b === void 0 ? void 0 : _b.voice) || "alloy"
        }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new https_1.HttpsError("internal", `OpenAI session creation failed: ${response.status} ${text}`);
    }
    const data = await response.json();
    const clientSecret = (_c = data === null || data === void 0 ? void 0 : data.client_secret) === null || _c === void 0 ? void 0 : _c.value;
    if (!clientSecret) {
        throw new https_1.HttpsError("internal", "OpenAI did not return a client secret.");
    }
    return {
        client_secret: clientSecret,
        expires_at: (_d = data === null || data === void 0 ? void 0 : data.client_secret) === null || _d === void 0 ? void 0 : _d.expires_at,
        model: data === null || data === void 0 ? void 0 : data.model
    };
});
exports.openaiRealtimeSdp = (0, https_1.onCall)({ secrets: [openaiKey] }, async (request) => {
    var _a, _b;
    const apiKey = openaiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError("failed-precondition", "Missing OPENAI_API_KEY in Functions config.");
    }
    const model = ((_a = request.data) === null || _a === void 0 ? void 0 : _a.model) || "gpt-4o-realtime-preview-2024-12-17";
    const offerSdp = (_b = request.data) === null || _b === void 0 ? void 0 : _b.offerSdp;
    if (!offerSdp) {
        throw new https_1.HttpsError("invalid-argument", "Missing offerSdp.");
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
        throw new https_1.HttpsError("internal", `OpenAI realtime SDP failed: ${response.status} ${text}`);
    }
    const answerSdp = await response.text();
    return { answerSdp };
});
//# sourceMappingURL=index.js.map