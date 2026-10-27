import { Router } from 'express';
import * as metadataController from '../controllers/metadata.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Publicly readable endpoints for registration and proposal selection
router.get('/batches', metadataController.getBatches);
router.get('/domains', metadataController.getDomains);

// Admin-only management endpoints
router.get('/batches/all', authenticate, requireRole(['ADMIN']), metadataController.getAllBatches);
router.post('/batches', authenticate, requireRole(['ADMIN']), metadataController.createBatch);

router.get('/domains/all', authenticate, requireRole(['ADMIN']), metadataController.getAllDomains);
router.post('/domains', authenticate, requireRole(['ADMIN']), metadataController.createDomain);
router.patch('/domains/:id/status', authenticate, requireRole(['ADMIN']), metadataController.toggleDomainStatus);

export default router;
