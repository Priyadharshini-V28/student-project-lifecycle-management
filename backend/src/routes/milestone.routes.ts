import { Router } from 'express';
import * as milestoneController from '../controllers/milestone.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All milestone routes require authentication
router.use(authenticate);

// Get all milestones for a project (Student member, Guide, Admin)
router.get('/:projectId/milestones', milestoneController.getMilestones);

// Student progress update (Role: STUDENT)
router.patch(
  '/:projectId/milestones/:milestoneId/progress',
  requireRole(['STUDENT']),
  milestoneController.updateProgress
);

// Faculty Guide / Admin review & approval (Role: FACULTY, ADMIN)
router.patch(
  '/:projectId/milestones/:milestoneId/review',
  requireRole(['FACULTY', 'ADMIN']),
  milestoneController.reviewMilestone
);

// Faculty Guide / Admin ad-hoc milestone creation (Role: FACULTY, ADMIN)
router.post(
  '/:projectId/milestones',
  requireRole(['FACULTY', 'ADMIN']),
  milestoneController.createMilestone
);

// Faculty Guide / Admin schedule adjustments (Role: FACULTY, ADMIN)
router.patch(
  '/:projectId/milestones/:milestoneId/schedule',
  requireRole(['FACULTY', 'ADMIN']),
  milestoneController.updateSchedule
);

export default router;
