import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { FacultyDashboardData, ApiResponse } from '../types';
import { 
  BookOpen, 
  LogOut, 
  CheckCircle2, 
  User, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  FileText,
  Users,
  FolderGit2,
  Award
} from 'lucide-react';
import { ProposalAppraisalModal } from '../components/ProposalAppraisalModal';
import { ProjectDocumentsSection } from '../components/ProjectDocumentsSection';
import { ProjectEvaluationModal } from '../components/ProjectEvaluationModal';
import { NotificationBell } from '../components/NotificationBell';
import { milestonesApi } from '../services/api';

export const FacultyDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<FacultyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeQueueTab, setActiveQueueTab] = useState<'reviews' | 'resubmissions' | 'proposals'>('reviews');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isAppraisalOpen, setIsAppraisalOpen] = useState<boolean>(false);

  // Supervised Project Deliverables Modal State
  const [selectedDocsProject, setSelectedDocsProject] = useState<{ id: string; title: string } | null>(null);

  // Supervised Project Final Evaluation Modal State
  const [selectedEvalProject, setSelectedEvalProject] = useState<{ id: string; title: string } | null>(null);

  // Milestone Review Modal State
  const [reviewMilestoneTarget, setReviewMilestoneTarget] = useState<{
    projectId: string;
    milestone: any;
  } | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('COMPLETED');
  const [facultyRemarks, setFacultyRemarks] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  const handleOpenMilestoneReview = (projectId: string, milestone: any) => {
    setReviewMilestoneTarget({ projectId, milestone });
    setReviewStatus(milestone.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
    setFacultyRemarks(milestone.facultyRemarks || '');
  };

  const handleSubmitMilestoneReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewMilestoneTarget) return;
    setIsSubmittingReview(true);
    try {
      await milestonesApi.review(
        reviewMilestoneTarget.projectId,
        String(reviewMilestoneTarget.milestone.milestoneNumber),
        {
          status: reviewStatus,
          facultyRemarks,
        }
      );
      setReviewMilestoneTarget(null);
      await fetchDashboardData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to review milestone');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.get<ApiResponse<FacultyDashboardData>>('/faculty/dashboard');
      if (res.data.success && res.data.data) {
        setDashboard(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch faculty dashboard data');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Error retrieving faculty dashboard. Please ensure backend services are active.';
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
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Student Project Lifecycle Management</h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  FACULTY SUPERVISOR
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
                {user?.profile?.designation || dashboard?.faculty.designation || 'Associate Professor'} • {user?.profile?.employeeId || dashboard?.faculty.employeeId || 'FAC-AI-101'}
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
            <h2 className="text-sm font-bold text-rose-900">Failed to Load Faculty Dashboard</h2>
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
            {/* Faculty Supervisor Header Card */}
            <div className="bg-white rounded-lg border border-slate-200 border-l-4 border-l-indigo-600 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Welcome, {dashboard.faculty.firstName} {dashboard.faculty.lastName}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {dashboard.faculty.employeeId}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {dashboard.faculty.designation} • {dashboard.faculty.departmentName}
                </p>
                <p className="text-xs text-slate-500">
                  Research Specialization: <span className="text-slate-800 font-medium">{dashboard.faculty.specialization}</span>
                </p>
              </div>

              {/* Supervising Capacity Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 min-w-[280px] space-y-1.5 shrink-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Supervising Quota</span>
                  <span className="font-bold text-slate-900">
                    {dashboard.metrics.currentlyAssigned} / {dashboard.metrics.maxQuota} Projects
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${dashboard.metrics.capacityUtilizationPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{dashboard.metrics.capacityUtilizationPercentage}% Quota Filled</span>
                  <span className="text-emerald-700 font-semibold">
                    {dashboard.metrics.remainingCapacity} Slots Available
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Column KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Assigned Projects */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Supervised Projects</span>
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {dashboard.metrics.currentlyAssigned}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {dashboard.metrics.remainingCapacity} slots remaining in academic quota
                  </div>
                </div>
              </div>

              {/* Card 2: Action Required Queue */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Action Required</span>
                  <div className={`p-1.5 rounded-md ${dashboard.metrics.pendingReviewsCount + dashboard.metrics.pendingResubmissionsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {dashboard.metrics.pendingReviewsCount + dashboard.metrics.pendingResubmissionsCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {dashboard.metrics.pendingReviewsCount} reviews • {dashboard.metrics.pendingResubmissionsCount} resubmissions
                  </div>
                </div>
              </div>

              {/* Card 3: Proposals Awaiting Appraisal */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proposals to Review</span>
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-700">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {dashboard.metrics.proposalsAwaitingReviewCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Awaiting topic & feasibility appraisal
                  </div>
                </div>
              </div>

              {/* Card 4: Evaluated Projects */}
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Evaluated & Completed</span>
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {dashboard.metrics.evaluatedProjectsCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Final defense completed projects
                  </div>
                </div>
              </div>
            </div>

            {/* Action Required Queues Section */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Supervisor Action Queue</h3>
                  <p className="text-xs text-slate-500">Items submitted by students requiring your evaluation or approval</p>
                </div>

                {/* Queue Switcher Tabs */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md text-xs font-semibold border border-slate-200">
                  <button
                    onClick={() => setActiveQueueTab('reviews')}
                    className={`px-3 py-1 rounded-sm transition ${
                      activeQueueTab === 'reviews'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Reviews ({dashboard.actionQueues.pendingReviews.length})
                  </button>
                  <button
                    onClick={() => setActiveQueueTab('resubmissions')}
                    className={`px-3 py-1 rounded-sm transition ${
                      activeQueueTab === 'resubmissions'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Resubmissions ({dashboard.actionQueues.pendingResubmissions.length})
                  </button>
                  <button
                    onClick={() => setActiveQueueTab('proposals')}
                    className={`px-3 py-1 rounded-sm transition ${
                      activeQueueTab === 'proposals'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Proposals ({dashboard.actionQueues.pendingProposals.length})
                  </button>
                </div>
              </div>

              {/* Tab 1: Pending Milestone Reviews */}
              {activeQueueTab === 'reviews' && (
                <div>
                  {dashboard.actionQueues.pendingReviews.length > 0 ? (
                    <div className="space-y-2.5">
                      {dashboard.actionQueues.pendingReviews.map((item) => (
                        <div key={item.projectId} className="p-3.5 rounded-md border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm">{item.projectTitle}</span>
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                {item.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Student Lead: <strong className="text-slate-900">{item.studentLead}</strong> ({item.rollNumber}) • Domain: {item.domain}
                            </div>
                            {item.activeMilestoneTitle && (
                              <div className="text-xs text-slate-700 font-medium">
                                Active Deliverable #{item.activeMilestoneNumber}: {item.activeMilestoneTitle} (Due: {item.milestoneDueDate?.substring(0, 10)})
                              </div>
                            )}
                          </div>
                          <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition shrink-0">
                            Conduct Review
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No project deliverables currently waiting in the review queue.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Pending Student Resubmissions */}
              {activeQueueTab === 'resubmissions' && (
                <div>
                  {dashboard.actionQueues.pendingResubmissions.length > 0 ? (
                    <div className="space-y-2.5">
                      {dashboard.actionQueues.pendingResubmissions.map((rs) => (
                        <div key={rs.resubmissionId} className="p-3.5 rounded-md border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1 max-w-2xl">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                                Resubmission Round #{rs.roundNumber}
                              </span>
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm">{rs.projectTitle}</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Lead: {rs.studentLead} ({rs.rollNumber}) • Received on: {rs.resubmittedAt.substring(0, 10)}
                            </div>
                            <div className="text-xs bg-white p-2.5 rounded-md border border-slate-200 text-slate-700 mt-1.5">
                              <strong className="text-slate-900">Student Resubmission Notes: </strong>
                              {rs.studentNotes}
                            </div>
                          </div>
                          <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition shrink-0">
                            Evaluate Resubmission
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No student resubmissions pending re-evaluation.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Proposals Awaiting Appraisal */}
              {activeQueueTab === 'proposals' && (
                <div>
                  {dashboard.actionQueues.pendingProposals.length > 0 ? (
                    <div className="space-y-2.5">
                      {dashboard.actionQueues.pendingProposals.map((prop) => (
                        <div key={prop.proposalId} className="p-3.5 rounded-md border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm">{prop.title}</span>
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                                {prop.status}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">v{prop.version}</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Domain: {prop.domain} • Submitted By: <strong className="text-slate-900">{prop.submittedByName}</strong> ({prop.submittedByRoll})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Academic Year: {prop.academicYear} • Submitted: {prop.createdAt.substring(0, 10)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedProposalId(prop.proposalId);
                              setIsAppraisalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition shrink-0"
                          >
                            Appraise Proposal
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No project proposals currently waiting for your appraisal.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Supervised Projects Portfolio */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Supervised Capstone Projects</h3>
                  <p className="text-xs text-slate-500">Active projects under your institutional guidance in the department</p>
                </div>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {dashboard.assignedProjects.length} Projects Total
                </span>
              </div>

              <div className="space-y-3.5">
                {dashboard.assignedProjects.map((project) => (
                  <div key={project.id} className="p-4 rounded-md border border-slate-200 hover:border-slate-300 transition bg-white space-y-3.5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                            {project.domain}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getStatusBadgeClasses(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">{project.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{project.abstract}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedDocsProject({ id: project.id, title: project.title })}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Deliverables & Docs</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedEvalProject({ id: project.id, title: project.title })}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition ${
                            project.status === 'COMPLETED'
                              ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Award className={`w-3.5 h-3.5 ${project.status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-500'}`} />
                          <span>{project.status === 'COMPLETED' ? 'Evaluation Result' : 'Final Evaluation'}</span>
                        </button>

                        {project.repositoryUrl && (
                          <a
                            href={project.repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            <FolderGit2 className="w-3.5 h-3.5" />
                            <span>Repo</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 uppercase font-semibold text-[11px] block">Student Lead & Team</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-semibold text-slate-900">{project.studentLead.name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">({project.studentLead.rollNumber})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{project.teamMembersCount} Team Members</span>
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase font-semibold text-[11px] block">Active Milestone</span>
                        {project.currentMilestone ? (
                          <div className="mt-0.5">
                            <span className="font-semibold text-slate-900">
                              M{project.currentMilestone.milestoneNumber}: {project.currentMilestone.title}
                            </span>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Due: {project.currentMilestone.dueDate.substring(0, 10)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenMilestoneReview(project.id, project.currentMilestone)}
                              className="mt-1.5 inline-flex items-center space-x-1 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-300 shadow-2xs transition"
                            >
                              <span>Review Deliverable</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">No active milestone</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 uppercase font-semibold text-[11px] block">Latest Evaluation</span>
                        {project.latestReview ? (
                          <div className="mt-0.5">
                            <span className="font-semibold text-slate-900">
                              Round #{project.latestReview.roundNumber} • {project.latestReview.status}
                            </span>
                            {project.latestReview.totalScore !== null && (
                              <div className="text-[11px] text-emerald-700 font-bold">
                                Score: {project.latestReview.totalScore} / 100
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">Awaiting first review</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Overall Progress</span>
                        <span>{project.overallProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-slate-900 h-1.5 rounded-full"
                          style={{ width: `${project.overallProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Proposal Appraisal Modal */}
            <ProposalAppraisalModal
              proposalId={selectedProposalId}
              isOpen={isAppraisalOpen}
              onClose={() => {
                setIsAppraisalOpen(false);
                setSelectedProposalId(null);
              }}
              onAppraisalCompleted={() => fetchDashboardData()}
            />

            {/* Milestone Deliverable Review Modal */}
            {reviewMilestoneTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Milestone Deliverable Evaluation
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        M{reviewMilestoneTarget.milestone.milestoneNumber}: {reviewMilestoneTarget.milestone.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Due Date: {reviewMilestoneTarget.milestone.dueDate.substring(0, 10)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewMilestoneTarget(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-md hover:bg-slate-100 transition"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSubmitMilestoneReview} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Evaluation Verdict / Status
                      </label>
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white"
                      >
                        <option value="COMPLETED">COMPLETED (Deliverables Verified & Approved)</option>
                        <option value="IN_PROGRESS">IN_PROGRESS (Revisions Needed / Ongoing)</option>
                        <option value="OVERDUE">OVERDUE (Deadline Breached / Flagged)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Supervisor Feedback & Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={facultyRemarks}
                        onChange={(e) => setFacultyRemarks(e.target.value)}
                        placeholder="Provide concrete evaluation feedback, required adjustments, or approval comments..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none placeholder-slate-400"
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setReviewMilestoneTarget(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-xs transition disabled:opacity-50"
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Save Evaluation'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Stage 10: Supervised Project Deliverables & Document Repository Modal */}
            {selectedDocsProject && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-4xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Supervised Project Repository
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {selectedDocsProject.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Inspect, verify, download deliverables, or upload faculty approval artifacts
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDocsProject(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-md hover:bg-slate-100 transition"
                    >
                      ✕
                    </button>
                  </div>

                  <ProjectDocumentsSection
                    projectId={selectedDocsProject.id}
                    projectTitle={selectedDocsProject.title}
                    userRole="FACULTY"
                    canUpload={true}
                  />

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedDocsProject(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition"
                    >
                      Close Repository
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Project Final Evaluation Modal */}
            {selectedEvalProject && (
              <ProjectEvaluationModal
                projectId={selectedEvalProject.id}
                projectTitle={selectedEvalProject.title}
                isOpen={true}
                onClose={() => setSelectedEvalProject(null)}
                onEvaluationCompleted={() => {
                  fetchDashboardData();
                  setSelectedEvalProject(null);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
