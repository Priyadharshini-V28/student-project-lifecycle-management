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
  FolderGit2
} from 'lucide-react';
import { ProposalAppraisalModal } from '../components/ProposalAppraisalModal';

export const FacultyDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<FacultyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeQueueTab, setActiveQueueTab] = useState<'reviews' | 'resubmissions' | 'proposals'>('reviews');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isAppraisalOpen, setIsAppraisalOpen] = useState<boolean>(false);

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
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-16">
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

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-800">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono">
                {user?.profile?.designation || dashboard?.faculty.designation || 'Associate Professor'} &bull; {user?.profile?.employeeId || dashboard?.faculty.employeeId || 'FAC-AI-101'}
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
            <h2 className="text-base font-bold text-rose-900">Failed to Load Faculty Dashboard</h2>
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
            {/* Welcome & Quota Hero Banner */}
            <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/30 rounded-full border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Faculty Supervisor Session Active</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome, {dashboard.faculty.firstName} {dashboard.faculty.lastName}
                  </h2>
                  <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
                    {dashboard.faculty.designation} &bull; {dashboard.faculty.departmentName}
                  </p>
                  <p className="text-indigo-300/80 text-xs">
                    Research Focus: <span className="text-white font-medium">{dashboard.faculty.specialization}</span>
                  </p>
                </div>

                {/* Supervising Capacity Meter */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 min-w-[260px] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-indigo-200 font-medium">Supervising Capacity</span>
                    <span className="font-bold text-white">
                      {dashboard.metrics.currentlyAssigned} / {dashboard.metrics.maxQuota} Projects
                    </span>
                  </div>
                  <div className="w-full bg-indigo-950/60 rounded-full h-2">
                    <div 
                      className="bg-indigo-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${dashboard.metrics.capacityUtilizationPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-indigo-200">
                    <span>{dashboard.metrics.capacityUtilizationPercentage}% Quota Filled</span>
                    <span className="text-emerald-300 font-semibold">
                      {dashboard.metrics.remainingCapacity} Slots Available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Column KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Assigned Projects */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supervised Projects</span>
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {dashboard.metrics.currentlyAssigned}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {dashboard.metrics.remainingCapacity} slots remaining in academic quota
                  </div>
                </div>
              </div>

              {/* Card 2: Action Required Queue */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Action Required</span>
                  <div className={`p-2 rounded-lg ${dashboard.metrics.pendingReviewsCount + dashboard.metrics.pendingResubmissionsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {dashboard.metrics.pendingReviewsCount + dashboard.metrics.pendingResubmissionsCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {dashboard.metrics.pendingReviewsCount} reviews &bull; {dashboard.metrics.pendingResubmissionsCount} resubmissions
                  </div>
                </div>
              </div>

              {/* Card 3: Proposals Awaiting Appraisal */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proposals to Review</span>
                  <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {dashboard.metrics.proposalsAwaitingReviewCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Awaiting topic & feasibility appraisal
                  </div>
                </div>
              </div>

              {/* Card 4: Evaluated Projects */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluated & Completed</span>
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {dashboard.metrics.evaluatedProjectsCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Final defense completed projects
                  </div>
                </div>
              </div>
            </div>

            {/* Action Required Queues Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Supervisor Action Queue</h3>
                  <p className="text-xs text-slate-500">Items submitted by students requiring your evaluation or approval</p>
                </div>

                {/* Queue Switcher Tabs */}
                <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveQueueTab('reviews')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeQueueTab === 'reviews'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Reviews ({dashboard.actionQueues.pendingReviews.length})
                  </button>
                  <button
                    onClick={() => setActiveQueueTab('resubmissions')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeQueueTab === 'resubmissions'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Resubmissions ({dashboard.actionQueues.pendingResubmissions.length})
                  </button>
                  <button
                    onClick={() => setActiveQueueTab('proposals')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeQueueTab === 'proposals'
                        ? 'bg-white text-indigo-700 shadow-xs'
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
                    <div className="space-y-3">
                      {dashboard.actionQueues.pendingReviews.map((item) => (
                        <div key={item.projectId} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm">{item.projectTitle}</span>
                              <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800">
                                {item.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Student Lead: <strong className="text-slate-800">{item.studentLead}</strong> ({item.rollNumber}) &bull; Domain: {item.domain}
                            </div>
                            {item.activeMilestoneTitle && (
                              <div className="text-xs text-indigo-700 font-medium">
                                Active Milestone #{item.activeMilestoneNumber}: {item.activeMilestoneTitle} (Due: {item.milestoneDueDate?.substring(0, 10)})
                              </div>
                            )}
                          </div>
                          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shrink-0">
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
                    <div className="space-y-3">
                      {dashboard.actionQueues.pendingResubmissions.map((rs) => (
                        <div key={rs.resubmissionId} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1 max-w-2xl">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-800">
                                Resubmission for Round #{rs.roundNumber}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">{rs.projectTitle}</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Lead: {rs.studentLead} ({rs.rollNumber}) &bull; Received on: {rs.resubmittedAt.substring(0, 10)}
                            </div>
                            <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 mt-2">
                              <strong className="text-slate-800">Student Resubmission Notes: </strong>
                              {rs.studentNotes}
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shrink-0">
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
                    <div className="space-y-3">
                      {dashboard.actionQueues.pendingProposals.map((prop) => (
                        <div key={prop.proposalId} className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm">{prop.title}</span>
                              <span className="px-2 py-0.5 text-xs font-bold rounded bg-sky-100 text-sky-800">
                                {prop.status}
                              </span>
                              <span className="text-xs text-slate-400">v{prop.version}</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Domain: {prop.domain} &bull; Submitted By: <strong className="text-slate-800">{prop.submittedByName}</strong> ({prop.submittedByRoll})
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Academic Year: {prop.academicYear} &bull; Submitted: {prop.createdAt.substring(0, 10)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedProposalId(prop.proposalId);
                              setIsAppraisalOpen(true);
                            }}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Supervised Capstone Projects</h3>
                  <p className="text-xs text-slate-500">Active projects under your institutional guidance in the AIDS department</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {dashboard.assignedProjects.length} Projects Total
                </span>
              </div>

              <div className="space-y-4">
                {dashboard.assignedProjects.map((project) => (
                  <div key={project.id} className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/40 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            {project.domain}
                          </span>
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClasses(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">{project.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{project.abstract}</p>
                      </div>

                      {project.repositoryUrl && (
                        <a
                          href={project.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0"
                        >
                          <FolderGit2 className="w-3.5 h-3.5" />
                          <span>Repo</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      )}
                    </div>

                    {/* Progress Bar & Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/80 text-xs">
                      <div>
                        <span className="text-slate-400 uppercase font-semibold text-[11px] block">Student Lead & Team</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-bold text-slate-800">{project.studentLead.name}</span>
                          <span className="text-slate-400 font-mono">({project.studentLead.rollNumber})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{project.teamMembersCount} Team Members</span>
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase font-semibold text-[11px] block">Active Milestone</span>
                        {project.currentMilestone ? (
                          <div className="mt-0.5">
                            <span className="font-bold text-slate-800">
                              M{project.currentMilestone.milestoneNumber}: {project.currentMilestone.title}
                            </span>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Due: {project.currentMilestone.dueDate.substring(0, 10)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">No active milestone</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 uppercase font-semibold text-[11px] block">Latest Evaluation</span>
                        {project.latestReview ? (
                          <div className="mt-0.5">
                            <span className="font-bold text-slate-800">
                              Round #{project.latestReview.roundNumber} &bull; {project.latestReview.status}
                            </span>
                            {project.latestReview.totalScore !== null && (
                              <div className="text-[11px] text-emerald-600 font-bold">
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
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
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
          </>
        )}
      </main>
    </div>
  );
};
