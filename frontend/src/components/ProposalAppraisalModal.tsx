import React, { useState, useEffect } from 'react';
import { proposalsApi } from '../services/api';
import { ProposalDetailDto } from '../types';
import { ClipboardCheck, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ClipboardCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Proposal Appraisal & Allocation</h2>
              <p className="text-xs text-slate-500">Evaluate capstone project proposal for official institution sign-off</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">Loading proposal details...</p>
            </div>
          ) : proposal ? (
            <>
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title & Badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    {proposal.domain}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    v{proposal.version} ({proposal.academicYear})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      proposal.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : proposal.status === 'CHANGES_REQUESTED'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : proposal.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-sky-50 text-sky-800 border-sky-200'
                    }`}
                  >
                    {proposal.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{proposal.title}</h3>
              </div>

              {/* Student Lead & Team Roster */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Team Roster ({proposal.members.length} student{proposal.members.length > 1 ? 's' : ''})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {proposal.members.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 bg-white border border-slate-200 rounded-md flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{m.name}</span>
                        <span className="text-slate-500 ml-1.5 font-mono text-[11px]">({m.rollNumber})</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          m.isLead
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : m.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
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
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Abstract & Research Scope
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                  {proposal.abstract}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Proposed Technology Stack
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {proposal.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-white text-slate-700 border border-slate-200"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* Appraisal Decision Radio Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Evaluation Decision *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVED')}
                    className={`py-2 px-3 rounded-md border text-xs font-semibold transition text-center ${
                      decision === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('CHANGES_REQUESTED')}
                    className={`py-2 px-3 rounded-md border text-xs font-semibold transition text-center ${
                      decision === 'CHANGES_REQUESTED'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✎ Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('REJECTED')}
                    className={`py-2 px-3 rounded-md border text-xs font-semibold transition text-center ${
                      decision === 'REJECTED'
                        ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ✕ Reject
                  </button>
                </div>

                {/* Contextual Notice */}
                <div className="mt-2.5 text-xs">
                  {decision === 'APPROVED' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-900 leading-relaxed">
                      <strong>Auto-Instantiation Notice:</strong> Approving this proposal will atomically create an official project in the projects catalog with status <code>ALLOCATED</code>, allocate the confirmed team roster, and pre-populate the 5 standard academic milestone gates.
                    </div>
                  )}
                  {decision === 'CHANGES_REQUESTED' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 leading-relaxed">
                      <strong>Revision Cycle:</strong> The proposal status will transition to <code>CHANGES_REQUESTED</code>. The student lead will be permitted to edit the abstract, scope, or tech stack and resubmit as version {proposal.version + 1}.
                    </div>
                  )}
                  {decision === 'REJECTED' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-900 leading-relaxed">
                      <strong>Terminal State:</strong> The proposal will be marked as rejected. Clear academic justification is mandatory for institutional records.
                    </div>
                  )}
                </div>
              </div>

              {/* Faculty Remarks Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || isLoading || !proposal}
            onClick={handleSubmitReview}
            className={`px-4 py-1.5 text-white text-xs font-semibold rounded-md shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5 ${
              decision === 'APPROVED'
                ? 'bg-slate-900 hover:bg-slate-800'
                : decision === 'CHANGES_REQUESTED'
                ? 'bg-amber-700 hover:bg-amber-800'
                : 'bg-rose-700 hover:bg-rose-800'
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
