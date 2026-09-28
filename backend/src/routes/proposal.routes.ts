import { Router } from 'express';
import * as proposalController from '../controllers/proposal.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All proposal routes require authentication
router.use(authenticate);

// Public settings endpoint for configurable thresholds
router.get('/settings', proposalController.getSettings);

// Proposals collection: Student creates, all authenticated roles can list visible proposals
router.route('/')
  .get(proposalController.getProposals)
  .post(requireRole(['STUDENT']), proposalController.createProposal);

// Single proposal endpoints
router.route('/:id')
  .get(proposalController.getProposalById)
  .put(requireRole(['STUDENT']), proposalController.updateProposal);

// Lifecycle actions
router.post('/:id/submit', requireRole(['STUDENT']), proposalController.submitProposal);
router.post('/:id/review', requireRole(['FACULTY', 'ADMIN']), proposalController.reviewProposal);

// Member management
router.post('/:id/members', requireRole(['STUDENT']), proposalController.addMember);
router.patch('/:id/members/respond', requireRole(['STUDENT']), proposalController.respondInvite);
router.delete('/:id/members/:memberId', requireRole(['STUDENT']), proposalController.removeMember);

export default router;
