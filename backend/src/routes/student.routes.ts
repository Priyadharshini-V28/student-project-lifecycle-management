import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All student routes strictly require authentication and STUDENT role
router.use(authenticate);
router.use(requireRole(['STUDENT']));

router.get('/dashboard', studentController.getDashboard);

export default router;
