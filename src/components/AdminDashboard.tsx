import React, { useState } from 'react';
import { useAuth, AppUser, AccessRequest } from '../lib/authContext';
import { 
  Users, 
  BookOpen, 
  LayoutGrid, 
  CheckCircle2, 
  Hourglass, 
  HardDrive, 
  ShieldAlert, 
  Search, 
  Check, 
  X, 
  UserMinus, 
  UserPlus, 
  FileText 
} from 'lucide-react';

interface AdminDashboardProps {
  booksCount: number;
  categoriesCount: number;
}

export default function AdminDashboard({ booksCount, categoriesCount }: AdminDashboardProps) {
  const { 
    allRequests, 
    allUsersList, 
    approveRequest, 
    denyRequest, 
    grantAccessDirectly, 
    revokeAccessDirectly 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [reqSearchQuery, setReqSearchQuery] = useState('');

  // -------------------------------------------------------------
  // CALCULATE DETAILED STATS
  // -------------------------------------------------------------
  const totalUsers = allUsersList.length;
  // Fallback to local simulation standard counts if zero
  const totalUsersCount = totalUsers || 2; 
  const approvedUsersCount = allUsersList.filter(u => u.libraryAccess).length || 1;
  const pendingRequestsCount = allRequests.filter(r => r.status === 'pending').length;
  const totalStorageApprox = (booksCount * 3.4).toFixed(1); // 3.4 MB average size

  // -------------------------------------------------------------
  // FITLERED LISTS
  // -------------------------------------------------------------
  const filteredUsers = allUsersList.filter(u => {
    const q = userSearchQuery.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const filteredRequests = allRequests.filter(r => {
    const q = reqSearchQuery.toLowerCase();
    return (
      r.displayName.toLowerCase().includes(q) || 
      r.userEmail.toLowerCase().includes(q) || 
      r.reason.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. STATUS SUMMARY GRID CARD PANELS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Books</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-slate-900">{booksCount}</span>
            <span className="text-xs text-slate-400 font-medium block">Metadata Records</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categories</span>
            <LayoutGrid className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-slate-900">{categoriesCount}</span>
            <span className="text-xs text-slate-400 font-medium block">Subtopics</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-slate-900">{totalUsersCount}</span>
            <span className="text-xs text-slate-400 font-medium block">Registered Profiles</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved Access</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-slate-900">{approvedUsersCount}</span>
            <span className="text-xs text-slate-400 font-medium block">Library Access True</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Reqs</span>
            <Hourglass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-slate-900">{pendingRequestsCount}</span>
            <span className="text-xs text-slate-400 font-medium block">Awaiting Review</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Storage Size</span>
            <HardDrive className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-slate-900">{totalStorageApprox} <span className="text-xs font-bold text-slate-400">MB</span></span>
            <span className="text-xs text-slate-400 font-medium block">Estimated Files Space</span>
          </div>
        </div>

      </div>

      {/* 2. TAB TOGGLES */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 flex">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-6 text-xs font-bold border-b-2 font-sans tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'border-amber-500 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Library Access Requests ({pendingRequestsCount})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-6 text-xs font-bold border-b-2 font-sans tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'users'
                ? 'border-amber-500 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <Users className="w-4 h-4" />
            User Access Management ({allUsersList.length})
          </button>
        </div>

        {/* Tab content panels */}
        <div className="p-6">
          
          {/* TAB A: ACCESS REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Search feed bar */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reqSearchQuery}
                  onChange={(e) => setReqSearchQuery(e.target.value)}
                  placeholder="Search requests by email, requester name, or reason terms..."
                  className="w-full text-xs py-2 pl-9 pr-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-55 shadow-3xs"
                />
              </div>

              {filteredRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto opacity-40 text-slate-350 stroke-1" />
                  <p className="text-xs font-medium">No system access requests found match query filters.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredRequests.map((request) => (
                    <div 
                      key={request.id}
                      className={`p-4 rounded-xl border transition-all duration-250 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        request.status === 'pending' ? 'bg-amber-50/20 border-amber-200/50 hover:bg-amber-50/30' :
                        request.status === 'approved' ? 'bg-emerald-50/10 border-emerald-100 hover:bg-emerald-50/20' :
                        'bg-slate-50/30 border-slate-100 hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 font-sans tracking-tight">{request.displayName}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-medium">{request.userEmail}</span>
                          <span className="text-[10px] text-slate-400 font-medium">·</span>
                          <span className="text-[10px] text-slate-500 font-mono font-medium">{formatDate(request.requestedAt)}</span>
                        </div>
                        <div className="bg-white/80 p-3 rounded-lg border border-slate-100/50 text-[11.5px] leading-relaxed text-slate-650 italic font-medium font-sans">
                          &ldquo;{request.reason}&rdquo;
                        </div>
                        {request.reviewedBy && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium font-mono">
                            <Check className="w-3 h-3 text-emerald-500" /> Reviewed by {request.reviewedByEmail}
                          </div>
                        )}
                      </div>

                      {/* Request action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {request.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => approveRequest(request.id, request.uid)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-sm transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => denyRequest(request.id)}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-sm transition flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                              <span>Deny</span>
                            </button>
                          </>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            request.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {request.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB B: USER ACCESS LISTS */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Search feed bar */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users list by username or registered email..."
                  className="w-full text-xs py-2 pl-9 pr-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-55 shadow-3xs"
                />
              </div>

              {/* Responsive users table list */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-s">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="py-3 px-4 md:px-5 font-bold">User display metadata</th>
                      <th className="py-3 px-4 font-bold">Role Assignment</th>
                      <th className="py-3 px-4 font-bold">Library Access</th>
                      <th className="py-3 px-4 font-bold">Last sign in</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          No users matching search filters found in system registry.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((item) => (
                        <tr key={item.uid} className="hover:bg-slate-50/50 transition">
                          
                          <td className="py-3.5 px-4 md:px-5">
                            <div className="flex items-center gap-3">
                              <img 
                                src={item.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
                                alt={item.displayName}
                                className="w-8 h-8 rounded-full border border-slate-100/50 shadow-3xs object-cover"
                              />
                              <div>
                                <div className="text-xs font-bold text-slate-900 font-sans tracking-tight leading-none">{item.displayName}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-none">{item.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              item.role === 'admin' ? 'bg-amber-100 text-amber-900 border border-amber-200/50' : 'bg-slate-100 text-slate-650'
                            }`}>
                              {item.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${item.libraryAccess ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className="text-[11px] font-bold text-slate-700">
                                {item.libraryAccess ? 'True (Granted)' : 'False (Restricted)'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-mono font-medium text-slate-500">
                              {item.lastLogin ? formatDate(item.lastLogin) : 'Never'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {item.email.toLowerCase() === 'adiemus80@gmail.com' ? (
                              <span className="text-[10px] font-mono font-semibold text-slate-350 select-none pr-3">System Owner</span>
                            ) : (
                              <div className="flex justify-end gap-1.5">
                                {item.libraryAccess ? (
                                  <button
                                    onClick={() => revokeAccessDirectly(item.uid)}
                                    className="px-2.5 py-1.2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold rounded-md border border-slate-200/50 transition cursor-pointer flex items-center gap-1"
                                    title="Revoke search access"
                                  >
                                    <UserMinus className="w-3 h-3 text-slate-600" />
                                    <span>Revoke</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => grantAccessDirectly(item.uid)}
                                    className="px-2.5 py-1.2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10.5px] font-bold rounded-md border border-amber-200/40 transition cursor-pointer flex items-center gap-1"
                                    title="Grant search access"
                                  >
                                    <UserPlus className="w-3 h-3 text-amber-600" />
                                    <span>Grant</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
