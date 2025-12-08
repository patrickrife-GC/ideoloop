
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { ArrowLeftIcon, UsersIcon, PlayIcon, ClockIcon } from '@heroicons/react/24/solid';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const data = await storageService.getAllUsers();
      setUsers(data);
      setIsLoading(false);
    };
    fetchUsers();
  }, []);

  // Calculate stats
  const totalUsers = users.length;
  const totalSessions = users.reduce((acc, user) => acc + (user.totalSessions || 0), 0);
  const activeToday = users.filter(u => {
      const day = 24 * 60 * 60 * 1000;
      return (Date.now() - (u.lastLogin || 0)) < day;
  }).length;

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
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-3 text-white/70 mb-2">
                        <UsersIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Users</span>
                    </div>
                    <p className="text-4xl font-bold">{totalUsers}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-3 text-white/70 mb-2">
                        <PlayIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Sessions</span>
                    </div>
                    <p className="text-4xl font-bold">{totalSessions}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-3 text-white/70 mb-2">
                        <ClockIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Active (24h)</span>
                    </div>
                    <p className="text-4xl font-bold">{activeToday}</p>
                 </div>
             </div>
         </div>
      </div>

      {/* Main Content - User Table */}
      <div className="max-w-7xl mx-auto px-6 -mt-16">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[500px]">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">User Directory</h3>
                  <button onClick={() => window.location.reload()} className="text-sm text-[#82ba90] font-semibold hover:underline">Refresh Data</button>
              </div>
              
              {isLoading ? (
                  <div className="p-12 flex justify-center">
                      <div className="w-8 h-8 border-4 border-[#82ba90] border-t-transparent rounded-full animate-spin"></div>
                  </div>
              ) : (
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                  <th className="px-6 py-4">User</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4">Last Active</th>
                                  <th className="px-6 py-4 text-center">Sessions</th>
                                  <th className="px-6 py-4">UID</th>
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
                                      <td className="px-6 py-4 text-xs font-mono text-gray-400">
                                          {user.uid}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
