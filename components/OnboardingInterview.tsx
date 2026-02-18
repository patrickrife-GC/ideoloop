import React, { useState } from 'react';
import { OnboardingAnswer, VoiceProfile } from '../types';

interface OnboardingInterviewProps {
  userName?: string;
  onComplete: (voiceProfile: VoiceProfile) => void;
}

const ONBOARDING_QUESTIONS = [
  {
    id: 'honest_reckoning',
    title: 'The Honest Reckoning',
    question: 'What are you trying to build or become right now—and more importantly, why does it actually matter to you (not why should it matter)?',
    placeholder: 'Be honest, not aspirational. What really drives you?',
    field: ['currentGoal', 'realMotivation'] as const,
  },
  {
    id: 'specificity',
    title: 'The Specificity Question',
    question: "Who specifically are you trying to reach—and what's one thing they believe or struggle with that you deeply understand?",
    placeholder: 'Think of a real person, not a demographic...',
    field: ['targetAudience', 'audienceStruggle'] as const,
  },
  {
    id: 'contrarian_edge',
    title: 'The Contrarian Edge',
    question: 'What do you believe about your field that would make most people in it uncomfortable or disagree with you?',
    placeholder: 'Your hot take that distinguishes you...',
    field: ['contrarianBelief'] as const,
  },
  {
    id: 'legacy',
    title: 'The Legacy Question',
    question: "If you could only teach one lesson for the rest of your life, and it had to be something you've earned through experience (not just read about), what would it be?",
    placeholder: 'What hard-won wisdom do you carry?',
    field: ['coreLesson', 'lessonOrigin'] as const,
  },
  {
    id: 'growth_moment',
    title: 'The Growth Moment',
    question: 'Tell me about a time you were really wrong about something important—and what changed your mind. What did that teach you about how you learn?',
    placeholder: 'Share a specific story of being wrong and growing...',
    field: ['growthMoment'] as const,
  },
  {
    id: 'belonging',
    title: 'The Belonging Question',
    question: "Where do you feel most misunderstood or unseen—even by people who think they know you? What's the truth about you that you wish more people understood?",
    placeholder: 'The gap between how you\'re perceived and who you really are...',
    field: ['misunderstood'] as const,
  },
  {
    id: 'emerging_idea',
    title: 'The Emerging Idea',
    question: "What's an idea that's been living in your head lately—something you're turning over, testing out, not fully sure about yet—that feels like it could be important? What makes you uncertain about it?",
    placeholder: 'Share your raw, half-baked thinking...',
    field: ['emergingIdea'] as const,
  },
];

export const OnboardingInterview: React.FC<OnboardingInterviewProps> = ({ userName, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');

  const question = ONBOARDING_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / ONBOARDING_QUESTIONS.length) * 100;
  const isLastQuestion = currentQuestion === ONBOARDING_QUESTIONS.length - 1;

  const handleNext = () => {
    if (!currentAnswer.trim()) return;

    const newAnswers = { ...answers, [question.id]: currentAnswer };
    setAnswers(newAnswers);

    if (isLastQuestion) {
      // Build voice profile from all answers
      const voiceProfile: VoiceProfile = {
        onboardingCompleted: true,
        onboardingCompletedAt: Date.now(),
        answers: ONBOARDING_QUESTIONS.map((q, idx) => ({
          questionId: q.id,
          question: q.question,
          answer: newAnswers[q.id] || '',
          timestamp: Date.now(),
        })),
        // Map answers to voice profile fields
        currentGoal: newAnswers.honest_reckoning,
        realMotivation: newAnswers.honest_reckoning,
        targetAudience: newAnswers.specificity,
        audienceStruggle: newAnswers.specificity,
        contrarianBelief: newAnswers.contrarian_edge,
        coreLesson: newAnswers.legacy,
        lessonOrigin: newAnswers.legacy,
        growthMoment: newAnswers.growth_moment,
        misunderstood: newAnswers.belonging,
        emergingIdea: newAnswers.emerging_idea,
      };

      onComplete(voiceProfile);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentAnswer('');
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setCurrentAnswer(answers[ONBOARDING_QUESTIONS[currentQuestion - 1].id] || '');
    }
  };

  const handleSkip = () => {
    // Allow skipping but still save empty answer
    const newAnswers = { ...answers, [question.id]: '' };
    setAnswers(newAnswers);

    if (isLastQuestion) {
      const voiceProfile: VoiceProfile = {
        onboardingCompleted: true,
        onboardingCompletedAt: Date.now(),
        answers: ONBOARDING_QUESTIONS.map((q) => ({
          questionId: q.id,
          question: q.question,
          answer: newAnswers[q.id] || '',
          timestamp: Date.now(),
        })),
      };
      onComplete(voiceProfile);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentAnswer('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1">
        <div
          className="h-1 bg-[#1f3a2e] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl space-y-8">

          {/* Header */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-[#1f3a2e] tracking-wide uppercase">
              Question {currentQuestion + 1} of {ONBOARDING_QUESTIONS.length}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {question.title}
            </h2>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 space-y-6">
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
              {question.question}
            </p>

            {/* Text Input */}
            <div className="space-y-3">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={question.placeholder}
                rows={6}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-[#1f3a2e] focus:ring-[#1f3a2e] p-4 text-base resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-400 text-right">
                {currentAnswer.length} characters
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              disabled={currentQuestion === 0}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none transition-all font-medium"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="px-6 py-3 text-gray-500 hover:text-gray-700 transition-all font-medium"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={!currentAnswer.trim()}
                className="px-8 py-3 bg-[#1f3a2e] text-white font-semibold rounded-full hover:bg-[#5a7968] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isLastQuestion ? 'Complete' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Helper Text */}
          {currentQuestion === 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
              <p className="font-medium mb-1">👋 {userName ? `Hey ${userName}` : 'Welcome'}!</p>
              <p className="text-blue-700">
                These 7 questions help us understand your authentic voice, perspective, and positioning.
                Your answers will shape every piece of content we create together. Be honest, not perfect.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
