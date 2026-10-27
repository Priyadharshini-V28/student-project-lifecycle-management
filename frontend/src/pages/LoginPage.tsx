import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  UserCheck,
  BookOpen,
  ShieldCheck
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      // Route based on role
      if (user.role === 'STUDENT') navigate('/student/dashboard');
      else if (user.role === 'FACULTY') navigate('/faculty/dashboard');
      else if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to authenticate');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setErrorMessage(null);
  };

  const handleAdminSelect = () => {
    setEmail('admin@splm.edu');
    setPassword('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold text-slate-900 tracking-tight">
          Student Project Lifecycle Management
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Institutional Project Management & Evaluation Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm rounded-lg border border-slate-200 space-y-6">
          {/* Quick Login / Select Account */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
            <div className="flex items-center space-x-1.5 mb-2">
              <UserCheck className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Select Institutional Account
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('student1@splm.edu')}
                className="text-xs py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-medium transition text-center shadow-2xs flex items-center justify-center space-x-1.5"
                title="Student Demo"
              >
                <GraduationCap className="w-3.5 h-3.5 text-sky-700" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('faculty1@splm.edu')}
                className="text-xs py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-medium transition text-center shadow-2xs flex items-center justify-center space-x-1.5"
                title="Faculty Demo"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                onClick={handleAdminSelect}
                className="text-xs py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-medium transition text-center shadow-2xs flex items-center justify-center space-x-1.5"
                title="Administrator Login"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-md p-3 flex items-start space-x-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email Address
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@splm.edu"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>

          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-xs text-slate-600">
              Need to register a new account?{' '}
              <Link to="/register" className="font-semibold text-slate-900 hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
