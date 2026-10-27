import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { ApiResponse, User, StudentAcademicProfile, FacultyAcademicProfile } from '../types';
import {
  ArrowLeft,
  LogOut,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Edit3,
  Layers,
  Building2,
  User as UserIcon,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout, updateUserState } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'security'>('overview');
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  // Specialized profile data
  const [studentData, setStudentData] = useState<StudentAcademicProfile | null>(null);
  const [facultyData, setFacultyData] = useState<FacultyAcademicProfile | null>(null);

  // Edit Profile Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editSemester, setEditSemester] = useState<number | ''>('');
  const [editCgpa, setEditCgpa] = useState<number | ''>('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Fetch full specialized academic profile on mount
  const fetchAcademicProfile = async () => {
    if (!user) return;
    setIsLoadingProfile(true);
    try {
      if (user.role === 'STUDENT') {
        const res = await apiClient.get<ApiResponse<{ profile: StudentAcademicProfile }>>('/users/student-profile');
        if (res.data.success && res.data.data?.profile) {
          setStudentData(res.data.data.profile);
        }
      } else if (user.role === 'FACULTY') {
        const res = await apiClient.get<ApiResponse<{ profile: FacultyAcademicProfile }>>('/users/faculty-profile');
        if (res.data.success && res.data.data?.profile) {
          setFacultyData(res.data.data.profile);
        }
      }
    } catch {
      // Fallback silently if specialized profile endpoint fails
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName || '');
      setEditLastName(user.lastName || '');
      if (user.profile?.semester !== undefined) setEditSemester(user.profile.semester);
      if (user.profile?.cgpa !== undefined) setEditCgpa(user.profile.cgpa);
      if (user.profile?.designation) setEditDesignation(user.profile.designation);
      if (user.profile?.specialization) setEditSpecialization(user.profile.specialization);

      fetchAcademicProfile();
    }
  }, [user]);

  // Handle Profile Update Submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const payload: Record<string, unknown> = {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      };

      if (user?.role === 'STUDENT') {
        if (editSemester !== '') payload.semester = Number(editSemester);
        if (editCgpa !== '') payload.cgpa = Number(editCgpa);
      } else if (user?.role === 'FACULTY') {
        if (editDesignation.trim()) payload.designation = editDesignation.trim();
        if (editSpecialization.trim()) payload.specialization = editSpecialization.trim();
      }

      const res = await apiClient.put<ApiResponse<{ user: User }>>('/users/profile', payload);

      if (res.data.success && res.data.data?.user) {
        updateUserState(res.data.data.user);
        setProfileSuccessMsg('Profile details successfully updated and persisted!');
        await fetchAcademicProfile();
      } else {
        throw new Error(res.data.message || 'Failed to update profile');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Unable to update profile. Please check your inputs.';
      setProfileErrorMsg(message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    // Pre-flight client checks
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match');
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordErrorMsg('New password must be at least 8 characters with at least one uppercase letter and one number');
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await apiClient.post<ApiResponse>('/users/change-password', {
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      if (res.data.success) {
        setPasswordSuccessMsg('Security credentials updated successfully! Audit log entry recorded.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(res.data.message || 'Failed to change password');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Failed to change password. Ensure current password is correct.';
      setPasswordErrorMsg(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const getDashboardPath = () => {
    if (user?.role === 'STUDENT') return '/student/dashboard';
    if (user?.role === 'FACULTY') return '/faculty/dashboard';
    return '/admin/dashboard';
  };

  const getRoleBadgeClasses = () => {
    if (user?.role === 'STUDENT') return 'bg-sky-50 text-sky-800 border-sky-200';
    if (user?.role === 'FACULTY') return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    return 'bg-purple-50 text-purple-800 border-purple-200';
  };

  const getRoleHeaderIcon = () => {
    if (user?.role === 'STUDENT') return <GraduationCap className="w-5 h-5 text-sky-400" />;
    if (user?.role === 'FACULTY') return <BookOpen className="w-5 h-5 text-indigo-400" />;
    return <ShieldCheck className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 pb-16">
      {/* Top Institutional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-xs">
              {getRoleHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Student Project Lifecycle Management</h1>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeClasses()}`}>
                  {user?.role} PROFILE
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Department of Artificial Intelligence & Data Science</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(getDashboardPath())}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:text-rose-700 hover:bg-rose-50 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        {/* Profile Banner Card */}
        <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${
          user?.role === 'STUDENT' ? 'border-l-sky-600' : user?.role === 'FACULTY' ? 'border-l-indigo-600' : 'border-l-purple-600'
        } p-5 shadow-xs`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-xs">
                {user?.firstName?.charAt(0) || 'U'}
                {user?.lastName?.charAt(0) || ''}
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${getRoleBadgeClasses()}`}>
                    {user?.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    {user?.departmentCode || 'AIDS'} &mdash; {user?.departmentName || 'Department of Artificial Intelligence & Data Science'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="flex flex-wrap items-center gap-2.5">
              {user?.role === 'STUDENT' && (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-center min-w-[95px]">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Roll No</div>
                    <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">{user.profile?.rollNumber || '22AD001'}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-center min-w-[95px]">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Semester</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{user.profile?.semester || 6}th</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-center min-w-[95px]">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CGPA</div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">{user.profile?.cgpa?.toFixed(2) || '8.85'}</div>
                  </div>
                </>
              )}

              {user?.role === 'FACULTY' && (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-center min-w-[95px]">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Faculty ID</div>
                    <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">{user.profile?.employeeId || 'FAC-AI-101'}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-center min-w-[105px]">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Active Projects</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {facultyData?.currentlyAssigned ?? 1} / {facultyData?.maxQuota ?? 5}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-center min-w-[105px]">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Remaining</div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">
                      {facultyData?.remainingCapacity ?? 4} Slots
                    </div>
                  </div>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Access Level</div>
                  <div className="text-xs font-bold text-purple-900 mt-0.5">Department Head Administrator</div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mt-5 space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3.5 text-xs font-semibold transition flex items-center space-x-1.5 border-b-2 ${
                activeTab === 'overview'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Academic Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`pb-2.5 px-3.5 text-xs font-semibold transition flex items-center space-x-1.5 border-b-2 ${
                activeTab === 'edit'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-2.5 px-3.5 text-xs font-semibold transition flex items-center space-x-1.5 border-b-2 ${
                activeTab === 'security'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Security & Credentials</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Academic Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Academic Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Institutional Credentials Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3.5 flex items-center">
                  <UserIcon className="w-4 h-4 mr-2 text-slate-700" />
                  <span>Institutional Credentials (Immutable)</span>
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Full Name</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">{user?.firstName} {user?.lastName}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Institutional Email</dt>
                    <dd className="font-semibold text-slate-900 font-mono mt-0.5">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {user?.role === 'STUDENT' ? 'University Roll Number' : 'Employee ID'}
                    </dt>
                    <dd className="font-mono font-bold text-slate-900 mt-0.5">
                      {user?.profile?.rollNumber || user?.profile?.employeeId || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Department</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">{user?.departmentCode} &mdash; AIDS</dd>
                  </div>
                </dl>
              </div>

              {/* Role Specific Details Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3.5 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-slate-700" />
                  <span>Academic Standing & Domain Scope</span>
                </h3>
                {user?.role === 'STUDENT' && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Academic Batch</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">{user.profile?.batchName || '2022-2026'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Current Semester</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">Semester {user.profile?.semester || 6}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Cumulative GPA</dt>
                      <dd className="font-bold text-emerald-700 mt-0.5">{user.profile?.cgpa?.toFixed(2) || '8.85'} / 10.0</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Degree Program</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">B.Tech (AI & Data Science)</dd>
                    </div>
                  </dl>
                )}

                {user?.role === 'FACULTY' && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Official Designation</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">{user.profile?.designation || 'Associate Professor'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Supervising Quota</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5">{facultyData?.maxQuota || 5} Projects Max</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Research Domains</dt>
                      <dd className="font-medium text-slate-800 text-xs mt-1 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                        {user.profile?.specialization || 'Computer Vision, Medical Image Analysis, Deep Learning'}
                      </dd>
                    </div>
                  </dl>
                )}

                {user?.role === 'ADMIN' && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Administrator accounts possess department-wide governance permissions, quota management, and review panel assignment controls.
                  </p>
                )}
              </div>
            </div>

            {/* Enrolled Projects / Supervised Projects Section */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3.5 flex items-center justify-between">
                <span className="flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-slate-700" />
                  <span>{user?.role === 'STUDENT' ? 'Active Capstone Project' : 'Supervised Projects'}</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {user?.role === 'STUDENT' ? (studentData?.projects?.length || 0) : (facultyData?.assignedProjects?.length || 0)} Total
                </span>
              </h3>

              {isLoadingProfile ? (
                <div className="py-6 flex justify-center items-center text-slate-500 text-xs">
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Loading project records...</span>
                </div>
              ) : (
                <>
                  {user?.role === 'STUDENT' && (
                    <div>
                      {studentData?.projects && studentData.projects.length > 0 ? (
                        <div className="space-y-3">
                          {studentData.projects.map((p) => (
                            <div key={p.projectId} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition bg-slate-50/50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-slate-900 text-xs">{p.title}</h4>
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-50 text-sky-800 border border-sky-200">
                                    {p.status}
                                  </span>
                                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Role: {p.roleInProject}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mb-2.5">
                                <span className="font-medium text-slate-700">Domain:</span> {p.domain} &bull;{' '}
                                <span className="font-medium text-slate-700">Faculty Guide:</span> {p.facultyGuide}
                              </div>
                              <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                  <span>Overall Progress</span>
                                  <span className="font-bold text-slate-900">{p.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-slate-900 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${p.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-3 text-center">No active project allocated yet.</p>
                      )}
                    </div>
                  )}

                  {user?.role === 'FACULTY' && (
                    <div>
                      {facultyData?.assignedProjects && facultyData.assignedProjects.length > 0 ? (
                        <div className="space-y-3">
                          {facultyData.assignedProjects.map((p) => (
                            <div key={p.projectId} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition bg-slate-50/50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-slate-900 text-xs">{p.title}</h4>
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  {p.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mb-2.5">
                                <span className="font-medium text-slate-700">Domain:</span> {p.domain} &bull;{' '}
                                <span className="font-medium text-slate-700">Student Lead:</span> {p.studentLead}
                              </div>
                              <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                  <span>Milestone Progress</span>
                                  <span className="font-bold text-slate-900">{p.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-slate-900 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${p.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-3 text-center">No projects currently under your guidance.</p>
                      )}
                    </div>
                  )}

                  {user?.role === 'ADMIN' && (
                    <div className="text-xs text-slate-600 py-2">
                      Department Administrators oversee all projects in the AIDS department via the Admin Central Dashboard.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Edit Profile */}
        {activeTab === 'edit' && (
          <div className="max-w-2xl bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Edit Academic Profile</h3>
            <p className="text-xs text-slate-500 mb-5">
              Update permitted profile attributes. Note that institutional identifiers (Roll Number, Employee ID, Email, Department) are immutable and managed centrally by Department Administration.
            </p>

            {profileSuccessMsg && (
              <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                  />
                </div>
              </div>

              {/* Student Specific Inputs */}
              {user?.role === 'STUDENT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Semester (1 - 8)</label>
                    <select
                      value={editSemester}
                      onChange={(e) => setEditSemester(Number(e.target.value))}
                      className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cumulative GPA (0.00 - 10.00)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={editCgpa}
                      onChange={(e) => setEditCgpa(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                </div>
              )}

              {/* Faculty Specific Inputs */}
              {user?.role === 'FACULTY' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Designation</label>
                    <input
                      type="text"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      placeholder="e.g. Associate Professor, Head of Research"
                      className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization & Research Interests</label>
                    <textarea
                      rows={3}
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      placeholder="e.g. Deep Learning, Computer Vision, Edge AI, Generative AI"
                      className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white shadow-xs disabled:opacity-50 transition"
                >
                  {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Security & Credentials */}
        {activeTab === 'security' && (
          <div className="max-w-2xl bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Change Account Password</h3>
            <p className="text-xs text-slate-500 mb-5">
              Ensure your account uses a strong passphrase. All password updates are cryptographically hashed using bcrypt and recorded in the departmental security audit trail.
            </p>

            {passwordSuccessMsg && (
              <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-700 block mb-1">Password Requirements:</span>
                <div className={`flex items-center space-x-1.5 ${newPassword.length >= 8 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <span>{newPassword.length >= 8 ? '✓' : '•'}</span>
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${/[A-Z]/.test(newPassword) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <span>{/[A-Z]/.test(newPassword) ? '✓' : '•'}</span>
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${/[0-9]/.test(newPassword) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <span>{/[0-9]/.test(newPassword) ? '✓' : '•'}</span>
                  <span>At least one numeric digit (0-9)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 mr-2 focus:ring-slate-900"
                  />
                  <span>Show Passwords</span>
                </label>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white shadow-xs disabled:opacity-50 transition"
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
