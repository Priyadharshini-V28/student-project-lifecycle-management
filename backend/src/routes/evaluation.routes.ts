import { Router } from 'express';
import * as evaluationController from '../controllers/evaluation.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All evaluation routes require authentication
router.use(authenticate);

// 1. Eligibility check (Student team members, Assigned Faculty guide, Admin)
router.get('/:projectId/evaluation/eligibility', evaluationController.getEligibility);

// 2. Evaluation details (Student team members sees released only; Faculty/Admin sees draft and released)
router.get('/:projectId/evaluation', evaluationController.getEvaluation);

// 3. Save evaluation draft (Assigned Faculty guide or Admin)
router.post(
  '/:projectId/evaluation/draft',
  requireRole(['FACULTY', 'ADMIN']),
  evaluationController.saveDraft
);

// 4. Submit final evaluation (Assigned Faculty guide or Admin)
router.post(
  '/:projectId/evaluation/submit',
  requireRole(['FACULTY', 'ADMIN']),
  evaluationController.submitEvaluation
);

export default router;
