import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'STUDENT' | 'FACULTY'>('STUDENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId] = useState(1); // 1 = AIDS

  // Student specific
  const [rollNumber, setRollNumber] = useState('');
  const [batchId] = useState(1); // 1 = 2022-2026 Batch
  const [semester, setSemester] = useState(6);
  const [cgpa, setCgpa] = useState(8.5);

  // Faculty specific
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [specialization, setSpecialization] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        email,
        password,
        firstName,
        lastName,
        role,
        departmentId,
      };

      if (role === 'STUDENT') {
        payload.rollNumber = rollNumber;
        payload.batchId = batchId;
        payload.semester = Number(semester);
        payload.cgpa = Number(cgpa);
      } else {
        payload.employeeId = employeeId;
        payload.designation = designation;
        payload.specialization = specialization;
      }

      const user = await register(payload);
      if (user.role === 'STUDENT') navigate('/student/dashboard');
      else navigate('/faculty/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to register account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-200">
            <GraduationCap className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Create Academic Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Register with your institutional credentials
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/80 space-y-6">
          {/* Role Selection Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center ${
                role === 'STUDENT'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👨‍🎓 Student Registration
            </button>
            <button
              type="button"
              onClick={() => setRole('FACULTY')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center ${
                role === 'FACULTY'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👨‍🏫 Faculty Registration
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Nair"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. priya.nair@splm.edu"
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars with 1 uppercase & 1 number"
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Student Dynamic Fields */}
            {role === 'STUDENT' ? (
              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-3">
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">
                  Student Academic Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number</label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. 22AD009"
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={cgpa}
                      onChange={(e) => setCgpa(Number(e.target.value))}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Faculty Dynamic Fields */
              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-3">
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">
                  Faculty Professional Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. FAC-AI-105"
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Assistant Professor"
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Research Specialization</label>
                  <input
                    type="text"
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Machine Learning, Natural Language Processing"
                    className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Register Account</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>

          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
