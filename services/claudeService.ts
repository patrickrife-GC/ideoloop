import Anthropic from '@anthropic-ai/sdk';
import { InterviewStyle, SocialContent, VoiceProfile } from '../types';

const getClaudeClient = () => {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  console.log("🔑 Claude API key present:", !!apiKey, "Length:", apiKey?.length);
  if (!apiKey) {
    throw new Error("VITE_ANTHROPIC_API_KEY is missing from environment variables.");
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
};

// Generate social content using Claude based on transcription
export const generateSocialContent = async (
  transcription: string,
  interviewStyle: InterviewStyle,
  voiceProfile?: VoiceProfile
): Promise<SocialContent[]> => {
  const client = getClaudeClient();

  // Build context about the user's voice if available
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

  const systemPrompt = `You are an elite ghostwriter for thought leaders and executives. Your specialty is transforming raw interview transcripts into viral, authentic social media content.

CORE PRINCIPLES:
- Grade 5 Readability: Simple words. Punchy sentences.
- Active Voice: "I decided" not "A decision was made"
- No Fluff: Remove "I think", "In my opinion", "Basically"
- Authentic Voice: Use their exact language and examples
- No Generic AI Phrases: Avoid "dive deep", "in today's fast-paced world", "leverage", "synergy"

${voiceContext}

Generate 4 distinct social media assets from this transcript. Each should feel authentic to the speaker's voice and use specific details from their interview.`;

  const userPrompt = `Interview Type: ${interviewStyle.replace(/_/g, ' ')}

TRANSCRIPT:
${transcription}

Generate these 4 assets:

1. LINKEDIN POST (Broetry Style):
- One sentence per line, double-spaced paragraphs
- Hook: Contrarian statement or hard number (no greeting)
- Body: Short punchy lines, use bullet points (•)
- CTA: End with specific question
- 3 relevant hashtags at bottom
- IMAGE PROMPT: Minimal, professional illustration (1:1 aspect ratio)

2. TWEET THREAD:
- 5-7 tweets, double newlines between
- Tweet 1: Hook under 280 chars, no hashtags
- Tweets 2-N: Numbered (1/, 2/), deliver value
- Final tweet: Summary + "Follow for more"
- IMAGE PROMPT: Simple chart/graph or bold visual metaphor (16:9)

3. VIDEO HOOK SCRIPT:
- [Visual direction] in brackets
- Spoken audio in quotes
- High energy, fast-paced, max 10 seconds
- IMAGE PROMPT: Eye-catching thumbnail

4. BLOG POST INTRO:
- Start in media res (middle of action)
- Narrative storytelling, 2-3 paragraphs
- Include keywords naturally
- IMAGE PROMPT: Cinematic editorial header (16:9)

Return as JSON array with this structure:
[
  {
    "type": "LinkedIn Post",
    "content": "...",
    "hashtags": ["...", "...", "..."],
    "imagePrompt": "..."
  },
  {
    "type": "Tweet Thread",
    "content": "...",
    "imagePrompt": "..."
  },
  {
    "type": "Video Hook",
    "content": "...",
    "imagePrompt": "..."
  },
  {
    "type": "Blog Post Intro",
    "content": "...",
    "imagePrompt": "..."
  }
]`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Extract text from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON from response
    const jsonText = content.text.trim();
    // Remove markdown code blocks if present
    const cleanJson = jsonText.replace(/^```json?\s*/, '').replace(/```\s*$/, '').trim();
    const socialAssets = JSON.parse(cleanJson) as SocialContent[];

    // Add attribution
    return socialAssets.map(asset => ({ ...asset, generatedBy: 'Claude' as const }));

  } catch (error: any) {
    console.error("Claude content generation error:", error);
    throw error;
  }
};
