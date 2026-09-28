import { Router } from 'express';
import * as facultyController from '../controllers/faculty.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All faculty routes strictly require authentication and FACULTY or ADMIN role
router.use(authenticate);
router.use(requireRole(['FACULTY', 'ADMIN']));

router.get('/dashboard', facultyController.getDashboard);

export default router;
