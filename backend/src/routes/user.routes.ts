import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All user profile routes require authentication
router.use(authenticate);

// Universal profile endpoints
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword);

// Specialized academic profiles with strict RBAC guards
router.get('/student-profile', requireRole(['STUDENT']), userController.getStudentProfile);
router.get('/faculty-profile', requireRole(['FACULTY', 'ADMIN']), userController.getFacultyProfile);

export default router;
