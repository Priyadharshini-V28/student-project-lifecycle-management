import React, { useState, useEffect } from 'react';
import { proposalsApi } from '../services/api';
import { ProposalDetailDto, SystemSettingsDto } from '../types';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (proposal: ProposalDetailDto) => void;
}

const PRESET_DOMAINS = [
  'Artificial Intelligence & Healthcare',
  'Natural Language Processing & LLMs',
  'Computer Vision & Medical Imaging',
  'Distributed Machine Learning & Federated Learning',
  'Edge AI, Embedded Systems & IoT',
  'Generative AI & Multimodal Systems',
  'Cybersecurity & Threat Detection',
  'Autonomous Robotics & Navigation',
];

const AVAILABLE_FACULTY = [
  { id: 'f0000000-0000-0000-0000-000000000001', name: 'Dr. Rajesh Kumar', designation: 'Associate Professor', dept: 'AIDS' },
  { id: 'f0000000-0000-0000-0000-000000000002', name: 'Dr. Meenakshi Sundaram', designation: 'Professor & Head', dept: 'AIDS' },
];

const PEER_STUDENTS = [
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'Ananya Verma', rollNumber: '22AD002' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'Vikram Patel', rollNumber: '22AD003' },
  { id: 'b0000000-0000-0000-0000-000000000004', name: 'Sneha Iyer', rollNumber: '22AD004' },
];

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [domain, setDomain] = useState(PRESET_DOMAINS[0]);
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState<string[]>(['Python', 'PyTorch']);
  const [assignedFacultyId, setAssignedFacultyId] = useState(AVAILABLE_FACULTY[0].id);
  const [selectedPeers, setSelectedPeers] = useState<typeof PEER_STUDENTS>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettingsDto>({
    maxTeamSize: 4,
    minTeamSize: 1,
    allowStudentProposals: true,
  });

  useEffect(() => {
    if (isOpen) {
      proposalsApi.getSettings()
        .then((s) => setSettings(s))
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

  const handleTogglePeer = (peer: typeof PEER_STUDENTS[0]) => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              💡
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">New Capstone Project Proposal</h2>
              <p className="text-xs text-slate-500">Formulate your capstone project scope, domain, and team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deep Learning Architecture for Diabetic Retinopathy"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          {/* Domain & Faculty Advisor in 2 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Specialization Domain *
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900"
              >
                {PRESET_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Faculty Supervisor / Guide *
              </label>
              <select
                value={assignedFacultyId}
                onChange={(e) => setAssignedFacultyId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900"
              >
                {AVAILABLE_FACULTY.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.designation})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Abstract */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Abstract & Problem Statement *
              </label>
              <span className={`text-[11px] font-medium ${abstract.length < 20 ? 'text-amber-600' : 'text-slate-400'}`}>
                {abstract.length} chars (min 20)
              </span>
            </div>
            <textarea
              rows={4}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Describe the research objective, clinical or industrial relevance, proposed machine learning methodology, and expected evaluation benchmarks..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          {/* Tech Stack Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Technology Stack (Press Enter to add tag)
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleAddTechTag}
                placeholder="e.g., PyTorch, Transformers, FastAPI, Docker"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddTechTag}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-50 border border-slate-100 rounded-xl">
              {techStack.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-100/70 text-sky-800 border border-sky-200/50"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTechTag(tag)}
                    className="ml-1.5 text-sky-600 hover:text-sky-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Team Members Invite */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Invite Team Members
              </label>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isTeamFull ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Team Size: {currentTeamSize} / {settings.maxTeamSize} (You + {selectedPeers.length})
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Select enrolled peers to join your proposal. You are assigned as Student Team Lead.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PEER_STUDENTS.map((peer) => {
                const isSelected = selectedPeers.some((p) => p.id === peer.id);
                return (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => handleTogglePeer(peer)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col ${
                      isSelected
                        ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center justify-between">
                      {peer.name}
                      {isSelected && <span className="text-sky-600 text-xs">✓</span>}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5">{peer.rollNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('SUBMITTED')}
              className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center space-x-1.5"
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
