import { Request, Response, NextFunction } from 'express';
import { metadataService } from '../services/metadata.service';
import { ApiError } from '../utils/ApiError';

export const getBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const batches = await metadataService.getAcademicBatches(departmentId);

    res.status(200).json({
      success: true,
      message: 'Active academic batches retrieved successfully',
      data: batches,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const batches = await metadataService.getAllAcademicBatches();

    res.status(200).json({
      success: true,
      message: 'All academic batches retrieved successfully',
      data: batches,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const { name, startYear, endYear, departmentId } = req.body;

    const newBatch = await metadataService.createAcademicBatch(
      {
        name,
        startYear: Number(startYear),
        endYear: Number(endYear),
        departmentId: Number(departmentId) || 1,
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Academic batch created successfully',
      data: newBatch,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getDomains = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const domains = await metadataService.getActiveDomains();

    res.status(200).json({
      success: true,
      message: 'Active project domains retrieved successfully',
      data: domains,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getAllDomains = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const domains = await metadataService.getAllDomains();

    res.status(200).json({
      success: true,
      message: 'All project domains retrieved successfully',
      data: domains,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createDomain = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const { name, description, departmentId } = req.body;

    const domain = await metadataService.createDomain(
      {
        name,
        description,
        departmentId: departmentId ? Number(departmentId) : undefined,
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Project domain created successfully',
      data: domain,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const toggleDomainStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const id = req.params.id as string;
    const { isActive } = req.body;

    const domain = await metadataService.toggleDomainStatus(id, Boolean(isActive), req.user.id);

    res.status(200).json({
      success: true,
      message: 'Domain status updated successfully',
      data: domain,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
