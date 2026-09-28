import { Request, Response, NextFunction } from 'express';
import { studentService } from '../services/student.service';
import { ApiError } from '../utils/ApiError';

export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students have access to the student dashboard');
    }

    const dashboardData = await studentService.getStudentDashboard(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Student dashboard aggregated data retrieved successfully',
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
