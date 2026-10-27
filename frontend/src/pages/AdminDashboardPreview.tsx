import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { allocationsApi, batchesApi, domainsApi, facultyApi } from '../services/api';
import { NotificationBell } from '../components/NotificationBell';
import {
  AllocationMatrixDto,
  FacultyCapacityItem,
  UnallocatedItemsDto,
  GuideRecommendationDto,
  AcademicBatchDto,
  DomainDto,
} from '../types';
import {
  ShieldCheck,
  LogOut,
  User,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Calendar,
  FolderGit2,
  Edit,
  Plus,
  ToggleLeft,
  ToggleRight,
  Award,
} from 'lucide-react';
import { ProjectEvaluationModal } from '../components/ProjectEvaluationModal';

export const AdminDashboardPreview: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [matrixData, setMatrixData] = useState<AllocationMatrixDto | null>(null);
  const [unallocated, setUnallocated] = useState<UnallocatedItemsDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [reassignModalProject, setReassignModalProject] = useState<{
    id: string;
    title: string;
    currentGuideId: string;
    currentGuideName: string;
  } | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [recommendations, setRecommendations] = useState<GuideRecommendationDto[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Quota edit modal state
  const [quotaModalFaculty, setQuotaModalFaculty] = useState<FacultyCapacityItem | null>(null);
  const [newMaxProjects, setNewMaxProjects] = useState<number>(5);

  // Evaluation oversight modal state
  const [evalModalProject, setEvalModalProject] = useState<{ id: string; title: string } | null>(null);

  // Proposal assignment modal state
  const [assignModalProposal, setAssignModalProposal] = useState<{
    id: string;
    title: string;
    domain: string;
  } | null>(null);
  const [selectedProposalFacultyId, setSelectedProposalFacultyId] = useState<string>('');
  const [allocateProjectImmediate, setAllocateProjectImmediate] = useState<boolean>(true);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'ALLOCATIONS' | 'BATCHES' | 'DOMAINS'>('ALLOCATIONS');

  // Batches state
  const [batches, setBatches] = useState<AcademicBatchDto[]>([]);
  const [newBatchName, setNewBatchName] = useState<string>('2027-2031 Batch');
  const [newBatchStart, setNewBatchStart] = useState<number>(2027);
  const [newBatchEnd, setNewBatchEnd] = useState<number>(2031);
  const [newBatchIsCurrent, setNewBatchIsCurrent] = useState<boolean>(false);

  // Domains state
  const [domains, setDomains] = useState<DomainDto[]>([]);
  const [newDomainName, setNewDomainName] = useState<string>('');
  const [newDomainDesc, setNewDomainDesc] = useState<string>('');

  // Faculty Specialization modal state
  const [specModalFaculty, setSpecModalFaculty] = useState<FacultyCapacityItem | null>(null);
  const [newSpecialization, setNewSpecialization] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [m, u] = await Promise.all([
        allocationsApi.getMatrix(),
        allocationsApi.getUnallocated(),
      ]);
      setMatrixData(m);
      setUnallocated(u);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load allocation data');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const data = await batchesApi.getAll();
      setBatches(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load academic batches');
    }
  };

  const loadDomains = async () => {
    try {
      const data = await domainsApi.getAll();
      setDomains(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load project domains');
    }
  };

  useEffect(() => {
    loadData();
    loadBatches();
    loadDomains();
  }, []);

  const handleOpenReassignModal = async (project: {
    id: string;
    title: string;
    currentGuideId: string;
    currentGuideName: string;
  }) => {
    setReassignModalProject(project);
    setSelectedFacultyId('');
    setReassignReason('');
    setRecommendations([]);

    // Fetch recommendations advisory ranking
    try {
      setLoadingRecs(true);
      const recs = await allocationsApi.getRecommendations(project.id);
      setRecommendations(recs);
    } catch {
      // Non-fatal advisory failure
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleOpenProposalAssignModal = async (proposal: {
    id: string;
    title: string;
    domain: string;
  }) => {
    setAssignModalProposal(proposal);
    setSelectedProposalFacultyId('');
    setAllocateProjectImmediate(true);
    setRecommendations([]);

    try {
      setLoadingRecs(true);
      const recs = await allocationsApi.getRecommendations(proposal.id);
      setRecommendations(recs);
    } catch {
      // Non-fatal
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleExecuteReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalProject || !selectedFacultyId) return;

    try {
      setSubmittingAction(true);
      setErrorMsg(null);
      await allocationsApi.reassignProjectGuide(reassignModalProject.id, {
        newFacultyGuideId: selectedFacultyId,
        reason: reassignReason.trim() || 'Departmental load rebalancing',
      });
      setSuccessMsg(`Project "${reassignModalProject.title}" supervisor reallocated successfully.`);
      setReassignModalProject(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Reallocation failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteProposalAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalProposal || !selectedProposalFacultyId) return;

    try {
      setSubmittingAction(true);
      setErrorMsg(null);
      await allocationsApi.assignProposalGuide(assignModalProposal.id, {
        facultyId: selectedProposalFacultyId,
        allocateProject: allocateProjectImmediate,
      });
      setSuccessMsg(
        allocateProjectImmediate
          ? `Project "${assignModalProposal.title}" supervisor assigned and capstone project allocated successfully.`
          : `Proposal "${assignModalProposal.title}" supervisor assigned successfully.`
      );
      setAssignModalProposal(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Assignment failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteQuotaUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaModalFaculty) return;

    try {
      setSubmittingAction(true);
      setErrorMsg(null);
      await allocationsApi.updateCapacity(quotaModalFaculty.id, {
        maxProjects: newMaxProjects,
      });
      setSuccessMsg(`Faculty capacity for ${quotaModalFaculty.name} updated to ${newMaxProjects} projects.`);
      setQuotaModalFaculty(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Quota update failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      setErrorMsg(null);
      await batchesApi.create({
        name: newBatchName,
        startYear: Number(newBatchStart),
        endYear: Number(newBatchEnd),
        isCurrent: newBatchIsCurrent,
      });
      setSuccessMsg(`Academic batch "${newBatchName}" created successfully.`);
      await loadBatches();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Batch creation failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteDomainCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    try {
      setSubmittingAction(true);
      setErrorMsg(null);
      await domainsApi.create({
        name: newDomainName.trim(),
        description: newDomainDesc.trim(),
      });
      setSuccessMsg(`Project domain "${newDomainName}" registered successfully.`);
      setNewDomainName('');
      setNewDomainDesc('');
      await loadDomains();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Domain registration failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteToggleDomain = async (id: string, currentStatus: boolean) => {
    try {
      setErrorMsg(null);
      await domainsApi.toggleStatus(id, !currentStatus);
      await loadDomains();
      setSuccessMsg('Domain status updated successfully.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Domain toggle failed.');
    }
  };

  const handleExecuteSpecUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specModalFaculty) return;
    try {
      setSubmittingAction(true);
      setErrorMsg(null);
      await facultyApi.updateSpecialization(specModalFaculty.id, newSpecialization);
      setSuccessMsg(`Specialization for ${specModalFaculty.name} updated successfully.`);
      setSpecModalFaculty(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Specialization update failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 pb-16">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Student Project Lifecycle Management</h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                  ADMINISTRATOR
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
                Administrator • Dept Head Office
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        {/* Governance Header Banner */}
        <div className="bg-white rounded-lg border border-slate-200 border-l-4 border-l-purple-600 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">
              Faculty Guide Allocation & Capacity Governance
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Supervise institutional workload balancing, enforce guide supervising quotas, review domain-matched advisor recommendations, and manage academic cohorts with immutable audit trails.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 shrink-0">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>Administrative Governance Console</span>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between text-rose-800 text-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between text-emerald-900 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-1">
          <button
            onClick={() => setActiveTab('ALLOCATIONS')}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition flex items-center space-x-1.5 border-b-2 ${
              activeTab === 'ALLOCATIONS'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guide Allocations & Capacity</span>
          </button>
          <button
            onClick={() => setActiveTab('BATCHES')}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition flex items-center space-x-1.5 border-b-2 ${
              activeTab === 'BATCHES'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Batches</span>
          </button>
          <button
            onClick={() => setActiveTab('DOMAINS')}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition flex items-center space-x-1.5 border-b-2 ${
              activeTab === 'DOMAINS'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Project Domains</span>
          </button>
        </div>

        {activeTab === 'ALLOCATIONS' && (
          <>
            {/* KPI Summary Cards */}
        {matrixData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Faculty Supervisors</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{matrixData.summary.totalFaculty}</p>
                <p className="text-xs text-slate-500 mt-0.5">Department of AI & Data Science</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Capstones</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{matrixData.summary.totalAssigned}</p>
                <p className="text-xs text-slate-500 mt-0.5">Projects currently underway</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Capacity</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">{matrixData.summary.availableSlots} Slots</p>
                <p className="text-xs text-slate-500 mt-0.5">Total capacity: {matrixData.summary.totalCapacity}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workload Utilization</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{matrixData.summary.overallUtilization}%</p>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full rounded-full"
                    style={{ width: `${Math.min(100, matrixData.summary.overallUtilization)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Departmental Faculty Capacity Matrix */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Faculty Supervisor Capacity Matrix</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Workload quota enforcement (max projects) and active supervisory allocations
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Faculty Member</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3 text-center">Assigned / Quota</th>
                  <th className="px-4 py-3 text-center">Remaining</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Pending Proposals</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData?.faculty.map((fac) => {
                  const isFull = fac.status === 'FULL';
                  const isNear = fac.status === 'NEAR_CAPACITY';

                  return (
                    <tr key={fac.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs">{fac.name}</div>
                        <div className="text-slate-500 text-[11px]">{fac.designation} • {fac.employeeId}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{fac.email}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <span className="text-slate-700 leading-snug line-clamp-2">{fac.specialization}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="font-bold text-slate-900 text-xs">
                          {fac.currentlyAssigned} / {fac.maxProjects}
                        </div>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full mx-auto mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isFull ? 'bg-rose-600' : isNear ? 'bg-amber-600' : 'bg-slate-900'
                            }`}
                            style={{ width: `${Math.min(100, fac.utilizationRate)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center font-semibold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                          {fac.remainingCapacity}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            isFull
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : isNear
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {fac.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-semibold text-slate-700">{fac.pendingProposalsCount}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSpecModalFaculty(fac);
                            setNewSpecialization(fac.specialization);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 border border-purple-200 bg-purple-50/50 rounded-md text-xs font-medium text-purple-800 hover:bg-purple-100/60 transition"
                        >
                          <Edit className="w-3 h-3 text-purple-600" />
                          <span>Specialization</span>
                        </button>
                        <button
                          onClick={() => {
                            setQuotaModalFaculty(fac);
                            setNewMaxProjects(fac.maxProjects);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 border border-slate-300 bg-white rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Sliders className="w-3 h-3 text-slate-500" />
                          <span>Adjust Quota</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Active Projects & Guide Reallocation */}
        <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Active Capstone Projects</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current project cohorts with supervisor reallocation controls and workload audit trails
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Project Details</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Student Lead</th>
                  <th className="px-4 py-3">Current Supervisor</th>
                  <th className="px-4 py-3 text-center">Progress</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unallocated?.activeProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 text-xs">{p.title}</div>
                      <div className="text-slate-500 text-[11px]">Status: {p.status}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{p.domain}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{p.leadStudent}</td>
                    <td className="px-4 py-3.5">
                      {p.currentGuide ? (
                        <span className="font-medium text-slate-900">{p.currentGuide.name}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="font-bold text-slate-900">{p.overallProgress}%</div>
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                        <div className="bg-slate-900 h-full rounded-full" style={{ width: `${p.overallProgress}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEvalModalProject({ id: p.id, title: p.title })}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium transition"
                        >
                          <Award className="w-3 h-3 text-slate-500" />
                          <span>Evaluation</span>
                        </button>
                        <button
                          onClick={() =>
                            handleOpenReassignModal({
                              id: p.id,
                              title: p.title,
                              currentGuideId: p.currentGuide?.id || '',
                              currentGuideName: p.currentGuide?.name || 'Unassigned',
                            })
                          }
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-xs transition"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{p.currentGuide ? 'Reassign Guide' : 'Assign Guide'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Pending Proposals Queue */}
        {unallocated && unallocated.pendingProposals.length > 0 && (
          <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Pending Project Proposals Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proposals awaiting faculty supervisor assignment or evaluation
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Proposal Title</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Submitted By</th>
                    <th className="px-4 py-3">Assigned Guide</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unallocated.pendingProposals.map((prop) => (
                    <tr key={prop.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-semibold text-slate-900 text-xs">{prop.title}</td>
                      <td className="px-4 py-3.5 text-slate-700">{prop.domain}</td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">{prop.leadStudent}</td>
                      <td className="px-4 py-3.5">
                        {prop.assignedFaculty ? (
                          <span className="font-medium text-slate-900">{prop.assignedFaculty.name}</span>
                        ) : (
                          <span className="text-rose-700 font-medium italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() =>
                            handleOpenProposalAssignModal({
                              id: prop.id,
                              title: prop.title,
                              domain: prop.domain,
                            })
                          }
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-xs transition"
                        >
                          <Users className="w-3 h-3" />
                          <span>Assign Guide</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        </>
      )}

      {activeTab === 'BATCHES' && (
        <div className="space-y-5">
          {/* Create Batch Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Register New Academic Batch</h3>
            </div>
            <form onSubmit={handleExecuteBatchCreate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. 2027-2031 Batch"
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Year</label>
                <input
                  type="number"
                  required
                  value={newBatchStart}
                  onChange={(e) => setNewBatchStart(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Year</label>
                <input
                  type="number"
                  required
                  value={newBatchEnd}
                  onChange={(e) => setNewBatchEnd(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBatchIsCurrent}
                    onChange={(e) => setNewBatchIsCurrent(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Is Current Batch</span>
                </label>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="ml-auto inline-flex items-center space-x-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>

          {/* Batches Table */}
          <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Enrolled Academic Batches</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Persisted academic cohorts for student registration and classification
                </p>
              </div>
              <button
                onClick={loadBatches}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Batch Name</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">{b.id}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 text-xs">{b.name}</td>
                      <td className="px-4 py-3.5 text-slate-600">{b.startYear} &ndash; {b.endYear}</td>
                      <td className="px-4 py-3.5 text-center">
                        {b.isCurrent ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Current Cohort
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Archived / Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'DOMAINS' && (
        <div className="space-y-5">
          {/* Create Domain Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
            <div className="flex items-center space-x-2 mb-3">
              <FolderGit2 className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Register New Project Domain</h3>
            </div>
            <form onSubmit={handleExecuteDomainCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Domain Name *</label>
                <input
                  type="text"
                  required
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="e.g. Quantum Computing & Cryptography"
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDomainDesc}
                  onChange={(e) => setNewDomainDesc(e.target.value)}
                  placeholder="Brief description of research / development scope"
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={submittingAction || !newDomainName.trim()}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Domain</span>
                </button>
              </div>
            </form>
          </div>

          {/* Domains Table */}
          <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Project Domains Catalog</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Persisted specializations used for project proposals and faculty keyword matching
                </p>
              </div>
              <button
                onClick={loadDomains}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Domain Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {domains.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-semibold text-slate-900 text-xs">{d.name}</td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-sm">{d.description || '—'}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            d.isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {d.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleExecuteToggleDomain(d.id, d.isActive)}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          {d.isActive ? (
                            <>
                              <ToggleRight className="w-3.5 h-3.5 text-slate-700" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      </main>

      {/* Reassign Guide Modal */}
      {reassignModalProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reassign Faculty Supervisor</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update project guide with workload validation and immutable audit logging
                </p>
              </div>
              <button
                onClick={() => setReassignModalProject(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-xs text-slate-900">{reassignModalProject.title}</div>
              <div className="text-slate-600 text-[11px]">Current Guide: <span className="font-medium text-slate-900">{reassignModalProject.currentGuideName}</span></div>
            </div>

            {/* Smart Recommendation Advisory Banner */}
            <div className="border border-sky-200 bg-sky-50/50 p-3 rounded-md space-y-2">
              <div className="flex items-center space-x-1.5 text-sky-900 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                <span>Advisory Domain Recommendation Ranking</span>
              </div>
              {loadingRecs ? (
                <p className="text-xs text-slate-500 italic">Analyzing specializations & faculty workloads...</p>
              ) : recommendations.length > 0 ? (
                <div className="space-y-1.5">
                  {recommendations.slice(0, 2).map((rec) => (
                    <div
                      key={rec.facultyId}
                      onClick={() => setSelectedFacultyId(rec.facultyId)}
                      className="cursor-pointer p-2 bg-white rounded-md border border-sky-200 flex items-center justify-between hover:border-sky-400 transition"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 text-xs">{rec.name}</span>
                        <span className="text-slate-500 text-xs ml-2">({rec.designation})</span>
                        <p className="text-[11px] text-sky-800">{rec.recommendationReason}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-200 rounded text-[11px] font-semibold">
                          {rec.matchScore}% Match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No recommendation available</p>
              )}
            </div>

            <form onSubmit={handleExecuteReassignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select New Faculty Guide <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {matrixData?.faculty
                    .filter((f) => f.id !== reassignModalProject.currentGuideId)
                    .map((f) => (
                      <option
                        key={f.id}
                        value={f.id}
                        disabled={f.remainingCapacity === 0}
                      >
                        {f.name} ({f.designation}) — {f.remainingCapacity > 0 ? `${f.remainingCapacity} slots available` : 'QUOTA FULL (Cannot Allocate)'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Reallocation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  required
                  rows={2}
                  placeholder="e.g. Domain specialization re-alignment, faculty workload balancing, or student team request."
                  className="w-full border border-slate-300 rounded-md p-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalProject(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !selectedFacultyId}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submittingAction ? 'Reallocating...' : 'Confirm Reallocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal Assignment Modal */}
      {assignModalProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign Project Guide & Allocate</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Designate an eligible faculty supervisor and initialize capstone milestones
                </p>
              </div>
              <button
                onClick={() => setAssignModalProposal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-900 text-xs">{assignModalProposal.title}</div>
              <div className="text-slate-500 text-[11px]">Domain: {assignModalProposal.domain}</div>
            </div>

            {/* Smart Recommendation Advisory Banner */}
            <div className="border border-sky-200 bg-sky-50/50 p-3 rounded-md space-y-2">
              <div className="flex items-center space-x-1.5 text-sky-900 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                <span>Advisory Domain Recommendation Ranking</span>
              </div>
              {loadingRecs ? (
                <p className="text-xs text-slate-500 italic">Analyzing specializations & faculty workloads...</p>
              ) : recommendations.length > 0 ? (
                <div className="space-y-1.5">
                  {recommendations.slice(0, 2).map((rec) => (
                    <div
                      key={rec.facultyId}
                      onClick={() => setSelectedProposalFacultyId(rec.facultyId)}
                      className="cursor-pointer p-2 bg-white rounded-md border border-sky-200 flex items-center justify-between hover:border-sky-400 transition"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 text-xs">{rec.name}</span>
                        <span className="text-slate-500 text-xs ml-2">({rec.designation})</span>
                        <p className="text-[11px] text-sky-800">{rec.recommendationReason}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-200 rounded text-[11px] font-semibold">
                          {rec.matchScore}% Match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No recommendation available</p>
              )}
            </div>

            <form onSubmit={handleExecuteProposalAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Designate Faculty Supervisor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProposalFacultyId}
                  onChange={(e) => setSelectedProposalFacultyId(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                >
                  <option value="">-- Choose Faculty Member --</option>
                  {matrixData?.faculty.map((f) => (
                    <option
                      key={f.id}
                      value={f.id}
                      disabled={f.remainingCapacity === 0}
                    >
                      {f.name} ({f.designation}) — {f.remainingCapacity > 0 ? `${f.remainingCapacity} slots available` : 'QUOTA FULL (Cannot Allocate)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <input
                  type="checkbox"
                  id="allocateProjectImmediateCheckbox"
                  checked={allocateProjectImmediate}
                  onChange={(e) => setAllocateProjectImmediate(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="allocateProjectImmediateCheckbox" className="text-xs text-slate-800 font-medium cursor-pointer">
                  Allocate Project Immediately (Instantiate milestones & activate for student team)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalProposal(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !selectedProposalFacultyId}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submittingAction ? 'Assigning...' : 'Assign Guide & Allocate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Capacity Modal */}
      {quotaModalFaculty && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Adjust Supervising Quota</h3>
              <button
                onClick={() => setQuotaModalFaculty(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Configure maximum supervising projects limit for <span className="font-semibold text-slate-900">{quotaModalFaculty.name}</span>.
            </p>

            <form onSubmit={handleExecuteQuotaUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Maximum Concurrent Projects (1 - 20)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newMaxProjects}
                  onChange={(e) => setNewMaxProjects(Number(e.target.value))}
                  required
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
                <p className="text-slate-500 text-[11px] mt-1">Currently assigned: {quotaModalFaculty.currentlyAssigned} projects</p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuotaModalFaculty(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submittingAction ? 'Updating...' : 'Save Quota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Specialization Modal */}
      {specModalFaculty && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Update Faculty Specialization</h3>
              <button
                onClick={() => setSpecModalFaculty(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Configure research and technical specialization for <span className="font-semibold text-slate-900">{specModalFaculty.name}</span>. Used by the domain recommendation engine.
            </p>

            <form onSubmit={handleExecuteSpecUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specialization Keywords / Domains
                </label>
                <textarea
                  rows={3}
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  required
                  placeholder="e.g. Deep Learning, Computer Vision, Medical Image Analysis, PyTorch"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSpecModalFaculty(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {submittingAction ? 'Saving...' : 'Save Specialization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Evaluation Oversight Modal */}
      {evalModalProject && (
        <ProjectEvaluationModal
          projectId={evalModalProject.id}
          projectTitle={evalModalProject.title}
          isOpen={true}
          readOnly={true}
          onClose={() => setEvalModalProject(null)}
          onEvaluationCompleted={() => setEvalModalProject(null)}
        />
      )}
    </div>
  );
};
