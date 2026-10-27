import fs from 'fs';
import { Project, User, AuditLog, DocumentModel, IDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { DocumentType, DOCUMENT_TYPES } from '../validators/document.validator';

export interface DocumentResponseDto {
  id: string;
  projectId: string;
  uploadedBy: {
    id: string;
    fullName: string;
    role: string;
    email?: string;
  };
  documentType: DocumentType;
  fileName: string;
  originalFileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  mimeType: string;
  version: number;
  remarks?: string;
  milestoneId?: string;
  uploadedAt: string;
}

export interface ProjectDocumentsOverviewDto {
  projectId: string;
  projectTitle: string;
  totalDocuments: number;
  documents: DocumentResponseDto[];
  latestByType: Partial<Record<DocumentType, DocumentResponseDto>>;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export class DocumentService {
  /**
   * Check whether user has access to view/download project assets
   */
  private async checkProjectAccess(
    projectId: string,
    userId: string,
    role: string,
    action: 'upload' | 'view'
  ): Promise<any> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (role === 'ADMIN') {
      return project;
    }

    if (role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.studentId === userId);
      if (!isMember) {
        throw ApiError.forbidden(
          `Access denied: You are not a member of project "${project.title}".`
        );
      }
      return project;
    }

    if (role === 'FACULTY') {
      const isGuide = project.facultyGuideId === userId;
      if (!isGuide) {
        throw ApiError.forbidden(
          `Access denied: You are not the assigned faculty supervisor for project "${project.title}".`
        );
      }
      return project;
    }

    throw ApiError.forbidden('Access denied: Unauthorized role.');
  }

  /**
   * Upload a project document with automatic version calculation
   */
  async uploadDocument(params: {
    projectId: string;
    userId: string;
    role: string;
    file: Express.Multer.File;
    documentType: DocumentType;
    remarks?: string;
    milestoneId?: string;
  }): Promise<DocumentResponseDto> {
    const { projectId, userId, role, file, documentType, remarks, milestoneId } = params;

    const project = await this.checkProjectAccess(projectId, userId, role, 'upload');

    // Find existing documents for this projectId and documentType to calculate next version
    const existingDocs = await DocumentModel.find({ projectId, documentType })
      .sort({ version: -1 })
      .limit(1);

    const version = existingDocs.length > 0 ? existingDocs[0].version + 1 : 1;

    // Create document record
    const document = await DocumentModel.create({
      projectId,
      uploadedBy: userId,
      documentType,
      fileName: file.filename,
      originalFileName: file.originalname,
      filePath: file.path,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      version,
      remarks: remarks?.trim() || undefined,
      milestoneId: milestoneId?.trim() || undefined,
      uploadedAt: new Date(),
    });

    // Write audit trail
    await AuditLog.create({
      userId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'DOCUMENT',
      entityId: document.id,
      details: {
        projectId,
        documentType,
        fileName: file.filename,
        originalFileName: file.originalname,
        fileSizeBytes: file.size,
        version,
        milestoneId,
        remarks,
      },
    });

    logger.info(
      `[DocumentService] Uploaded ${documentType} v${version} for project "${project.title}" by user ${userId}`
    );

    const uploader = await User.findById(userId).select('id firstName lastName role email');
    const uploaderFullName = uploader ? `${uploader.firstName} ${uploader.lastName}`.trim() : 'Project Member';

    // Dispatch in-app notification
    try {
      const teamMemberIds = (project.teamMembers || []).map((m: any) => m.studentId);
      await notificationService.notifyDocumentUpload({
        projectId: project.id,
        projectTitle: project.title,
        documentId: document.id,
        documentType,
        version,
        uploaderId: userId,
        uploaderName: uploaderFullName,
        uploaderRole: role,
        facultyGuideId: project.facultyGuideId,
        teamMemberIds,
      });
    } catch (err) {
      logger.error('[DocumentService] Non-fatal notification error on document upload:', err);
    }

    return {
      id: document.id,
      projectId: document.projectId,
      uploadedBy: {
        id: uploader?.id || userId,
        fullName: uploaderFullName,
        role: uploader?.role || role,
        email: uploader?.email,
      },
      documentType: document.documentType,
      fileName: document.fileName,
      originalFileName: document.originalFileName || document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      fileSizeFormatted: formatFileSize(document.fileSizeBytes),
      mimeType: document.mimeType,
      version: document.version,
      remarks: document.remarks,
      milestoneId: document.milestoneId,
      uploadedAt: document.uploadedAt ? document.uploadedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Get all documents for a project grouped with latest version mapping
   */
  async getProjectDocuments(
    projectId: string,
    userId: string,
    role: string
  ): Promise<ProjectDocumentsOverviewDto> {
    const project = await this.checkProjectAccess(projectId, userId, role, 'view');

    const documents = await DocumentModel.find({ projectId }).sort({ uploadedAt: -1 });

    const uploaderIds = Array.from(new Set(documents.map((d) => d.uploadedBy)));
    const users = await User.find({ _id: { $in: uploaderIds } }).select('id firstName lastName role email');
    const userMap = new Map(users.map((u) => [u.id || (u as any)._id, u]));

    const formattedList: DocumentResponseDto[] = documents.map((doc) => {
      const uploader = userMap.get(doc.uploadedBy);
      const uploaderFullName = uploader ? `${uploader.firstName} ${uploader.lastName}`.trim() : 'Project Member';
      return {
        id: doc.id,
        projectId: doc.projectId,
        uploadedBy: {
          id: uploader?.id || doc.uploadedBy,
          fullName: uploaderFullName,
          role: uploader?.role || 'STUDENT',
          email: uploader?.email,
        },
        documentType: doc.documentType,
        fileName: doc.fileName,
        originalFileName: doc.originalFileName || doc.fileName,
        fileSizeBytes: doc.fileSizeBytes,
        fileSizeFormatted: formatFileSize(doc.fileSizeBytes),
        mimeType: doc.mimeType,
        version: doc.version,
        remarks: doc.remarks,
        milestoneId: doc.milestoneId,
        uploadedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : new Date().toISOString(),
      };
    });

    // Compute latest version per documentType
    const latestByType: Partial<Record<DocumentType, DocumentResponseDto>> = {};
    for (const docDto of formattedList) {
      const type = docDto.documentType;
      if (!latestByType[type] || docDto.version > latestByType[type]!.version) {
        latestByType[type] = docDto;
      }
    }

    return {
      projectId: project.id,
      projectTitle: project.title,
      totalDocuments: formattedList.length,
      documents: formattedList,
      latestByType,
    };
  }

  /**
   * Retrieve full version history for a particular document type or document ID
   */
  async getDocumentVersions(
    projectId: string,
    typeOrId: string,
    userId: string,
    role: string
  ): Promise<DocumentResponseDto[]> {
    await this.checkProjectAccess(projectId, userId, role, 'view');

    let targetType: DocumentType | undefined;

    if (DOCUMENT_TYPES.includes(typeOrId as DocumentType)) {
      targetType = typeOrId as DocumentType;
    } else {
      const targetDoc = await DocumentModel.findOne({ _id: typeOrId, projectId });
      if (!targetDoc) {
        throw ApiError.notFound('Target document not found in this project');
      }
      targetType = targetDoc.documentType;
    }

    const versions = await DocumentModel.find({ projectId, documentType: targetType }).sort({
      version: -1,
    });

    const uploaderIds = Array.from(new Set(versions.map((d) => d.uploadedBy)));
    const users = await User.find({ _id: { $in: uploaderIds } }).select('id firstName lastName role email');
    const userMap = new Map(users.map((u) => [u.id || (u as any)._id, u]));

    return versions.map((doc) => {
      const uploader = userMap.get(doc.uploadedBy);
      const uploaderFullName = uploader ? `${uploader.firstName} ${uploader.lastName}`.trim() : 'Project Member';
      return {
        id: doc.id,
        projectId: doc.projectId,
        uploadedBy: {
          id: uploader?.id || doc.uploadedBy,
          fullName: uploaderFullName,
          role: uploader?.role || 'STUDENT',
          email: uploader?.email,
        },
        documentType: doc.documentType,
        fileName: doc.fileName,
        originalFileName: doc.originalFileName || doc.fileName,
        fileSizeBytes: doc.fileSizeBytes,
        fileSizeFormatted: formatFileSize(doc.fileSizeBytes),
        mimeType: doc.mimeType,
        version: doc.version,
        remarks: doc.remarks,
        milestoneId: doc.milestoneId,
        uploadedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : new Date().toISOString(),
      };
    });
  }

  /**
   * Secure download of a document file with RBAC validation and audit logging
   */
  async downloadDocument(
    projectId: string,
    documentId: string,
    userId: string,
    role: string
  ): Promise<{
    filePath: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: number;
  }> {
    await this.checkProjectAccess(projectId, userId, role, 'view');

    const document = await DocumentModel.findOne({ _id: documentId, projectId });
    if (!document) {
      throw ApiError.notFound('Document record not found');
    }

    if (!fs.existsSync(document.filePath)) {
      throw ApiError.notFound('Requested file attachment is missing on disk storage');
    }

    // Write audit trail
    await AuditLog.create({
      userId,
      action: 'DOCUMENT_DOWNLOADED',
      entityType: 'DOCUMENT',
      entityId: document.id,
      details: {
        projectId,
        documentType: document.documentType,
        fileName: document.fileName,
        originalFileName: document.originalFileName,
        version: document.version,
      },
    });

    logger.info(
      `[DocumentService] User ${userId} (${role}) downloaded document ${document.id} (v${document.version})`
    );

    return {
      filePath: document.filePath,
      originalFileName: document.originalFileName || document.fileName,
      mimeType: document.mimeType,
      fileSizeBytes: document.fileSizeBytes,
    };
  }
}

export const documentService = new DocumentService();
