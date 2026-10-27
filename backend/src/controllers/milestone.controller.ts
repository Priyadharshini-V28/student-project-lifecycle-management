import { Request, Response, NextFunction } from 'express';
import { milestoneService } from '../services/milestone.service';
import { ApiError } from '../utils/ApiError';
import {
  updateProgressSchema,
  reviewMilestoneSchema,
  createMilestoneSchema,
  updateScheduleSchema,
} from '../validators/milestone.validator';

export const getMilestones = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);

    const data = await milestoneService.getProjectMilestones(
      projectId,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Project milestones retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const updateProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);
    const milestoneId = String(req.params.milestoneId);
    const validatedInput = updateProgressSchema.parse(req.body);

    const result = await milestoneService.updateMilestoneProgress(
      projectId,
      milestoneId,
      validatedInput,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Milestone progress updated successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const reviewMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);
    const milestoneId = String(req.params.milestoneId);
    const validatedInput = reviewMilestoneSchema.parse(req.body);

    const result = await milestoneService.reviewMilestone(
      projectId,
      milestoneId,
      validatedInput,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Milestone review completed successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const createMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);
    const validatedInput = createMilestoneSchema.parse(req.body);

    const milestone = await milestoneService.createMilestone(
      projectId,
      validatedInput,
      req.user.id,
      req.user.role
    );

    res.status(201).json({
      success: true,
      message: 'Milestone created successfully',
      data: milestone,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const updateSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);
    const milestoneId = String(req.params.milestoneId);
    const validatedInput = updateScheduleSchema.parse(req.body);

    const milestone = await milestoneService.updateMilestoneSchedule(
      projectId,
      milestoneId,
      validatedInput,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Milestone schedule updated successfully',
      data: milestone,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
