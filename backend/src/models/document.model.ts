import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export interface IDocument {
  _id?: string;
  projectId: string;
  uploadedBy: string;
  documentType: 'PROPOSAL' | 'SRS' | 'ARCHITECTURE_DESIGN' | 'MID_TERM_REPORT' | 'FINAL_THESIS' | 'PRESENTATION' | 'SOURCE_CODE_ZIP';
  fileName: string;
  originalFileName?: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  version: number;
  remarks?: string;
  milestoneId?: string;
  uploadedAt?: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    projectId: { type: String, ref: 'Project', required: true, index: true },
    uploadedBy: { type: String, ref: 'User', required: true },
    documentType: {
      type: String,
      required: true,
      enum: ['PROPOSAL', 'SRS', 'ARCHITECTURE_DESIGN', 'MID_TERM_REPORT', 'FINAL_THESIS', 'PRESENTATION', 'SOURCE_CODE_ZIP'],
    },
    fileName: { type: String, required: true },
    originalFileName: { type: String },
    filePath: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
    version: { type: Number, default: 1 },
    remarks: { type: String },
    milestoneId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

documentSchema.index({ projectId: 1, documentType: 1, version: -1 });

export const DocumentModel = model<IDocument>('Document', documentSchema);
export const Document = DocumentModel;

