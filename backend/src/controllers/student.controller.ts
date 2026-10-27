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

export const getStudentList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const callerId = req.user?.id;
    const students = await studentService.getStudentDirectory(callerId, departmentId);

    res.status(200).json({
      success: true,
      message: 'Student directory retrieved successfully',
      data: students,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

