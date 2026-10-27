import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadSingleDocument } from '../middleware/upload.middleware';
import * as documentController from '../controllers/document.controller';

const router = Router();

// Upload document for a project
router.post(
  '/:projectId/documents',
  authenticate,
  uploadSingleDocument,
  documentController.uploadDocument
);

// Get all documents for a project
router.get(
  '/:projectId/documents',
  authenticate,
  documentController.getProjectDocuments
);

// Get version history for a document type or document ID
router.get(
  '/:projectId/documents/versions/:typeOrId',
  authenticate,
  documentController.getDocumentVersions
);

// Get version history alias by document ID
router.get(
  '/:projectId/documents/:documentId/versions',
  authenticate,
  documentController.getDocumentVersions
);

// Secure download for a document
router.get(
  '/:projectId/documents/:documentId/download',
  authenticate,
  documentController.downloadDocument
);

export default router;
