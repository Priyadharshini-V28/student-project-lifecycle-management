import React, { useState, useEffect } from 'react';
import { proposalsApi, domainsApi, facultyApi, studentsApi } from '../services/api';
import {
  ProposalDetailDto,
  SystemSettingsDto,
  DomainDto,
  FacultyListItemDto,
  StudentListItemDto,
} from '../types';
import { FileText, AlertCircle } from 'lucide-react';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (proposal: ProposalDetailDto) => void;
}

const FALLBACK_DOMAINS: DomainDto[] = [
  { id: 'dom-1', name: 'Artificial Intelligence & Healthcare', description: '', isActive: true, createdAt: '' },
  { id: 'dom-2', name: 'Natural Language Processing & LLMs', description: '', isActive: true, createdAt: '' },
  { id: 'dom-3', name: 'Computer Vision & Medical Imaging', description: '', isActive: true, createdAt: '' },
  { id: 'dom-4', name: 'Distributed Machine Learning & Federated Learning', description: '', isActive: true, createdAt: '' },
  { id: 'dom-5', name: 'Edge AI, Embedded Systems & IoT', description: '', isActive: true, createdAt: '' },
  { id: 'dom-6', name: 'Generative AI & Multimodal Systems', description: '', isActive: true, createdAt: '' },
  { id: 'dom-7', name: 'Cybersecurity & Threat Detection', description: '', isActive: true, createdAt: '' },
  { id: 'dom-8', name: 'Autonomous Robotics & Navigation', description: '', isActive: true, createdAt: '' },
];

const FALLBACK_FACULTY: FacultyListItemDto[] = [
  { id: 'f0000000-0000-0000-0000-000000000001', name: 'Dr. Rajesh Kumar', designation: 'Associate Professor', departmentCode: 'AIDS', email: 'rajesh@splm.edu', specialization: 'Machine Learning', remainingCapacity: 3 },
];

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [subjectCode, setSubjectCode] = useState('CAPSTONE-01');
  const [subjectName, setSubjectName] = useState('Major Capstone Project');

  // Dynamic collections
  const [domains, setDomains] = useState<DomainDto[]>(FALLBACK_DOMAINS);
  const [facultyList, setFacultyList] = useState<FacultyListItemDto[]>(FALLBACK_FACULTY);
  const [studentsList, setStudentsList] = useState<StudentListItemDto[]>([]);

  const [domain, setDomain] = useState(FALLBACK_DOMAINS[0].name);
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState<string[]>(['Python', 'PyTorch']);
  const [assignedFacultyId, setAssignedFacultyId] = useState('');
  const [selectedPeers, setSelectedPeers] = useState<StudentListItemDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettingsDto>({
    maxTeamSize: 4,
    minTeamSize: 1,
    allowStudentProposals: true,
  });

  useEffect(() => {
    if (isOpen) {
      // 1. Settings
      proposalsApi.getSettings()
        .then((s) => setSettings(s))
        .catch(() => {});

      // 2. Dynamic Domains from MongoDB
      domainsApi.getAll(true)
        .then((data) => {
          if (data && data.length > 0) {
            setDomains(data);
            setDomain(data[0].name);
          }
        })
        .catch(() => {});

      // 3. Dynamic Faculty Directory from MongoDB
      facultyApi.getList()
        .then((data) => {
          if (data && data.length > 0) {
            setFacultyList(data);
          }
        })
        .catch(() => {});

      // 4. Dynamic Students Directory from MongoDB
      studentsApi.getList()
        .then((data) => {
          if (data && data.length > 0) {
            setStudentsList(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTeamSize = 1 + selectedPeers.length;
  const isTeamFull = currentTeamSize >= settings.maxTeamSize;

  const handleAddTechTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = techInput.trim();
    if (trimmed && !techStack.includes(trimmed)) {
      if (techStack.length >= 15) {
        setError('Maximum 15 technology tags permitted.');
        return;
      }
      setTechStack([...techStack, trimmed]);
      setTechInput('');
      setError(null);
    }
  };

  const handleRemoveTechTag = (tag: string) => {
    setTechStack(techStack.filter((t) => t !== tag));
  };

  const handleTogglePeer = (peer: StudentListItemDto) => {
    if (selectedPeers.some((p) => p.id === peer.id)) {
      setSelectedPeers(selectedPeers.filter((p) => p.id !== peer.id));
      setError(null);
    } else {
      if (currentTeamSize >= settings.maxTeamSize) {
        setError(`Cannot add member. Platform maximum team size is ${settings.maxTeamSize} students.`);
        return;
      }
      setSelectedPeers([...selectedPeers, peer]);
      setError(null);
    }
  };

  const handleSubmit = async (initialStatus: 'DRAFT' | 'SUBMITTED') => {
    setError(null);

    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters long.');
      return;
    }
    if (abstract.trim().length < 20) {
      setError('Abstract must be at least 20 characters explaining the academic scope.');
      return;
    }
    if (techStack.length === 0) {
      setError('Please add at least one technology stack tag.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await proposalsApi.create({
        title: title.trim(),
        abstract: abstract.trim(),
        domain,
        subjectCode: subjectCode.trim() || 'CAPSTONE-01',
        subjectName: subjectName.trim() || 'Major Capstone Project',
        techStack,
        assignedFacultyId: assignedFacultyId || null,
        initialStatus,
        coMemberStudentIds: selectedPeers.map((p) => p.id),
      });

      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit proposal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">New Capstone Project Proposal</h2>
              <p className="text-xs text-slate-500">Formulate your project scope, subject context, domain, and team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deep Learning Architecture for Diabetic Retinopathy"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
            />
          </div>

          {/* Subject Context in 2 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject / Course Code
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g., CAPSTONE-01"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject / Course Name
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g., Major Capstone Project"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
              />
            </div>
          </div>

          {/* Domain & Faculty Advisor in 2 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialization Domain *
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Faculty Supervisor / Guide *
              </label>
              <select
                value={assignedFacultyId}
                onChange={(e) => setAssignedFacultyId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
              >
                <option value="">-- Let Department / Admin Assign Guide --</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.designation} • {f.departmentCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Abstract */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Abstract & Problem Statement *
              </label>
              <span className={`text-[11px] font-medium ${abstract.length < 20 ? 'text-amber-700' : 'text-slate-500'}`}>
                {abstract.length} chars (min 20)
              </span>
            </div>
            <textarea
              rows={3}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Describe the research objective, clinical or industrial relevance, proposed machine learning methodology, and expected evaluation benchmarks..."
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
            />
          </div>

          {/* Tech Stack Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Technology Stack (Press Enter to add tag)
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleAddTechTag}
                placeholder="e.g., PyTorch, Transformers, FastAPI, Docker"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddTechTag}
                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md transition"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-50 border border-slate-200 rounded-md">
              {techStack.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white text-slate-800 border border-slate-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTechTag(tag)}
                    className="ml-1 text-slate-400 hover:text-slate-700 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Team Members Invite */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Invite Team Members
              </label>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  isTeamFull ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Team Size: {currentTeamSize} / {settings.maxTeamSize} (You + {selectedPeers.length})
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Select enrolled peers to join your proposal. You are assigned as Student Team Lead.
            </p>
            {studentsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No other enrolled students found in directory.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {studentsList.map((peer) => {
                  const isSelected = selectedPeers.some((p) => p.id === peer.id);
                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => handleTogglePeer(peer)}
                      className={`p-2 rounded-md border text-left transition flex flex-col ${
                        isSelected
                          ? 'bg-sky-50 border-sky-300 text-sky-950'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-semibold flex items-center justify-between">
                        {peer.name}
                        {isSelected && <span className="text-sky-700 text-xs font-bold">✓</span>}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {peer.rollNumber || peer.email}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-white transition"
          >
            Cancel
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition shadow-xs disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('SUBMITTED')}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit for Appraisal</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
