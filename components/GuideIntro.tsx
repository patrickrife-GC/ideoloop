
import React, { useState } from 'react';
import { InterviewConfig, InterviewStyle, UserPlan } from '../types';
import { LockClosedIcon } from '@heroicons/react/24/solid';

interface GuideIntroProps {
  onStart: (style: InterviewStyle, topic?: string, useCustomOnly?: boolean) => void;
  userPlan?: UserPlan;
  onOpenPricing: () => void;
}

const INTERVIEW_STYLES: (Partial<InterviewConfig> & { isPro: boolean })[] = [
  {
    id: 'IDEA_PULL',
    title: 'Idea Pull',
    description: "Surface one specific, non-obvious idea worth sharing today when you don't know what to talk about.",
    isPro: false,
  },
  {
    id: 'WIN_OF_WEEK',
    title: 'Win of the Week',
    description: 'Uncover the real lever behind a recent success and turn it into a replicable play.',
    isPro: false,
  },
  {
    id: 'HARD_LESSON',
    title: 'Hard Lesson',
    description: 'Extract a clean lesson from a failure and convert it into a sharp post.',
    isPro: false,
  },
  {
    id: 'CUSTOMER_VOICE',
    title: 'Customer Voice',
    description: 'Capture real customer language and turn it into positioning insights.',
    isPro: true,
  },
  {
    id: 'DECISION_IN_PROGRESS',
    title: 'Decision in Progress',
    description: 'Clarify options, tradeoffs, and the smallest next test to get unstuck.',
    isPro: true,
  },
  {
    id: 'PATTERN_RECOGNITION',
    title: 'Pattern Recognition',
    description: 'Separate signal from noise and turn it into a concrete move or boundary.',
    isPro: true,
  },
  {
    id: 'ENERGY_CHECK',
    title: 'Energy Check',
    description: 'Diagnose what gives energy vs. drains you and what to redesign.',
    isPro: true,
  }
];

export const GuideIntro: React.FC<GuideIntroProps> = ({ onStart, userPlan = 'FREE', onOpenPricing }) => {
  const [selectedStyle, setSelectedStyle] = useState<InterviewStyle>('IDEA_PULL');
  const [topic, setTopic] = useState('');
  const [useCustomOnly, setUseCustomOnly] = useState(false);

  const handleStart = () => {
    // Feature Gating Logic
    // 1. Check if using custom prompt (PRO only)
    if (useCustomOnly && userPlan !== 'PRO') {
      onOpenPricing();
      return;
    }

    // 2. Check if selected lens is PRO-only
    const config = INTERVIEW_STYLES.find(s => s.id === selectedStyle);
    if (config?.isPro && userPlan !== 'PRO') {
        onOpenPricing();
        return;
    }

    onStart(selectedStyle, topic, useCustomOnly);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 text-center py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">
            Select your lens.
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Ideoloop will guide you through a specific sequence of 3 questions to extract the highest quality insights.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {INTERVIEW_STYLES.map((style) => (
                <div 
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id as InterviewStyle)}
                    className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all flex flex-col h-full overflow-hidden ${
                        selectedStyle === style.id
                        ? 'border-[#1f3a2e] bg-[#1f3a2e]/5 shadow-md'
                        : 'border-gray-100 hover:border-[#1f3a2e]/50 hover:bg-gray-50'
                    }`}
                >
                    {style.isPro && userPlan !== 'PRO' && (
                        <div className="absolute top-2 right-2 bg-gray-900/5 p-1 rounded-full">
                            <LockClosedIcon className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                    
                    <h3 className={`font-bold text-lg mb-2 flex items-center gap-2 ${selectedStyle === style.id ? 'text-[#1f3a2e]' : 'text-gray-900'}`}>
                        {style.title}
                        {style.isPro && userPlan === 'PRO' && (
                             <span className="text-[10px] bg-[#E67E50] text-white px-1.5 py-0.5 rounded font-bold tracking-wide">PRO</span>
                        )}
                    </h3>
                    <p className="text-sm text-gray-600 flex-1">
                        {style.description}
                    </p>
                </div>
            ))}
        </div>

        {/* Custom Prompt Input Section - PRO only */}
        <div className="w-full text-left pt-6 max-w-2xl mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2 ml-1 flex items-center gap-2">
                Custom interview prompt
                {userPlan !== 'PRO' ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        <LockClosedIcon className="w-3 h-3" />
                        PRO
                    </span>
                ) : (
                    <span className="text-gray-400 font-normal">(Optional)</span>
                )}
            </label>
            {userPlan === 'PRO' ? (
                <>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Add your own context or instructions for the AI interviewer..."
                        rows={3}
                        className="block w-full rounded-xl border-gray-300 bg-gray-50 shadow-sm focus:border-[#1f3a2e] focus:ring-[#1f3a2e] focus:bg-white p-4 text-base transition-colors resize-none"
                    />
                    {topic.trim() && (
                        <label className="flex items-center gap-2 mt-3 ml-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useCustomOnly}
                                onChange={(e) => setUseCustomOnly(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-[#1f3a2e] focus:ring-[#1f3a2e]"
                            />
                            <span className="text-sm text-gray-600">Use custom prompt only (ignore lens above)</span>
                        </label>
                    )}
                </>
            ) : (
                <button
                    onClick={onOpenPricing}
                    className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center text-gray-500 hover:border-gray-300 hover:bg-gray-100 transition-colors"
                >
                    <span className="flex items-center justify-center gap-2">
                        <LockClosedIcon className="w-4 h-4" />
                        Upgrade to PRO to create custom prompts
                    </span>
                </button>
            )}
        </div>
        
        <div className="pt-4">
          <button
            onClick={handleStart}
            className="rounded-full bg-gray-900 px-10 py-4 text-lg font-semibold text-white shadow-lg hover:bg-gray-800 hover:scale-105 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {INTERVIEW_STYLES.find(s => s.id === selectedStyle)?.isPro && userPlan !== 'PRO' ? (
                <>
                    <LockClosedIcon className="w-5 h-5" />
                    Unlock this Template
                </>
            ) : (
                "Start Session"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
