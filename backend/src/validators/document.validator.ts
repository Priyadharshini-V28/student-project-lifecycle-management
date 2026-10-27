import { z } from 'zod';

export const DOCUMENT_TYPES = [
  'PROPOSAL',
  'SRS',
  'ARCHITECTURE_DESIGN',
  'MID_TERM_REPORT',
  'FINAL_THESIS',
  'PRESENTATION',
  'SOURCE_CODE_ZIP',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const ALLOWED_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
];

export const ALLOWED_EXTENSIONS: readonly string[] = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.zip',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
];

export const uploadDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES, {
    errorMap: () => ({
      message: `Invalid document type. Allowed types: ${DOCUMENT_TYPES.join(', ')}`,
    }),
  }),
  remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional(),
  milestoneId: z.string().trim().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

/**
 * Validates whether the given file extension and MIME type are permitted
 */
export const validateFileType = (
  originalName: string,
  mimeType: string
): { isValid: boolean; reason?: string } => {
  const dotIndex = originalName.lastIndexOf('.');
  if (dotIndex === -1) {
    return { isValid: false, reason: 'File must have a valid extension' };
  }

  const ext = originalName.slice(dotIndex).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      reason: `File extension "${ext}" is not allowed. Permitted extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check MIME type if provided and not generic octet-stream for zip
  if (mimeType && mimeType !== 'application/octet-stream') {
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
    if (!isAllowedMime) {
      return {
        isValid: false,
        reason: `MIME type "${mimeType}" is not permitted for upload`,
      };
    }
  }

  return { isValid: true };
};
