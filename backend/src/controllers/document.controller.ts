import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service';
import { ApiError } from '../utils/ApiError';
import { uploadDocumentSchema } from '../validators/document.validator';

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if (!req.file) throw ApiError.badRequest('No file provided for upload');

    const projectId = String(req.params.projectId);
    const validatedInput = uploadDocumentSchema.parse(req.body);

    const document = await documentService.uploadDocument({
      projectId,
      userId: req.user.id,
      role: req.user.role,
      file: req.file,
      documentType: validatedInput.documentType,
      remarks: validatedInput.remarks,
      milestoneId: validatedInput.milestoneId,
    });

    res.status(201).json({
      success: true,
      message: `Document ${document.documentType} v${document.version} uploaded successfully`,
      data: document,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getProjectDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);

    const overview = await documentService.getProjectDocuments(
      projectId,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Project documents retrieved successfully',
      data: overview,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const getDocumentVersions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);
    const typeOrId = String(req.params.typeOrId || req.params.documentId || req.params.documentType);

    const versions = await documentService.getDocumentVersions(
      projectId,
      typeOrId,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: 'Document versions retrieved successfully',
      data: versions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

export const downloadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    const projectId = String(req.params.projectId);
    const documentId = String(req.params.documentId);

    const fileMeta = await documentService.downloadDocument(
      projectId,
      documentId,
      req.user.id,
      req.user.role
    );

    res.download(fileMeta.filePath, fileMeta.originalFileName, (err) => {
      if (err) {
        if (!res.headersSent) {
          next(err);
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
