import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { StudentDashboardData, ApiResponse } from '../types';
import { 
  GraduationCap, 
  LogOut, 
  CheckCircle2, 
  User, 
  FolderGit2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ExternalLink,
  Award,
  RefreshCw,
  FileText,
  UserCheck,
  Plus
} from 'lucide-react';
import { CreateProposalModal } from '../components/CreateProposalModal';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isCreateProposalOpen, setIsCreateProposalOpen] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.get<ApiResponse<StudentDashboardData>>('/students/dashboard');
      if (res.data.success && res.data.data) {
        setDashboard(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch student dashboard data');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Error retrieving student dashboard. Please ensure backend services are active.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'UNDER_REVIEW':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CHANGES_REQUESTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OVERDUE':
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ALLOCATED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-16">
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

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-800">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono">
                Roll: {user?.profile?.rollNumber || dashboard?.student.rollNumber || '22AD001'} • Sem {user?.profile?.semester || dashboard?.student.semester || 6}
              </span>
            </div>

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
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="h-32 bg-slate-200 animate-pulse rounded-2xl"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-xl"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-200 animate-pulse rounded-2xl"></div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
            <div className="inline-flex p-3 bg-rose-100 rounded-full text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-rose-900">Failed to Load Dashboard</h2>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{errorMsg}</p>
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Loaded Dashboard Content */}
        {!isLoading && !errorMsg && dashboard && (
          <>
            {/* Welcome Banner / Alert */}
            <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="max-w-3xl space-y-2 relative z-10">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Authenticated Session Active (JWT + Redis Protected)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome back, {dashboard.student.firstName}!
                </h2>
                <p className="text-sky-100 text-xs sm:text-sm leading-relaxed">
                  Academic Term 2025–2026 &bull; {dashboard.student.departmentName} &bull; Batch {dashboard.student.batchName}
                </p>
              </div>

              {/* Action Alert Banner if Changes Requested */}
              {dashboard.metrics.pendingReviewAction && (
                <div className="mt-4 p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      <strong>Action Required:</strong> Review Round #{dashboard.latestReview?.roundNumber} requested revisions. Please check required changes and prepare resubmission.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4-Column KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Project Status */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Lifecycle</span>
                  <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadgeClasses(dashboard.metrics.projectStatus || 'ALLOCATED')}`}>
                    {dashboard.metrics.projectStatus || 'NO ACTIVE PROJECT'}
                  </span>
                  <div className="mt-2 text-xs text-slate-500">
                    Overall Progress: <strong className="text-slate-800">{dashboard.metrics.overallProgress}%</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Milestones Progress */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestones Gates</span>
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {dashboard.metrics.milestonesCompleted} / {dashboard.metrics.milestonesTotal}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${dashboard.metrics.milestoneProgressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {dashboard.metrics.milestoneProgressPercentage}% Gates Approved
                  </div>
                </div>
              </div>

              {/* Card 3: Deadlines & Overdue Status */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestone Deadlines</span>
                  <div className={`p-2 rounded-lg ${dashboard.metrics.overdueMilestonesCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {dashboard.metrics.overdueMilestonesCount > 0 ? (
                      <span className="text-rose-600">{dashboard.metrics.overdueMilestonesCount} Overdue</span>
                    ) : (
                      <span className="text-emerald-600">On Schedule</span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {dashboard.milestones.find(m => m.status === 'IN_PROGRESS') ? (
                      `Next Due: ${dashboard.milestones.find(m => m.status === 'IN_PROGRESS')?.dueDate.substring(0, 10)}`
                    ) : 'All milestones current'}
                  </div>
                </div>
              </div>

              {/* Card 4: Academic Standing */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Record</span>
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    CGPA {dashboard.student.cgpa.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Semester {dashboard.student.semester} &bull; Roll {dashboard.student.rollNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Project Spotlight & Team Details */}
            {dashboard.activeProject && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">
                        {dashboard.activeProject.domain}
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClasses(dashboard.activeProject.status)}`}>
                        {dashboard.activeProject.status}
                      </span>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                        Role: {dashboard.activeProject.roleInProject}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {dashboard.activeProject.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {dashboard.activeProject.abstract}
                    </p>
                  </div>

                  {dashboard.activeProject.repositoryUrl && (
                    <a
                      href={dashboard.activeProject.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shrink-0"
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>Repository</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}
                </div>

                {/* Guide & Team Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Faculty Supervisor */}
                  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Faculty Guide & Supervisor
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        {dashboard.activeProject.facultyGuide.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {dashboard.activeProject.facultyGuide.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {dashboard.activeProject.facultyGuide.designation} &bull; {dashboard.activeProject.facultyGuide.departmentCode}
                        </div>
                        <div className="text-[11px] text-sky-600 font-mono">
                          {dashboard.activeProject.facultyGuide.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Team Members */}
                  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Team Roster ({dashboard.activeProject.teamMembers.length} Members)
                    </span>
                    <div className="space-y-2">
                      {dashboard.activeProject.teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">{member.name}</span>
                            <span className="text-slate-400 font-mono">({member.rollNumber})</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${member.role === 'LEAD' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Overall Project Progress</span>
                    <span>{dashboard.activeProject.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-sky-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${dashboard.activeProject.overallProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Milestones Tracking Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Milestone Gates & Review Schedule</h3>
                  <p className="text-xs text-slate-500">Track and submit deliverables for scheduled faculty evaluations</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {dashboard.milestones.length} Milestones Configured
                </span>
              </div>

              <div className="space-y-3">
                {dashboard.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 transition bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {m.milestoneNumber}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{m.title}</h4>
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${getStatusBadgeClasses(m.status)}`}>
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 pl-8">{m.description}</p>
                      {m.studentRemarks && (
                        <div className="text-[11px] text-slate-600 pl-8 mt-1">
                          <strong className="text-slate-700">Student Remarks:</strong> {m.studentRemarks}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end justify-between shrink-0 space-y-1 pl-8 md:pl-0">
                      <div className="text-xs text-slate-500">
                        Due: <strong className="text-slate-800">{m.dueDate.substring(0, 10)}</strong>
                      </div>
                      <div className="text-xs text-slate-600">
                        Progress: <strong className="text-sky-700">{m.completionPercentage}%</strong>
                      </div>
                      <div className="w-32 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-sky-600 h-1.5 rounded-full"
                          style={{ width: `${m.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest Faculty Review & Feedback Loop */}
            {dashboard.latestReview && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-800">
                        Round #{dashboard.latestReview.roundNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{dashboard.latestReview.reviewTitle}</h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClasses(dashboard.latestReview.status)}`}>
                        {dashboard.latestReview.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Evaluated by {dashboard.latestReview.reviewerName} on {dashboard.latestReview.reviewDate.substring(0, 10)}
                    </p>
                  </div>

                  {dashboard.latestReview.hasMarks && dashboard.latestReview.totalScore !== null && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-semibold uppercase">Total Score</div>
                      <div className="text-xl font-extrabold text-emerald-600">
                        {dashboard.latestReview.totalScore} / 100
                      </div>
                    </div>
                  )}
                </div>

                {/* Score Breakdown if marks awarded */}
                {dashboard.latestReview.hasMarks && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Technical (30)</span>
                      <span className="text-sm font-bold text-slate-800">{dashboard.latestReview.technicalScore ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Docs (30)</span>
                      <span className="text-sm font-bold text-slate-800">{dashboard.latestReview.documentationScore ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Presentation (40)</span>
                      <span className="text-sm font-bold text-slate-800">{dashboard.latestReview.presentationScore ?? 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Structured Qualitative Feedback */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 space-y-1">
                    <span className="font-bold text-emerald-800 block">Identified Strengths:</span>
                    <p className="text-emerald-900 leading-relaxed">{dashboard.latestReview.strengths || 'None recorded'}</p>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 space-y-1">
                    <span className="font-bold text-amber-800 block">Issues & Deficiencies:</span>
                    <p className="text-amber-900 leading-relaxed">{dashboard.latestReview.issuesIdentified || 'None recorded'}</p>
                  </div>
                  <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 space-y-1">
                    <span className="font-bold text-sky-800 block">Required Changes:</span>
                    <p className="text-sky-900 leading-relaxed">{dashboard.latestReview.requiredChanges || 'Proceed as planned'}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <strong className="text-slate-800">General Remarks: </strong>
                  {dashboard.latestReview.generalFeedback}
                </div>
              </div>
            )}

            {/* Submitted Proposals Drawer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-sky-600" />
                  <h3 className="text-base font-bold text-slate-900">Project Proposals History</h3>
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {dashboard.proposals.length} Submitted
                  </span>
                </div>
                <button
                  onClick={() => setIsCreateProposalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit Proposal</span>
                </button>
              </div>

              <div className="space-y-3">
                {dashboard.proposals.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{p.title}</div>
                      <div className="text-slate-500 mt-0.5">
                        Domain: {p.domain} &bull; Version: v{p.version} &bull; Academic Year: {p.academicYear}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 font-bold rounded-full border ${getStatusBadgeClasses(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Proposal Modal */}
            <CreateProposalModal
              isOpen={isCreateProposalOpen}
              onClose={() => setIsCreateProposalOpen(false)}
              onSuccess={() => fetchDashboardData()}
            />
          </>
        )}
      </main>
    </div>
  );
};
