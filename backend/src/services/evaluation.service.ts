import { Project, Evaluation, DocumentModel, AuditLog, User } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import {
  DEFAULT_RUBRIC_TEMPLATE,
  calculateRubricTotals,
  SaveDraftEvaluationInput,
  SubmitEvaluationInput,
} from '../validators/evaluation.validator';
import { IRubricCriterionScore } from '../models/evaluation.model';

export interface EligibilityResultDto {
  eligible: boolean;
  reasons: string[];
  canEvaluate: boolean;
  projectStatus: string;
  overallProgress: number;
  milestonesCount: number;
  completedMilestonesCount: number;
  documentsCount: number;
  qualifyingDocumentsCount: number;
  currentEvaluationStatus: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
  standardRubric: IRubricCriterionScore[];
}

export class EvaluationService {
  /**
   * Evaluates project prerequisites for final evaluation eligibility
   */
  async checkEligibility(
    projectId: string,
    userId: string,
    role: string
  ): Promise<EligibilityResultDto> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Role-based evaluation permission check
    const isGuide = project.facultyGuideId === userId;
    const isAdmin = role === 'ADMIN';
    const canEvaluate = isGuide || isAdmin;

    // Student access verification
    if (role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.studentId === userId);
      if (!isMember) {
        throw ApiError.forbidden('Access denied: You are not a member of this project team.');
      }
    }

    const reasons: string[] = [];

    // 1. Check existing evaluation status
    const existingEvaluation = await Evaluation.findOne({ projectId });
    const currentEvaluationStatus = existingEvaluation ? existingEvaluation.status : 'NOT_STARTED';

    if (currentEvaluationStatus === 'SUBMITTED') {
      reasons.push('Final evaluation has already been submitted and finalized.');
    }

    // 2. Project lifecycle status check
    if (project.status === 'SUSPENDED' || project.status === 'ARCHIVED') {
      reasons.push(`Project cannot be evaluated in its current lifecycle state (${project.status}).`);
    }

    // 3. Milestones prerequisite check
    const milestones = project.milestones || [];
    const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED');
    const milestoneCount = milestones.length;
    const completedCount = completedMilestones.length;

    if (milestoneCount === 0) {
      reasons.push('Project has no milestones defined in the curriculum schedule.');
    } else {
      // Must have at least 75% overall progress OR >= 75% of milestones marked completed
      const completionRatio = completedCount / milestoneCount;
      const progressSufficient = (project.overallProgress || 0) >= 75 || completionRatio >= 0.75;
      if (!progressSufficient) {
        reasons.push(
          `Project progress is insufficient for final viva (${project.overallProgress}% overall; ${completedCount}/${milestoneCount} milestones completed). Minimum 75% required.`
        );
      }
    }

    // 4. Required deliverables check (SRS, MID_TERM_REPORT, FINAL_THESIS, PRESENTATION)
    const documents = await DocumentModel.find({ projectId });
    const qualifyingDocs = documents.filter((doc) =>
      ['FINAL_THESIS', 'MID_TERM_REPORT', 'SRS', 'PRESENTATION'].includes(doc.documentType)
    );

    if (qualifyingDocs.length === 0) {
      reasons.push(
        'Required deliverables missing. At least one formal document (SRS, Mid-Term Report, Final Thesis, or Presentation) must be uploaded.'
      );
    }

    // 5. Evaluator authorization note
    if (!canEvaluate && role !== 'STUDENT') {
      reasons.push('Only the assigned faculty supervisor or department administrator can evaluate this project.');
    }

    const eligible =
      currentEvaluationStatus !== 'SUBMITTED' &&
      milestoneCount > 0 &&
      ((project.overallProgress || 0) >= 75 || completedCount / milestoneCount >= 0.75) &&
      qualifyingDocs.length > 0;

    return {
      eligible,
      reasons,
      canEvaluate,
      projectStatus: project.status,
      overallProgress: project.overallProgress || 0,
      milestonesCount: milestoneCount,
      completedMilestonesCount: completedCount,
      documentsCount: documents.length,
      qualifyingDocumentsCount: qualifyingDocs.length,
      currentEvaluationStatus,
      standardRubric: DEFAULT_RUBRIC_TEMPLATE,
    };
  }

  /**
   * Retrieve evaluation record with strict student privacy protection
   * (Drafts are strictly hidden from students; released/submitted evaluations are visible)
   */
  async getEvaluation(
    projectId: string,
    userId: string,
    role: string
  ): Promise<{
    evaluation: any | null;
    status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
    isReleased: boolean;
  }> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Verify role permissions
    if (role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.studentId === userId);
      if (!isMember) {
        throw ApiError.forbidden('Access denied: You are not a member of this project team.');
      }
    } else if (role === 'FACULTY') {
      if (project.facultyGuideId !== userId) {
        throw ApiError.forbidden('Access denied: You are not the assigned faculty supervisor for this project.');
      }
    }

    const evaluation = await Evaluation.findOne({ projectId });

    if (!evaluation) {
      return {
        evaluation: null,
        status: 'NOT_STARTED',
        isReleased: false,
      };
    }

    // STUDENT PRIVACY GUARD: If evaluation is still DRAFT, students cannot see marks or remarks
    if (role === 'STUDENT' && evaluation.status === 'DRAFT') {
      return {
        evaluation: null,
        status: 'NOT_STARTED',
        isReleased: false,
      };
    }

    // Populate evaluator details
    const evaluator = await User.findById(evaluation.evaluatorId).select(
      'firstName lastName email facultyProfile'
    );

    const resultEvaluation = {
      id: evaluation.id,
      projectId: evaluation.projectId,
      evaluatorId: evaluation.evaluatorId,
      evaluatorName: evaluator ? `${evaluator.firstName} ${evaluator.lastName}` : 'Faculty Supervisor',
      evaluatorEmail: evaluator?.email,
      status: evaluation.status,
      rubricScores: evaluation.rubricScores,
      totalWeightedScore: evaluation.totalWeightedScore,
      letterGrade: evaluation.letterGrade,
      generalFeedback: evaluation.generalFeedback,
      recommendations: evaluation.recommendations,
      isPassed: evaluation.isPassed,
      submittedAt: evaluation.submittedAt ? evaluation.submittedAt.toISOString() : undefined,
      createdAt: evaluation.createdAt ? evaluation.createdAt.toISOString() : undefined,
      updatedAt: evaluation.updatedAt ? evaluation.updatedAt.toISOString() : undefined,
    };

    return {
      evaluation: resultEvaluation,
      status: evaluation.status,
      isReleased: evaluation.status === 'SUBMITTED',
    };
  }

  /**
   * Save or update an evaluation draft (Role: Assigned Faculty or Admin)
   */
  async saveDraft(
    projectId: string,
    evaluatorId: string,
    input: SaveDraftEvaluationInput,
    role: string
  ): Promise<any> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      throw ApiError.forbidden('Access denied: Only faculty supervisors or administrators can evaluate projects.');
    }

    if (role === 'FACULTY' && project.facultyGuideId !== evaluatorId) {
      throw ApiError.forbidden('Only the assigned faculty supervisor can evaluate this project.');
    }

    let existingEvaluation = await Evaluation.findOne({ projectId });
    if (existingEvaluation && existingEvaluation.status === 'SUBMITTED') {
      throw ApiError.badRequest('Final evaluation has already been submitted and cannot be reverted to draft.');
    }

    // Merge provided rubric scores with default template
    const scoresToUse: IRubricCriterionScore[] = DEFAULT_RUBRIC_TEMPLATE.map((templateItem) => {
      const provided = input.rubricScores?.find((s) => s.criterionKey === templateItem.criterionKey);
      if (provided) {
        return {
          criterionKey: templateItem.criterionKey,
          label: provided.label || templateItem.label,
          weight: provided.weight || templateItem.weight,
          score: Math.max(0, Math.min(100, Number(provided.score || 0))),
          remarks: provided.remarks || '',
        };
      }
      return { ...templateItem };
    });

    const { totalWeightedScore, letterGrade, isPassed } = calculateRubricTotals(scoresToUse);

    if (!existingEvaluation) {
      existingEvaluation = new Evaluation({
        projectId,
        evaluatorId,
        status: 'DRAFT',
        rubricScores: scoresToUse,
        totalWeightedScore,
        letterGrade,
        generalFeedback: input.generalFeedback || 'Evaluation draft in preparation.',
        recommendations: input.recommendations || '',
        isPassed,
      });
    } else {
      existingEvaluation.evaluatorId = evaluatorId;
      existingEvaluation.status = 'DRAFT';
      existingEvaluation.rubricScores = scoresToUse;
      existingEvaluation.totalWeightedScore = totalWeightedScore;
      existingEvaluation.letterGrade = letterGrade;
      if (input.generalFeedback !== undefined) {
        existingEvaluation.generalFeedback = input.generalFeedback;
      }
      if (input.recommendations !== undefined) {
        existingEvaluation.recommendations = input.recommendations;
      }
      existingEvaluation.isPassed = isPassed;
    }

    await existingEvaluation.save();

    // Record audit log
    await AuditLog.create({
      userId: evaluatorId,
      action: 'EVALUATION_DRAFT_SAVED',
      entityType: 'PROJECT_EVALUATION',
      entityId: existingEvaluation.id,
      details: {
        projectId,
        totalWeightedScore,
        letterGrade,
      },
    });

    logger.info(
      `[EvaluationService] Draft saved for project ${projectId} by evaluator ${evaluatorId} (Score: ${totalWeightedScore}, Grade: ${letterGrade})`
    );

    return existingEvaluation;
  }

  /**
   * Submit final project evaluation, finalize marks, and transition project lifecycle to COMPLETED
   */
  async submitEvaluation(
    projectId: string,
    evaluatorId: string,
    input: SubmitEvaluationInput,
    role: string
  ): Promise<{ evaluation: any; project: any }> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (role !== 'FACULTY' && role !== 'ADMIN') {
      throw ApiError.forbidden('Access denied: Only faculty supervisors or administrators can evaluate projects.');
    }

    if (role === 'FACULTY' && project.facultyGuideId !== evaluatorId) {
      throw ApiError.forbidden('Only the assigned faculty supervisor can evaluate this project.');
    }

    let existingEvaluation = await Evaluation.findOne({ projectId });
    if (existingEvaluation && existingEvaluation.status === 'SUBMITTED') {
      throw ApiError.badRequest('Final evaluation has already been submitted and cannot be modified.');
    }

    // Validate rubric weights sum to 100%
    const totalWeight = input.rubricScores.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw ApiError.badRequest(`Rubric criteria weights must sum exactly to 100% (current sum: ${totalWeight}%).`);
    }

    // Verify prerequisites
    const eligibility = await this.checkEligibility(projectId, evaluatorId, role);
    if (!eligibility.eligible) {
      throw ApiError.badRequest(
        `Project does not satisfy final evaluation prerequisites: ${eligibility.reasons.join('; ')}`
      );
    }

    // Calculate official scores
    const { totalWeightedScore, letterGrade, isPassed } = calculateRubricTotals(input.rubricScores);

    const submittedDate = new Date();

    if (!existingEvaluation) {
      existingEvaluation = new Evaluation({
        projectId,
        evaluatorId,
        status: 'SUBMITTED',
        rubricScores: input.rubricScores,
        totalWeightedScore,
        letterGrade,
        generalFeedback: input.generalFeedback,
        recommendations: input.recommendations || '',
        isPassed,
        submittedAt: submittedDate,
      });
    } else {
      existingEvaluation.evaluatorId = evaluatorId;
      existingEvaluation.status = 'SUBMITTED';
      existingEvaluation.rubricScores = input.rubricScores;
      existingEvaluation.totalWeightedScore = totalWeightedScore;
      existingEvaluation.letterGrade = letterGrade;
      existingEvaluation.generalFeedback = input.generalFeedback;
      existingEvaluation.recommendations = input.recommendations || '';
      existingEvaluation.isPassed = isPassed;
      existingEvaluation.submittedAt = submittedDate;
    }

    await existingEvaluation.save();

    // Lifecycle Integration: On passing final evaluation, transition project to COMPLETED with 100% progress
    if (isPassed) {
      project.status = 'COMPLETED';
      project.overallProgress = 100;
    } else {
      project.status = 'CHANGES_REQUESTED';
    }

    // Mirror summary marks into project.finalEvaluation for backward compatibility
    project.finalEvaluation = {
      evaluatorId,
      technicalScore:
        input.rubricScores.find((r) => r.criterionKey === 'technicalImplementation')?.score ??
        Math.round(totalWeightedScore),
      documentationScore:
        input.rubricScores.find((r) => r.criterionKey === 'documentationQuality')?.score ??
        Math.round(totalWeightedScore),
      presentationScore:
        input.rubricScores.find((r) => r.criterionKey === 'presentationDemonstration')?.score ??
        Math.round(totalWeightedScore),
      vivaScore:
        input.rubricScores.find((r) => r.criterionKey === 'testingValidationOutcomes')?.score ??
        Math.round(totalWeightedScore),
      overallScore: totalWeightedScore,
      letterGrade,
      finalRemarks: input.generalFeedback,
      evaluatedAt: submittedDate,
    };

    await project.save();

    // Audit log
    await AuditLog.create({
      userId: evaluatorId,
      action: 'FINAL_EVALUATION_SUBMITTED',
      entityType: 'PROJECT_EVALUATION',
      entityId: existingEvaluation.id,
      details: {
        projectId,
        evaluatorId,
        totalWeightedScore,
        letterGrade,
        isPassed,
        projectStatus: project.status,
      },
    });

    logger.info(
      `[EvaluationService] Final evaluation submitted for project ${projectId}. Total Score: ${totalWeightedScore}, Grade: ${letterGrade}, Project Status: ${project.status}`
    );

    // In-app notifications to student team members & supervisor
    try {
      const teamMemberIds = project.teamMembers.map((m) => m.studentId);
      await notificationService.notifyProjectEvaluation({
        projectId: project.id,
        projectTitle: project.title,
        reviewId: existingEvaluation.id,
        remarks: `Official Grade: ${letterGrade} (${totalWeightedScore}/100) — Project is marked ${project.status}. Feedback: "${input.generalFeedback}"`,
        teamMemberIds,
        facultyGuideId: project.facultyGuideId,
      });
    } catch (notifErr) {
      logger.error('[EvaluationService] Notification delivery warning (non-fatal):', notifErr);
    }

    return {
      evaluation: existingEvaluation,
      project,
    };
  }
}

export const evaluationService = new EvaluationService();
