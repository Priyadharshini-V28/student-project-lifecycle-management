import React, { useState, useEffect } from 'react';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  Save,
  Send,
  X,
  Clock,
} from 'lucide-react';
import { evaluationApi } from '../services/api';
import {
  IRubricCriterionScore,
  EvaluationEligibilityDto,
  EvaluationDto,
  LetterGrade,
} from '../types';

interface ProjectEvaluationModalProps {
  projectId: string;
  projectTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onEvaluationCompleted: () => void;
  readOnly?: boolean;
}

export const ProjectEvaluationModal: React.FC<ProjectEvaluationModalProps> = ({
  projectId,
  projectTitle,
  isOpen,
  onClose,
  onEvaluationCompleted,
  readOnly = false,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [eligibility, setEligibility] = useState<EvaluationEligibilityDto | null>(null);
  const [existingEvaluation, setExistingEvaluation] = useState<EvaluationDto | null>(null);

  // Form State
  const [rubricScores, setRubricScores] = useState<IRubricCriterionScore[]>([]);
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen && projectId) {
      loadEvaluationData();
    }
  }, [isOpen, projectId]);

  const loadEvaluationData = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const [eligRes, evalRes] = await Promise.all([
        evaluationApi.getEligibility(projectId),
        evaluationApi.getEvaluation(projectId),
      ]);

      setEligibility(eligRes);

      if (evalRes.evaluation) {
        setExistingEvaluation(evalRes.evaluation);
        setRubricScores(evalRes.evaluation.rubricScores || eligRes.standardRubric);
        setGeneralFeedback(evalRes.evaluation.generalFeedback || '');
        setRecommendations(evalRes.evaluation.recommendations || '');
      } else {
        setExistingEvaluation(null);
        setRubricScores(eligRes.standardRubric || []);
        setGeneralFeedback('');
        setRecommendations('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load project evaluation data.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...rubricScores];
    const clamped = Math.max(0, Math.min(100, isNaN(newScore) ? 0 : newScore));
    updated[index] = { ...updated[index], score: clamped };
    setRubricScores(updated);
  };

  const handleRemarksChange = (index: number, remarks: string) => {
    const updated = [...rubricScores];
    updated[index] = { ...updated[index], remarks };
    setRubricScores(updated);
  };

  // Live Weighted Calculation
  const totalWeightedScore = Math.round(
    rubricScores.reduce((sum, item) => sum + (Number(item.score || 0) * Number(item.weight || 0)) / 100, 0) * 100
  ) / 100;

  const getTentativeGrade = (score: number): { grade: LetterGrade; label: string; color: string } => {
    if (score >= 90) return { grade: 'O', label: 'Outstanding (O)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 80) return { grade: 'A+', label: 'Excellent (A+)', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (score >= 70) return { grade: 'A', label: 'Very Good (A)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (score >= 60) return { grade: 'B+', label: 'Good (B+)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (score >= 50) return { grade: 'B', label: 'Pass (B)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { grade: 'RA', label: 'Re-appear / Changes Required (RA)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const gradeInfo = getTentativeGrade(totalWeightedScore);

  const handleSaveDraft = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const saved = await evaluationApi.saveDraft(projectId, {
        rubricScores,
        generalFeedback,
        recommendations,
      });
      setExistingEvaluation(saved);
      setSuccessMsg('Evaluation draft saved successfully in records.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save evaluation draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!eligibility?.eligible) {
      setErrorMsg('Cannot finalize: Project does not yet meet all final evaluation prerequisites.');
      return;
    }
    if (!generalFeedback.trim() || generalFeedback.trim().length < 5) {
      setErrorMsg('Please enter substantive qualitative feedback (at least 5 characters).');
      return;
    }

    const confirmed = window.confirm(
      `Confirm final evaluation submission?\n\nWeighted Score: ${totalWeightedScore}/100\nGrade: ${gradeInfo.label}\n\nOnce finalized, project status will transition to COMPLETED and results will be released to students.`
    );
    if (!confirmed) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await evaluationApi.submit(projectId, {
        rubricScores,
        generalFeedback,
        recommendations,
      });
      setSuccessMsg('Final project evaluation submitted successfully! Project is marked COMPLETED.');
      setTimeout(() => {
        onEvaluationCompleted();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit final evaluation.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isSubmitted = existingEvaluation?.status === 'SUBMITTED';
  const isFormDisabled = readOnly || isSubmitted || saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-4xl w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Capstone Final Evaluation & Viva
              </span>
              {isSubmitted ? (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>FINAL EVALUATION SUBMITTED</span>
                </span>
              ) : existingEvaluation?.status === 'DRAFT' ? (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>DRAFT IN PROGRESS</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  AWAITING EVALUATION
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">{projectTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-md hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-900 border-t-transparent mb-2"></div>
            <p>Loading rubric guidelines and evaluation prerequisites...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Eligibility & Prerequisites Card */}
            {eligibility && !isSubmitted && (
              <div
                className={`p-3.5 rounded-md border text-xs ${
                  eligibility.eligible
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-semibold">
                    {eligibility.eligible ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Prerequisites Satisfied — Project is Eligible for Final Viva Evaluation</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Project Not Yet Eligible for Final Evaluation</span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-white/80 rounded border">
                    Progress: {eligibility.overallProgress}% ({eligibility.completedMilestonesCount}/{eligibility.milestonesCount} Milestones)
                  </span>
                </div>

                {!eligibility.eligible && eligibility.reasons.length > 0 && (
                  <ul className="mt-2 list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {eligibility.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Rubric Criteria Evaluation Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-slate-600" />
                  <span>Institutional Rubric Scoring Criteria (100% Weight Total)</span>
                </h4>
                <span className="text-[11px] text-slate-500">Each criterion graded on a scale of 0 to 100</span>
              </div>

              <div className="space-y-2.5">
                {rubricScores.map((criterion, idx) => (
                  <div
                    key={criterion.criterionKey}
                    className="p-3 bg-slate-50/70 rounded-md border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{criterion.label}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                            Weight: {criterion.weight}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={criterion.score}
                            disabled={isFormDisabled}
                            onChange={(e) => handleScoreChange(idx, parseFloat(e.target.value))}
                            className="w-16 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 text-right disabled:bg-slate-100"
                          />
                          <span className="text-slate-500 font-mono">/ 100</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 font-mono w-14 text-right">
                          ={(((criterion.score || 0) * criterion.weight) / 100).toFixed(1)} pts
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Criterion remarks or justification..."
                        value={criterion.remarks || ''}
                        disabled={isFormDisabled}
                        onChange={(e) => handleRemarksChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Weighted Score Summary Bar */}
            <div className="p-4 rounded-md border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Weighted Aggregate Outcome
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {totalWeightedScore}
                    </span>
                    <span className="text-slate-400 font-mono text-sm">/ 100</span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${gradeInfo.color}`}>
                      {gradeInfo.label}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Degree Recommendation
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1 text-xs font-bold mt-0.5 ${
                      totalWeightedScore >= 50 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {totalWeightedScore >= 50 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pass & Conclude Capstone</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Revision / Resubmission Required</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluator Remarks & Recommendations */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Evaluator General Feedback <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={generalFeedback}
                  disabled={isFormDisabled}
                  onChange={(e) => setGeneralFeedback(e.target.value)}
                  placeholder="Comprehensive feedback on technical rigor, viva performance, and report quality..."
                  className="w-full p-2.5 text-xs text-slate-800 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Future Recommendations & Research Extensions
                </label>
                <input
                  type="text"
                  value={recommendations}
                  disabled={isFormDisabled}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Suggestions for publication, intellectual property, or ongoing system deployment..."
                  className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition"
              >
                Close
              </button>

              {!readOnly && !isSubmitted && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-300 transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitFinal}
                    disabled={saving || !eligibility?.eligible}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Finalize & Submit Evaluation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
