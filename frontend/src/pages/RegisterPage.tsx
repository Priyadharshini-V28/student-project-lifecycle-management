import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { batchesApi } from '../services/api';
import { AcademicBatchDto } from '../types';
import { 
  GraduationCap, 
  ArrowRight, 
  AlertCircle,
  BookOpen
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

  // Dynamic Batches
  const [batches, setBatches] = useState<AcademicBatchDto[]>([]);

  // Student specific
  const [rollNumber, setRollNumber] = useState('');
  const [batchId, setBatchId] = useState<number>(1);
  const [semester, setSemester] = useState(6);
  const [cgpa, setCgpa] = useState(8.5);

  useEffect(() => {
    batchesApi.getAll().then((data) => {
      if (data && data.length > 0) {
        setBatches(data);
        setBatchId(data[0].id);
      }
    }).catch(() => {
      // Fallback batches
      setBatches([
        { id: 1, name: '2022-2026 Batch', startYear: 2022, endYear: 2026, isCurrent: true },
        { id: 2, name: '2023-2027 Batch', startYear: 2023, endYear: 2027, isCurrent: false },
        { id: 3, name: '2024-2028 Batch', startYear: 2024, endYear: 2028, isCurrent: false },
        { id: 4, name: '2025-2029 Batch', startYear: 2025, endYear: 2029, isCurrent: false },
        { id: 5, name: '2026-2030 Batch', startYear: 2026, endYear: 2030, isCurrent: false },
      ]);
    });
  }, []);

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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-xl font-bold text-slate-900 tracking-tight">
          Create Institutional Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Department of Artificial Intelligence & Data Science
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm rounded-lg border border-slate-200 space-y-6">
          {/* Role Selection Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              className={`flex-1 py-2 text-xs font-semibold rounded-sm transition flex items-center justify-center space-x-1.5 ${
                role === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-sky-700" />
              <span>Student Registration</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('FACULTY')}
              className={`flex-1 py-2 text-xs font-semibold rounded-sm transition flex items-center justify-center space-x-1.5 ${
                role === 'FACULTY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
              <span>Faculty Registration</span>
            </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Priya"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
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
                  className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
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
                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
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
                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            {/* Student Dynamic Fields */}
            {role === 'STUDENT' ? (
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-3">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                  Student Academic Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number</label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. 22AD009"
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Academic Batch</label>
                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(Number(e.target.value))}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Faculty Dynamic Fields */
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-3">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
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
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                      className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                    className="block w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
              <Link to="/login" className="font-semibold text-slate-900 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
