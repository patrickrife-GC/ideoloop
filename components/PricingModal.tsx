
import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-in">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 z-10"
        >
            <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Free Tier */}
            <div className="p-8 bg-gray-50 border-r border-gray-100 flex flex-col h-full">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Starter</h3>
                    <p className="text-gray-500 mt-2 text-sm">Perfect for trying out the studio.</p>
                </div>
                <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-500 ml-2">/ month</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <CheckIcon className="w-5 h-5 text-gray-400" />
                        3 Interviews per month
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <CheckIcon className="w-5 h-5 text-gray-400" />
                        Basic Interview Templates
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <CheckIcon className="w-5 h-5 text-gray-400" />
                        Standard AI Writer (Flash)
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <CheckIcon className="w-5 h-5 text-gray-400" />
                        720p Video Downloads
                    </li>
                </ul>
                <button 
                    onClick={onClose}
                    className="w-full py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    Continue Free
                </button>
            </div>

            {/* Pro Tier */}
            <div className="p-8 bg-white relative overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 bg-[#E67E50] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    RECOMMENDED
                </div>
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Pro Studio</h3>
                    <p className="text-gray-500 mt-2 text-sm">For serious content creators.</p>
                </div>
                <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">$29</span>
                    <span className="text-gray-500 ml-2">/ month</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="bg-[#1f3a2e]/10 p-1 rounded-full"><CheckIcon className="w-3 h-3 text-[#1f3a2e]" /></div>
                        <strong>Unlimited</strong> Interviews
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="bg-[#1f3a2e]/10 p-1 rounded-full"><CheckIcon className="w-3 h-3 text-[#1f3a2e]" /></div>
                        Access to <strong>Deep Dive Templates</strong>
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="bg-[#1f3a2e]/10 p-1 rounded-full"><CheckIcon className="w-3 h-3 text-[#1f3a2e]" /></div>
                        <strong>Pro Ghostwriter</strong> (Gemini 3 Pro)
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="bg-[#1f3a2e]/10 p-1 rounded-full"><CheckIcon className="w-3 h-3 text-[#1f3a2e]" /></div>
                        Viral Clip Analysis
                    </li>
                </ul>
                <button 
                    onClick={onUpgrade}
                    className="w-full py-3 rounded-xl bg-[#E67E50] font-bold text-white shadow-lg hover:bg-[#d06a42] hover:scale-[1.02] transition-all"
                >
                    Upgrade to Pro
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">Secure payment via Stripe</p>
            </div>
        </div>
      </div>
    </div>
  );
};
