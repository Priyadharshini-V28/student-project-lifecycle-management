import { Router } from 'express';
import * as facultyController from '../controllers/faculty.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All faculty routes require authentication
router.use(authenticate);

// Faculty directory accessible to all authenticated users (students creating proposals, etc.)
router.get('/list', facultyController.getFacultyList);

// Admin-only specialization management
router.patch('/:id/specialization', requireRole(['ADMIN']), facultyController.updateSpecialization);

// Faculty Dashboard requires FACULTY or ADMIN role
router.get('/dashboard', requireRole(['FACULTY', 'ADMIN']), facultyController.getDashboard);

export default router;
