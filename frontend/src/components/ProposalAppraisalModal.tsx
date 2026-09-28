import React, { useState, useEffect } from 'react';
import { proposalsApi } from '../services/api';
import { ProposalDetailDto } from '../types';

interface ProposalAppraisalModalProps {
  proposalId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAppraisalCompleted: () => void;
}

export const ProposalAppraisalModal: React.FC<ProposalAppraisalModalProps> = ({
  proposalId,
  isOpen,
  onClose,
  onAppraisalCompleted,
}) => {
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'>('APPROVED');
  const [facultyComments, setFacultyComments] = useState('');

  useEffect(() => {
    if (isOpen && proposalId) {
      setIsLoading(true);
      setError(null);
      proposalsApi.getProposalById(proposalId)
        .then((data) => {
          setProposal(data);
          setFacultyComments(data.facultyComments || '');
        })
        .catch((err) => setError((err as Error).message || 'Failed to load proposal details.'))
        .finally(() => setIsLoading(false));
    } else {
      setProposal(null);
      setFacultyComments('');
      setDecision('APPROVED');
      setError(null);
    }
  }, [isOpen, proposalId]);

  if (!isOpen || !proposalId) return null;

  const handleSubmitReview = async () => {
    if (facultyComments.trim().length < 5) {
      setError('Please provide feedback comments of at least 5 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await proposalsApi.review(proposalId, {
        status: decision,
        facultyComments: facultyComments.trim(),
      });

      onAppraisalCompleted();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit appraisal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              ⚖️
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Proposal Appraisal & Allocation</h2>
              <p className="text-xs text-slate-500">Evaluate capstone project proposal for official institution sign-off</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">Loading proposal details...</p>
            </div>
          ) : proposal ? (
            <>
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
                  <span className="font-bold">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Title & Badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                    {proposal.domain}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    v{proposal.version} ({proposal.academicYear})
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      proposal.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : proposal.status === 'CHANGES_REQUESTED'
                        ? 'bg-amber-100 text-amber-800'
                        : proposal.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {proposal.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{proposal.title}</h3>
              </div>

              {/* Student Lead & Team Roster */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Team Roster ({proposal.members.length} student{proposal.members.length > 1 ? 's' : ''})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {proposal.members.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{m.name}</span>
                        <span className="text-slate-500 ml-1.5 font-mono">({m.rollNumber})</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          m.isLead
                            ? 'bg-amber-100 text-amber-800'
                            : m.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.isLead ? 'LEAD' : m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abstract */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Abstract & Research Scope
                </label>
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed max-h-36 overflow-y-auto">
                  {proposal.abstract}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Proposed Technology Stack
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {proposal.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Appraisal Decision Radio Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Evaluation Decision *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      decision === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('CHANGES_REQUESTED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      decision === 'CHANGES_REQUESTED'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ✎ Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('REJECTED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      decision === 'REJECTED'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ✕ Reject
                  </button>
                </div>

                {/* Contextual Notice */}
                <div className="mt-3 text-xs">
                  {decision === 'APPROVED' && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-800 leading-relaxed">
                      <strong>Auto-Instantiation Notice:</strong> Approving this proposal will atomically create an official project in the <code className="bg-emerald-100 px-1 rounded">projects</code> table with status <code className="bg-emerald-100 px-1 rounded">ALLOCATED</code>, allocate the confirmed team roster, and pre-populate the 5 standard academic milestone gates.
                    </div>
                  )}
                  {decision === 'CHANGES_REQUESTED' && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-800 leading-relaxed">
                      <strong>Revision Cycle:</strong> The proposal status will transition to <code className="bg-amber-100 px-1 rounded">CHANGES_REQUESTED</code>. The student lead will be permitted to edit the abstract, scope, or tech stack and resubmit as version {proposal.version + 1}.
                    </div>
                  )}
                  {decision === 'REJECTED' && (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-800 leading-relaxed">
                      <strong>Terminal State:</strong> The proposal will be marked as rejected. Clear academic justification is mandatory for institutional records.
                    </div>
                  )}
                </div>
              </div>

              {/* Faculty Remarks Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Supervisor Remarks & Evaluation Feedback *
                </label>
                <textarea
                  rows={3}
                  value={facultyComments}
                  onChange={(e) => setFacultyComments(e.target.value)}
                  placeholder={
                    decision === 'APPROVED'
                      ? 'e.g., Well-formulated research design and robust methodology. Approved for capstone execution.'
                      : 'e.g., Narrow down the clinical dataset, specify baseline comparison models, and detail GPU hardware feasibility...'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || isLoading || !proposal}
            onClick={handleSubmitReview}
            className={`px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center space-x-1.5 ${
              decision === 'APPROVED'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                : decision === 'CHANGES_REQUESTED'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving Appraisal...</span>
              </>
            ) : (
              <span>Submit Evaluation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
