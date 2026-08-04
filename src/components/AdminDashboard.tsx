import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { 
  migrateLegacyFileReferences, 
  cleanupLegacyFileUrls, 
  createLegacyMigrationBackup, 
  MigrationSummaryReport, 
  CleanupSummaryReport 
} from '../lib/firebase';
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
  FileText,
  Database,
  RefreshCw,
  AlertCircle,
  Download,
  Trash2,
  AlertTriangle
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

  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'migration'>('requests');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [reqSearchQuery, setReqSearchQuery] = useState('');

  // Storage Migration State - Stage 1
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationReport, setMigrationReport] = useState<MigrationSummaryReport | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Storage Migration State - Stage 2
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<CleanupSummaryReport | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [showCleanupConfirmModal, setShowCleanupConfirmModal] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationError(null);
    try {
      const report = await migrateLegacyFileReferences();
      setMigrationReport(report);
    } catch (err: any) {
      setMigrationError(err?.message || 'Migration scan failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDownloadBackup = async () => {
    const confirmed = window.confirm(
      "SECURITY WARNING: This private migration backup may contain active Firebase download tokens. Do not commit, share, or upload it.\n\nDo you wish to proceed with downloading the private JSON backup file?"
    );
    if (!confirmed) return;

    setDownloadingBackup(true);
    try {
      const backup = await createLegacyMigrationBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-science-bookshelf-private-migration-backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to download backup: ${err?.message || err}`);
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleRunStage2Cleanup = async () => {
    setShowCleanupConfirmModal(false);
    setIsCleaning(true);
    setCleanupError(null);
    try {
      const report = await cleanupLegacyFileUrls();
      setCleanupReport(report);
    } catch (err: any) {
      setCleanupError(err?.message || 'Stage 2 cleanup failed');
    } finally {
      setIsCleaning(false);
    }
  };

  // -------------------------------------------------------------
  // CALCULATE DETAILED STATS
  // -------------------------------------------------------------
  const totalUsersCount = allUsersList.length; 
  const approvedUsersCount = allUsersList.filter(u => u.libraryAccess).length;
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
          <button
            onClick={() => setActiveTab('migration')}
            className={`py-3 px-6 text-xs font-bold border-b-2 font-sans tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'migration'
                ? 'border-amber-500 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <Database className="w-4 h-4" />
            Storage Migration
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

          {/* TAB C: STORAGE MIGRATION */}
          {activeTab === 'migration' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* STAGE 1: MIGRATION SCAN & POPULATE STORAGEPATH */}
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 font-sans tracking-tight flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600" />
                        Stage 1: Populate `storagePath` References
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                        Scan all catalog books in Firestore, derive secure object storage paths from legacy persistent URLs, verify Storage object existence, and populate missing <code className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded">storagePath</code> properties. Safe, idempotent, and non-destructive.
                      </p>
                    </div>

                    <button
                      onClick={handleRunMigration}
                      disabled={isMigrating}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-[0.98] flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
                      <span>{isMigrating ? 'Executing Stage 1...' : 'Run Stage 1 Migration'}</span>
                    </button>
                  </div>

                  {migrationError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{migrationError}</span>
                    </div>
                  )}
                </div>

                {migrationReport && (
                  <div className="space-y-4">
                    {/* Stage 1 Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 bg-white border border-slate-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scanned</span>
                        <span className="text-lg font-black text-slate-800">{migrationReport.scanned}</span>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Newly Migrated</span>
                        <span className="text-lg font-black text-emerald-700">{migrationReport.migrated}</span>
                      </div>
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Already Migrated</span>
                        <span className="text-lg font-black text-blue-700">{migrationReport.alreadyMigrated}</span>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Skipped</span>
                        <span className="text-lg font-black text-amber-700">{migrationReport.skipped}</span>
                      </div>
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Failed</span>
                        <span className="text-lg font-black text-rose-700">{migrationReport.failed}</span>
                      </div>
                    </div>

                    {/* Stage 1 Log Table */}
                    <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-2xs max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 bg-slate-50">
                            <th className="py-2 px-4 font-bold">Book ID</th>
                            <th className="py-2 px-4 font-bold">Title</th>
                            <th className="py-2 px-4 font-bold">Status</th>
                            <th className="py-2 px-4 font-bold">Derived Storage Path</th>
                            <th className="py-2 px-4 font-bold">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {migrationReport.items.map((item) => (
                            <tr key={item.bookId} className="hover:bg-slate-50/50">
                              <td className="py-2 px-4 font-mono text-[11px] text-slate-500">{item.bookId}</td>
                              <td className="py-2 px-4 font-bold text-slate-800">{item.title}</td>
                              <td className="py-2 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  item.status === 'migrated' ? 'bg-emerald-100 text-emerald-800' :
                                  item.status === 'already_migrated' ? 'bg-blue-100 text-blue-800' :
                                  item.status === 'skipped' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2 px-4 font-mono text-[11px] text-slate-600">{item.storagePath || '-'}</td>
                              <td className="py-2 px-4 text-slate-500 text-[11px]">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* STAGE 2: CLEANUP LEGACY FILEURLS */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="bg-rose-50/40 border border-rose-200/60 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 font-sans tracking-tight flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        Stage 2: Cleanup Legacy `fileUrl` Fields
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                        Permanently remove legacy <code className="font-mono text-rose-700 bg-rose-50 px-1 py-0.5 rounded">fileUrl</code> properties from verified Firestore book documents after verifying that <code className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded">storagePath</code> exists and points to a valid object in Firebase Storage.
                      </p>
                      <div className="mt-2 text-[11px] font-medium text-amber-800 bg-amber-50/80 border border-amber-200/70 p-2 rounded-lg flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Warning: This private migration backup may contain active Firebase download tokens. Do not commit, share, or upload it.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleDownloadBackup}
                        disabled={downloadingBackup}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                        title="Download private JSON backup of all book records before cleanup"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-300" />
                        <span>{downloadingBackup ? 'Exporting Backup...' : 'Download JSON Backup'}</span>
                      </button>

                      <button
                        onClick={() => setShowCleanupConfirmModal(true)}
                        disabled={isCleaning}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isCleaning ? 'Cleaning Up...' : 'Run Stage 2 Cleanup'}</span>
                      </button>
                    </div>
                  </div>

                  {cleanupError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{cleanupError}</span>
                    </div>
                  )}
                </div>

                {cleanupReport && (
                  <div className="space-y-4">
                    {/* Stage 2 Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 bg-white border border-slate-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scanned</span>
                        <span className="text-lg font-black text-slate-800">{cleanupReport.scanned}</span>
                      </div>
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Cleaned</span>
                        <span className="text-lg font-black text-rose-700">{cleanupReport.cleaned}</span>
                      </div>
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Already Clean</span>
                        <span className="text-lg font-black text-blue-700">{cleanupReport.alreadyClean}</span>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Skipped</span>
                        <span className="text-lg font-black text-amber-700">{cleanupReport.skipped}</span>
                      </div>
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Failed</span>
                        <span className="text-lg font-black text-rose-700">{cleanupReport.failed}</span>
                      </div>
                    </div>

                    {/* Stage 2 Log Table */}
                    <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-2xs max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 bg-slate-50">
                            <th className="py-2 px-4 font-bold">Book ID</th>
                            <th className="py-2 px-4 font-bold">Title</th>
                            <th className="py-2 px-4 font-bold">Status</th>
                            <th className="py-2 px-4 font-bold">Storage Path</th>
                            <th className="py-2 px-4 font-bold">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {cleanupReport.items.map((item) => (
                            <tr key={item.bookId} className="hover:bg-slate-50/50">
                              <td className="py-2 px-4 font-mono text-[11px] text-slate-500">{item.bookId}</td>
                              <td className="py-2 px-4 font-bold text-slate-800">{item.title}</td>
                              <td className="py-2 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  item.status === 'cleaned' ? 'bg-rose-100 text-rose-800' :
                                  item.status === 'already_clean' ? 'bg-blue-100 text-blue-800' :
                                  item.status === 'skipped' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2 px-4 font-mono text-[11px] text-slate-600">{item.storagePath || '-'}</td>
                              <td className="py-2 px-4 text-slate-500 text-[11px]">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* STAGE 2 CONFIRMATION MODAL */}
              {showCleanupConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                  <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100">
                    <div className="flex items-center gap-3 text-rose-600">
                      <div className="p-2.5 bg-rose-50 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 font-sans">Confirm Stage 2 Cleanup</h4>
                        <p className="text-xs text-slate-500 font-medium">Permanent Firestore Field Deletion</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Are you sure you want to run Stage 2 Cleanup? This will permanently delete legacy <code className="font-mono text-rose-700 bg-rose-50 px-1 py-0.5 rounded">fileUrl</code> fields from all verified book records in Firestore.
                    </p>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                      Recommended: Download a JSON backup before proceeding if you have not done so already.
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => setShowCleanupConfirmModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRunStage2Cleanup}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                      >
                        Yes, Run Stage 2 Cleanup
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
