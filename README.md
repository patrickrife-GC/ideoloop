<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1rLT5QkKCUDEPohY7JUQneMvcWBVC_FJt

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set your AI provider config in `.env.local` (example below)
3. Run the app:
   `npm run dev`

Example `.env.local`:
```
AI_PROVIDER=gemini
AI_LIVE_PROVIDER=gemini
AI_IMAGE_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key

OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

Notes:
- `AI_PROVIDER` controls content generation (transcripts + posts + images).
- `AI_LIVE_PROVIDER` controls the live interview experience. Use `gemini` for live audio.
- `AI_IMAGE_PROVIDER` controls image generation (defaults to Gemini "nano banana").
- OpenAI/Anthropic browser calls may require a server proxy due to CORS and key exposure.

## Firebase Functions (OpenAI Live Proxy)

To enable OpenAI live sessions later, deploy the Functions proxy:

1. Set the secret: `firebase functions:secrets:set OPENAI_API_KEY`
2. From `functions/`, run `npm install`, `npm run build`, then `npm run deploy`.
