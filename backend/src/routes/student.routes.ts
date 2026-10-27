import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All student routes require authentication
router.use(authenticate);

// Student directory accessible to authenticated users (team creation, peer invitation)
router.get('/list', studentController.getStudentList);

// Personal student dashboard strictly requires STUDENT role
router.get('/dashboard', requireRole(['STUDENT']), studentController.getDashboard);

export default router;
