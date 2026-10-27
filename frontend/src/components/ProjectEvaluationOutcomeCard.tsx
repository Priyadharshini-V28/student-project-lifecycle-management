import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { evaluationApi } from '../services/api';
import { EvaluationDto, LetterGrade } from '../types';

interface ProjectEvaluationOutcomeCardProps {
  projectId: string;
}

export const ProjectEvaluationOutcomeCard: React.FC<ProjectEvaluationOutcomeCardProps> = ({ projectId }) => {
  const [evaluation, setEvaluation] = useState<EvaluationDto | null>(null);
  const [isReleased, setIsReleased] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (projectId) {
      loadEvaluation();
    }
  }, [projectId]);

  const loadEvaluation = async () => {
    setLoading(true);
    try {
      const res = await evaluationApi.getEvaluation(projectId);
      if (res.isReleased && res.evaluation) {
        setEvaluation(res.evaluation);
        setIsReleased(true);
      } else {
        setEvaluation(null);
        setIsReleased(false);
      }
    } catch {
      // If error or forbidden, silently hide
      setEvaluation(null);
      setIsReleased(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isReleased || !evaluation) {
    return null;
  }

  const getGradeBadge = (grade: LetterGrade) => {
    switch (grade) {
      case 'O':
        return { label: 'Grade O • Outstanding', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'A+':
        return { label: 'Grade A+ • Excellent', bg: 'bg-teal-50 text-teal-800 border-teal-300' };
      case 'A':
        return { label: 'Grade A • Very Good', bg: 'bg-blue-50 text-blue-800 border-blue-300' };
      case 'B+':
        return { label: 'Grade B+ • Good', bg: 'bg-indigo-50 text-indigo-800 border-indigo-300' };
      case 'B':
        return { label: 'Grade B • Pass', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      default:
        return { label: 'Grade RA • Re-evaluation', bg: 'bg-rose-50 text-rose-800 border-rose-300' };
    }
  };

  const gradeInfo = getGradeBadge(evaluation.letterGrade);

  return (
    <div className="bg-white rounded-lg border-2 border-emerald-200 shadow-sm p-5 space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-600 text-white flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CAPSTONE PROJECT COMPLETED</span>
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${gradeInfo.bg}`}>
              {gradeInfo.label}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">Official Final Project Evaluation & Viva Result</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluated by {evaluation.evaluatorName || 'Faculty Supervisor'}
            {evaluation.submittedAt && ` on ${evaluation.submittedAt.substring(0, 10)}`}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Final Weighted Score</div>
          <div className="flex items-baseline space-x-1 justify-end">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {evaluation.totalWeightedScore}
            </span>
            <span className="text-slate-400 font-mono text-sm">/ 100</span>
          </div>
        </div>
      </div>

      {/* Rubric Breakdown Grid */}
      <div className="space-y-1.5">
        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
          <Award className="w-3.5 h-3.5 text-emerald-600" />
          <span>Institutional Rubric Scoring Breakdown</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {evaluation.rubricScores.map((item) => (
            <div
              key={item.criterionKey}
              className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-400">Weight: {item.weight}%</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-mono">Score</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {item.score} / 100
                </span>
              </div>
              {item.remarks && (
                <p className="text-[10px] text-slate-600 mt-1 italic truncate" title={item.remarks}>
                  "{item.remarks}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Structured Qualitative Feedback */}
      <div className="p-3.5 bg-emerald-50/50 rounded-md border border-emerald-100 text-xs text-slate-800 space-y-2">
        <div>
          <strong className="text-emerald-950 font-bold block mb-0.5">Faculty Viva Remarks & Feedback:</strong>
          <p className="leading-relaxed">{evaluation.generalFeedback}</p>
        </div>
        {evaluation.recommendations && (
          <div className="pt-2 border-t border-emerald-200/60">
            <strong className="text-emerald-950 font-bold block mb-0.5">Future Recommendations & Publications:</strong>
            <p className="leading-relaxed text-slate-700">{evaluation.recommendations}</p>
          </div>
        )}
      </div>
    </div>
  );
};
