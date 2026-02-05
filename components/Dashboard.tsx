

import React from 'react';
import { SessionRecord, UserProfile } from '../types';
import { ArrowLeftIcon, CalendarIcon, DocumentTextIcon, FolderOpenIcon, ShieldCheckIcon, StarIcon } from '@heroicons/react/24/solid';

interface DashboardProps {
  user: UserProfile;
  onBack: () => void;
  onAdmin?: () => void;
  onViewSession: (session: SessionRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onBack, onAdmin, onViewSession }) => {
  const history = user.history || [];

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                 <ArrowLeftIcon className="w-5 h-5" />
             </button>
             <h1 className="text-xl font-bold text-gray-900">Your Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
             {onAdmin && user.role === 'admin' && (
                 <button onClick={onAdmin} className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-full hover:bg-black transition-colors flex items-center gap-1">
                     <ShieldCheckIcon className="w-3 h-3" />
                     Admin
                 </button>
             )}
             
             {/* Plan Badge */}
             {user.plan === 'PRO' ? (
                 <span className="text-xs font-bold bg-[#1f3a2e] text-white px-2 py-1 rounded tracking-wide">PRO</span>
             ) : (
                 <button className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors flex items-center gap-1">
                     <StarIcon className="w-3 h-3 text-yellow-500" />
                     Upgrade
                 </button>
             )}

             <span className="text-sm font-medium text-gray-600 hidden sm:block">{user.name}</span>
             {user.photoUrl ? (
                 <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
             ) : (
                 <div className="w-8 h-8 rounded-full bg-[#1f3a2e] flex items-center justify-center text-white font-bold">
                     {user.name.charAt(0)}
                 </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{history.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Insights Mapped</p>
                <p className="text-3xl font-bold text-gray-900">{user.insights.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Content Pieces</p>
                <p className="text-3xl font-bold text-gray-900">
                    {history.reduce((acc, sess) => acc + (sess.socialAssets?.length || 0), 0)}
                </p>
            </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Content</h2>

        {history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No content yet</h3>
                <p className="text-gray-500">Start your first interview to populate your dashboard.</p>
                <button onClick={onBack} className="mt-4 text-[#1f3a2e] font-semibold hover:underline">
                    Go to Studio
                </button>
            </div>
        ) : (
            <div className="space-y-8">
                {history.map((session) => (
                    <div key={session.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <h3 className="font-bold text-gray-900 capitalize">{session.style.replace(/_/g, ' ')} Session</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {new Date(session.timestamp).toLocaleDateString()} at {new Date(session.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => onViewSession(session)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f3a2e] text-white rounded-lg text-xs font-semibold hover:bg-[#5a7968] transition-colors"
                                >
                                    <FolderOpenIcon className="w-3 h-3" />
                                    Open Project
                                </button>
                                <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                                    {session.socialAssets?.length || 0} Assets
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Transcript Summary</h4>
                                <p className="text-sm text-gray-600 line-clamp-3">{session.transcription}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(session.socialAssets || []).map((asset, i) => (
                                    <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-[#1f3a2e] bg-[#1f3a2e]/10 px-2 py-1 rounded">
                                                {asset.type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">{asset.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
};