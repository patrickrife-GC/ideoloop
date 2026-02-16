
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { CustomPrompt, UserPlan, SessionRecord } from '../types';
import { ArrowLeftIcon, UsersIcon, PlayIcon, ClockIcon, PlusIcon, LinkIcon, TrashIcon, ClipboardIcon, CheckIcon, DocumentTextIcon, StarIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface AdminDashboardProps {
  onBack: () => void;
  currentUserId: string;
}

type TabType = 'users' | 'prompts';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, currentUserId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create prompt form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptEmail, setNewPromptEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // View user content state
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [userSessions, setUserSessions] = useState<SessionRecord[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [usersData, promptsData] = await Promise.all([
        storageService.getAllUsers(),
        storageService.getAllCustomPrompts()
      ]);
      setUsers(usersData);
      setCustomPrompts(promptsData);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Calculate stats
  const totalUsers = users.length;
  const totalSessions = users.reduce((acc, user) => acc + (user.totalSessions || 0), 0);
  const proUsers = users.filter(u => u.plan === 'PRO').length;

  const handleCreatePrompt = async () => {
    if (!newPromptTitle.trim() || !newPromptText.trim()) return;

    setIsCreating(true);
    try {
      const newPrompt = await storageService.createCustomPrompt({
        title: newPromptTitle.trim(),
        description: newPromptDescription.trim() || undefined,
        prompt: newPromptText.trim(),
        createdBy: currentUserId,
        assignedToEmail: newPromptEmail.trim() || undefined
      });

      setCustomPrompts(prev => [newPrompt, ...prev]);
      setShowCreateForm(false);
      setNewPromptTitle('');
      setNewPromptDescription('');
      setNewPromptText('');
      setNewPromptEmail('');
    } catch (e) {
      console.error("Failed to create prompt", e);
      alert("Failed to create prompt. Please try again.");
    }
    setIsCreating(false);
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      await storageService.deleteCustomPrompt(id);
      setCustomPrompts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error("Failed to delete prompt", e);
      alert("Failed to delete prompt.");
    }
  };

  const copyShareLink = (shareCode: string, promptId: string) => {
    const link = `${window.location.origin}/i/${shareCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(promptId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePlanChange = async (uid: string, newPlan: UserPlan) => {
    try {
      await storageService.updateUserPlan(uid, newPlan);
      // Update local state
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, plan: newPlan } : u));
    } catch (e) {
      console.error("Failed to update plan", e);
      alert("Failed to update user plan.");
    }
  };

  const handleViewUserContent = async (user: any) => {
    setViewingUser(user);
    setIsLoadingSessions(true);
    setExpandedSessionId(null);
    try {
      const sessions = await storageService.getUserSessions(user.uid);
      setUserSessions(sessions);
    } catch (e) {
      console.error("Failed to fetch user sessions", e);
      setUserSessions([]);
    }
    setIsLoadingSessions(false);
  };

  const closeUserContentModal = () => {
    setViewingUser(null);
    setUserSessions([]);
    setExpandedSessionId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-inter">
      {/* Header */}
      <div className="bg-[#1e293b] text-white pb-24">
         <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
             <div className="flex items-center gap-4 mb-8">
                 <button onClick={onBack} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">
                     <ArrowLeftIcon className="w-5 h-5 text-white" />
                 </button>
                 <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
             </div>

             {/* Stats Cards */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/70 mb-2">
                        <UsersIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Total Users</span>
                    </div>
                    <p className="text-3xl font-bold">{totalUsers}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 text-amber-400/80 mb-2">
                        <StarIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Pro Users</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{proUsers}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/70 mb-2">
                        <PlayIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Sessions</span>
                    </div>
                    <p className="text-3xl font-bold">{totalSessions}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/70 mb-2">
                        <DocumentTextIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Prompts</span>
                    </div>
                    <p className="text-3xl font-bold">{customPrompts.length}</p>
                 </div>
             </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 -mt-16">
          <div className="flex gap-2 mb-4">
              <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                      activeTab === 'users'
                          ? 'bg-white text-gray-900 shadow-lg'
                          : 'bg-white/50 text-gray-600 hover:bg-white/80'
                  }`}
              >
                  <UsersIcon className="w-4 h-4 inline mr-2" />
                  Users
              </button>
              <button
                  onClick={() => setActiveTab('prompts')}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                      activeTab === 'prompts'
                          ? 'bg-white text-gray-900 shadow-lg'
                          : 'bg-white/50 text-gray-600 hover:bg-white/80'
                  }`}
              >
                  <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                  Custom Prompts
              </button>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[500px]">
              {activeTab === 'users' ? (
                  <>
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                          <h3 className="font-bold text-gray-800">User Directory</h3>
                          <button onClick={() => window.location.reload()} className="text-sm text-[#6B9B7F] font-semibold hover:underline">Refresh Data</button>
                      </div>

                      {isLoading ? (
                          <div className="p-12 flex justify-center">
                              <div className="w-8 h-8 border-4 border-[#1f3a2e] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                      ) : (
                          <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                  <thead>
                                      <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                          <th className="px-6 py-4">User</th>
                                          <th className="px-6 py-4">Plan</th>
                                          <th className="px-6 py-4">Status</th>
                                          <th className="px-6 py-4">Last Active</th>
                                          <th className="px-6 py-4 text-center">Sessions</th>
                                          <th className="px-6 py-4 text-center">Actions</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {users.map((user) => (
                                          <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-3">
                                                      {user.photoUrl ? (
                                                          <img src={user.photoUrl} alt="" className="w-8 h-8 rounded-full" />
                                                      ) : (
                                                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">
                                                              {user.name ? user.name.charAt(0) : 'U'}
                                                          </div>
                                                      )}
                                                      <div>
                                                          <p className="font-semibold text-sm text-gray-900">{user.name || 'Anonymous'}</p>
                                                          <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <select
                                                      value={user.plan || 'FREE'}
                                                      onChange={(e) => handlePlanChange(user.uid, e.target.value as UserPlan)}
                                                      className={`text-xs font-bold px-2 py-1 rounded border-0 cursor-pointer ${
                                                          user.plan === 'PRO'
                                                              ? 'bg-amber-100 text-amber-700'
                                                              : 'bg-gray-100 text-gray-600'
                                                      }`}
                                                  >
                                                      <option value="FREE">FREE</option>
                                                      <option value="PRO">PRO</option>
                                                  </select>
                                              </td>
                                              <td className="px-6 py-4">
                                                  {user.isGuest ? (
                                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">GUEST</span>
                                                  ) : (
                                                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">VERIFIED</span>
                                                  )}
                                              </td>
                                              <td className="px-6 py-4 text-sm text-gray-600">
                                                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <span className="font-mono font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs">
                                                      {user.totalSessions || 0}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <button
                                                      onClick={() => handleViewUserContent(user)}
                                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1f3a2e] bg-[#1f3a2e]/10 hover:bg-[#1f3a2e]/20 rounded-lg transition-colors"
                                                  >
                                                      <EyeIcon className="w-3.5 h-3.5" />
                                                      View
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </>
              ) : (
                  <>
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                          <h3 className="font-bold text-gray-800">Custom Interview Prompts</h3>
                          <button
                              onClick={() => setShowCreateForm(true)}
                              className="text-sm bg-[#1f3a2e] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#2a4f3d] transition-colors flex items-center gap-2"
                          >
                              <PlusIcon className="w-4 h-4" />
                              New Prompt
                          </button>
                      </div>

                      {/* View User Content Modal */}
                      {viewingUser && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          {viewingUser.photoUrl ? (
                                              <img src={viewingUser.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                                          ) : (
                                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                                  {viewingUser.name ? viewingUser.name.charAt(0) : 'U'}
                                              </div>
                                          )}
                                          <div>
                                              <h3 className="text-xl font-bold text-gray-900">{viewingUser.name || 'Anonymous'}</h3>
                                              <p className="text-sm text-gray-500">{viewingUser.email}</p>
                                          </div>
                                      </div>
                                      <button
                                          onClick={closeUserContentModal}
                                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                      >
                                          <XMarkIcon className="w-5 h-5 text-gray-500" />
                                      </button>
                                  </div>

                                  <div className="flex-1 overflow-y-auto p-6">
                                      {isLoadingSessions ? (
                                          <div className="flex justify-center py-12">
                                              <div className="w-8 h-8 border-4 border-[#1f3a2e] border-t-transparent rounded-full animate-spin"></div>
                                          </div>
                                      ) : userSessions.length === 0 ? (
                                          <div className="text-center py-12">
                                              <PlayIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                              <p className="text-gray-500">No sessions yet</p>
                                          </div>
                                      ) : (
                                          <div className="space-y-4">
                                              {userSessions.map((session) => (
                                                  <div key={session.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                                      <button
                                                          onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                                                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                                                      >
                                                          <div className="flex items-center gap-3">
                                                              <span className="text-xs font-bold bg-[#1f3a2e] text-white px-2 py-1 rounded">
                                                                  {session.style}
                                                              </span>
                                                              <span className="text-sm text-gray-600">
                                                                  {new Date(session.timestamp).toLocaleString()}
                                                              </span>
                                                          </div>
                                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                                              <span>{session.socialAssets?.length || 0} assets</span>
                                                              <span className="text-gray-300">|</span>
                                                              <span>{expandedSessionId === session.id ? '▼' : '▶'}</span>
                                                          </div>
                                                      </button>

                                                      {expandedSessionId === session.id && (
                                                          <div className="p-4 space-y-4 bg-white">
                                                              {/* Transcription */}
                                                              {session.transcription && (
                                                                  <div>
                                                                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Transcription</h5>
                                                                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                                                                          {session.transcription}
                                                                      </p>
                                                                  </div>
                                                              )}

                                                              {/* Social Assets */}
                                                              {session.socialAssets && session.socialAssets.length > 0 && (
                                                                  <div>
                                                                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Generated Content</h5>
                                                                      <div className="space-y-3">
                                                                          {session.socialAssets.map((asset, idx) => (
                                                                              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                                                                  <div className="flex items-center gap-2 mb-2">
                                                                                      <span className="text-xs font-semibold text-[#1f3a2e]">{asset.type}</span>
                                                                                      {asset.generatedBy && (
                                                                                          <span className="text-xs text-gray-400">via {asset.generatedBy}</span>
                                                                                      )}
                                                                                  </div>
                                                                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.content}</p>
                                                                                  {asset.imageUrl && (
                                                                                      <img src={asset.imageUrl} alt="" className="mt-2 max-w-xs rounded-lg" />
                                                                                  )}
                                                                              </div>
                                                                          ))}
                                                                      </div>
                                                                  </div>
                                                              )}

                                                              {/* Audio/Video */}
                                                              {session.videoUrl && (
                                                                  <div>
                                                                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Recording</h5>
                                                                      <audio controls src={session.videoUrl} className="w-full" />
                                                                  </div>
                                                              )}
                                                          </div>
                                                      )}
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* Create Form Modal */}
                      {showCreateForm && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                  <div className="p-6 border-b border-gray-200">
                                      <h3 className="text-xl font-bold text-gray-900">Create Custom Interview</h3>
                                      <p className="text-sm text-gray-500 mt-1">Create a custom prompt to share with clients</p>
                                  </div>
                                  <div className="p-6 space-y-4">
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                          <input
                                              type="text"
                                              value={newPromptTitle}
                                              onChange={(e) => setNewPromptTitle(e.target.value)}
                                              placeholder="e.g., Q1 Strategy Review"
                                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1f3a2e] focus:border-transparent"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                                          <input
                                              type="text"
                                              value={newPromptDescription}
                                              onChange={(e) => setNewPromptDescription(e.target.value)}
                                              placeholder="Brief description for your reference"
                                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1f3a2e] focus:border-transparent"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Interview Prompt *</label>
                                          <textarea
                                              value={newPromptText}
                                              onChange={(e) => setNewPromptText(e.target.value)}
                                              placeholder="Enter the full system prompt for the AI interviewer..."
                                              rows={8}
                                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1f3a2e] focus:border-transparent resize-none"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Email (optional)</label>
                                          <input
                                              type="email"
                                              value={newPromptEmail}
                                              onChange={(e) => setNewPromptEmail(e.target.value)}
                                              placeholder="client@example.com"
                                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1f3a2e] focus:border-transparent"
                                          />
                                          <p className="text-xs text-gray-500 mt-1">If set, this prompt will appear in their account when they sign in</p>
                                      </div>
                                  </div>
                                  <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                                      <button
                                          onClick={() => setShowCreateForm(false)}
                                          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                      >
                                          Cancel
                                      </button>
                                      <button
                                          onClick={handleCreatePrompt}
                                          disabled={isCreating || !newPromptTitle.trim() || !newPromptText.trim()}
                                          className="px-6 py-2 bg-[#1f3a2e] text-white rounded-lg font-semibold hover:bg-[#2a4f3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                          {isCreating ? 'Creating...' : 'Create Prompt'}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}

                      {isLoading ? (
                          <div className="p-12 flex justify-center">
                              <div className="w-8 h-8 border-4 border-[#1f3a2e] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                      ) : customPrompts.length === 0 ? (
                          <div className="p-12 text-center">
                              <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">No custom prompts yet</p>
                              <p className="text-sm text-gray-400">Create your first prompt to share with clients</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-gray-100">
                              {customPrompts.map((prompt) => (
                                  <div key={prompt.id} className="p-6 hover:bg-gray-50 transition-colors">
                                      <div className="flex justify-between items-start gap-4">
                                          <div className="flex-1 min-w-0">
                                              <h4 className="font-bold text-gray-900">{prompt.title}</h4>
                                              {prompt.description && (
                                                  <p className="text-sm text-gray-500 mt-1">{prompt.description}</p>
                                              )}
                                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{prompt.prompt}</p>
                                              <div className="flex flex-wrap gap-2 mt-3">
                                                  {prompt.assignedToEmail && (
                                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                          Assigned: {prompt.assignedToEmail}
                                                      </span>
                                                  )}
                                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                      Used {prompt.usageCount} times
                                                  </span>
                                                  <span className="text-xs text-gray-400">
                                                      Created {new Date(prompt.createdAt).toLocaleDateString()}
                                                  </span>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <button
                                                  onClick={() => copyShareLink(prompt.shareCode!, prompt.id)}
                                                  className="p-2 text-gray-500 hover:text-[#1f3a2e] hover:bg-gray-100 rounded-lg transition-colors"
                                                  title="Copy share link"
                                              >
                                                  {copiedId === prompt.id ? (
                                                      <CheckIcon className="w-5 h-5 text-green-600" />
                                                  ) : (
                                                      <LinkIcon className="w-5 h-5" />
                                                  )}
                                              </button>
                                              <button
                                                  onClick={() => handleDeletePrompt(prompt.id)}
                                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                  title="Delete prompt"
                                              >
                                                  <TrashIcon className="w-5 h-5" />
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </>
              )}
          </div>
      </div>
    </div>
  );
};
