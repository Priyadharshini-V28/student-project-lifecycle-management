import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  LogOut, 
  CheckCircle2 
} from 'lucide-react';

export const AdminDashboardPreview: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">System Administration</h1>
              <p className="text-xs text-slate-500 font-medium">Department Governance & Allocations</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase tracking-wider">
              {user?.role}
            </span>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/30 rounded-full border border-purple-400/30 text-purple-200 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />
              <span>Administrator Privileges Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Institutional Admin Portal
            </h2>
            <p className="text-purple-100 text-xs sm:text-sm leading-relaxed">
              Logged in as {user?.firstName} {user?.lastName} ({user?.email}). Manage academic batches, configure maximum team sizes, supervise faculty guide quotas, and view institutional audit logs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
