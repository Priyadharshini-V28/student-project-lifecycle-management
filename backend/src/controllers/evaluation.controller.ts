import { Request, Response, NextFunction } from 'express';
import { evaluationService } from '../services/evaluation.service';
import { ApiError } from '../utils/ApiError';
import {
  saveDraftEvaluationSchema,
  submitEvaluationSchema,
} from '../validators/evaluation.validator';

export const getEligibility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const projectId = String(req.params.projectId);
    const eligibility = await evaluationService.checkEligibility(
      projectId,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Evaluation eligibility retrieved successfully',
      data: eligibility,
    });
  } catch (err) {
    next(err);
  }
};

export const getEvaluation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const projectId = String(req.params.projectId);
    const result = await evaluationService.getEvaluation(
      projectId,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Project evaluation details retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const saveDraft = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const projectId = String(req.params.projectId);
    const validatedInput = saveDraftEvaluationSchema.parse(req.body);

    const draft = await evaluationService.saveDraft(
      projectId,
      req.user.id,
      validatedInput,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Evaluation draft saved successfully',
      data: draft,
    });
  } catch (err) {
    next(err);
  }
};

export const submitEvaluation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const projectId = String(req.params.projectId);
    const validatedInput = submitEvaluationSchema.parse(req.body);

    const result = await evaluationService.submitEvaluation(
      projectId,
      req.user.id,
      validatedInput,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Final project evaluation submitted and project status updated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
