import { Router } from 'express';
import * as allocationController from '../controllers/allocation.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All allocation routes require authentication
router.use(authenticate);

// Departmental / Institutional Faculty Capacity Matrix
router.get('/matrix', requireRole(['ADMIN', 'FACULTY']), allocationController.getMatrix);

// Unallocated / Pending Items Queue
router.get('/unallocated', requireRole(['ADMIN', 'FACULTY']), allocationController.getUnallocated);

// Recommendation & Advisory Domain Ranking
router.get('/recommendations/:id', requireRole(['ADMIN', 'FACULTY']), allocationController.getRecommendations);

// Guide Reallocation & Assignment Actions
router.post(
  '/projects/:projectId/reassign',
  requireRole(['ADMIN', 'FACULTY']),
  allocationController.reassignProjectGuide
);

router.post(
  '/proposals/:proposalId/assign',
  requireRole(['ADMIN', 'FACULTY']),
  allocationController.assignProposalGuide
);

// Faculty Quota Configuration (Admin Only)
router.patch(
  '/faculty/:facultyId/capacity',
  requireRole(['ADMIN']),
  allocationController.updateFacultyCapacity
);

export default router;
