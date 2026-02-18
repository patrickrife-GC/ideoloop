

export interface Question {
  id: string;
  text: string;
  description?: string;
}

// New Interview Types for the Conversational Mode
export type InterviewStyle =
  | 'ONBOARDING'
  | 'WIN_OF_WEEK'
  | 'HARD_LESSON'
  | 'CUSTOMER_VOICE'
  | 'DECISION_IN_PROGRESS'
  | 'PATTERN_RECOGNITION'
  | 'ENERGY_CHECK'
  | 'IDEA_PULL';

export interface InterviewConfig {
  id: InterviewStyle;
  title: string;
  description: string;
  systemInstruction: string;
  voiceName: string;
  isPro?: boolean; // Added for tier gating
}

export interface RecordingSession {
  blob: Blob; // Single continuous recording
  interviewStyle: InterviewStyle;
}

export interface SocialContent {
  type: 'Tweet Thread' | 'Blog Post Intro' | 'LinkedIn Post' | 'Video Hook';
  content: string;
  hashtags?: string[];
  imagePrompt?: string; // The text description for the AI artist
  imageUrl?: string; // The generated base64 image
  generatedBy?: 'Claude' | 'Gemini'; // Track which AI generated the content
}

export interface UserInsight {
  category: 'GOAL' | 'VALUE' | 'FACT' | 'STRUGGLE';
  text: string;
  timestamp: number;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  style: InterviewStyle;
  transcription?: string;
  socialAssets?: SocialContent[];
  insights: UserInsight[];
  videoUrl?: string; // Cloud storage URL (Audio)
}

export type UserPlan = 'FREE' | 'PRO';

// Voice Profile from 7-question onboarding interview
export interface OnboardingAnswer {
  questionId: string;
  question: string;
  answer: string;
  timestamp: number;
}

export interface VoiceProfile {
  onboardingCompleted: boolean;
  onboardingCompletedAt?: number;
  answers: OnboardingAnswer[];
  // Extracted fields for easy access
  currentGoal?: string;
  realMotivation?: string;
  targetAudience?: string;
  audienceStruggle?: string;
  contrarianBelief?: string;
  coreLesson?: string;
  lessonOrigin?: string;
  growthMoment?: string;
  misunderstood?: string;
  emergingIdea?: string;
}

export interface UserProfile {
  id: string; // This will now be the Firebase UID
  name: string;
  email: string;
  photoUrl?: string;
  joinedAt: number;
  insights: UserInsight[];
  history: SessionRecord[];
  interactionCount: number;
  lastLogin?: number;
  isGuest?: boolean;
  plan: UserPlan; // Added plan field
  voiceProfile?: VoiceProfile; // Voice profile from onboarding
}

export interface GeneratedResult {
  transcription?: string;
  socialAssets?: SocialContent[];
  newInsights?: UserInsight[]; // Insights extracted from THIS session
}

export type AiModel = 'GEMINI_FLASH' | 'GEMINI_PRO';

export enum AppView {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  WELCOME = 'WELCOME',
  ONBOARDING = 'ONBOARDING', // 7-question voice profile interview
  GUIDE_INTRO = 'GUIDE_INTRO',
  STUDIO = 'STUDIO',
  SUMMARY = 'SUMMARY',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN',
}