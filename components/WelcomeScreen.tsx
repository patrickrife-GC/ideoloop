import React from 'react';

interface WelcomeScreenProps {
  onBegin: () => void;
  onDashboard: () => void;
  userName?: string;
  aiProvider?: string;
  onAiProviderChange?: (value: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onBegin,
  onDashboard,
  userName,
  aiProvider,
  onAiProviderChange
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center relative overflow-hidden">
      <div className="relative z-10 max-w-xl mx-auto space-y-8 animate-fade-in-up">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          Turn your voice into powerful content — starting with a short, reflective interview.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onBegin}
            className="w-full sm:w-auto rounded-full bg-[#82ba90] px-10 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#6da87a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#82ba90] transition-all"
          >
            Begin New Session
          </button>
          
          <button
            onClick={onDashboard}
            className="w-full sm:w-auto rounded-full bg-white px-10 py-3 text-base font-semibold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-all"
          >
            View Dashboard
          </button>
        </div>

        {onAiProviderChange && (
          <div className="w-full max-w-sm mx-auto text-left space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Content AI Provider
            </label>
            <select
              value={aiProvider}
              onChange={(e) => onAiProviderChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#82ba90]/40"
            >
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <p className="text-[11px] text-gray-400">
              Changing provider reloads the app to apply settings.
            </p>
          </div>
        )}
      </div>
      
      {/* Subtle Background Accent */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#82ba90] to-transparent opacity-50 z-0"></div>
    </div>
  );
};
