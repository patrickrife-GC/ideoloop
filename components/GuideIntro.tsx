
import React, { useState } from 'react';
import { InterviewConfig, InterviewStyle, UserPlan } from '../types';
import { LockClosedIcon } from '@heroicons/react/24/solid';

interface GuideIntroProps {
  onStart: (style: InterviewStyle, topic?: string) => void;
  userPlan?: UserPlan;
  onOpenPricing: () => void;
}

const INTERVIEW_STYLES: (Partial<InterviewConfig> & { isPro: boolean })[] = [
  {
    id: 'WIN_OF_WEEK',
    title: 'Win of the Week',
    description: 'Analyze what worked, why it worked, and how to replicate it.',
    isPro: false,
  },
  {
    id: 'HARD_LESSON',
    title: 'Hard Lesson',
    description: 'Reflect on a recent setback and the assumptions behind it.',
    isPro: false,
  },
  {
    id: 'CUSTOMER_VOICE',
    title: 'Customer Voice',
    description: 'Deep dive into a specific customer interaction that stuck with you.',
    isPro: false,
  },
  {
    id: 'DECISION_IN_PROGRESS',
    title: 'Decision in Progress',
    description: 'Unpack the tensions and tradeoffs of a decision you are wrestling with.',
    isPro: true,
  },
  {
    id: 'PATTERN_RECOGNITION',
    title: 'Pattern Recognition',
    description: 'Distinguish between the signals and the noise in your business.',
    isPro: true,
  },
  {
    id: 'ENERGY_CHECK',
    title: 'Energy Check',
    description: 'Audit what is giving you energy versus what is draining you.',
    isPro: true,
  }
];

export const GuideIntro: React.FC<GuideIntroProps> = ({ onStart, userPlan = 'FREE', onOpenPricing }) => {
  const [selectedStyle, setSelectedStyle] = useState<InterviewStyle>('WIN_OF_WEEK');
  const [topic, setTopic] = useState('');

  const handleStart = () => {
    // Feature Gating Logic
    const config = INTERVIEW_STYLES.find(s => s.id === selectedStyle);
    if (config?.isPro && userPlan !== 'PRO') {
        onOpenPricing();
        return;
    }
    onStart(selectedStyle, topic);
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
                        ? 'border-[#82ba90] bg-[#82ba90]/5 shadow-md' 
                        : 'border-gray-100 hover:border-[#82ba90]/50 hover:bg-gray-50'
                    }`}
                >
                    {style.isPro && userPlan !== 'PRO' && (
                        <div className="absolute top-2 right-2 bg-gray-900/5 p-1 rounded-full">
                            <LockClosedIcon className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                    
                    <h3 className={`font-bold text-lg mb-2 flex items-center gap-2 ${selectedStyle === style.id ? 'text-[#6da87a]' : 'text-gray-900'}`}>
                        {style.title}
                        {style.isPro && userPlan === 'PRO' && (
                             <span className="text-[10px] bg-[#82ba90] text-white px-1.5 py-0.5 rounded font-bold tracking-wide">PRO</span>
                        )}
                    </h3>
                    <p className="text-sm text-gray-600 flex-1">
                        {style.description}
                    </p>
                </div>
            ))}
        </div>

        {/* Topic Input Section */}
        <div className="w-full text-left pt-6 max-w-2xl mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                Any specific context before we start? <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. The Q3 marketing launch, The hiring issue, The new feature..."
                className="block w-full rounded-xl border-gray-300 bg-gray-50 shadow-sm focus:border-[#82ba90] focus:ring-[#82ba90] focus:bg-white p-4 text-base transition-colors"
            />
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
