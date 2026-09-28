import { Request, Response, NextFunction } from 'express';
import { facultyService } from '../services/faculty.service';
import { ApiError } from '../utils/ApiError';

export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!['FACULTY', 'ADMIN'].includes(req.user.role)) {
      throw ApiError.forbidden('Only faculty members and administrators have access to the faculty dashboard');
    }

    const dashboardData = await facultyService.getFacultyDashboard(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Faculty dashboard aggregated data retrieved successfully',
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
