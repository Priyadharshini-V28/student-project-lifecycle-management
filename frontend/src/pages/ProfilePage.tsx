import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { ApiResponse, User, StudentAcademicProfile, FacultyAcademicProfile } from '../types';

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
    if (user?.role === 'STUDENT') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (user?.role === 'FACULTY') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Institutional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(getDashboardPath())}
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-sky-600 transition"
              title="Return to Dashboard"
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-800 text-base tracking-tight">
              User Profile & Academic Credentials
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeClasses()}`}>
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-md border border-rose-200 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Profile Banner Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-md border-2 border-white">
                {user?.firstName?.charAt(0) || 'U'}
                {user?.lastName?.charAt(0) || ''}
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getRoleBadgeClasses()}`}>
                    {user?.role}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    <svg className="w-3.5 h-3.5 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {user?.departmentCode || 'AIDS'} — {user?.departmentName || 'Department of Artificial Intelligence & Data Science'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="flex flex-wrap items-center gap-3">
              {user?.role === 'STUDENT' && (
                <>
                  <div className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-2 text-center min-w-[100px]">
                    <div className="text-xs font-semibold text-sky-600 uppercase">Roll No</div>
                    <div className="text-sm font-bold text-sky-950 font-mono">{user.profile?.rollNumber || '22AD001'}</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-center min-w-[100px]">
                    <div className="text-xs font-semibold text-indigo-600 uppercase">Semester</div>
                    <div className="text-base font-bold text-indigo-950">{user.profile?.semester || 6}th</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-center min-w-[100px]">
                    <div className="text-xs font-semibold text-emerald-600 uppercase">CGPA</div>
                    <div className="text-base font-bold text-emerald-950">{user.profile?.cgpa?.toFixed(2) || '8.85'}</div>
                  </div>
                </>
              )}

              {user?.role === 'FACULTY' && (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-center min-w-[100px]">
                    <div className="text-xs font-semibold text-indigo-600 uppercase">Faculty ID</div>
                    <div className="text-sm font-bold text-indigo-950 font-mono">{user.profile?.employeeId || 'FAC-AI-101'}</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-2 text-center min-w-[110px]">
                    <div className="text-xs font-semibold text-sky-600 uppercase">Active Projects</div>
                    <div className="text-base font-bold text-sky-950">
                      {facultyData?.currentlyAssigned ?? 1} / {facultyData?.maxQuota ?? 5}
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-center min-w-[110px]">
                    <div className="text-xs font-semibold text-emerald-600 uppercase">Remaining Quota</div>
                    <div className="text-base font-bold text-emerald-950">
                      {facultyData?.remainingCapacity ?? 4} Slots
                    </div>
                  </div>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
                  <div className="text-xs font-semibold text-amber-700 uppercase">Access Level</div>
                  <div className="text-sm font-bold text-amber-950">Department Head Administrator</div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mt-6 space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-semibold border-b-2 transition ${
                activeTab === 'overview'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Academic Overview
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`pb-3 text-sm font-semibold border-b-2 transition ${
                activeTab === 'edit'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Edit Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 text-sm font-semibold border-b-2 transition ${
                activeTab === 'security'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Security & Credentials
            </button>
          </div>
        </div>

        {/* Tab 1: Academic Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Academic Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Institutional Credentials Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Institutional Credentials (Immutable)
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-slate-400 uppercase">Full Name</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">{user?.firstName} {user?.lastName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-400 uppercase">Institutional Email</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-400 uppercase">
                      {user?.role === 'STUDENT' ? 'University Roll Number' : 'Employee ID'}
                    </dt>
                    <dd className="font-mono font-bold text-sky-700 mt-0.5">
                      {user?.profile?.rollNumber || user?.profile?.employeeId || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-400 uppercase">Department</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">{user?.departmentCode} — AIDS</dd>
                  </div>
                </dl>
              </div>

              {/* Role Specific Details Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Academic Standing & Domain Scope
                </h2>
                {user?.role === 'STUDENT' && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-slate-400 uppercase">Academic Batch</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">{user.profile?.batchName || '2022-2026'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400 uppercase">Current Semester</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">Semester {user.profile?.semester || 6}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400 uppercase">Cumulative GPA</dt>
                      <dd className="font-bold text-emerald-600 mt-0.5">{user.profile?.cgpa?.toFixed(2) || '8.85'} / 10.0</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400 uppercase">Degree Program</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">B.Tech (AI & Data Science)</dd>
                    </div>
                  </dl>
                )}

                {user?.role === 'FACULTY' && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-slate-400 uppercase">Official Designation</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">{user.profile?.designation || 'Associate Professor'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-400 uppercase">Supervising Quota</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">{facultyData?.maxQuota || 5} Projects Max</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-slate-400 uppercase">Research Domains</dt>
                      <dd className="font-semibold text-indigo-700 mt-0.5 bg-indigo-50/60 p-2 rounded border border-indigo-100">
                        {user.profile?.specialization || 'Computer Vision, Medical Image Analysis, Deep Learning'}
                      </dd>
                    </div>
                  </dl>
                )}

                {user?.role === 'ADMIN' && (
                  <p className="text-sm text-slate-600">
                    Administrator accounts possess department-wide governance permissions, quota management, and review panel assignment controls.
                  </p>
                )}
              </div>
            </div>

            {/* Enrolled Projects / Supervised Projects Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {user?.role === 'STUDENT' ? 'Active Capstone Project' : 'Supervised Projects'}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {user?.role === 'STUDENT' ? (studentData?.projects?.length || 0) : (facultyData?.assignedProjects?.length || 0)} Total
                </span>
              </h2>

              {isLoadingProfile ? (
                <div className="py-8 flex justify-center items-center text-slate-400 text-sm">
                  <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading project records...
                </div>
              ) : (
                <>
                  {user?.role === 'STUDENT' && (
                    <div>
                      {studentData?.projects && studentData.projects.length > 0 ? (
                        <div className="space-y-4">
                          {studentData.projects.map((p) => (
                            <div key={p.projectId} className="border border-slate-200 rounded-lg p-4 hover:border-sky-300 transition bg-slate-50/50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <h3 className="font-bold text-slate-900 text-sm">{p.title}</h3>
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-100 text-sky-800">
                                    {p.status}
                                  </span>
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                                    Role: {p.roleInProject}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mb-3">
                                <span className="font-medium text-slate-700">Domain:</span> {p.domain} &bull;{' '}
                                <span className="font-medium text-slate-700">Faculty Guide:</span> {p.facultyGuide}
                              </div>
                              <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                  <span>Overall Progress</span>
                                  <span className="font-bold text-sky-700">{p.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-sky-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${p.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 py-4 text-center">No active project allocated yet.</p>
                      )}
                    </div>
                  )}

                  {user?.role === 'FACULTY' && (
                    <div>
                      {facultyData?.assignedProjects && facultyData.assignedProjects.length > 0 ? (
                        <div className="space-y-4">
                          {facultyData.assignedProjects.map((p) => (
                            <div key={p.projectId} className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition bg-slate-50/50">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <h3 className="font-bold text-slate-900 text-sm">{p.title}</h3>
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800">
                                  {p.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mb-3">
                                <span className="font-medium text-slate-700">Domain:</span> {p.domain} &bull;{' '}
                                <span className="font-medium text-slate-700">Student Lead:</span> {p.studentLead}
                              </div>
                              <div>
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                  <span>Milestone Progress</span>
                                  <span className="font-bold text-indigo-700">{p.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${p.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 py-4 text-center">No projects currently under your guidance.</p>
                      )}
                    </div>
                  )}

                  {user?.role === 'ADMIN' && (
                    <div className="text-sm text-slate-600 py-2">
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
          <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Edit Academic Profile</h2>
            <p className="text-xs text-slate-500 mb-6">
              Update permitted profile attributes. Note that institutional identifiers (Roll Number, Employee ID, Email, Department) are immutable and managed centrally by Department Administration.
            </p>

            {profileSuccessMsg && (
              <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {profileSuccessMsg}
              </div>
            )}

            {profileErrorMsg && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {profileErrorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
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
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
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
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              )}

              {/* Faculty Specific Inputs */}
              {user?.role === 'FACULTY' && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Designation</label>
                    <input
                      type="text"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      placeholder="e.g. Associate Professor, Head of Research"
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization & Research Interests</label>
                    <textarea
                      rows={3}
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      placeholder="e.g. Deep Learning, Computer Vision, Edge AI, Generative AI"
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50 transition"
                >
                  {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Security & Credentials */}
        {activeTab === 'security' && (
          <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Change Account Password</h2>
            <p className="text-xs text-slate-500 mb-6">
              Ensure your account uses a strong passphrase. All password updates are cryptographically hashed using bcrypt and recorded in the departmental security audit trail.
            </p>

            {passwordSuccessMsg && (
              <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {passwordSuccessMsg}
              </div>
            )}

            {passwordErrorMsg && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {passwordErrorMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
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
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
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
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-600 block mb-1">Password Requirements:</span>
                <div className={`flex items-center ${newPassword.length >= 8 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <span className="mr-1.5">{newPassword.length >= 8 ? '✓' : '•'}</span> At least 8 characters
                </div>
                <div className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <span className="mr-1.5">{/[A-Z]/.test(newPassword) ? '✓' : '•'}</span> At least one uppercase letter (A-Z)
                </div>
                <div className={`flex items-center ${/[0-9]/.test(newPassword) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  <span className="mr-1.5">{/[0-9]/.test(newPassword) ? '✓' : '•'}</span> At least one numeric digit (0-9)
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 mr-2 focus:ring-sky-500"
                  />
                  Show Passwords
                </label>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50 transition"
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
