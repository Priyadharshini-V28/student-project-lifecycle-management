import { Request, Response, NextFunction } from 'express';
import { allocationService } from '../services/allocation.service';
import { ApiError } from '../utils/ApiError';
import {
  ReassignProjectGuideSchema,
  AssignProposalGuideSchema,
  UpdateFacultyCapacitySchema,
} from '../validators/allocation.validator';

export const getMatrix = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const matrix = await allocationService.getFacultyAllocationMatrix(departmentId);

    res.status(200).json({
      success: true,
      message: 'Faculty capacity matrix retrieved successfully',
      data: matrix,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getUnallocated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const items = await allocationService.getUnallocatedItems();

    res.status(200).json({
      success: true,
      message: 'Pending items retrieved successfully',
      data: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const reassignProjectGuide = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = req.params.projectId as string;
    const input = ReassignProjectGuideSchema.parse(req.body);
    const result = await allocationService.reassignProjectGuide(
      projectId,
      input.newFacultyGuideId,
      req.user.id,
      req.user.role,
      input.reason
    );

    res.status(200).json({
      success: true,
      message: 'Project supervisor reallocated successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const assignProposalGuide = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const proposalId = req.params.proposalId as string;
    const input = AssignProposalGuideSchema.parse(req.body);
    const result = await allocationService.assignProposalGuide(
      proposalId,
      input.facultyId,
      req.user.id,
      req.user.role,
      input.allocateProject
    );

    res.status(200).json({
      success: true,
      message: 'Proposal supervisor assigned successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateFacultyCapacity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const facultyId = req.params.facultyId as string;
    const input = UpdateFacultyCapacitySchema.parse(req.body);
    const result = await allocationService.updateFacultyCapacity(
      facultyId,
      input.maxProjects,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Faculty supervising capacity updated successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const recommendations = await allocationService.getRecommendedGuides(id);

    res.status(200).json({
      success: true,
      message: 'Recommended faculty guides retrieved and ranked successfully',
      data: recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
