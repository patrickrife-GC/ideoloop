

import React, { useState } from 'react';
import { AiModel } from '../types';
import { SparklesIcon, BoltIcon } from '@heroicons/react/24/solid';

interface SummaryScreenProps {
  onGenerate: (model: AiModel) => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ onGenerate }) => {
  const [selectedModel, setSelectedModel] = useState<AiModel>('GEMINI_PRO');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f7f5] px-6 text-center">
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in-up">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#82ba90]/20">
          <svg className="w-10 h-10 text-[#82ba90]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-gray-900">
          You did it.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed">
          You just laid the foundation for powerful, authentic content. <br/>
          Select your writer intelligence:
        </p>

        {/* Model Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div 
                onClick={() => setSelectedModel('GEMINI_FLASH')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${selectedModel === 'GEMINI_FLASH' ? 'border-[#82ba90] bg-white shadow-md' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}
            >
                <div className="flex items-center gap-2 mb-2">
                    <BoltIcon className={`w-5 h-5 ${selectedModel === 'GEMINI_FLASH' ? 'text-[#82ba90]' : 'text-gray-400'}`} />
                    <span className="font-bold text-gray-900">Standard</span>
                </div>
                <p className="text-xs text-gray-500">
                    Fast & Efficient. Powered by Gemini 2.5 Flash. Great for quick drafts.
                </p>
            </div>

            <div 
                onClick={() => setSelectedModel('GEMINI_PRO')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left relative overflow-hidden ${selectedModel === 'GEMINI_PRO' ? 'border-purple-500 bg-white shadow-md' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}
            >
                {selectedModel === 'GEMINI_PRO' && <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">RECOMMENDED</div>}
                <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className={`w-5 h-5 ${selectedModel === 'GEMINI_PRO' ? 'text-purple-500' : 'text-gray-400'}`} />
                    <span className="font-bold text-gray-900">Premium</span>
                </div>
                <p className="text-xs text-gray-500">
                    Deep Reasoning. Powered by Gemini 3 Pro. Comparable to Claude 3.5 Sonnet.
                </p>
            </div>
        </div>
        
        <div className="pt-8">
          <button
            onClick={() => onGenerate(selectedModel)}
            className="rounded-full bg-[#82ba90] px-10 py-4 text-lg font-semibold text-white shadow-lg hover:bg-[#6da87a] hover:scale-105 transition-all w-full sm:w-auto"
          >
            Create Content
          </button>
        </div>
      </div>
    </div>
  );
};