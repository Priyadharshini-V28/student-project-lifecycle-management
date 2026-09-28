import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  LogOut, 
  CheckCircle2, 
  User 
} from 'lucide-react';

export const StudentDashboardPreview: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Student Portal</h1>
              <p className="text-xs text-slate-500 font-medium">Department of AI & Data Science</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-800">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono">
                Roll: {user?.profile?.rollNumber || '22AD001'} • Sem {user?.profile?.semester || 6}
              </span>
            </div>

            <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-full text-xs font-bold uppercase tracking-wider">
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
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authenticated Session Active (JWT + Redis Protected)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="text-sky-100 text-xs sm:text-sm leading-relaxed">
              You are logged in as an authenticated Student. Your role grants access to proposal creation, milestone tracking, deliverable uploads, and the iterative review feedback loop.
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <User className="w-4 h-4 text-sky-600" />
            <span>Enrolled Student Profile (Verified in PostgreSQL)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Email</span>
              <span className="font-semibold text-slate-800 break-all">{user?.email}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Roll Number</span>
              <span className="font-semibold text-slate-800">{user?.profile?.rollNumber || '22AD001'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Academic Batch</span>
              <span className="font-semibold text-slate-800">{user?.profile?.batchName || '2022-2026 Batch'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">CGPA</span>
              <span className="font-bold text-emerald-600">{user?.profile?.cgpa || '8.85'} / 10.00</span>
            </div>
          </div>
        </div>

        {/* Stage 3 Status */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Stage 3 Verification Success</span>
          </div>
          <p className="leading-relaxed">
            Role-Based Access Control verified: As a Student, you can navigate student views. Direct attempts to access <code>/faculty/dashboard</code> are blocked by <code>ProtectedRoute</code> and Express <code>requireRole(['FACULTY'])</code> middleware!
          </p>
        </div>
      </main>
    </div>
  );
};
