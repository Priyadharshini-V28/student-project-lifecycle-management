import { Router } from 'express';
import * as proposalController from '../controllers/proposal.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Project details and updates
router.get('/:id', proposalController.getProjectById);
router.patch('/:id/repo', proposalController.updateProjectRepo);

export default router;
