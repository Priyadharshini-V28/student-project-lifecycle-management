import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.validator';
import { ApiError } from '../utils/ApiError';

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const profile = await userService.getUserProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user: profile },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const validatedInput = updateProfileSchema.parse(req.body);
    const updatedUser = await userService.updateUserProfile(
      req.user.id,
      req.user.role,
      validatedInput
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const validatedInput = changePasswordSchema.parse(req.body);
    await userService.changePassword(req.user.id, validatedInput);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const profile = await userService.getStudentAcademicProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Student academic profile retrieved successfully',
      data: { profile },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getFacultyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const profile = await userService.getFacultyAcademicProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Faculty academic profile retrieved successfully',
      data: { profile },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
