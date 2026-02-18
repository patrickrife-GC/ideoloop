import React from 'react';
import { AppView } from '../types';

interface HeroProps {
  onGetStarted: () => void;
  onCreateCustom: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted, onCreateCustom }) => {
  return (
    <div className="relative overflow-hidden bg-white py-16 sm:py-24 lg:py-32">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <span className="rounded-full bg-[#1f3a2e]/10 px-3 py-1 text-sm font-semibold leading-6 text-[#1f3a2e] ring-1 ring-inset ring-[#1f3a2e]/30">
              Powered by Gemini 2.5 Flash
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Stop writing. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1f3a2e] to-[#6B9B7F]">
              Start talking.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Turn a 10-minute voice conversation into a month's worth of high-performing social content. 
            Our AI interviews you, transcribes the insights, and writes the posts.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={onGetStarted}
              className="relative z-10 rounded-md bg-[#1f3a2e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5a7968] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f3a2e] transition-all"
            >
              Start Interview
            </button>
            <button
              onClick={onCreateCustom}
              className="relative z-10 text-sm font-semibold leading-6 text-gray-900 hover:text-[#E67E50] transition-colors"
            >
              Build Custom Template <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Decorative background blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl pointer-events-none opacity-20 blur-3xl z-0">
          <div className="aspect-[1100/600] w-full bg-gradient-to-tr from-[#1f3a2e] to-[#6B9B7F]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}}></div>
      </div>
    </div>
  );
};