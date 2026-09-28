import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  CheckCircle2, 
  User, 
  BookOpen
} from 'lucide-react';

export const FacultyDashboardPreview: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Faculty Supervisor Portal</h1>
              <p className="text-xs text-slate-500 font-medium">Department of AI & Data Science</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-800">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono">
                {user?.profile?.designation || 'Associate Professor'} • {user?.profile?.employeeId || 'FAC-AI-101'}
              </span>
            </div>

            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase tracking-wider">
              {user?.role}
            </span>

            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              title="View & Edit Profile"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Profile</span>
            </button>

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
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/30 rounded-full border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Supervisor Session Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.firstName} {user?.lastName}!
            </h2>
            <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
              You are authenticated with Faculty privileges. Your permissions permit reviewing project proposals, conducting multi-round periodic reviews, entering rubric marks, and evaluating final defenses.
            </p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Faculty Profile (Verified in PostgreSQL)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Email</span>
              <span className="font-semibold text-slate-800 break-all">{user?.email}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Employee ID</span>
              <span className="font-semibold text-slate-800">{user?.profile?.employeeId || 'FAC-AI-101'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Designation</span>
              <span className="font-semibold text-slate-800">{user?.profile?.designation || 'Associate Professor'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Specialization</span>
              <span className="font-semibold text-indigo-700">{user?.profile?.specialization || 'Computer Vision'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
