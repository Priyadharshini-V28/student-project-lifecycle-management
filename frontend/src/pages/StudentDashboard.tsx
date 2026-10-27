import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { StudentDashboardData, ApiResponse } from '../types';
import { 
  GraduationCap, 
  LogOut, 
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
  Plus,
  Edit3
} from 'lucide-react';
import { CreateProposalModal } from '../components/CreateProposalModal';
import { ProjectDocumentsSection } from '../components/ProjectDocumentsSection';
import { ProjectEvaluationOutcomeCard } from '../components/ProjectEvaluationOutcomeCard';
import { NotificationBell } from '../components/NotificationBell';
import { milestonesApi } from '../services/api';
import { MilestoneDto } from '../types';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isCreateProposalOpen, setIsCreateProposalOpen] = useState<boolean>(false);

  // Milestone Progress Update Modal State
  const [editingMilestone, setEditingMilestone] = useState<MilestoneDto | null>(null);
  const [progressVal, setProgressVal] = useState<number>(0);
  const [remarksVal, setRemarksVal] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);

  const handleOpenMilestoneModal = (m: MilestoneDto) => {
    setEditingMilestone(m);
    setProgressVal(m.completionPercentage || 0);
    setRemarksVal(m.studentRemarks || '');
  };

  const handleSaveMilestoneProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone || !dashboard?.activeProject) return;
    setIsUpdatingProgress(true);
    try {
      await milestonesApi.updateProgress(dashboard.activeProject.id, editingMilestone.id, {
        completionPercentage: Number(progressVal),
        studentRemarks: remarksVal,
      });
      setEditingMilestone(null);
      await fetchDashboardData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update milestone progress');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

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
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Student Project Lifecycle Management</h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                  STUDENT PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Department of Artificial Intelligence & Data Science</p>
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

            <NotificationBell />

            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              title="View & Edit Profile"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Profile</span>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-24 bg-slate-200 animate-pulse rounded-lg"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-200 animate-pulse rounded-lg"></div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center space-y-3">
            <div className="inline-flex p-2.5 bg-rose-100 rounded-full text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-rose-900">Failed to Load Dashboard</h2>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{errorMsg}</p>
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-md hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Loaded Dashboard Content */}
        {!isLoading && !errorMsg && dashboard && (
          <>
            {/* Academic Status Header Card */}
            <div className="bg-white rounded-lg border border-slate-200 border-l-4 border-l-sky-600 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Welcome back, {dashboard.student.firstName} {dashboard.student.lastName}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {dashboard.student.rollNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {dashboard.student.departmentName} • Academic Batch: <span className="font-semibold text-slate-800">{dashboard.student.batchName}</span> • Semester {dashboard.student.semester}
                </p>
              </div>

              {/* Action Alert Banner if Changes Requested */}
              {dashboard.metrics.pendingReviewAction ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-md flex items-center space-x-2 text-xs text-amber-900 shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Revisions Required:</strong> Review Round #{dashboard.latestReview?.roundNumber} requested updates.
                  </span>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Academic Standing: Regular</span>
                </div>
              )}
            </div>

            {/* 4-Column KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Project Status */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Project Lifecycle</span>
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-700">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${getStatusBadgeClasses(dashboard.metrics.projectStatus || 'ALLOCATED')}`}>
                    {dashboard.metrics.projectStatus || 'NO ACTIVE PROJECT'}
                  </span>
                  <div className="mt-2 text-xs text-slate-600">
                    Overall Progress: <strong className="text-slate-900 font-bold">{dashboard.metrics.overallProgress}%</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Milestones Progress */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Milestones Gates</span>
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-700">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    {dashboard.metrics.milestonesCompleted} / {dashboard.metrics.milestonesTotal}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                      className="bg-slate-900 h-1.5 rounded-full"
                      style={{ width: `${dashboard.metrics.milestoneProgressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    {dashboard.metrics.milestoneProgressPercentage}% Gates Approved
                  </div>
                </div>
              </div>

              {/* Card 3: Deadlines & Overdue Status */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Milestone Deadlines</span>
                  <div className={`p-1.5 rounded-md ${dashboard.metrics.overdueMilestonesCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    {dashboard.metrics.overdueMilestonesCount > 0 ? (
                      <span className="text-rose-700">{dashboard.metrics.overdueMilestonesCount} Overdue</span>
                    ) : (
                      <span className="text-emerald-700">On Schedule</span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {dashboard.milestones.find(m => m.status === 'IN_PROGRESS') ? (
                      `Next Due: ${dashboard.milestones.find(m => m.status === 'IN_PROGRESS')?.dueDate.substring(0, 10)}`
                    ) : 'All deliverables current'}
                  </div>
                </div>
              </div>

              {/* Card 4: Academic Standing */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Academic Record</span>
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-700">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    CGPA {dashboard.student.cgpa.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Semester {dashboard.student.semester} • Roll {dashboard.student.rollNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Project Spotlight & Team Details */}
            {dashboard.activeProject && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {dashboard.activeProject.domain}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getStatusBadgeClasses(dashboard.activeProject.status)}`}>
                        {dashboard.activeProject.status}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        Role: {dashboard.activeProject.roleInProject}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {dashboard.activeProject.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {dashboard.activeProject.abstract}
                    </p>
                  </div>

                  {dashboard.activeProject.repositoryUrl && (
                    <a
                      href={dashboard.activeProject.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shrink-0"
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>Repository</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}
                </div>

                {/* Guide & Team Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Faculty Supervisor */}
                  <div className="bg-slate-50 rounded-md p-3.5 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Faculty Guide & Supervisor
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-md bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                        {dashboard.activeProject.facultyGuide.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {dashboard.activeProject.facultyGuide.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {dashboard.activeProject.facultyGuide.designation} • {dashboard.activeProject.facultyGuide.departmentCode}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono">
                          {dashboard.activeProject.facultyGuide.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Team Members */}
                  <div className="bg-slate-50 rounded-md p-3.5 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Team Roster ({dashboard.activeProject.teamMembers.length} Members)
                    </span>
                    <div className="space-y-1.5">
                      {dashboard.activeProject.teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-900">{member.name}</span>
                            <span className="text-slate-500 font-mono text-[11px]">({member.rollNumber})</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${member.role === 'LEAD' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Overall Project Progress</span>
                    <span>{dashboard.activeProject.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded-full"
                      style={{ width: `${dashboard.activeProject.overallProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Milestones Tracking Checklist */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Milestone Deliverables & Schedule</h3>
                  <p className="text-xs text-slate-500">Track and submit deliverables for scheduled faculty evaluations</p>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {dashboard.milestones.length} Milestones Configured
                </span>
              </div>

              <div className="space-y-2.5">
                {dashboard.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-md border border-slate-200 hover:border-slate-300 transition bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                          {m.milestoneNumber}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-900">{m.title}</h4>
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getStatusBadgeClasses(m.status)}`}>
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 pl-8">{m.description}</p>
                      {m.studentRemarks && (
                        <div className="text-[11px] text-slate-600 pl-8 mt-1">
                          <strong className="text-slate-700">Student Remarks:</strong> {m.studentRemarks}
                        </div>
                      )}
                      {m.facultyRemarks && (
                        <div className="text-[11px] text-slate-800 bg-slate-50 p-2 rounded-md ml-8 mt-1.5 border border-slate-200">
                          <strong className="text-slate-900 font-semibold">Faculty Feedback:</strong> {m.facultyRemarks}
                        </div>
                      )}
                      <div className="pl-8 pt-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenMilestoneModal(m)}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium shadow-2xs transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Report Progress</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between shrink-0 space-y-1 pl-8 md:pl-0">
                      <div className="text-xs text-slate-500">
                        Due: <strong className="text-slate-800">{m.dueDate.substring(0, 10)}</strong>
                      </div>
                      <div className="text-xs text-slate-600">
                        Progress: <strong className="text-slate-900">{m.completionPercentage}%</strong>
                      </div>
                      <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-slate-900 h-1.5 rounded-full"
                          style={{ width: `${m.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage 12: Final Evaluation Outcome & Degree Clearance */}
            {dashboard.activeProject && (
              <ProjectEvaluationOutcomeCard projectId={dashboard.activeProject.id} />
            )}

            {/* Stage 10: Deliverables & Document Repository */}
            {dashboard.activeProject && (
              <ProjectDocumentsSection
                projectId={dashboard.activeProject.id}
                projectTitle={dashboard.activeProject.title}
                userRole="STUDENT"
                canUpload={true}
              />
            )}

            {/* Latest Faculty Review & Feedback Loop */}
            {dashboard.latestReview && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        Round #{dashboard.latestReview.roundNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{dashboard.latestReview.reviewTitle}</h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getStatusBadgeClasses(dashboard.latestReview.status)}`}>
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
                      <div className="text-xl font-bold text-slate-900">
                        {dashboard.latestReview.totalScore} / 100
                      </div>
                    </div>
                  )}
                </div>

                {/* Score Breakdown if marks awarded */}
                {dashboard.latestReview.hasMarks && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-md border border-slate-200 text-center">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase">Technical (30)</span>
                      <span className="text-sm font-bold text-slate-900">{dashboard.latestReview.technicalScore ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase">Docs (30)</span>
                      <span className="text-sm font-bold text-slate-900">{dashboard.latestReview.documentationScore ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase">Presentation (40)</span>
                      <span className="text-sm font-bold text-slate-900">{dashboard.latestReview.presentationScore ?? 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Structured Qualitative Feedback */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-md p-3 space-y-1">
                    <span className="font-semibold text-emerald-900 block">Identified Strengths:</span>
                    <p className="text-slate-800 leading-relaxed">{dashboard.latestReview.strengths || 'None recorded'}</p>
                  </div>
                  <div className="bg-amber-50/60 border border-amber-200 rounded-md p-3 space-y-1">
                    <span className="font-semibold text-amber-900 block">Issues & Deficiencies:</span>
                    <p className="text-slate-800 leading-relaxed">{dashboard.latestReview.issuesIdentified || 'None recorded'}</p>
                  </div>
                  <div className="bg-blue-50/60 border border-blue-200 rounded-md p-3 space-y-1">
                    <span className="font-semibold text-blue-900 block">Required Changes:</span>
                    <p className="text-slate-800 leading-relaxed">{dashboard.latestReview.requiredChanges || 'Proceed as planned'}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-slate-700">
                  <strong className="text-slate-900">General Remarks: </strong>
                  {dashboard.latestReview.generalFeedback}
                </div>
              </div>
            )}

            {/* Submitted Proposals Drawer */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">Project Proposals History</h3>
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {dashboard.proposals.length} Submitted
                  </span>
                </div>
                <button
                  onClick={() => setIsCreateProposalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit Proposal</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {dashboard.proposals.map((p) => (
                  <div key={p.id} className="p-3 rounded-md border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">{p.title}</div>
                      <div className="text-slate-500 mt-0.5">
                        Domain: {p.domain} • Version: v{p.version} • Academic Year: {p.academicYear}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 font-semibold rounded-md border ${getStatusBadgeClasses(p.status)}`}>
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

            {/* Milestone Progress Modal */}
            {editingMilestone && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Milestone Deliverable M{editingMilestone.milestoneNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{editingMilestone.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Due Date: {editingMilestone.dueDate.substring(0, 10)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingMilestone(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-md hover:bg-slate-100 transition"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveMilestoneProgress} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">Completion Progress</label>
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {progressVal}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progressVal}
                        onChange={(e) => setProgressVal(Number(e.target.value))}
                        className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-md"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>0% (Not Started)</span>
                        <span>50% (In Progress)</span>
                        <span>100% (Completed)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Deliverable Summary & Remarks
                      </label>
                      <textarea
                        rows={3}
                        value={remarksVal}
                        onChange={(e) => setRemarksVal(e.target.value)}
                        placeholder="Detail progress accomplished, deliverables completed, or technical blockers..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none placeholder-slate-400"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingMilestone(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingProgress}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-xs transition disabled:opacity-50"
                      >
                        {isUpdatingProgress ? 'Saving...' : 'Submit Progress Update'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
